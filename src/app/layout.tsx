import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BootRise",
  description: "Architecture-aware AI engineering reliability platform."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
