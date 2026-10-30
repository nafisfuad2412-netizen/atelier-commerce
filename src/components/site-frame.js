"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { MotionConfig } from "framer-motion";
import { useCart } from "./store/cart-provider";
import { STORE_FONTS, contrastColor } from "@/lib/store";

export default function SiteFrame({ children, theme }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { count, ready, message } = useCart();
  const style = { "--store-primary": theme.primary_color, "--store-paper": theme.secondary_color, "--store-on-primary": contrastColor(theme.primary_color), "--store-ink": contrastColor(theme.secondary_color), "--store-font": STORE_FONTS[theme.font_family] };
  return <MotionConfig reducedMotion="user"><div className="storefront" style={style}>
    <div className="store-announcement">A little less ordinary. A little more you. <span>Thoughtfully chosen, for everyday living.</span></div>
    <header className="store-header"><nav aria-label="Main navigation" className="store-nav store-width">
      <Link href="/" className="store-logo" aria-label="Atelier home">atelier<span aria-hidden="true">✳</span><small>OBJECTS & EVERYDAY LIVING</small></Link>
      <div className="store-desktop-nav"><Link href="/" aria-current={pathname === "/" ? "page" : undefined}>Home</Link><Link href="/products" aria-current={pathname === "/products" ? "page" : undefined}>The collection</Link><Link href="/#our-approach">Our approach</Link></div>
      <div className="store-nav-actions"><Link href="/products" aria-label="Search the collection" className="store-icon-button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="10" cy="10" r="6.5"/><path d="m15 15 5 5"/></svg></Link><Link href="/order" className="store-bag" aria-label={`Shopping bag, ${ready ? count : 0} items`}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 7h16l1 14H3L4 7Z M8 8V6a4 4 0 0 1 8 0v2"/></svg><span>Bag <b>{ready ? count : 0}</b></span></Link><button aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} aria-controls="store-mobile-menu" className="store-menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? "×" : "☰"}</button></div>
    </nav>{menuOpen && <nav id="store-mobile-menu" aria-label="Mobile navigation" className="store-mobile-nav"><Link href="/" onClick={() => setMenuOpen(false)}>Home</Link><Link href="/products" onClick={() => setMenuOpen(false)}>The collection</Link><Link href="/#our-approach" onClick={() => setMenuOpen(false)}>Our approach</Link></nav>}</header>
    <main id="main-content">{children}</main>
    <footer className="store-footer"><div className="store-width store-footer-main"><div><Link href="/" className="store-footer-logo">atelier<span aria-hidden="true">✳</span></Link><p>Good things. Thoughtfully chosen.<br/>A considered way to make the everyday yours.</p></div><nav aria-label="Footer navigation"><p>EXPLORE</p><Link href="/products">The collection</Link><Link href="/order">Your bag</Link><Link href="/#our-approach">Our approach</Link></nav><div className="store-footer-note"><span aria-hidden="true">✳</span><p>For the objects you keep.<br/>And the moments in between.</p></div></div><div className="store-width store-footer-bottom"><span>© {new Date().getFullYear()} Atelier Commerce</span><span>All prices in Bangladeshi taka (BDT).</span><Link href="/admin">Store administration ↗</Link></div></footer>
    {message && <div role="status" className="store-toast">{message}</div>}
  </div></MotionConfig>;
}
