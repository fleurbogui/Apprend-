-- =====================================================================
-- 🗄️ INSTALLATION SUPABASE — Le Français en Aventures
-- ---------------------------------------------------------------------
-- 1. Remplace l'adresse e-mail à la ligne marquée ✏️ par celle du prof.
-- 2. Copie TOUT ce fichier dans Supabase → SQL Editor → New query → Run.
-- 3. Tu peux relancer ce script sans risque : il ne supprime aucune donnée.
--
-- Sécurité :
--  • Les élèves (clé "anon") ne peuvent PAS lire les tables directement.
--    Ils passent uniquement par des fonctions : eleve_connexion, eleve_envoyer
--    et classement (qui ne renvoie que des prénoms et des scores).
--  • Seuls les e-mails listés dans la table "profs" peuvent lire les
--    résultats et gérer les devoirs (tableau de bord prof.html).
-- =====================================================================

-- ---------- Tables ----------
create table if not exists public.profs (
  email text primary key
);

-- METS ICI L'E-MAIL DU PROF (le même que le compte créé dans Authentication → Users)
insert into public.profs (email) values ('prof@gmail.com') on conflict do nothing;

create table if not exists public.eleves (
  id      uuid primary key default gen_random_uuid(),
  cle     text not null unique,              -- prénom normalisé (minuscules, sans accents)
  nom     text not null,                     -- prénom tel que tapé la 1re fois
  cree_le timestamptz not null default now(),
  vu_le   timestamptz not null default now()  -- dernière connexion / synchro
);

create table if not exists public.progression (
  eleve_id uuid not null references public.eleves(id) on delete cascade,
  etape    text not null,                    -- "idNiveau-numéroÉtape", ex. "3-2"
  etoiles  smallint not null default 0,      -- meilleur score
  points   int not null default 0,
  fois     int not null default 0,           -- nombre de fois jouée
  maj      timestamptz not null default now(),
  primary key (eleve_id, etape)
);

-- Chaque étape terminée = une tentative (sert à vérifier les devoirs)
create table if not exists public.tentatives (
  id           bigint generated always as identity primary key,
  client_id    text not null unique,         -- évite les doublons si l'envoi est répété
  eleve_id     uuid not null references public.eleves(id) on delete cascade,
  etape        text not null,
  etoiles      smallint not null default 0,
  points       int not null default 0,
  erreurs      int not null default 0,
  indices      int not null default 0,
  passes       int not null default 0,       -- exercices passés ⏭️
  nb_exercices int not null default 5,
  duree_s      int not null default 0,       -- temps passé sur l'étape
  fait_le      timestamptz not null default now(),  -- quand l'élève a joué (heure du téléphone)
  recu_le      timestamptz not null default now()   -- quand le serveur l'a reçu
);
create index if not exists tentatives_eleve_date on public.tentatives (eleve_id, fait_le desc);

create table if not exists public.devoirs (
  id          bigint generated always as identity primary key,
  titre       text not null,
  etapes      text[] not null,               -- ex. {"3-1","3-2"}
  date_limite date not null,
  cree_le     timestamptz not null default now()
);

-- ---------- Sécurité (RLS) ----------
alter table public.profs       enable row level security;
alter table public.eleves      enable row level security;
alter table public.progression enable row level security;
alter table public.tentatives  enable row level security;
alter table public.devoirs     enable row level security;

-- Vrai si la personne connectée est un prof autorisé
create or replace function public.est_prof()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profs
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

drop policy if exists "prof lit profs"        on public.profs;
drop policy if exists "prof lit eleves"       on public.eleves;
drop policy if exists "prof supprime eleves"  on public.eleves;
drop policy if exists "prof lit progression"  on public.progression;
drop policy if exists "prof lit tentatives"   on public.tentatives;
drop policy if exists "prof gere devoirs"     on public.devoirs;

