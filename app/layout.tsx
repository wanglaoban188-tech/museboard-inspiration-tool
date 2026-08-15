import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Museboard 灵感搜集器",
  description: "面向电商设计的以图搜图与灵感库"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
