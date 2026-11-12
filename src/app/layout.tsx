import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "JUSS CMS — Creative command center",
    template: "%s · JUSS CMS",
  },
  description: "Your self-hosted workspace for brands and creative teams.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
