"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SiteFrame({ children }) {
  const pathname = usePathname();
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return children;
  return <>
    <header className="border-b border-black/10">
      <nav aria-label="Main navigation" className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6">
        <Link href="/" className="text-xl font-semibold tracking-tight">Atelier Commerce</Link>
        <div className="flex gap-6 text-sm"><Link href="/products">Products</Link><Link href="/order">Order</Link></div>
      </nav>
    </header>
    <main id="main-content" className="mx-auto max-w-6xl px-6 py-20">{children}</main>
  </>;
}
