import SiteFrame from "@/components/site-frame";
import { CartProvider } from "@/components/store/cart-provider";
import { getStoreTheme } from "@/lib/theme";
import "./store.css";

export const dynamic = "force-dynamic";

export default async function StoreLayout({ children }) {
  const theme = await getStoreTheme();
  return <CartProvider><SiteFrame theme={theme}>{children}</SiteFrame></CartProvider>;
}
