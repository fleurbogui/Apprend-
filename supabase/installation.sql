-- Installation de la base Supabase pour Apprend+.
--
-- 1. Remplacer l'adresse e-mail de la table profs par celle du prof.
-- 2. Coller tout le fichier dans Supabase, SQL Editor, puis Run.
-- Le script peut être relancé : il ne supprime aucune donnée.
--
-- Les élèves (clé anon) n'ont aucun accès direct aux tables. Ils se connectent
-- avec leur prénom et un code secret de 4 chiffres (eleve_connexion), puis
-- utilisent un jeton de session pour eleve_session, eleve_envoyer et classement.
-- Seuls les comptes dont l'e-mail est dans la table profs, et confirmé,
-- peuvent lire les résultats et gérer les devoirs.

create extension if not exists pgcrypto with schema extensions;

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

-- Code secret (haché avec bcrypt) et blocage après 5 essais ratés
alter table public.eleves add column if not exists code_hash    text;
alter table public.eleves add column if not exists echecs       int not null default 0;
alter table public.eleves add column if not exists bloque_jusqu timestamptz;
alter table public.eleves add column if not exists code_defini  boolean generated always as (code_hash is not null) stored;

-- Sessions des élèves : seul le haché SHA-256 du jeton est gardé
create table if not exists public.sessions (
  jeton_hash text primary key,
  eleve_id   uuid not null references public.eleves(id) on delete cascade,
  cree_le    timestamptz not null default now(),
  vu_le      timestamptz not null default now()
);
create index if not exists sessions_eleve on public.sessions (eleve_id, cree_le desc);

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
alter table public.sessions    enable row level security;

revoke all on public.profs, public.eleves, public.progression, public.tentatives, public.devoirs, public.sessions
  from anon, authenticated;
grant select on public.profs, public.progression, public.tentatives, public.devoirs to authenticated;
-- Le haché du code n'est jamais lisible, même par les profs
grant select (id, cle, nom, cree_le, vu_le, code_defini, bloque_jusqu) on public.eleves to authenticated;
grant delete on public.eleves to authenticated;
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

-- Fonctions

-- Anciennes versions, sans code secret
drop function if exists public.eleve_connexion(text);
drop function if exists public.eleve_envoyer(uuid, jsonb);
drop function if exists public.classement(uuid, timestamptz);

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

-- Élève correspondant à un jeton de session (null si le jeton est inconnu)
create or replace function public.eleve_par_jeton(p_jeton text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_jeton is null or p_jeton !~ '^[0-9a-f]{64}$' then
    return null;
  end if;
  update public.sessions set vu_le = now()
  where jeton_hash = encode(extensions.digest(p_jeton, 'sha256'), 'hex')
  returning eleve_id into v_id;
  return v_id;
end;
$$;

-- Progression et devoirs d'un élève
create or replace function public.eleve_donnees(p_id uuid)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'nom', (select nom from public.eleves where id = p_id),
    'progression', coalesce((
        select jsonb_object_agg(etape, jsonb_build_object('etoiles', etoiles, 'points', points, 'fois', fois))
        from public.progression where eleve_id = p_id), '{}'::jsonb),
    'devoirs', public.devoirs_json()
  );
$$;

