import Link from "next/link";
import { HOMEWORK_GUIDE_URL, type HeaderNavItem } from "@/lib/navigation";

const footerNavLinks: HeaderNavItem[] = [
  { href: "/home", label: "과제 홈" },
  { href: "/git-how", label: "깃이란?" },
  { href: HOMEWORK_GUIDE_URL, label: "과제제출방법", external: true },
];

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="shrink-0 border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {/* 브랜드 */}
          <div className="space-y-3 sm:col-span-2 lg:col-span-1">
            <Link
              href="/home"
              className="inline-block text-base font-semibold text-black hover:opacity-80 transition-opacity dark:text-zinc-50"
            >
              AI 빅데이터 전문가 양성과정
            </Link>
            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 max-w-sm">
              K-Digital Training 기반 빅데이터·AI 실무 교육 과제 제출 및
              학습 진행을 관리하는 플랫폼입니다.
            </p>
          </div>

          {/* 바로가기 */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-black dark:text-zinc-50">
              바로가기
            </h2>
            <ul className="space-y-2">
              {footerNavLinks.map((link) => (
                <li key={link.href}>
                  {link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50 transition-colors"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      href={link.href}
                      className="text-sm text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50 transition-colors"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* 안내 */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-black dark:text-zinc-50">
              이용 안내
            </h2>
            <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
              <li>로그인 후 본인 과정의 과제를 제출할 수 있습니다.</li>
              <li>제출 기한 내 URL 수정이 가능합니다.</li>
              <li>
                문의는 교육 담당자 또는{" "}
                <a
                  href={HOMEWORK_GUIDE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline dark:text-blue-400"
                >
                  과제제출방법
                </a>
                {" "}가이드를 확인해 주세요.
              </li>
            </ul>
          </div>
        </div>

        {/* 하단 저작권 */}
        <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-500">
          <p>© {currentYear} 빅데이터 전문가 양성과정. All rights reserved.</p>
          <p>K-Digital Training</p>
        </div>
      </div>
    </footer>
  );
}
