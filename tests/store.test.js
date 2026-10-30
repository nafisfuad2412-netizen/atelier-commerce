import test from "node:test";
import assert from "node:assert/strict";
import { parseCart, addCartItem, checkoutFingerprint, requestForFingerprint } from "../src/lib/cart.js";
import { formatMoney, toMinorUnits, contrastColor } from "../src/lib/store.js";

const id = "a6dfab81-b282-47dd-b12c-8c98110b5c86";
const second = "b727513a-b9a7-492b-b780-f2b1c6c29701";
test("bag storage rejects malformed, oversized and invalid quantities without trusting prices", () => {
  assert.deepEqual(parseCart("invalid"), []);
  assert.deepEqual(parseCart(JSON.stringify({ productId:id })), []);
  assert.deepEqual(parseCart(JSON.stringify([{ productId:id, quantity:2, price:.01 },{productId:id.toUpperCase(),quantity:3},{productId:second,quantity:100}])), [{productId:id,quantity:2}]);
  assert.deepEqual(parseCart(JSON.stringify(Array.from({length:101},()=>({productId:id,quantity:1})))), []);
});
test("bag additions merge quantities and respect the per-product limit", () => {
  assert.deepEqual(addCartItem([], id), [{productId:id,quantity:1}]);
  assert.deepEqual(addCartItem([{productId:id,quantity:99}], id), [{productId:id,quantity:99}]);
  assert.deepEqual(addCartItem([], "invalid"), []);
});
test("BDT amounts and integer minor units avoid floating point cart arithmetic", () => {
  assert.equal(toMinorUnits("19.99") * 3, 5997);
  assert.equal(toMinorUnits("0.10") + toMinorUnits("0.20"), 30);
  assert.equal(toMinorUnits("9999999999.99"), 999999999999);
  assert.throws(()=>toMinorUnits("1.999"));
  assert.ok(formatMoney("1250.00").includes("৳"));
  assert.equal(contrastColor("#ffffff"), "#17251e");
  assert.equal(contrastColor("#000000"), "#ffffff");
});
test("identical normalized checkout details retain a request ID across retries", async () => {
  const payload = { customerName:" Test ", customerEmail:"TEST@example.com", shippingAddress:" Test address ", items:[{productId:second,quantity:2},{productId:id,quantity:1}] };
  const signature = await checkoutFingerprint(payload);
  const equivalent = await checkoutFingerprint({...payload,customerName:"Test",customerEmail:"test@example.com",shippingAddress:"Test address",items:[...payload.items].reverse()});
  assert.equal(signature,equivalent);
  const first = requestForFingerprint(signature,null);
  assert.equal(requestForFingerprint(equivalent,first).requestId,first.requestId);
  const changed = await checkoutFingerprint({...payload,items:[{productId:id,quantity:3}]});
  assert.notEqual(requestForFingerprint(changed,first).requestId,first.requestId);
  assert.equal(JSON.stringify(first).includes("example.com"),false);
});
