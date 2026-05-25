import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/app/_components/Header";
import Footer from "@/app/_components/Footer";
import { SessionProvider } from "@/lib/auth/SessionProvider";
import { createRootMetadata } from "@/lib/seo/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = createRootMetadata();

// Next.js 14+ viewport는 별도 export로 분리 (metadata 내 viewport deprecated)
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased app-shell`}
      >
        <SessionProvider>
          <Header />
          <main className="app-shell-main">{children}</main>
          <Footer />
        </SessionProvider>
      </body>
    </html>
  );
}