create policy "prof lit profs"       on public.profs       for select to authenticated using (public.est_prof());
create policy "prof lit eleves"      on public.eleves      for select to authenticated using (public.est_prof());
create policy "prof supprime eleves" on public.eleves      for delete to authenticated using (public.est_prof());
create policy "prof lit progression" on public.progression for select to authenticated using (public.est_prof());
create policy "prof lit tentatives"  on public.tentatives  for select to authenticated using (public.est_prof());
create policy "prof gere devoirs"    on public.devoirs     for all    to authenticated
  using (public.est_prof()) with check (public.est_prof());

-- ---------- Fonctions appelées par l'appli des élèves ----------

-- Devoirs visibles par les élèves (en cours + terminés depuis moins de 14 jours)
create or replace function public.devoirs_json()
returns jsonb
language sql stable security definer set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', d.id, 'titre', d.titre, 'etapes', d.etapes,
           'date_limite', d.date_limite, 'cree_le', d.cree_le)
         order by d.date_limite), '[]'::jsonb)
  from public.devoirs d
  where d.date_limite >= current_date - 14;
$$;

-- Connexion par prénom : crée l'élève s'il n'existe pas, renvoie sa progression et les devoirs
create or replace function public.eleve_connexion(p_nom text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_nom text := left(btrim(regexp_replace(coalesce(p_nom, ''), '\s+', ' ', 'g')), 30);
  v_cle text;
  v_id  uuid;
begin
  if char_length(v_nom) < 2 then
    raise exception 'Prénom trop court';
  end if;
  v_cle := translate(lower(v_nom),
                     'àâäáãåçéèêëíìîïñóòôöõúùûüýÿœæ',
                     'aaaaaaceeeeiiiinooooouuuuyyoa');

  insert into public.eleves (cle, nom) values (v_cle, v_nom)
  on conflict (cle) do update set vu_le = now()
  returning id into v_id;

  return jsonb_build_object(
    'id', v_id,
    'nom', (select nom from public.eleves where id = v_id),
    'progression', coalesce((
        select jsonb_object_agg(etape, jsonb_build_object('etoiles', etoiles, 'points', points, 'fois', fois))
        from public.progression where eleve_id = v_id), '{}'::jsonb),
    'devoirs', public.devoirs_json()
  );
end;
$$;

-- Envoi des étapes terminées (appelé après chaque étape, et au retour du réseau)
create or replace function public.eleve_envoyer(p_id uuid, p_tentatives jsonb)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  t         jsonb;
  v_etape   text;
  v_etoiles int;
  v_points  int;
  n         int := 0;
begin
  if not exists (select 1 from public.eleves where id = p_id) then
    raise exception 'Élève inconnu';
  end if;
  if jsonb_typeof(p_tentatives) <> 'array' or jsonb_array_length(p_tentatives) > 200 then
    raise exception 'Données invalides';
  end if;

  for t in select value from jsonb_array_elements(p_tentatives) loop
    v_etape   := left(coalesce(t ->> 'etape', ''), 20);
    v_etoiles := least(greatest(coalesce((t ->> 'etoiles')::int, 0), 0), 3);
    v_points  := least(greatest(coalesce((t ->> 'points')::int, 0), 0), 10000);
    continue when v_etape = '' or coalesce(t ->> 'client_id', '') = '';

    insert into public.tentatives
      (client_id, eleve_id, etape, etoiles, points, erreurs, indices, passes, nb_exercices, duree_s, fait_le)
    values (
      left(t ->> 'client_id', 64), p_id, v_etape, v_etoiles, v_points,
      least(greatest(coalesce((t ->> 'erreurs')::int, 0), 0), 999),
      least(greatest(coalesce((t ->> 'indices')::int, 0), 0), 999),
      least(greatest(coalesce((t ->> 'passes')::int, 0), 0), 999),
      least(greatest(coalesce((t ->> 'nb_exercices')::int, 5), 1), 50),
      least(greatest(coalesce((t ->> 'duree_s')::int, 0), 0), 36000),
      least(coalesce((t ->> 'fait_le')::timestamptz, now()), now())
    )
    on conflict (client_id) do nothing;

    if found then
      n := n + 1;
      insert into public.progression (eleve_id, etape, etoiles, points, fois, maj)
      values (p_id, v_etape, v_etoiles, v_points, 1, now())
      on conflict (eleve_id, etape) do update
        set etoiles = greatest(public.progression.etoiles, excluded.etoiles),
            points  = greatest(public.progression.points, excluded.points),
            fois    = public.progression.fois + 1,
            maj     = now();
    end if;
  end loop;

  update public.eleves set vu_le = now() where id = p_id;
  return jsonb_build_object('recues', n, 'devoirs', public.devoirs_json());
end;
$$;

-- Droits d'exécution
-- Classement des élèves (affiché dans l'appli, onglet « Classement »)
--  • Semaine : points gagnés depuis lundi. Une même étape rapporte ses points
--    une seule fois par jour (le meilleur essai), pour éviter de rejouer en boucle
--    une étape facile. Les étapes faites trop vite (moins de 6 s par mot) ne comptent pas.
--  • Général : total des étoiles (meilleur score de chaque étape).
--  Seuls les prénoms et les scores sont renvoyés (top 20 + la place de l'élève).
create or replace function public.classement(p_id uuid, p_debut timestamptz default null)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  -- p_debut = lundi 0 h chez l'élève (envoyé par l'appli), borné par sécurité
  v_debut timestamptz := least(greatest(coalesce(p_debut, date_trunc('week', now())), now() - interval '8 days'), now());
  r jsonb;
begin
  if not exists (select 1 from public.eleves where id = p_id) then
    raise exception 'Élève inconnu';
  end if;

  with par_jour as (
    select t.eleve_id, t.etape, (t.fait_le at time zone 'UTC')::date as jour, max(t.points) as pts
    from public.tentatives t
    where t.fait_le >= v_debut
      and not (t.duree_s > 0 and t.duree_s < t.nb_exercices * 6)
    group by 1, 2, 3
  ),
  semaine as (
    select e.id, e.nom, sum(j.pts)::int as score, 0 as departage
    from par_jour j join public.eleves e on e.id = j.eleve_id
    group by e.id, e.nom
    having sum(j.pts) > 0
  ),
  general as (
    select e.id, e.nom, sum(p.etoiles)::int as score, sum(p.points)::int as departage
    from public.progression p join public.eleves e on e.id = p.eleve_id
    group by e.id, e.nom
    having sum(p.etoiles) > 0
  ),
  sem_rang as (
    select *, rank() over (order by score desc) as rang,
              row_number() over (order by score desc, nom) as ordre
    from semaine
  ),
  gen_rang as (
    select *, rank() over (order by score desc, departage desc) as rang,
              row_number() over (order by score desc, departage desc, nom) as ordre
    from general
  )
  select jsonb_build_object(
    'debut', v_debut,
    'nb_semaine', (select count(*) from semaine),
    'nb_general', (select count(*) from general),
    'semaine', coalesce((select jsonb_agg(jsonb_build_object('rang', rang, 'ordre', ordre, 'nom', nom, 'score', score, 'moi', id = p_id) order by ordre)
                         from sem_rang where ordre <= 20 or id = p_id), '[]'::jsonb),
    'general', coalesce((select jsonb_agg(jsonb_build_object('rang', rang, 'ordre', ordre, 'nom', nom, 'score', score, 'moi', id = p_id) order by ordre)
                         from gen_rang where ordre <= 20 or id = p_id), '[]'::jsonb)
  ) into r;
  return r;
end;
$$;

revoke all on function public.eleve_connexion(text)        from public;
revoke all on function public.eleve_envoyer(uuid, jsonb)   from public;
revoke all on function public.devoirs_json()               from public;
grant execute on function public.eleve_connexion(text)      to anon, authenticated;
grant execute on function public.eleve_envoyer(uuid, jsonb) to anon, authenticated;
grant execute on function public.devoirs_json()             to anon, authenticated;
grant execute on function public.est_prof()                 to authenticated;
revoke all on function public.classement(uuid, timestamptz) from public;
grant execute on function public.classement(uuid, timestamptz) to anon, authenticated;
