import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CarePrior — Patient Portal",
  description: "AI-assisted intake. Human-led decisions.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU">
      <body className="font-sans antialiased">
        <div className="mx-auto max-w-3xl px-4 py-8 md:px-6">{children}</div>
      </body>
    </html>
  );
}
