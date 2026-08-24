import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Guard SaaS | Security Guard Management",
  description: "Manage societies, manpower, billing and attendance in real time.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
