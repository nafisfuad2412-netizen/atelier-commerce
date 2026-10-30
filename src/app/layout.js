import Link from "next/link";
import "./globals.css";

export const metadata = {
  title: { default: "Atelier Commerce", template: "%s | Atelier Commerce" },
  description: "Atelier Commerce storefront and administration.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:bg-white focus:p-4">
          Skip to content
        </a>
        <header className="border-b border-black/10">
          <nav aria-label="Main navigation" className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6">
            <Link href="/" className="text-xl font-semibold tracking-tight">Atelier Commerce</Link>
            <div className="flex gap-6 text-sm">
              <Link href="/products">Products</Link>
              <Link href="/order">Order</Link>
            </div>
          </nav>
        </header>
        <main id="main-content" className="mx-auto max-w-6xl px-6 py-20">{children}</main>
      </body>
    </html>
  );
}
