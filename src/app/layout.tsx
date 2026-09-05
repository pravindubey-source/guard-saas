import type { Metadata } from "next";
import "./globals.css";
import { COMPANY } from "@/lib/company";

export const metadata: Metadata = {
  title: `${COMPANY.name} | Security Guard Management`,
  description: "Manage societies, manpower, billing and attendance in real time.",
  icons: { icon: COMPANY.logoPath },
};

const THEME_INIT_SCRIPT = `
(function () {
  try {
    var theme = localStorage.getItem("theme");
    if (theme === "dark") document.documentElement.classList.add("dark");
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
