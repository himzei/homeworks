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

  // 주요 특징 데이터
  const features = [
    {
      icon: <Code className="w-8 h-8" />,
      title: "AI 기술 전문 교육",
      description: "최신 AI 기술과 빅데이터 분석 방법을 체계적으로 학습합니다.",
    },
    {
      icon: <Database className="w-8 h-8" />,
      title: "실무 중심 커리큘럼",
      description:
        "이론과 실습을 결합한 실무 중심의 교육 프로그램을 제공합니다.",
    },
    {
      icon: <Brain className="w-8 h-8" />,
      title: "전문가 양성",
      description:
        "AI 빅데이터 분야의 전문가로 성장할 수 있는 기회를 제공합니다.",
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

  return (
    <div className="min-h-screen bg-white dark:bg-black">
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

            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-black dark:text-white mb-4 sm:mb-6 leading-tight">
              AI 빅데이터 전문가
              <br />
              <span className="text-blue-600 dark:text-blue-400">양성과정</span>
            </h1>

            <p className="text-base sm:text-xl lg:text-2xl text-zinc-600 dark:text-zinc-400 mb-8 sm:mb-10 max-w-2xl mx-auto leading-relaxed">
              미래를 이끌어갈 AI 빅데이터 전문가가 되세요.
              <br />
              체계적인 교육과 실무 경험을 통해 전문성을 키워보세요.
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
                alt="AI 빅데이터 전문가 양성과정"
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
