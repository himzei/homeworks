import Link from "next/link";
import { BLOG_PATH, GIT_HOW_PATH, HOW_WORK_PATH } from "@/lib/navigation";

/** 랜딩 페이지 히어로 섹션 — H1·내부 링크로 온페이지 SEO 보강 */
export default function MainHero() {
  return (
    <section
      aria-labelledby="main-hero-heading"
      className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-zinc-900 dark:via-black dark:to-zinc-900"
    >
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-32">
        <div className="max-w-7xl mx-auto text-center">
          <p className="inline-flex items-center gap-2 px-4 py-2 mb-8 bg-blue-100 dark:bg-blue-900/30 rounded-full text-primary text-sm font-medium">
            <span>K-Digital Training</span>
          </p>

          <h1
            id="main-hero-heading"
            className="text-3xl sm:text-4xl lg:text-5xl xl:text-5xl font-bold text-black dark:text-white mb-4 sm:mb-6 leading-tight"
          >
            빅데이터 전문가 양성과정
            <br />
            <span className="text-brand-point dark:text-brand-cream">
              AI·데이터 분석 실무 교육
            </span>
          </h1>

          <p className="text-base sm:text-xl lg:text-xl text-zinc-600 dark:text-zinc-400 mb-8 sm:mb-10 max-w-3xl mx-auto leading-relaxed">
            빅데이터 전문가 양성과정으로 미래를 이끌 데이터·AI 전문가를
            준비하세요. 체계적인 커리큘럼과 실무 프로젝트로 Git 과제 제출부터
            학습 진행까지 한 플랫폼에서 관리합니다.
          </p>

          <nav
            aria-label="빅데이터 전문가 양성과정 안내 링크"
            className="flex flex-wrap items-center justify-center gap-3 sm:gap-4"
          >
            <Link
              href={HOW_WORK_PATH}
              className="inline-flex items-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            >
              과제 제출 방법
            </Link>
            <Link
              href={GIT_HOW_PATH}
              className="inline-flex items-center rounded-full border border-zinc-300 dark:border-zinc-600 px-5 py-2.5 text-sm font-medium text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
            >
              Git 기초 가이드
            </Link>
            <Link
              href={BLOG_PATH}
              className="inline-flex items-center rounded-full border border-zinc-300 dark:border-zinc-600 px-5 py-2.5 text-sm font-medium text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
            >
              블로그
            </Link>
          </nav>
        </div>
      </div>
    </section>
  );
}
