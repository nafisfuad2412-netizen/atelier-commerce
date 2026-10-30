-- Run as postgres in the dedicated Atelier Commerce project.
-- Fixture accounts, orders, configuration and products all roll back.
begin;
select set_config('atelier_test.admin_id', gen_random_uuid()::text, true);
select set_config('atelier_test.other_id', gen_random_uuid()::text, true);
select set_config('atelier_test.admin_email', email, true) from atelier_private.admin_access;
insert into auth.users (id, email, email_confirmed_at, aud, role, is_anonymous)
values
  (current_setting('atelier_test.admin_id')::uuid, current_setting('atelier_test.admin_email'), null, 'authenticated', 'authenticated', false),
  (current_setting('atelier_test.other_id')::uuid, 'rls-test@example.invalid', now(), 'authenticated', 'authenticated', false);
insert into public.products (title, price) values ('RLS fixture', 25);
insert into public.orders (customer_name, customer_email, shipping_address, items_ordered, total_amount)
values ('RLS fixture', 'rls-test@example.invalid', 'Test address', '[{"title":"RLS fixture","quantity":1,"unit_price":25}]', 25);

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$
begin
  if (select count(*) from public.products where title = 'RLS fixture') <> 1 then raise exception 'Public product read failed'; end if;
  if (select count(*) from public.theme_settings) <> 1 then raise exception 'Public theme read failed'; end if;
  begin
    perform 1 from public.orders;
    raise exception 'Anonymous order read was allowed';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.products (title, price) values ('Forbidden', 1);
    raise exception 'Anonymous product write was allowed';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.orders (customer_name, customer_email, shipping_address, items_ordered, total_amount)
    values ('Forbidden', 'x@example.invalid', 'Test address', '[{}]', 1);
    raise exception 'Anonymous direct order insert was allowed';
  exception when insufficient_privilege then null; end;
end $$;

reset role;
select set_config('request.jwt.claims', jsonb_build_object(
  'role', 'authenticated', 'sub', current_setting('atelier_test.other_id'),
  'email', current_setting('atelier_test.admin_email'),
  'user_metadata', jsonb_build_object('role', 'admin')
)::text, true);
set local role authenticated;
do $$
declare affected integer;
begin
  if atelier_private.is_admin() then raise exception 'Spoofed email/metadata authorized non-admin'; end if;
  if exists (select 1 from public.orders) then raise exception 'Non-admin read orders'; end if;
  update public.products set price = 1 where title = 'RLS fixture';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Non-admin changed product'; end if;
  delete from public.products where title = 'RLS fixture';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Non-admin deleted product'; end if;
  update public.theme_settings set primary_color = '#000000';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Non-admin changed theme'; end if;
  update public.orders set status = 'completed';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Non-admin changed order'; end if;
  begin
    insert into public.products (title, price) values ('Forbidden', 1);
    raise exception 'Non-admin product insert allowed';
  exception when insufficient_privilege then null; end;
  begin
    insert into atelier_private.admin_access (id, email) values (true, 'attacker@example.invalid');
    raise exception 'Non-admin changed allowlist';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.orders (customer_name, customer_email, shipping_address, items_ordered, total_amount)
    values ('Forbidden', 'x@example.invalid', 'Test address', '[{}]', 1);
    raise exception 'Authenticated direct order insert allowed';
  exception when insufficient_privilege then null; end;
end $$;

do $$
declare p record; target_bucket text; predicate text; allowed boolean; expected boolean;
begin
  for p in select policyname, qual, with_check from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname like 'atelier_images_admin_%'
  loop
    foreach target_bucket in array array['product-images', 'another-bucket'] loop
      expected := atelier_private.is_admin() and target_bucket = 'product-images';
      foreach predicate in array array[p.qual, p.with_check] loop
        if predicate is not null then
          execute format('select %s from (select %L::text as bucket_id) as object_row', predicate, target_bucket) into allowed;
          if allowed is distinct from expected then
            raise exception 'Storage predicate failed: %, bucket %', p.policyname, target_bucket;
          end if;
        end if;
      end loop;
    end loop;
  end loop;
end $$;

reset role;
select set_config('request.jwt.claims', jsonb_build_object(
  'role', 'authenticated', 'sub', current_setting('atelier_test.admin_id')
)::text, true);
set local role authenticated;
do $$ begin
  if atelier_private.is_admin() then raise exception 'Unverified email authorized admin'; end if;
end $$;

reset role;
update auth.users set email_confirmed_at = now() where id = current_setting('atelier_test.admin_id')::uuid;
set local role authenticated;
do $$
declare product_id uuid; affected integer;
begin
  if not atelier_private.is_admin() then raise exception 'Verified admin denied'; end if;
  insert into public.products (title, price) values ('Admin fixture', 10) returning id into product_id;
  update public.products set price = 15 where id = product_id;
  if (select price from public.products where id = product_id) <> 15 then raise exception 'Admin product update failed'; end if;
  delete from public.products where id = product_id;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'Admin product delete failed'; end if;
  update public.theme_settings set primary_color = '#112233';
  if (select primary_color from public.theme_settings) <> '#112233' then raise exception 'Admin theme update failed'; end if;
  if (select count(*) from public.orders where customer_name = 'RLS fixture') <> 1 then raise exception 'Admin order read failed'; end if;
  update public.orders set status = 'processing' where customer_name = 'RLS fixture';
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'Admin order status update failed'; end if;
  begin
    update public.orders set total_amount = 0;
    raise exception 'Admin could rewrite checkout totals';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.products (title, price) values ('Invalid', -1);
    raise exception 'Negative price accepted';
  exception when check_violation then null; end;
end $$;
do $$
declare p record; target_bucket text; predicate text; allowed boolean; expected boolean;
begin
  for p in select policyname, qual, with_check from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname like 'atelier_images_admin_%'
  loop
    foreach target_bucket in array array['product-images', 'another-bucket'] loop
      expected := atelier_private.is_admin() and target_bucket = 'product-images';
      foreach predicate in array array[p.qual, p.with_check] loop
        if predicate is not null then
          execute format('select %s from (select %L::text as bucket_id) as object_row', predicate, target_bucket) into allowed;
          if allowed is distinct from expected then
            raise exception 'Storage predicate failed: %, bucket %', p.policyname, target_bucket;
          end if;
        end if;
      end loop;
    end loop;
  end loop;
end $$;

reset role;
set local role service_role;
insert into public.orders (customer_name, customer_email, shipping_address, items_ordered, total_amount)
values ('Server fixture', 'server@example.invalid', 'Test address', '[{"quantity":1,"unit_price":25}]', 25);
reset role;

-- SQL predicates are verified; real upload/download integration is tested in Step 4.
select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'product-images';
rollback;
select 'PASS: anonymous, non-admin, unverified admin, verified admin, server access checks, and bucket-scoped storage predicates; all fixtures rolled back' as result;

