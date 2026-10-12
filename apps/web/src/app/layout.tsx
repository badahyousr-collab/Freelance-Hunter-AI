import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pipisso — Freelance Hunter",
  description: "Freelance Hunter is a project-discovery and proposal-management system within the Pipisso ecosystem.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
