import SiteFrame from "@/components/site-frame";
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
        <SiteFrame>{children}</SiteFrame>
      </body>
    </html>
  );
}
