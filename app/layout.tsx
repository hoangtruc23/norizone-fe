import type { Metadata } from "next";
import { Montserrat, Playfair_Display } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["vietnamese"],
  variable: "--font-sans",
  weight: ["300", "400", "500"],
});

const playfair = Playfair_Display({
  subsets: ["vietnamese"],
  variable: "--font-serif",
  weight: ["400", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "NORI ZONE - Good Vibes Only.",
  description: "Không gian giải trí cho gen Z.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${montserrat.variable} ${playfair.variable}`}>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}