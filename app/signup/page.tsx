import type { Metadata } from "next";
import SignupPageClient from "./SignupPageClient";

export const metadata: Metadata = {
  title: "회원가입",
  robots: { index: false, follow: false },
};

export default function SignupPage() {
  return <SignupPageClient />;
}
