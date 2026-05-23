import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
  Users,
  ClipboardList,
  AlertCircle,
  MessageSquare,
  ClipboardCheck,
  FileText,
  CheckCircle2,
  Plus,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { LEGACY_GROUPS } from "@/lib/constants";
import { Button } from "@/app/_components/ui/button";

import GroupTabs from "./_components/GroupTabs";
import StatCard from "./_components/StatCard";
import AssignmentProgressCard, {
  type AssignmentProgressItem,
} from "./_components/AssignmentProgressCard";
import PendingHomeworkList, {
  type PendingHomeworkItem,
} from "./_components/PendingHomeworkList";
import PendingConsultationList, {
  type PendingConsultationItem,
} from "./_components/PendingConsultationList";
import DashboardSection from "./_components/DashboardSection";

// 동적 렌더링 강제 (세션별/그룹별 데이터를 매 요청마다 새로 조회)
export const dynamic = "force-dynamic";
export const revalidate = 0;

// 페이지 메타데이터
export const metadata = {
  title: "관리자 대시보드",
  description: "학생 현황과 과제·상담·설문조사 운영 현황을 한눈에 확인",
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

/**
 * 관리자 전용 대시보드
 * - 핵심 KPI(학생/과제/검토 대기/상담 대기) 한눈에 확인
 * - 진행중 과제 제출률, 검토 대기 제출물, 답변 대기 상담 표시
 * - 과정(group) 단위 필터링 지원
 */
export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const selectedGroupParam = (params?.group as string) || null;
  const isExplicitGroup =
    !!selectedGroupParam && selectedGroupParam !== "all";
  const filterGroup = isExplicitGroup ? selectedGroupParam : null;

  const supabase = await createClient();

  // 1) 사용자 + 관리자 권한 확인 (병렬 불가: 이후 쿼리들이 권한에 의존)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/?login_required=1");
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // 관리자가 아니면 일반 홈으로 보냄
  if (currentProfile?.role !== "admin") {
    redirect("/home");
  }

  // 2) 대시보드 데이터 병렬 조회 (waterfall 방지)
  // assignments 쿼리 빌더: 선택된 그룹에 따라 필터
  const buildAssignmentsQuery = () => {
    const query = supabase
      .from("assignments")
      .select(
        "id, title, start_date, end_date, group_name, created_at, lecture_material_url, previous_answer_url",
      )
      .order("end_date", { ascending: true });

    if (!filterGroup) return query;

    // LEGACY_GROUPS(13기 등)은 group_name이 null인 과제도 포함
    if (LEGACY_GROUPS.includes(filterGroup as (typeof LEGACY_GROUPS)[number])) {
      const escaped = filterGroup.replace(/"/g, '""');
      return query.or(`group_name.is.null,group_name.eq."${escaped}"`);
    }
    return query.eq("group_name", filterGroup);
  };

  // profiles는 그룹별 학생 수 집계를 위해 항상 전체를 가져오고,
  // 화면용 필터링은 메모리에서 처리한다.
  const allProfilesQuery = supabase
    .from("profiles")
    .select("id, name, group_name")
    .neq("role", "admin");

  const [
    assignmentsResult,
    profilesResult,
    homeworksResult,
    consultationsResult,
    surveysResult,
  ] = await Promise.all([
    buildAssignmentsQuery(),
    allProfilesQuery,
    supabase
      .from("homeworks")
      .select("id, user_id, assignment_id, url, status, created_at"),
    supabase
      .from("consultations")
      .select("id, student_id, content, status, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("surveys")
      .select("id, title, start_date, end_date, group_name"),
  ]);

  const assignments = assignmentsResult.data ?? [];
  const allProfiles = profilesResult.data ?? [];
  const allHomeworks = homeworksResult.data ?? [];
  const allConsultations = consultationsResult.data ?? [];
  const allSurveys = surveysResult.data ?? [];

  // 그룹별 학생 수 집계 (탭 배지 표시용)
  // - "all": 전체 학생 수
  // - 각 group_name 키: 해당 그룹에 정확히 매칭되는 학생 수
  const studentCountsByGroup: Record<string, number> = {
    all: allProfiles.length,
  };
  for (const profile of allProfiles) {
    const groupKey = profile.group_name;
    if (groupKey) {
      studentCountsByGroup[groupKey] =
        (studentCountsByGroup[groupKey] ?? 0) + 1;
    }
  }

  // 선택된 그룹에 해당하는 학생만 추출 (전체 선택 시 그대로 사용)
  const filteredProfiles = filterGroup
    ? allProfiles.filter((p) => p.group_name === filterGroup)
    : allProfiles;

  // 3) 통계 계산
  const totalStudents = filteredProfiles.length;

  // 학생 ID Set: 그룹 필터링된 학생의 제출물만 추리기 위함
  const studentIdSet = new Set(filteredProfiles.map((p) => p.id));

  // 과제 ID Set: 그룹 필터링된 과제의 제출물만 추리기 위함
  const assignmentIdSet = new Set(assignments.map((a) => a.id));

  // 필터링된 제출물 (해당 그룹 학생 + 해당 그룹 과제만)
  const filteredHomeworks = allHomeworks.filter(
    (h) => studentIdSet.has(h.user_id) && assignmentIdSet.has(h.assignment_id),
  );

  // 현재 시각 (마감/진행 판단용)
  const now = new Date();

  // 진행중 / 예정 / 종료된 과제 분류
  const activeAssignments = assignments.filter((a) => {
    const start = new Date(a.start_date);
    const end = new Date(a.end_date);
    return start <= now && end >= now;
  });

  const upcomingAssignments = assignments.filter(
    (a) => new Date(a.start_date) > now,
  );

  // 검토 대기 제출물 수
  const pendingHomeworkCount = filteredHomeworks.filter(
    (h) => h.status === "검토중",
  ).length;

  // 답변 대기 상담 (학생이 현재 그룹에 속한 경우만)
  const filteredConsultations = allConsultations.filter((c) =>
    studentIdSet.has(c.student_id),
  );
  const pendingConsultationCount = filteredConsultations.filter(
    (c) => c.status === "대기중",
  ).length;

  // 진행중 설문조사
  const activeSurveys = allSurveys.filter((s) => {
    if (filterGroup && s.group_name && s.group_name !== filterGroup) {
      return false;
    }
    const start = new Date(s.start_date);
    const end = new Date(s.end_date);
    return start <= now && end >= now;
  });

  // 4) 진행중 과제 제출률 계산 (상위 5개)
  // user_id별 이름 매핑 (필터 외 학생도 표시 가능하도록 전체 기준으로 구성)
  const profileNameMap = new Map(
    allProfiles.map((p) => [p.id, p.name ?? "이름없음"]),
  );

  const activeAssignmentsWithProgress: AssignmentProgressItem[] =
    activeAssignments.slice(0, 5).map((assignment) => {
      // 해당 과제에 대한 제출물 수 (현재 그룹 학생만)
      const submittedCount = filteredHomeworks.filter(
        (h) => h.assignment_id === assignment.id,
      ).length;

      return {
        id: assignment.id,
        title: assignment.title,
        endDate: assignment.end_date,
        submittedCount,
        totalStudents,
      };
    });

  // 5) 검토 대기 제출물 리스트 (최근 5개)
  // assignment 제목 매핑
  const assignmentTitleMap = new Map(assignments.map((a) => [a.id, a.title]));

  const pendingHomeworks: PendingHomeworkItem[] = filteredHomeworks
    .filter((h) => h.status === "검토중")
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .slice(0, 5)
    .map((h) => ({
      id: h.id,
      studentId: h.user_id,
      studentName: profileNameMap.get(h.user_id) ?? "알 수 없는 학생",
      assignmentTitle:
        assignmentTitleMap.get(h.assignment_id) ?? "삭제된 과제",
      submissionUrl: h.url,
      submittedAt: h.created_at,
    }));

  // 6) 답변 대기 상담 리스트 (최근 5개)
  const pendingConsultations: PendingConsultationItem[] = filteredConsultations
    .filter((c) => c.status === "대기중")
    .slice(0, 5)
    .map((c) => ({
      id: c.id,
      studentId: c.student_id,
      studentName: profileNameMap.get(c.student_id) ?? "알 수 없는 학생",
      content: c.content,
      createdAt: c.created_at,
    }));

  // 7) 화면에 표시할 그룹 라벨 (탭이 짧은 라벨이라 헤더에선 풀네임 노출)
  const groupLabel = filterGroup ?? "전체 과정";
  // 현재 보고 있는 데이터 범위 안내 문구
  const scopeDescription = filterGroup
    ? "선택한 과정의 데이터만 표시됩니다."
    : "모든 과정의 데이터를 합산해 표시합니다.";

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="container mx-auto py-4 sm:py-8 px-4 sm:px-8">
        {/* 페이지 헤더 */}
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-zinc-50">
                관리자 대시보드
              </h1>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  {groupLabel}
                </span>{" "}
                · {scopeDescription}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/assignment/new">
                <Button className="bg-blue-500 hover:bg-blue-600 text-white">
                  <Plus className="size-4" />새 과제 등록
                </Button>
              </Link>
              <Link href="/home">
                <Button variant="outline">홈으로 이동</Button>
              </Link>
            </div>
          </div>
        </div>

        {/* 과정(기수) 탭 필터 - 클릭한 그룹의 데이터만 하단에 표시됨 */}
        <div className="mb-6 sm:mb-8">
          <Suspense fallback={null}>
            <GroupTabs
              selectedGroup={selectedGroupParam}
              studentCountsByGroup={studentCountsByGroup}
            />
          </Suspense>
        </div>

        {/* 상단 KPI 카드 */}
        <section
          aria-label="핵심 지표"
          className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4"
        >
          <StatCard
            label="전체 학생"
            value={totalStudents}
            hint={filterGroup ? "해당 과정 기준" : "관리자 제외"}
            icon={<Users className="size-5" />}
            accentClassName="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
          />
          <StatCard
            label="진행중 과제"
            value={activeAssignments.length}
            hint={`예정 ${upcomingAssignments.length}건`}
            icon={<ClipboardList className="size-5" />}
            accentClassName="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
          />
          <StatCard
            label="검토 대기"
            value={pendingHomeworkCount}
            hint={pendingHomeworkCount > 0 ? "확인이 필요합니다" : "모두 처리됨"}
            icon={<AlertCircle className="size-5" />}
            accentClassName="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
            highlight={pendingHomeworkCount > 0}
          />
          <StatCard
            label="답변 대기 상담"
            value={pendingConsultationCount}
            hint={
              pendingConsultationCount > 0 ? "답변이 필요합니다" : "모두 처리됨"
            }
            icon={<MessageSquare className="size-5" />}
            accentClassName="bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
            highlight={pendingConsultationCount > 0}
          />
          <StatCard
            label="진행중 설문"
            value={activeSurveys.length}
            hint="현재 응답 가능"
            icon={<ClipboardCheck className="size-5" />}
            accentClassName="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
          />
        </section>

        {/* 메인 그리드: 왼쪽(진행중 과제) + 오른쪽(검토대기 / 상담대기) */}
        <div className="mt-6 sm:mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 왼쪽: 진행중 과제 제출률 */}
          <div className="lg:col-span-2">
            <DashboardSection
              title="진행중 과제 제출 현황"
              description="현재 기간 중인 과제와 학생들의 제출률입니다."
              moreHref="/home?tab=assignment-list"
              moreLabel="숙제 리스트 보기"
            >
              <AssignmentProgressCard items={activeAssignmentsWithProgress} />
            </DashboardSection>
          </div>

          {/* 오른쪽: 검토 대기 제출물 */}
          <div>
            <DashboardSection
              title="검토 대기 제출물"
              description={`최근 ${pendingHomeworks.length}건 (전체 ${pendingHomeworkCount}건)`}
              moreHref="/home?tab=evaluation"
              moreLabel="평가 화면"
            >
              <PendingHomeworkList items={pendingHomeworks} />
            </DashboardSection>
          </div>
        </div>

        {/* 하단 그리드: 답변 대기 상담 + 빠른 액션 */}
        <div className="mt-6 sm:mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 답변 대기 상담 */}
          <div className="lg:col-span-2">
            <DashboardSection
              title="답변 대기 상담"
              description={`최근 ${pendingConsultations.length}건 (전체 ${pendingConsultationCount}건)`}
              moreHref="/home?tab=consultation"
            >
              <PendingConsultationList items={pendingConsultations} />
            </DashboardSection>
          </div>

          {/* 빠른 액션 */}
          <div>
            <DashboardSection
              title="빠른 액션"
              description="자주 사용하는 작업"
            >
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-card p-2">
                <QuickActionLink
                  href="/assignment/new"
                  label="새 과제 등록"
                  icon={<FileText className="size-4" />}
                />
                <QuickActionLink
                  href="/home?tab=survey"
                  label="설문조사 관리"
                  icon={<ClipboardCheck className="size-4" />}
                />
                <QuickActionLink
                  href="/home?tab=consultation"
                  label="학생 상담 관리"
                  icon={<MessageSquare className="size-4" />}
                />
                <QuickActionLink
                  href="/home?tab=evaluation"
                  label="제출물 평가"
                  icon={<CheckCircle2 className="size-4" />}
                />
                <QuickActionLink
                  href="/home?tab=progress"
                  label="진행 과정 보기"
                  icon={<Users className="size-4" />}
                  isLast
                />
              </div>
            </DashboardSection>
          </div>
        </div>
      </main>
    </div>
  );
}

/** 빠른 액션 한 줄 링크 */
function QuickActionLink({
  href,
  label,
  icon,
  isLast = false,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  isLast?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ${
        isLast ? "" : "mb-0.5"
      }`}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
        {icon}
      </span>
      <span className="text-sm font-medium text-black dark:text-zinc-50">
        {label}
      </span>
    </Link>
  );
}