-- Connexion avec le prénom et le code secret.
-- Premier passage : l'élève est créé avec ce code. Si le prof a remis le code
-- à zéro, le prochain code saisi devient le nouveau code.
-- Les erreurs sont renvoyées dans la réponse au lieu d'être levées, pour que
-- le compteur d'essais ratés soit bien enregistré.
create or replace function public.eleve_connexion(p_nom text, p_code text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_nom     text := btrim(regexp_replace(coalesce(p_nom, ''), '\s+', ' ', 'g'));
  v_cle     text;
  v_eleve   public.eleves%rowtype;
  v_jeton   text;
  v_nouveau boolean := false;
begin
  if char_length(v_nom) < 2 or char_length(v_nom) > 30
     or v_nom ~ '[0-9<>"&=+@\\/;:{}()\[\]#%$*!?|`~^_,]' or v_nom ~ '^[-''. ]' then
    return jsonb_build_object('erreur', 'nom');
  end if;
  if coalesce(p_code, '') !~ '^[0-9]{4}$' then
    return jsonb_build_object('erreur', 'format');
  end if;
  v_cle := translate(lower(v_nom),
                     'àâäáãåçéèêëíìîïñóòôöõúùûüýÿœæ',
                     'aaaaaaceeeeiiiinooooouuuuyyoa');

  select * into v_eleve from public.eleves where cle = v_cle for update;

  if not found or v_eleve.code_hash is null then
    -- Nouveau code : on refuse les codes trop faciles à deviner
    if p_code in ('0000','1111','2222','3333','4444','5555','6666','7777','8888','9999','1234','4321','0123','9876') then
      return jsonb_build_object('erreur', 'facile');
    end if;
    if v_eleve.id is null then
      if (select count(*) from public.eleves where cree_le > now() - interval '1 hour') >= 300 then
        return jsonb_build_object('erreur', 'trop');
      end if;
      insert into public.eleves (cle, nom, code_hash)
      values (v_cle, v_nom, extensions.crypt(p_code, extensions.gen_salt('bf', 8)))
      returning * into v_eleve;
      v_nouveau := true;
    else
      update public.eleves
      set code_hash = extensions.crypt(p_code, extensions.gen_salt('bf', 8)), echecs = 0, bloque_jusqu = null
      where id = v_eleve.id;
    end if;
  else
    if v_eleve.bloque_jusqu is not null and v_eleve.bloque_jusqu > now() then
      return jsonb_build_object('erreur', 'bloque',
        'minutes', ceil(extract(epoch from v_eleve.bloque_jusqu - now()) / 60));
    end if;
    if extensions.crypt(p_code, v_eleve.code_hash) <> v_eleve.code_hash then
      if v_eleve.echecs + 1 >= 5 then
        update public.eleves set echecs = 0, bloque_jusqu = now() + interval '15 minutes' where id = v_eleve.id;
        return jsonb_build_object('erreur', 'bloque', 'minutes', 15);
      end if;
      update public.eleves set echecs = v_eleve.echecs + 1 where id = v_eleve.id;
      return jsonb_build_object('erreur', 'code', 'restants', 4 - v_eleve.echecs);
    end if;
    update public.eleves set echecs = 0, bloque_jusqu = null where id = v_eleve.id;
  end if;

  -- Nouvelle session ; on garde au plus 5 sessions par élève
  v_jeton := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.sessions (jeton_hash, eleve_id)
  values (encode(extensions.digest(v_jeton, 'sha256'), 'hex'), v_eleve.id);
  delete from public.sessions
  where eleve_id = v_eleve.id
    and jeton_hash not in (
      select jeton_hash from public.sessions where eleve_id = v_eleve.id order by cree_le desc limit 5);
  update public.eleves set vu_le = now() where id = v_eleve.id;

  return public.eleve_donnees(v_eleve.id)
         || jsonb_build_object('jeton', v_jeton, 'nouveau', v_nouveau);
end;
$$;

-- Synchronisation d'un élève déjà connecté
create or replace function public.eleve_session(p_jeton text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_id uuid := public.eleve_par_jeton(p_jeton);
begin
  if v_id is null then
    return jsonb_build_object('erreur', 'session');
  end if;
  update public.eleves set vu_le = now() where id = v_id;
  return public.eleve_donnees(v_id);
end;
$$;

-- Envoi des étapes terminées
create or replace function public.eleve_envoyer(p_jeton text, p_tentatives jsonb)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_id      uuid := public.eleve_par_jeton(p_jeton);
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
  if v_id is null then
    return jsonb_build_object('erreur', 'session');
  end if;
  if jsonb_typeof(p_tentatives) <> 'array' or jsonb_array_length(p_tentatives) > 50 then
    raise exception 'Données invalides';
  end if;
  -- Limite anti-abus : 150 étapes reçues par heure et par élève
  if (select count(*) from public.tentatives where eleve_id = v_id and recu_le > now() - interval '1 hour')
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
    values (t ->> 'client_id', v_id, v_etape, v_etoiles, v_points, v_err, v_ind, v_pas, v_nb, v_duree, v_fait)
    on conflict (client_id) do nothing;

    if found then
      n := n + 1;
      insert into public.progression (eleve_id, etape, etoiles, points, fois, maj)
      values (v_id, v_etape, v_etoiles, v_points, 1, now())
      on conflict (eleve_id, etape) do update
        set etoiles = greatest(public.progression.etoiles, excluded.etoiles),
            points  = greatest(public.progression.points, excluded.points),
            fois    = public.progression.fois + 1,
            maj     = now();
    end if;
  end loop;

  update public.eleves set vu_le = now() where id = v_id;
  return jsonb_build_object('recues', n, 'devoirs', public.devoirs_json());
end;
$$;

-- Classement : top 20 de la semaine et général, plus la place de l'élève.
-- Semaine : une étape rapporte ses points une fois par jour au maximum, et les
-- étapes faites en moins de 6 secondes par mot ne comptent pas.
-- Seuls les prénoms et les scores sont renvoyés.
create or replace function public.classement(p_jeton text, p_debut timestamptz default null)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_id    uuid := public.eleve_par_jeton(p_jeton);
  v_debut timestamptz := least(greatest(coalesce(p_debut, date_trunc('week', now())), now() - interval '8 days'), now());
  r jsonb;
begin
  if v_id is null then
    return jsonb_build_object('erreur', 'session');
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
    'semaine', coalesce((select jsonb_agg(jsonb_build_object('rang', rang, 'ordre', ordre, 'nom', nom, 'score', score, 'moi', id = v_id) order by ordre)
                         from sem_rang where ordre <= 20 or id = v_id), '[]'::jsonb),
    'general', coalesce((select jsonb_agg(jsonb_build_object('rang', rang, 'ordre', ordre, 'nom', nom, 'score', score, 'moi', id = v_id) order by ordre)
                         from gen_rang where ordre <= 20 or id = v_id), '[]'::jsonb)
  ) into r;
  return r;
end;
$$;

-- Remise à zéro du code d'un élève par un prof (déconnecte aussi ses téléphones)
create or replace function public.prof_reinitialiser_code(p_eleve uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.est_prof() then
    raise exception 'Réservé aux profs';
  end if;
  update public.eleves set code_hash = null, echecs = 0, bloque_jusqu = null where id = p_eleve;
  delete from public.sessions where eleve_id = p_eleve;
end;
$$;

-- Droits d'exécution des fonctions

revoke all on function public.est_prof()                      from public, anon;
revoke all on function public.devoirs_json()                  from public, anon, authenticated;
revoke all on function public.eleve_par_jeton(text)           from public, anon, authenticated;
revoke all on function public.eleve_donnees(uuid)             from public, anon, authenticated;
revoke all on function public.eleve_connexion(text, text)     from public;
revoke all on function public.eleve_session(text)             from public;
revoke all on function public.eleve_envoyer(text, jsonb)      from public;
revoke all on function public.classement(text, timestamptz)   from public;
revoke all on function public.prof_reinitialiser_code(uuid)   from public, anon;

grant execute on function public.est_prof()                    to authenticated;
grant execute on function public.eleve_connexion(text, text)   to anon, authenticated;
grant execute on function public.eleve_session(text)           to anon, authenticated;
grant execute on function public.eleve_envoyer(text, jsonb)    to anon, authenticated;
grant execute on function public.classement(text, timestamptz) to anon, authenticated;
grant execute on function public.prof_reinitialiser_code(uuid) to authenticated;
