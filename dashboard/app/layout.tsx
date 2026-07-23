import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Self-hosted (rather than next/font/google) so `npm run build` doesn't
// depend on reaching fonts.googleapis.com at build time — same families,
// same CSS variables, no visual change.
const inter = localFont({
  src: "./fonts/Inter-Variable.ttf",
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = localFont({
  src: "./fonts/JetBrainsMono-Variable.ttf",
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VertexOS — Business Lead Intelligence",
  description: "Score, sort, and triage business leads at a glance.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${jetbrainsMono.variable} min-h-screen bg-vx-bg font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
