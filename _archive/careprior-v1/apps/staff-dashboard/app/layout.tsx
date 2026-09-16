import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CarePrior — Staff Dashboard",
  description: "AI-assisted intake. Human-led decisions.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
