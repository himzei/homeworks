import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/app/_components/Header";
import Footer from "@/app/_components/Footer";
import { SessionProvider } from "@/lib/auth/SessionProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// SEO: '빅데이터 전문가 양성과정' 키워드 최적화
const siteName = "빅데이터 전문가 양성과정";
const siteDescription =
  "빅데이터 전문가 양성과정으로 AI·데이터 분석부터 실무 프로젝트까지 체계적으로 배우세요. K-Digital Training 기반 전문가 교육.";

export const metadata: Metadata = {
  title: {
    default: siteName,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  keywords: [
    "빅데이터 전문가 양성과정",
    "빅데이터 전문가",
    "AI 빅데이터 교육",
    "데이터 분석 교육",
    "K-Digital Training",
    "빅데이터 양성",
  ],
  authors: [{ name: "빅데이터 전문가 양성과정" }],
  creator: "빅데이터 전문가 양성과정",
  openGraph: {
    type: "website",
    locale: "ko_KR",
    title: siteName,
    description: siteDescription,
    siteName,
  },
  twitter: {
    card: "summary_large_image",
    title: siteName,
    description: siteDescription,
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.ico",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProvider>
          <Header />
          {children}
          <Footer />
        </SessionProvider>
      </body>
    </html>
  );
}
