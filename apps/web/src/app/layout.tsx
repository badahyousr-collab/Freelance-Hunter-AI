import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "pipisso freelance hunter",
  description: "Поиск фриланс-заказов, подбор проектов по навыкам и управление откликами.",
  icons: {
    icon: "/icon.svg?v=4",
    shortcut: "/icon.svg?v=4",
    apple: "/icon.svg?v=4",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
