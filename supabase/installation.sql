-- Installation de la base Supabase pour Apprend+.
--
-- 1. Remplacer l'adresse e-mail de la table profs par celle du prof.
-- 2. Coller tout le fichier dans Supabase, SQL Editor, puis Run.
-- Le script peut être relancé : il ne supprime aucune donnée.
--
-- Les élèves (clé anon) n'ont aucun accès direct aux tables. Ils passent
-- uniquement par les fonctions eleve_connexion, eleve_envoyer et classement.
-- Seuls les comptes dont l'e-mail est dans la table profs, et confirmé,
-- peuvent lire les résultats et gérer les devoirs.

-- Tables

create table if not exists public.profs (
  email text primary key
);

-- E-mail du prof (le même que le compte créé dans Authentication > Users)
insert into public.profs (email) values ('prof@gmail.com') on conflict do nothing;

create table if not exists public.eleves (
  id      uuid primary key default gen_random_uuid(),
  cle     text not null unique,   -- prénom en minuscules, sans accents
  nom     text not null,
  cree_le timestamptz not null default now(),
  vu_le   timestamptz not null default now()
);

create table if not exists public.progression (
  eleve_id uuid not null references public.eleves(id) on delete cascade,
  etape    text not null,         -- "idNiveau-numéroÉtape", par exemple "3-2"
  etoiles  smallint not null default 0,
  points   int not null default 0,
  fois     int not null default 0,
  maj      timestamptz not null default now(),
  primary key (eleve_id, etape)
);

create table if not exists public.tentatives (
  id           bigint generated always as identity primary key,
  client_id    text not null unique,  -- évite les doublons quand un envoi est répété
  eleve_id     uuid not null references public.eleves(id) on delete cascade,
  etape        text not null,
  etoiles      smallint not null default 0,
  points       int not null default 0,
  erreurs      int not null default 0,
  indices      int not null default 0,
  passes       int not null default 0,
  nb_exercices int not null default 5,
  duree_s      int not null default 0,
  fait_le      timestamptz not null default now(),  -- heure du téléphone
  recu_le      timestamptz not null default now()   -- heure de réception
);
create index if not exists tentatives_eleve_date on public.tentatives (eleve_id, fait_le desc);
create index if not exists tentatives_eleve_recu on public.tentatives (eleve_id, recu_le desc);
create index if not exists eleves_cree_le on public.eleves (cree_le desc);

create table if not exists public.devoirs (
  id          bigint generated always as identity primary key,
  titre       text not null,
  etapes      text[] not null,
  date_limite date not null,
  cree_le     timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'devoirs_titre_court') then
    alter table public.devoirs add constraint devoirs_titre_court
      check (char_length(titre) between 1 and 80);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'devoirs_etapes_valides') then
    alter table public.devoirs add constraint devoirs_etapes_valides
      check (cardinality(etapes) between 1 and 30
             and array_to_string(etapes, ',') ~ '^[0-9]{1,3}-[0-9]{1,2}(,[0-9]{1,3}-[0-9]{1,2})*$');
  end if;
end $$;

-- Droits sur les tables : rien pour anon, le strict nécessaire pour les profs

alter table public.profs       enable row level security;
alter table public.eleves      enable row level security;
alter table public.progression enable row level security;
alter table public.tentatives  enable row level security;
alter table public.devoirs     enable row level security;

revoke all on public.profs, public.eleves, public.progression, public.tentatives, public.devoirs from anon, authenticated;
grant select         on public.profs, public.eleves, public.progression, public.tentatives, public.devoirs to authenticated;
grant delete         on public.eleves to authenticated;
grant insert, delete on public.devoirs to authenticated;

-- Vrai si l'utilisateur connecté est un prof autorisé avec un e-mail confirmé
create or replace function public.est_prof()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from auth.users u
    join public.profs p on lower(p.email) = lower(u.email)
    where u.id = auth.uid()
      and u.email_confirmed_at is not null
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

-- Fonctions appelées par l'application des élèves

-- Devoirs en cours ou terminés depuis moins de 14 jours
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

