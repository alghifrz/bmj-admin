import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: {
    default: "Panel Admin",
    template: "%s | Buana Medika Jaya",
  },
  description: "Panel admin Buana Medika Jaya",
  robots: {
    index: false,
    follow: false,
  },
  icons: {
    icon: "/icon.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${inter.variable} ${poppins.variable} h-full antialiased`}>
      <body className="min-h-full bg-surface font-sans text-ink">{children}</body>
    </html>
  );
}
