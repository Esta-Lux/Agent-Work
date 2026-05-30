import type { Metadata } from "next";
import "./globals.css";

const fallbackFontVariables = {
  "--font-inter": "ui-sans-serif, system-ui, sans-serif",
  "--font-geist-mono": "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace",
  "--font-instrument-serif": "Georgia, Cambria, Times New Roman, Times, serif"
} as React.CSSProperties;

export const metadata: Metadata = {
  title: "BootRise",
  description: "Architecture-aware AI engineering reliability platform."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="font-sans" style={fallbackFontVariables}>
        {children}
      </body>
    </html>
  );
}
