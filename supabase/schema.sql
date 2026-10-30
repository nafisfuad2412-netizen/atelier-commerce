-- Atelier Commerce: run once in an empty Supabase project as postgres.
-- Admin email configuration is applied separately and never committed.
create schema atelier_private;
revoke all on schema atelier_private from public, anon, authenticated;
grant usage on schema atelier_private to authenticated;

create table atelier_private.admin_access (
  id boolean primary key default true check (id),
  email text not null check (email = lower(btrim(email)) and length(email) between 3 and 320)
);
alter table atelier_private.admin_access enable row level security;
revoke all on atelier_private.admin_access from public, anon, authenticated, service_role;

-- Intentional definer: reads the private allowlist and authoritative Auth record.
-- It returns only a boolean for the current authenticated caller.
create function atelier_private.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1 from auth.users u
    join atelier_private.admin_access a on a.id and a.email = lower(u.email)
    where u.id = (select auth.uid())
      and u.email_confirmed_at is not null
      and coalesce(u.is_anonymous, false) = false
      and u.deleted_at is null
      and (u.banned_until is null or u.banned_until <= now())
  );
$$;
revoke all on function atelier_private.is_admin() from public, anon, authenticated, service_role;
grant execute on function atelier_private.is_admin() to authenticated;

create table public.products (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) between 1 and 200),
  description text not null default '' check (length(description) <= 10000),
  price numeric(12,2) not null check (price >= 0 and price <= 9999999999.99),
  image_url text check (image_url is null or (length(image_url) <= 2048 and image_url ~ '^https://')),
  stock_status text not null default 'in_stock' check (stock_status in ('in_stock', 'out_of_stock')),
  created_at timestamptz not null default now()
);
create index products_created_at_idx on public.products (created_at desc, id);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null check (length(btrim(customer_name)) between 1 and 200),
  customer_email text not null check (length(customer_email) <= 320 and customer_email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'),
  shipping_address text not null check (length(btrim(shipping_address)) between 5 and 2000),
  items_ordered jsonb not null check (
    case when jsonb_typeof(items_ordered) = 'array'
      then jsonb_array_length(items_ordered) between 1 and 100 else false end
  ),
  total_amount numeric(12,2) not null check (total_amount >= 0 and total_amount <= 9999999999.99),
  status text not null default 'pending' check (status in ('pending', 'processing', 'shipped', 'completed', 'cancelled')),
  created_at timestamptz not null default now()
);
create index orders_created_at_idx on public.orders (created_at desc, id);
create index orders_status_created_at_idx on public.orders (status, created_at desc);

-- A singleton row keeps theme management consistent across the storefront.
create table public.theme_settings (
  id smallint primary key default 1 check (id = 1),
  primary_color text not null default '#234D38' check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  secondary_color text not null default '#FAF8F4' check (secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
  font_family text not null default 'sans' check (font_family in ('sans', 'serif', 'mono'))
);
insert into public.theme_settings (id) values (1);

alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.theme_settings enable row level security;
revoke all on public.products, public.orders, public.theme_settings from public, anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
grant select on public.products, public.theme_settings to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant update on public.theme_settings to authenticated;
grant select on public.orders to authenticated;
grant update (status) on public.orders to authenticated;
grant select, insert, update, delete on public.products, public.orders, public.theme_settings to service_role;

create policy products_public_read on public.products for select to anon, authenticated using (true);
create policy products_admin_insert on public.products for insert to authenticated
  with check ((select atelier_private.is_admin()));
create policy products_admin_update on public.products for update to authenticated
  using ((select atelier_private.is_admin())) with check ((select atelier_private.is_admin()));
create policy products_admin_delete on public.products for delete to authenticated
  using ((select atelier_private.is_admin()));
create policy theme_public_read on public.theme_settings for select to anon, authenticated using (true);
create policy theme_admin_update on public.theme_settings for update to authenticated
  using ((select atelier_private.is_admin())) with check ((select atelier_private.is_admin()));
create policy orders_admin_read on public.orders for select to authenticated
  using ((select atelier_private.is_admin()));
create policy orders_admin_update_status on public.orders for update to authenticated
  using ((select atelier_private.is_admin())) with check ((select atelier_private.is_admin()));

-- No anon/authenticated INSERT grant or policy for orders.
-- Step 3 will validate checkout input and calculate totals server-side.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

-- Public image delivery uses the bucket's public URL. Listing is admin-only.
create policy atelier_images_admin_select on storage.objects for select to authenticated
  using (bucket_id = 'product-images' and (select atelier_private.is_admin()));
create policy atelier_images_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and (select atelier_private.is_admin()));
create policy atelier_images_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and (select atelier_private.is_admin()))
  with check (bucket_id = 'product-images' and (select atelier_private.is_admin()));
create policy atelier_images_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and (select atelier_private.is_admin()));

