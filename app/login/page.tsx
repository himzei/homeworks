import type { Metadata } from "next";
import LoginPageClient from "./LoginPageClient";

export const metadata: Metadata = {
  title: "로그인",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return <LoginPageClient />;
}
