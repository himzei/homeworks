import Link from "next/link";
import { GIT_HOW_PATH, HOW_WORK_PATH, type HeaderNavItem } from "@/lib/navigation";

const footerNavLinks: HeaderNavItem[] = [
  { href: "/home", label: "과제 홈" },
  { href: GIT_HOW_PATH, label: "깃이란?" },
  { href: HOW_WORK_PATH, label: "과제제출방법" },
];

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="shrink-0 border-t border-brand-navy/10 bg-brand-footer">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {/* 브랜드 */}
          <div className="space-y-3 sm:col-span-2 lg:col-span-1">
            <Link
              href="/"
              className="inline-block text-base font-semibold text-brand-navy hover:opacity-80 transition-opacity"
            >
              빅데이터 전문가 양성과정
            </Link>
            <p className="text-sm leading-relaxed text-brand-navy/70 max-w-sm">
              K-Digital Training 기반 빅데이터·AI 실무 교육 과제 제출 및
              학습 진행을 관리하는 플랫폼입니다.
            </p>
          </div>

          {/* 바로가기 */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-brand-navy">
              바로가기
            </h2>
            <ul className="space-y-2">
              {footerNavLinks.map((link) => {
                if (!link.href) return null;

                return (
                <li key={link.href}>
                  {link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-brand-navy/70 hover:text-brand-navy transition-colors"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      href={link.href}
                      className="text-sm text-brand-navy/70 hover:text-brand-navy transition-colors"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
                );
              })}
            </ul>
          </div>

          {/* 안내 */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-brand-navy">
              이용 안내
            </h2>
            <ul className="space-y-2 text-sm text-brand-navy/70">
              <li>로그인 후 본인 과정의 과제를 제출할 수 있습니다.</li>
              <li>제출 기한 내 URL 수정이 가능합니다.</li>
              <li>
                문의는 교육 담당자 또는{" "}
                <Link
                  href={HOW_WORK_PATH}
                  className="text-brand-blue hover:text-brand-navy underline transition-colors"
                >
                  과제제출방법
                </Link>
                {" "}가이드를 확인해 주세요.
              </li>
            </ul>
          </div>
        </div>

        {/* 하단 저작권 */}
        <div className="mt-8 pt-6 border-t border-brand-navy/10 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-brand-navy/50">
          <p>© {currentYear} 빅데이터 전문가 양성과정. All rights reserved.</p>
          <p>K-Digital Training</p>
        </div>
      </div>
    </footer>
  );
}
