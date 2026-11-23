-- Mise à jour d'une base déjà installée : à coller dans Supabase, SQL Editor, puis Run.
-- Peut être relancé sans risque. Ne supprime aucune donnée.
-- (Déjà inclus dans installation.sql pour une nouvelle installation.)

-- 1. Le prof a le droit de supprimer un élève depuis le tableau de bord.
--    Ses sessions, sa progression et ses réponses partent avec lui (on delete cascade).
grant delete on public.eleves to authenticated;
drop policy if exists "prof supprime eleves" on public.eleves;
create policy "prof supprime eleves" on public.eleves for delete to authenticated using (public.est_prof());

-- 2. eleves_absents : permet aux téléphones de retirer les élèves supprimés
--    de la liste « Déjà venus sur ce téléphone ».

create or replace function public.eleves_absents(p_noms text[])
returns text[]
language sql stable security definer set search_path = public
as $$
  select coalesce(array_agg(n), '{}')
  from unnest(coalesce(p_noms, '{}'::text[])) with ordinality as x(n, i)
  where x.i <= 20
    and not exists (
      select 1 from public.eleves e
      where e.cle = translate(lower(btrim(regexp_replace(coalesce(x.n, ''), '\s+', ' ', 'g'))),
                              'àâäáãåçéèêëíìîïñóòôöõúùûüýÿœæ',
                              'aaaaaaceeeeiiiinooooouuuuyyoa'));
$$;

revoke all on function public.eleves_absents(text[]) from public;
grant execute on function public.eleves_absents(text[]) to anon, authenticated;
