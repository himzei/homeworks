import MainHero from "@/app/_components/MainHero";
import TodayAssignments from "@/app/_components/TodayAssignments";
import { createClient } from "@/lib/supabase/server";
import { fetchTodayAssignments } from "@/lib/fetch-today-assignments";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  const supabase = await createClient();
  const todayAssignments = await fetchTodayAssignments(supabase);

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
    <div className="min-h-full bg-white dark:bg-black">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <MainHero />

      {/* 로그인 사용자 + 오늘 진행 중인 과제가 있을 때만 표시 */}
      {todayAssignments.length > 0 && (
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24">
          <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold text-black dark:text-zinc-50 mb-2">
                오늘의 과제
              </h2>
              <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400">
                현재 진행 중인 과제입니다. 아래에서 바로 제출할 수 있습니다.
              </p>
            </div>
            <TodayAssignments assignments={todayAssignments} />
          </div>
        </section>
      )}
    </div>
  );
}
