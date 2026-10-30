-- A safe session authorization probe; no admin email or data is returned.
create function public.is_store_admin()
returns boolean language sql stable security invoker set search_path = ''
as $$ select atelier_private.is_admin(); $$;
revoke all on function public.is_store_admin() from public, anon, authenticated, service_role;
grant execute on function public.is_store_admin() to authenticated;

