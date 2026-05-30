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
  ListChecks,
  UserPlus,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { LEGACY_GROUPS } from "@/lib/constants";
import GroupTabsLoader from "./_components/GroupTabsLoader";
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
import AdminAccountCards, {
  type AdminAccountItem,
} from "./_components/AdminAccountCards";
import PendingMemberApprovalList, {
  type PendingMemberItem,
} from "./_components/PendingMemberApprovalList";
import {
  countDashboardPendingConsultations,
  countDashboardPendingHomeworks,
  fetchDashboardHomeworkRows,
  fetchDashboardPendingConsultationList,
  fetchDashboardPendingHomeworkList,
} from "@/lib/admin/fetch-dashboard-scoped-rows";
import { PROFILE_APPROVAL_STATUS } from "@/lib/profile-approval";

// 동적 렌더링 강제 (세션별/그룹별 데이터를 매 요청마다 새로 조회)
export const dynamic = "force-dynamic";
export const revalidate = 0;

// 페이지 메타데이터
export const metadata = {
  title: "관리자 대시보드",
  description: "학생 현황과 과제·상담·설문조사 운영 현황을 한눈에 확인",
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

const memberApprovalDateFormatter = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeStyle: "short",
});

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
    redirect("/login?login_required=1");
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

  const allProfilesQuery = supabase
    .from("profiles")
    .select("id, name, group_name")
    .neq("role", "admin")
    .eq("is_dormant", false);

  const adminProfilesQuery = supabase
    .from("profiles")
    .select(
      "id, name, phone, avatar_url, university, major",
    )
    .eq("role", "admin")
    .order("name", { ascending: true });

  const pendingMembersCountQuery = supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .neq("role", "admin")
    .eq("approval_status", PROFILE_APPROVAL_STATUS.pending);

  const pendingMembersListQuery = supabase
    .from("profiles")
    .select("id, name, group_name, phone, created_at, approval_status")
    .neq("role", "admin")
    .eq("approval_status", PROFILE_APPROVAL_STATUS.pending)
    .order("created_at", { ascending: false })
    .limit(5);

  const [
    assignmentsResult,
    profilesResult,
    adminProfilesResult,
    surveysResult,
    pendingMembersCountResult,
    pendingMembersListResult,
  ] = await Promise.all([
    buildAssignmentsQuery(),
    allProfilesQuery,
    adminProfilesQuery,
    supabase
      .from("surveys")
      .select("id, title, start_date, end_date, group_name"),
    pendingMembersCountQuery,
    pendingMembersListQuery,
  ]);

  const assignments = assignmentsResult.data ?? [];
  const allProfiles = profilesResult.data ?? [];
  const adminProfiles = adminProfilesResult.data ?? [];
  const allSurveys = surveysResult.data ?? [];

  if (pendingMembersCountResult.error) {
    console.error(
      "가입 검토 대기 회원 count 오류:",
      pendingMembersCountResult.error,
    );
  }
  if (pendingMembersListResult.error) {
    console.error(
      "가입 검토 대기 회원 목록 오류:",
      pendingMembersListResult.error,
    );
  }

  const pendingMemberCount = pendingMembersCountResult.count ?? 0;
  const pendingMembersForDashboard: PendingMemberItem[] = (
    pendingMembersListResult.data ?? []
  ).map((row) => ({
    id: row.id,
    name: row.name?.trim() || "(이름 없음)",
    groupName: row.group_name,
    phone: row.phone,
    createdAtLabel: memberApprovalDateFormatter.format(
      new Date(row.created_at),
    ),
    approvalStatus: row.approval_status,
  }));

  const filteredProfiles = filterGroup
    ? allProfiles.filter(
        (p) => p.group_name === filterGroup || !p.group_name,
      )
    : allProfiles;

  const totalStudents = filteredProfiles.length;
  const filteredStudentIds = filteredProfiles.map((profile) => profile.id);
  const filteredAssignmentIds = assignments.map((assignment) => assignment.id);

  const [
    scopedHomeworkRows,
    pendingHomeworkCount,
    pendingHomeworkListRows,
    pendingConsultationCount,
    pendingConsultationListRows,
  ] = await Promise.all([
    fetchDashboardHomeworkRows(
      supabase,
      filteredStudentIds,
      filteredAssignmentIds,
    ),
    countDashboardPendingHomeworks(
      supabase,
      filteredStudentIds,
      filteredAssignmentIds,
    ),
    fetchDashboardPendingHomeworkList(
      supabase,
      filteredStudentIds,
      filteredAssignmentIds,
      5,
    ),
    countDashboardPendingConsultations(supabase, filteredStudentIds),
    fetchDashboardPendingConsultationList(supabase, filteredStudentIds, 5),
  ]);

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
      const submittedCount = scopedHomeworkRows.filter(
        (homework) => homework.assignment_id === assignment.id,
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

  const pendingHomeworks: PendingHomeworkItem[] = pendingHomeworkListRows.map(
    (homework) => ({
      id: homework.id,
      studentId: homework.user_id,
      studentName: profileNameMap.get(homework.user_id) ?? "알 수 없는 학생",
      assignmentId: homework.assignment_id,
      assignmentTitle:
        assignmentTitleMap.get(homework.assignment_id) ?? "삭제된 과제",
      submissionUrl: homework.url,
      submittedAt: homework.created_at,
    }),
  );

  const pendingConsultations: PendingConsultationItem[] =
    pendingConsultationListRows.map((consultation) => ({
      id: consultation.id,
      studentId: consultation.student_id,
      studentName:
        profileNameMap.get(consultation.student_id) ?? "알 수 없는 학생",
      content: consultation.content,
      createdAt: consultation.created_at,
    }));

  // 7) 관리자 계정 카드 데이터 (이메일 RPC 병렬 조회)
  const adminIds = adminProfiles.map((p) => p.id);
  let adminEmailMap = new Map<string, string>();
  if (adminIds.length > 0) {
    const { data: adminEmailData } = await supabase.rpc("get_user_emails", {
      user_ids: adminIds,
    });
    if (adminEmailData) {
      adminEmailMap = new Map(
        adminEmailData.map((item: { user_id: string; email: string }) => [
          item.user_id,
          item.email,
        ]),
      );
    }
  }

  const adminAccounts: AdminAccountItem[] = adminProfiles.map((profile) => ({
    id: profile.id,
    name: profile.name ?? "이름 없음",
    email: adminEmailMap.get(profile.id) ?? null,
    phone: profile.phone,
    avatar_url: profile.avatar_url,
    university: profile.university,
    major: profile.major,
  }));

  // 8) 화면에 표시할 그룹 라벨 (탭이 짧은 라벨이라 헤더에선 풀네임 노출)
  const newAssignmentHref = filterGroup
    ? `/admin/assignments/new?group=${encodeURIComponent(filterGroup)}`
    : "/admin/assignments/new";

  const adminAssignmentsHref = filterGroup
    ? `/admin/assignments?group=${encodeURIComponent(filterGroup)}`
    : "/admin/assignments";

  return (
    <>
        {/* 과정(기수) 탭 필터 - 클릭한 그룹의 데이터만 하단에 표시됨 */}
        <div className="mb-6 sm:mb-8">
          <Suspense fallback={null}>
            <GroupTabsLoader selectedGroup={selectedGroupParam} />
          </Suspense>
        </div>

        {/* 관리자 계정 (학생 상담 전체 탭과 분리) */}
        <section className="mb-6 sm:mb-8">
          <DashboardSection
            title="관리자 계정"
            description={`등록된 관리자 ${adminAccounts.length}명 · 프로필을 클릭하면 상세 정보를 확인할 수 있습니다.`}
          >
            <AdminAccountCards admins={adminAccounts} />
          </DashboardSection>
        </section>

        {/* 상단 KPI 카드 */}
        <section
          aria-label="핵심 지표"
          className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4"
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
            label="가입 검토 대기"
            value={pendingMemberCount}
            hint={
              pendingMemberCount > 0
                ? "신규 가입 승인이 필요합니다"
                : "대기 중인 가입 없음"
            }
            icon={<UserPlus className="size-5" />}
            accentClassName="bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
            highlight={pendingMemberCount > 0}
            href="/admin/members"
          />
          <StatCard
            label="과제 검토 대기"
            value={pendingHomeworkCount}
            hint={pendingHomeworkCount > 0 ? "확인이 필요합니다" : "모두 처리됨"}
            icon={<AlertCircle className="size-5" />}
            accentClassName="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
            highlight={pendingHomeworkCount > 0}
            href={adminAssignmentsHref}
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

        {/* 가입 검토 대기 회원 (과정 필터와 무관 — 전체 신규 가입) */}
        <section className="mt-6 sm:mt-8">
          <DashboardSection
            title="가입 검토 대기"
            description={
              pendingMemberCount > 0
                ? `신규 가입 ${pendingMemberCount}명 · 최근 ${pendingMembersForDashboard.length}명 표시`
                : "승인 대기 중인 신규 회원이 없습니다."
            }
            moreHref="/admin/members"
            moreLabel="회원 관리 전체 보기"
          >
            <PendingMemberApprovalList members={pendingMembersForDashboard} />
          </DashboardSection>
        </section>

        {/* 메인 그리드: 왼쪽(진행중 과제) + 오른쪽(검토대기 / 상담대기) */}
        <div className="mt-6 sm:mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 왼쪽: 진행중 과제 제출률 */}
          <div className="lg:col-span-2">
            <DashboardSection
              title="진행중 과제 제출 현황"
              description="현재 기간 중인 과제와 학생들의 제출률입니다."
              moreHref="/admin/assignments"
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
              moreHref={adminAssignmentsHref}
              moreLabel="숙제 리스트 보기"
            >
              <PendingHomeworkList
                items={pendingHomeworks}
                filterGroup={filterGroup}
              />
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
              moreHref="/admin/consultations"
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
                  href={newAssignmentHref}
                  label="새 과제 등록"
                  icon={<FileText className="size-4" />}
                />
                <QuickActionLink
                  href="/admin/assignments"
                  label="숙제 리스트 관리"
                  icon={<ListChecks className="size-4" />}
                />
                <QuickActionLink
                  href="/admin/surveys"
                  label="설문조사 관리"
                  icon={<ClipboardCheck className="size-4" />}
                />
                <QuickActionLink
                  href="/admin/consultations"
                  label="학생 상담 관리"
                  icon={<MessageSquare className="size-4" />}
                />
                <QuickActionLink
                  href="/admin/members"
                  label="회원 관리"
                  icon={<UserPlus className="size-4" />}
                />
                <QuickActionLink
                  href="/admin/evaluation"
                  label="제출물 평가"
                  icon={<CheckCircle2 className="size-4" />}
                />
                <QuickActionLink
                  href={
                    filterGroup
                      ? `/admin/progress?group=${encodeURIComponent(filterGroup)}`
                      : "/admin/progress"
                  }
                  label="진행 과정 보기"
                  icon={<Users className="size-4" />}
                  isLast
                />
              </div>
            </DashboardSection>
          </div>
        </div>
    </>
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
