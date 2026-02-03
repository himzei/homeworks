import Tabs from "@/app/_components/Tabs";
import ProgressGrid from "@/app/_components/ProgressGrid";
import AssignmentList from "@/app/_components/AssignmentList";
import TodayAssignments from "@/app/_components/TodayAssignments";
import EvaluationTab from "@/app/_components/EvaluationTab";
import { Button } from "@/app/_components/ui/button";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

// 동적 렌더링 강제 설정 (세션별로 다른 데이터를 보여주므로 캐싱 방지)
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  // Supabase 클라이언트 생성
  const supabase = await createClient();

  // assignments 테이블에서 숙제 리스트 가져오기
  const { data: assignmentsData, error: assignmentsError } = await supabase
    .from("assignments")
    .select("*")
    .order("created_at", { ascending: false }); // 최신순 정렬

  // 에러 처리
  if (assignmentsError) {
    console.error("숙제 리스트 조회 오류:", assignmentsError);
  }

  // 현재 시간 가져오기
  const now = new Date();

  // 오늘의 숙제 필터링: 현재 시간이 start_date와 end_date 사이에 있는 숙제
  const todayAssignmentsData = (assignmentsData || [])
    .filter((assignment) => {
      const startDate = new Date(assignment.start_date);
      const endDate = new Date(assignment.end_date);
      return now >= startDate && now <= endDate;
    })
    .map((assignment) => ({
      id: assignment.id,
      title: assignment.title,
      content: assignment.content || "",
      startDate: new Date(assignment.start_date),
      endDate: new Date(assignment.end_date),
      lectureMaterialUrl: assignment.lecture_material_url || null, // 오늘의 강의자료 URL
      previousAnswerUrl: assignment.previous_answer_url || null, // 지난과제 모범답안 URL
    }));

  // 제출 학생 수를 계산하기 위해 각 assignment에 대한 제출 수를 가져옴
  const assignmentListData = await Promise.all(
    (assignmentsData || []).map(async (assignment) => {
      // 각 assignment에 대한 제출 학생 수 계산
      const { count, error } = await supabase
        .from("homeworks")
        .select("*", { count: "exact", head: true })
        .eq("assignment_id", assignment.id);

      if (error) {
        console.error(`Assignment ${assignment.id} 제출 수 조회 오류:`, error);
      }

      return {
        id: assignment.id,
        title: assignment.title,
        content: assignment.content || "",
        startDate: new Date(assignment.start_date),
        endDate: new Date(assignment.end_date),
        submissionCount: count || 0,
      };
    }),
  );
  // 현재 로그인한 사용자 정보 가져오기
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();
  const currentUserId = currentUser?.id || ""; // 현재 로그인한 사용자 ID

  // 현재 사용자의 프로필 정보 가져오기 (관리자 권한 확인용)
  let isAdmin = false;
  if (currentUserId) {
    const { data: currentUserProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", currentUserId)
      .single();

    // 관리자 역할 확인 (role이 'admin'인 경우)
    isAdmin = currentUserProfile?.role === "admin";
  }

  // 데이터베이스에서 과제 목록 가져오기 (ProgressGrid용)
  const assignments = (assignmentsData || []).map((assignment) => ({
    id: assignment.id,
    name: assignment.title, // title을 name으로 매핑
  }));

  // profiles 테이블에서 회원가입된 모든 사용자 정보 가져오기 (관리자 제외)
  const { data: profilesData, error: profilesError } = await supabase
    .from("profiles")
    .select("id, name, role")
    .neq("role", "admin") // 관리자 제외
    .order("created_at", { ascending: true }); // 생성일 순으로 정렬

  // 에러 처리
  if (profilesError) {
    console.error("사용자 프로필 조회 오류:", profilesError);
  }

  // 사용자 목록 데이터 생성: profiles 테이블에서 가져온 데이터를 ProgressGrid 형식으로 변환
  // 관리자는 이미 쿼리에서 제외되었으므로 추가 필터링 불필요
  const users = (profilesData || []).map((profile) => ({
    id: profile.id,
    name: profile.name || profile.id, // name이 없으면 id 사용
    section:
      profile.id === currentUserId ? ("your" as const) : ("everyone" as const), // 현재 사용자는 "your", 나머지는 "everyone"
  }));

  // 데이터베이스에서 모든 제출 상태 가져오기 (URL 및 status 정보 포함)
  // 주의: RLS 정책으로 인해 모든 사용자의 제출 상태를 조회하지 못할 수 있음
  // 필요시 supabase-setup.sql에서 homeworks 테이블의 SELECT 정책을 수정해야 함
  const { data: allHomeworks, error: homeworksError } = await supabase
    .from("homeworks")
    .select("user_id, assignment_id, url, status"); // URL 및 status 필드 추가

  // 에러 처리
  if (homeworksError) {
    console.error("제출 상태 조회 오류:", homeworksError);
  }

  // 진행 상태 데이터 생성: 각 사용자-과제 조합에 대해 제출 여부, URL, status 확인
  const progressData: Array<{
    userId: string;
    assignmentId: string;
    status: "completed" | "not_completed";
    url?: string; // 제출 URL 정보 (제출한 경우에만 존재)
    evaluationStatus?: string; // 평가 상태 (검토중, 승인, 수정필요, 모범답안)
  }> = [];

  // 모든 사용자와 모든 과제에 대해 진행 상태 생성
  users.forEach((user) => {
    assignments.forEach((assignment) => {
      // 제출된 숙제 찾기
      const submission = (allHomeworks || []).find(
        (homework) =>
          homework.user_id === user.id &&
          homework.assignment_id === assignment.id,
      );

      progressData.push({
        userId: user.id,
        assignmentId: assignment.id,
        status: submission
          ? ("completed" as const)
          : ("not_completed" as const),
        url: submission?.url, // 제출한 경우 URL 정보 포함
        evaluationStatus: submission?.status || undefined, // 평가 상태 정보 포함
      });
    });
  });

  // 탭 아이템 정의
  const tabItems = [
    {
      id: "homework",
      label: "오늘의숙제",
      content: (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-black dark:text-zinc-50 mb-2">
              오늘의 과제
            </h2>
            <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-400">
              현재 진행 중인 과제입니다.
            </p>
          </div>

          {/* 오늘의 숙제 목록 */}
          <TodayAssignments assignments={todayAssignmentsData} />
        </div>
      ),
    },
    {
      id: "progress",
      label: "진행과정",
      content: (
        <div className="w-full">
          <ProgressGrid
            currentUserId={currentUserId}
            assignments={assignments}
            users={users}
            progressData={progressData}
          />
        </div>
      ),
    },
    // 관리자만 숙제 리스트 및 평가 탭 표시
    ...(isAdmin
      ? [
          {
            id: "assignment-list",
            label: "숙제리스트",
            content: (
              <div className="w-full space-y-4">
                {/* 헤더 영역: 제목과 글쓰기 버튼 */}
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-semibold text-black dark:text-zinc-50">
                    숙제 리스트
                  </h2>
                  <Link href="/assignment/new">
                    <Button className="bg-blue-500 hover:bg-blue-600 text-white">
                      글쓰기
                    </Button>
                  </Link>
                </div>
                <AssignmentList assignments={assignmentListData} />
              </div>
            ),
          },
          {
            id: "evaluation",
            label: "평가",
            content: (
              <EvaluationTab
                assignments={assignmentListData.map((assignment) => ({
                  id: assignment.id,
                  title: assignment.title,
                  content: assignment.content,
                  startDate: assignment.startDate,
                  endDate: assignment.endDate,
                }))}
              />
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full container flex-col py-8 px-4 sm:px-8 bg-white dark:bg-black sm:items-start">
        <Tabs items={tabItems} defaultTabId="homework" />
      </main>
    </div>
  );
}
