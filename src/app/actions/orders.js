"use server";

import { submitOrder } from "@/lib/checkout/service";

export async function placeOrder(input) {
  return submitOrder(input);
}
