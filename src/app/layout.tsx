import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "hycut — Create short films with AI",
    template: "%s • hycut",
  },
  description:
    "Transform your ideas into cinematic short films. Describe your vision and let hycut bring it to life.",
  keywords: [
    "hycut",
    "AI",
    "short films",
    "video",
    "generator",
    "cinematic",
  ],
  authors: [{ name: "hycut" }],
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  icons: {
    icon: [
      { url: "/hycutwnobg.png", type: "image/png", sizes: "16x16" },
      { url: "/hycutwnobg.png", type: "image/png", sizes: "32x32" },
    ],
    apple: [{ url: "/hycutwnobg.png" }],
    shortcut: ["/hycutwnobg.png"],
  },
  openGraph: {
    title: "hycut — Create short films with AI",
    description:
      "Transform your ideas into cinematic short films. Describe your vision and let hycut bring it to life.",
    url: "/",
    siteName: "hycut",
    images: [
      {
        url: "/hycutwnobg.png",
        width: 1200,
        height: 630,
        alt: "hycut",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "hycut — Create short films with AI",
    description:
      "Transform your ideas into cinematic short films. Describe your vision and let hycut bring it to life.",
    images: ["/hycutwnobg.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
