"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/app/_components/ui/button";
import {
  GraduationCap,
  Users,
  BookOpen,
  Award,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Code,
  Database,
  Brain,
} from "lucide-react";

export default function Home() {
  const router = useRouter();

  // 주요 특징 데이터 (SEO: 빅데이터 전문가 양성과정 관련 키워드 포함)
  const features = [
    {
      icon: <Code className="w-8 h-8" />,
      title: "빅데이터·AI 기술 전문 교육",
      description:
        "빅데이터 전문가 양성과정에서 최신 AI 기술과 데이터 분석 방법을 체계적으로 학습합니다.",
    },
    {
      icon: <Database className="w-8 h-8" />,
      title: "실무 중심 커리큘럼",
      description:
        "이론과 실습을 결합한 실무 중심의 빅데이터 전문가 양성 교육 프로그램을 제공합니다.",
    },
    {
      icon: <Brain className="w-8 h-8" />,
      title: "전문가 양성",
      description:
        "빅데이터 전문가 양성과정을 통해 AI·데이터 분야 전문가로 성장할 수 있는 기회를 제공합니다.",
    },
  ];

  // 프로그램 혜택 데이터
  const benefits = [
    "체계적인 커리큘럼",
    "실무 프로젝트 경험",
    "전문 강사진",
    "취업 지원 프로그램",
    "네트워킹 기회",
    "평생 학습 지원",
  ];

  // SEO: 구조화 데이터 (JSON-LD) - 검색엔진이 교육 과정 정보를 이해하도록 지원
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: "빅데이터 전문가 양성과정",
    description:
      "빅데이터 전문가 양성과정으로 AI·데이터 분석부터 실무 프로젝트까지 체계적으로 배웁니다. K-Digital Training 기반 전문가 교육.",
    provider: {
      "@type": "Organization",
      name: "빅데이터 전문가 양성과정",
    },
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* 히어로 섹션 */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-zinc-900 dark:via-black dark:to-zinc-900">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-32">
          <div className="max-w-4xl mx-auto text-center">
            {/* 메인 타이틀 */}
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-700 dark:text-blue-300 text-sm font-medium">
              <Sparkles className="w-4 h-4" />
              <span>K-Digital Training</span>
            </div>

            {/* SEO: 메인 키워드 '빅데이터 전문가 양성과정'을 h1에 포함 */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-black dark:text-white mb-4 sm:mb-6 leading-tight">
              빅데이터 전문가 양성과정
              <br />
              <span className="text-blue-600 dark:text-blue-400">
                AI·데이터 분석 실무 교육
              </span>
            </h1>

            <p className="text-base sm:text-xl lg:text-2xl text-zinc-600 dark:text-zinc-400 mb-8 sm:mb-10 max-w-2xl mx-auto leading-relaxed">
              빅데이터 전문가 양성과정으로 미래를 이끌어갈 데이터 전문가가 되세요.
              <br />
              체계적인 커리큘럼과 실무 프로젝트로 전문성을 키워보세요.
            </p>
          </div>
        </div>
      </section>

      {/* 통계 섹션 */}
      <section className="py-16 bg-zinc-50 dark:bg-zinc-900/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            {/* 이미지 첨부 */}
            <div className="relative w-full h-auto rounded-lg overflow-hidden shadow-lg">
              <Image
                src="https://datainstitute.knu.ac.kr/uploads/ckeditor/24641083351656572.jpg"
                alt="빅데이터 전문가 양성과정 - AI·데이터 분석 실무 교육"
                width={1200}
                height={600}
                className="w-full h-auto object-cover"
                priority
                unoptimized={true} // 외부 이미지 최적화 비활성화 (필요시)
                onError={(e) => {
                  // 이미지 로드 실패 시 처리
                  console.error("이미지 로드 실패:", e);
                }}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
