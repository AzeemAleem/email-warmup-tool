import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pacify Packaging",
  description: "Pacify packaging tools and email warmup dashboard",
  icons: {
    icon: [{ url: "/icon.png", type: "image/png" }],
    apple: [{ url: "/apple-icon.png", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${inter.variable}`} data-theme="dark">
      <body
        className={`${inter.className} min-h-screen bg-gray-950 text-gray-200 antialiased font-sans`}
      >
        {children}
      </body>
    </html>
  );
}