-- Connexion par prénom : crée l'élève s'il n'existe pas encore
create or replace function public.eleve_connexion(p_nom text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_nom text := btrim(regexp_replace(coalesce(p_nom, ''), '\s+', ' ', 'g'));
  v_cle text;
  v_id  uuid;
begin
  if char_length(v_nom) < 2 or char_length(v_nom) > 30 then
    raise exception 'Prénom invalide';
  end if;
  -- Lettres, espaces, apostrophes, points et tirets uniquement ; pas de symbole en tête
  if v_nom ~ '[0-9<>"&=+@\\/;:{}()\[\]#%$*!?|`~^_,]' or v_nom ~ '^[-''. ]' then
    raise exception 'Prénom invalide';
  end if;
  v_cle := translate(lower(v_nom),
                     'àâäáãåçéèêëíìîïñóòôöõúùûüýÿœæ',
                     'aaaaaaceeeeiiiinooooouuuuyyoa');

  select id into v_id from public.eleves where cle = v_cle;
  if v_id is null then
    -- Limite anti-abus : 300 nouveaux élèves par heure au maximum
    if (select count(*) from public.eleves where cree_le > now() - interval '1 hour') >= 300 then
      raise exception 'Trop d''inscriptions, réessaie plus tard';
    end if;
    insert into public.eleves (cle, nom) values (v_cle, v_nom)
    on conflict (cle) do update set vu_le = now()
    returning id into v_id;
  else
    update public.eleves set vu_le = now() where id = v_id;
  end if;

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

-- Envoi des étapes terminées
create or replace function public.eleve_envoyer(p_id uuid, p_tentatives jsonb)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  t         jsonb;
  v_etape   text;
  v_nb      int;
  v_etoiles int;
  v_points  int;
  v_fait    timestamptz;
  v_err     int;
  v_ind     int;
  v_pas     int;
  v_duree   int;
  n         int := 0;
begin
  if not exists (select 1 from public.eleves where id = p_id) then
    raise exception 'Élève inconnu';
  end if;
  if jsonb_typeof(p_tentatives) <> 'array' or jsonb_array_length(p_tentatives) > 50 then
    raise exception 'Données invalides';
  end if;
  -- Limite anti-abus : 150 étapes reçues par heure et par élève
  if (select count(*) from public.tentatives where eleve_id = p_id and recu_le > now() - interval '1 hour')
     + jsonb_array_length(p_tentatives) > 150 then
    raise exception 'Trop d''envois, réessaie plus tard';
  end if;

  for t in select value from jsonb_array_elements(p_tentatives) loop
    continue when jsonb_typeof(t) <> 'object';
    v_etape := coalesce(t ->> 'etape', '');
    continue when v_etape !~ '^[0-9]{1,3}-[0-9]{1,2}$';
    continue when coalesce(t ->> 'client_id', '') !~ '^[A-Za-z0-9_-]{8,64}$';

    begin
      v_nb      := least(greatest(coalesce((t ->> 'nb_exercices')::int, 5), 1), 10);
      v_etoiles := least(greatest(coalesce((t ->> 'etoiles')::int, 0), 0), 3);
      v_points  := least(greatest(coalesce((t ->> 'points')::int, 0), 0), v_nb * 10);
      v_fait    := least(greatest(coalesce((t ->> 'fait_le')::timestamptz, now()), now() - interval '30 days'), now());
      v_err     := least(greatest(coalesce((t ->> 'erreurs')::int, 0), 0), 999);
      v_ind     := least(greatest(coalesce((t ->> 'indices')::int, 0), 0), 999);
      v_pas     := least(greatest(coalesce((t ->> 'passes')::int, 0), 0), v_nb);
      v_duree   := least(greatest(coalesce((t ->> 'duree_s')::int, 0), 0), 36000);
    exception when others then
      continue;  -- valeur illisible : on ignore cette ligne
    end;

    insert into public.tentatives
      (client_id, eleve_id, etape, etoiles, points, erreurs, indices, passes, nb_exercices, duree_s, fait_le)
    values (t ->> 'client_id', p_id, v_etape, v_etoiles, v_points, v_err, v_ind, v_pas, v_nb, v_duree, v_fait)
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

-- Classement : top 20 de la semaine et général, plus la place de l'élève.
-- Semaine : une étape rapporte ses points une fois par jour au maximum, et les
-- étapes faites en moins de 6 secondes par mot ne comptent pas.
-- Seuls les prénoms et les scores sont renvoyés.
create or replace function public.classement(p_id uuid, p_debut timestamptz default null)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
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
      and t.duree_s >= t.nb_exercices * 6
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

-- Droits d'exécution des fonctions

revoke all on function public.est_prof()                      from public, anon;
revoke all on function public.devoirs_json()                  from public, anon, authenticated;
revoke all on function public.eleve_connexion(text)           from public;
revoke all on function public.eleve_envoyer(uuid, jsonb)      from public;
revoke all on function public.classement(uuid, timestamptz)   from public;

grant execute on function public.est_prof()                    to authenticated;
grant execute on function public.eleve_connexion(text)         to anon, authenticated;
grant execute on function public.eleve_envoyer(uuid, jsonb)    to anon, authenticated;
grant execute on function public.classement(uuid, timestamptz) to anon, authenticated;
