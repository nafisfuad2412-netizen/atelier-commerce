import Link from "next/link";
import Checkout from "@/components/store/checkout";

export const metadata = { title: "Your bag", robots: { index: false, follow: false } };

export default function OrderPage() {
  return <div className="store-width store-order-page"><div className="store-breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/products">The collection</Link><span>/</span><span>Your bag</span></div><Checkout/></div>;
}
