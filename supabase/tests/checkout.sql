-- Runs as postgres; all products, orders and request records roll back.
begin;
select set_config('atelier_test.product_id', gen_random_uuid()::text, true);
select set_config('atelier_test.unavailable_id', gen_random_uuid()::text, true);
select set_config('atelier_test.email', gen_random_uuid()::text || '@example.invalid', true);
insert into public.products (id, title, price, stock_status) values
  (current_setting('atelier_test.product_id')::uuid, 'Checkout fixture', 19.99, 'in_stock'),
  (current_setting('atelier_test.unavailable_id')::uuid, 'Unavailable fixture', 12, 'out_of_stock');

set local role anon;
do $$ begin
  begin
    perform public.place_store_order(gen_random_uuid(), '{}'::jsonb);
    raise exception 'Anonymous checkout RPC was allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role authenticated;
do $$ begin
  begin
    perform public.place_store_order(gen_random_uuid(), '{}'::jsonb);
    raise exception 'Authenticated browser checkout RPC was allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

set local role service_role;
do $$
declare
  payload jsonb;
  invalid jsonb;
  result jsonb;
  repeated jsonb;
  request_id_value uuid := gen_random_uuid();
  order_id_value uuid;
  i integer;
begin
  payload := jsonb_build_object('customer_name', 'Checkout fixture',
    'customer_email', current_setting('atelier_test.email'), 'shipping_address', 'Test address',
    'items', jsonb_build_array(jsonb_build_object('product_id', current_setting('atelier_test.product_id'), 'quantity', 2)));
  result := public.place_store_order(request_id_value, payload);
  order_id_value := (result->>'id')::uuid;
  if result->>'total_amount' <> '39.98' or result->>'status' <> 'pending' then
    raise exception 'Database pricing or initial status failed';
  end if;
  if (select items_ordered->0->>'unit_price' from public.orders where id = order_id_value) <> '19.99' then
    raise exception 'Authoritative item snapshot failed';
  end if;
  repeated := public.place_store_order(request_id_value, payload);
  if repeated <> result then raise exception 'Idempotent retry failed'; end if;
  if (select count(*) from public.orders where customer_email = current_setting('atelier_test.email')) <> 1 then
    raise exception 'Retry created duplicate order';
  end if;
  begin
    perform public.place_store_order(request_id_value, jsonb_set(payload, '{customer_name}', '"Changed"'));
    raise exception 'Idempotency mismatch accepted';
  exception when invalid_parameter_value then
    if sqlerrm <> 'IDEMPOTENCY_CONFLICT' then raise; end if;
  end;
  foreach invalid in array array[
    payload || '{"total_amount":0.01}',
    jsonb_set(payload, '{items,0,quantity}', '0'),
    jsonb_set(payload, '{items,0,quantity}', '1.5'),
    jsonb_set(payload, '{items,0,product_id}', '"invalid"'),
    jsonb_set(payload, '{items}', '[]'),
    jsonb_set(payload, '{items}', (payload->'items') || (payload->'items')),
    jsonb_set(payload, '{customer_name}', '" "')
  ] loop
    begin
      perform public.place_store_order(gen_random_uuid(), invalid);
      raise exception 'Invalid checkout payload accepted';
    exception when invalid_parameter_value then null; end;
  end loop;
  begin
    perform public.place_store_order(gen_random_uuid(), jsonb_set(payload, '{items,0,product_id}', to_jsonb(current_setting('atelier_test.unavailable_id'))));
    raise exception 'Out-of-stock product accepted';
  exception when raise_exception then
    if sqlerrm <> 'PRODUCT_UNAVAILABLE' then raise; end if;
  end;
  begin
    perform public.place_store_order(gen_random_uuid(), jsonb_set(payload, '{items,0,product_id}', to_jsonb(gen_random_uuid()::text)));
    raise exception 'Missing product accepted';
  exception when raise_exception then
    if sqlerrm <> 'PRODUCT_UNAVAILABLE' then raise; end if;
  end;
  for i in 1..4 loop
    perform public.place_store_order(gen_random_uuid(), payload);
  end loop;
  begin
    perform public.place_store_order(gen_random_uuid(), payload);
    raise exception 'Rate limit did not apply';
  exception when raise_exception then
    if sqlerrm <> 'ORDER_RATE_LIMIT' then raise; end if;
  end;
  -- A valid retry still succeeds when the new-order rate limit has been reached.
  if public.place_store_order(request_id_value, payload) <> result then
    raise exception 'Rate limit blocked an idempotent retry';
  end if;
end $$;
reset role;
rollback;
select 'PASS: RPC authorization, database prices, idempotency, invalid input, availability and shared rate limiting; fixtures rolled back' as result;
