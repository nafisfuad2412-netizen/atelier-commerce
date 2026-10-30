-- Step 3: service-only, transactional checkout.
create table atelier_private.order_requests (
  request_id uuid primary key,
  request_hash text not null check (length(request_hash) = 64),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table atelier_private.order_requests enable row level security;
revoke all on atelier_private.order_requests from public, anon, authenticated;
grant usage on schema atelier_private to service_role;
grant select, insert on atelier_private.order_requests to service_role;
create policy order_requests_service_only on atelier_private.order_requests
  for all to service_role using (true) with check (true);
create index orders_email_created_at_idx on public.orders (lower(customer_email), created_at desc);

-- SECURITY INVOKER: only the trusted backend's service_role may execute.
-- No public RLS bypass or direct visitor insert privilege is introduced.
create function public.place_store_order(p_request_id uuid, p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path = ''
as $$
declare
  customer_name_value text;
  customer_email_value text;
  address_value text;
  item jsonb;
  product public.products%rowtype;
  product_id_value uuid;
  quantity_value integer;
  normalized jsonb;
  payload_hash text;
  prior atelier_private.order_requests%rowtype;
  snapshots jsonb := '[]'::jsonb;
  total_minor bigint := 0;
  new_order_id uuid;
begin
  if p_request_id is null or jsonb_typeof(p_payload) is distinct from 'object' then
    raise exception using errcode = '22023', message = 'INVALID_ORDER';
  end if;
  if (p_payload - array['customer_name','customer_email','shipping_address','items']) <> '{}'::jsonb
    or jsonb_typeof(p_payload->'customer_name') is distinct from 'string'
    or jsonb_typeof(p_payload->'customer_email') is distinct from 'string'
    or jsonb_typeof(p_payload->'shipping_address') is distinct from 'string'
    or jsonb_typeof(p_payload->'items') is distinct from 'array'
  then raise exception using errcode = '22023', message = 'INVALID_ORDER'; end if;
  customer_name_value := btrim(p_payload->>'customer_name');
  customer_email_value := lower(btrim(p_payload->>'customer_email'));
  address_value := btrim(p_payload->>'shipping_address');
  if length(customer_name_value) not between 1 and 200
    or length(customer_email_value) > 320
    or customer_email_value !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
    or length(address_value) not between 5 and 2000
    or jsonb_array_length(p_payload->'items') not between 1 and 100
  then raise exception using errcode = '22023', message = 'INVALID_ORDER'; end if;

  for item in select value from jsonb_array_elements(p_payload->'items') loop
    if jsonb_typeof(item) is distinct from 'object' then
      raise exception using errcode = '22023', message = 'INVALID_ORDER';
    end if;
    if (item - array['product_id','quantity']) <> '{}'::jsonb
      or jsonb_typeof(item->'product_id') is distinct from 'string'
      or (item->>'product_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or jsonb_typeof(item->'quantity') is distinct from 'number'
      or (item->>'quantity') !~ '^[0-9]{1,2}$'
    then raise exception using errcode = '22023', message = 'INVALID_ORDER'; end if;
    if (item->>'quantity')::integer not between 1 and 99 then
      raise exception using errcode = '22023', message = 'INVALID_ORDER';
    end if;
  end loop;
  if (select count(distinct (value->>'product_id')::uuid) from jsonb_array_elements(p_payload->'items'))
    <> jsonb_array_length(p_payload->'items')
  then raise exception using errcode = '22023', message = 'DUPLICATE_PRODUCT'; end if;

  normalized := jsonb_build_object(
    'customer_name', customer_name_value, 'customer_email', customer_email_value,
    'shipping_address', address_value, 'items', (
      select jsonb_agg(jsonb_build_object('product_id', (value->>'product_id')::uuid,
        'quantity', (value->>'quantity')::integer) order by (value->>'product_id')::uuid)
      from jsonb_array_elements(p_payload->'items')
    )
  );
  payload_hash := encode(sha256(convert_to(normalized::text, 'UTF8')), 'hex');
  -- Concurrent retries serialize before reading the idempotency record.
  perform pg_advisory_xact_lock(hashtextextended('atelier-request:' || p_request_id::text, 0));
  select * into prior from atelier_private.order_requests where request_id = p_request_id;
  if found then
    if prior.request_hash <> payload_hash then
      raise exception using errcode = '22023', message = 'IDEMPOTENCY_CONFLICT';
    end if;
    return (select jsonb_build_object('id', id, 'total_amount', total_amount::text,
      'status', status, 'created_at', created_at) from public.orders where id = prior.order_id);
  end if;

  -- Shared database limit (not a process-local counter).
  perform pg_advisory_xact_lock(hashtextextended('atelier-email:' || customer_email_value, 0));
  if (select count(*) from public.orders
    where lower(customer_email) = customer_email_value and created_at > now() - interval '1 hour') >= 5
  then raise exception using errcode = 'P0001', message = 'ORDER_RATE_LIMIT'; end if;

  -- Lock in deterministic order; prices/availability cannot change mid-checkout.
  for item in select value from jsonb_array_elements(normalized->'items') loop
    product_id_value := (item->>'product_id')::uuid;
    quantity_value := (item->>'quantity')::integer;
    select * into product from public.products where id = product_id_value for share;
    if not found then raise exception using errcode = 'P0001', message = 'PRODUCT_UNAVAILABLE'; end if;
    if product.stock_status <> 'in_stock' then
      raise exception using errcode = 'P0001', message = 'PRODUCT_UNAVAILABLE';
    end if;
    total_minor := total_minor + (product.price * 100)::bigint * quantity_value;
    if total_minor > 999999999999 then
      raise exception using errcode = '22023', message = 'ORDER_TOTAL_TOO_LARGE';
    end if;
    snapshots := snapshots || jsonb_build_array(jsonb_build_object(
      'product_id', product.id, 'title', product.title,
      'quantity', quantity_value, 'unit_price', product.price::text
    ));
  end loop;

  insert into public.orders (customer_name, customer_email, shipping_address, items_ordered, total_amount)
  values (customer_name_value, customer_email_value, address_value, snapshots, total_minor::numeric / 100)
  returning id into new_order_id;
  insert into atelier_private.order_requests (request_id, request_hash, order_id)
  values (p_request_id, payload_hash, new_order_id);
  return (select jsonb_build_object('id', id, 'total_amount', total_amount::text,
    'status', status, 'created_at', created_at) from public.orders where id = new_order_id);
end;
$$;
revoke all on function public.place_store_order(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.place_store_order(uuid, jsonb) to service_role;

