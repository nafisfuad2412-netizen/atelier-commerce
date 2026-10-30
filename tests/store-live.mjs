// Development project only: creates scoped products/images and cleans up on stdin
// or timeout. Run with --env-file=.env.local and a unique nonce argument.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const nonce = process.argv[2];
assert.ok(nonce, "A unique fixture nonce is required.");
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession:false,autoRefreshToken:false } });
const imagePath = `${randomUUID()}.webp`;
const email = `store-${nonce}@example.invalid`;
let ids = [];
try {
  const image = await client.storage.from("product-images").upload(imagePath, await readFile("public/images/atelier-hero.webp"), {contentType:"image/webp"});
  assert.equal(image.error,null);
  const imageUrl = client.storage.from("product-images").getPublicUrl(imagePath).data.publicUrl;
  const values = [["Stone bowl",1250],["Linen cloth",850],["Amber vessel",1550],["Everyday mug",650],["Studio vase",2200]].map(([title,price],index)=>({title:`QA ${title} ${nonce}`,description:"Temporary storefront verification fixture.",price,image_url:imageUrl,stock_status:index===2?"out_of_stock":"in_stock"}));
  const inserted = await client.from("products").insert(values).select("id,title");
  assert.equal(inserted.error,null); ids=inserted.data.map(product=>product.id);
  const search = await fetch(`http://127.0.0.1:3000/api/products?q=${encodeURIComponent(nonce)}&sort=price_asc`);
  assert.equal(search.status,200);
  const catalog=await search.json();
  assert.equal(catalog.products.length,5);
  assert.deepEqual(catalog.products.map(product=>product.price),[650,850,1250,1550,2200]);
  const stock=await (await fetch(`http://127.0.0.1:3000/api/products?q=${encodeURIComponent(nonce)}&stock=in_stock`)).json();
  assert.equal(stock.products.length,4);
  const bag=await (await fetch(`http://127.0.0.1:3000/api/cart?ids=${ids.slice(0,2).join(",")}`)).json();
  assert.equal(bag.products.length,2);
  assert.equal((await fetch("http://127.0.0.1:3000/api/cart?ids=invalid")).status,400);
  console.log(`STORE_LIVE_PASS: search, sorting, availability and selected-product reads. Browser email: ${email}`);
  console.log("STORE_QA_READY: fixtures held until cleanup input or 15-minute timeout.");
  await new Promise(resolve=>{const timer=setTimeout(resolve,15*60*1000);process.stdin.once("data",()=>{clearTimeout(timer);resolve();});});
  const orders=await client.from("orders").select("id,total_amount,items_ordered").eq("customer_email",email);
  if(orders.data?.length)console.log(JSON.stringify({browserOrders:orders.data.map(order=>({id:order.id,total:order.total_amount,quantity:order.items_ordered[0]?.quantity}))}));
} finally {
  await client.from("orders").delete().eq("customer_email",email);
  if(ids.length)await client.from("products").delete().in("id",ids);
  await client.storage.from("product-images").remove([imagePath]);
  console.log("STORE_QA_CLEANUP_COMPLETE");
}
process.exit(0);
