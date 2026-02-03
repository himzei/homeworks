import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Check, X, Github, ArrowLeft, Edit } from "lucide-react";

interface UserProfilePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function UserProfilePage({
  params,
}: UserProfilePageProps) {
  // Next.js 15에서 params는 Promise이므로 await로 unwrap 필요
  const { id } = await params;
  const supabase = await createClient();

  // 현재 로그인한 사용자 확인
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  // 현재 로그인한 사용자의 ID와 URL의 id가 같으면 프로필 수정 페이지로 리다이렉트
  if (currentUser && currentUser.id === id) {
    redirect("/profile");
  }

  // 사용자 프로필 정보 가져오기
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  // 프로필을 찾을 수 없을 때
  if (profileError || !profile) {
    // 현재 로그인한 사용자 본인이라면 프로필 수정 페이지로 리다이렉트
    if (currentUser && currentUser.id === id) {
      redirect("/profile");
    }
    // 다른 사용자의 프로필을 찾을 수 없으면 not-found 페이지 표시
    notFound();
  }

  // 모든 과제 목록 가져오기
  const { data: assignmentsData } = await supabase
    .from("assignments")
    .select("id, title")
    .order("created_at", { ascending: false });

  // 해당 사용자의 제출 정보 가져오기
  const { data: homeworksData } = await supabase
    .from("homeworks")
    .select("assignment_id, url, status, created_at")
    .eq("user_id", id);

  // 과제별 제출 정보를 맵으로 변환
  const submissionMap = new Map();
  homeworksData?.forEach((homework) => {
    submissionMap.set(homework.assignment_id, {
      url: homework.url,
      status: homework.status || "검토중",
      submittedAt: homework.created_at,
    });
  });

  // 평가 상태에 따른 스타일 반환
  const getStatusStyle = (status?: string) => {
    switch (status) {
      case "검토중":
        return {
          bgColor: "bg-yellow-300",
          text: "검토중",
          textColor: "text-yellow-700 dark:text-yellow-300",
        };
      case "승인":
        return {
          bgColor: "bg-green-300",
          text: "승인",
          textColor: "text-green-700 dark:text-green-300",
        };
      case "수정필요":
        return {
          bgColor: "bg-orange-300",
          text: "수정필요",
          textColor: "text-orange-700 dark:text-orange-300",
        };
      case "모범답안":
        return {
          bgColor: "bg-blue-300",
          text: "모범답안",
          textColor: "text-blue-700 dark:text-blue-300",
        };
      default:
        return {
          bgColor: "bg-gray-400",
          text: "제출완료",
          textColor: "text-gray-700 dark:text-gray-300",
        };
    }
  };

  // 날짜 및 시간 포맷팅 함수
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const dateStr = date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const timeStr = date.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false, // 24시간 형식 사용
    });
    return `${dateStr} ${timeStr}`;
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-4xl flex-col py-8 px-4 sm:px-8 bg-white dark:bg-black">
        {/* 뒤로가기 및 프로필 수정 버튼 */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/home"
            className="inline-flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            뒤로가기
          </Link>
          <Link
            href="/profile"
            className="inline-flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            <Edit className="w-4 h-4" />
            프로필 수정
          </Link>
        </div>

        {/* 프로필 헤더 */}
        <div className="mb-8">
          <div className="flex items-start gap-6">
            {/* 아바타 */}
            <div className="flex-shrink-0">
              <div className="w-24 h-24 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center overflow-hidden border-2 border-zinc-300 dark:border-zinc-600">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-4xl text-zinc-400 dark:text-zinc-500">
                    {profile.name ? profile.name.charAt(0).toUpperCase() : "?"}
                  </div>
                )}
              </div>
            </div>

            {/* 사용자 정보 */}
            <div className="flex-1">
              <h1 className="text-3xl font-semibold text-black dark:text-zinc-50 mb-2">
                {profile.name}
              </h1>
              {profile.group_name && (
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                  {profile.group_name}
                </p>
              )}

              {/* GitHub 주소 섹션 */}
              <div>
                <h2 className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">
                  GitHub
                </h2>
                {profile.github_url ? (
                  <a
                    href={profile.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  >
                    <Github className="w-4 h-4" />
                    {profile.github_url}
                  </a>
                ) : (
                  <p className="text-zinc-400 dark:text-zinc-500 italic text-sm">
                    GitHub 주소가 등록되지 않았습니다.
                  </p>
                )}
              </div>

              {/* 자기소개 섹션 */}
              <div className="mb-4">
                <h2 className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">
                  자기소개
                </h2>
                {profile.bio ? (
                  <p className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
                    {profile.bio}
                  </p>
                ) : (
                  <p className="text-zinc-400 dark:text-zinc-500 italic">
                    자기소개가 없습니다.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 과제 진행 상황 */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-black dark:text-zinc-50 mb-4">
            과제 진행 상황
          </h2>
          {assignmentsData && assignmentsData.length > 0 ? (
            <div className="space-y-3">
              {assignmentsData.map((assignment) => {
                const submission = submissionMap.get(assignment.id);
                const statusStyle = getStatusStyle(submission?.status);

                return (
                  <div
                    key={assignment.id}
                    className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-black dark:text-zinc-50 mb-1">
                          {assignment.title}
                        </h3>
                        {submission ? (
                          <div className="flex items-center gap-4 mt-2">
                            <span
                              className={`px-3 py-1 rounded-md ${statusStyle.bgColor} ${statusStyle.textColor} font-medium text-xs`}
                            >
                              {statusStyle.text}
                            </span>
                            <span className="text-sm text-zinc-500 dark:text-zinc-400">
                              제출일: {formatDate(submission.submittedAt)}
                            </span>
                            {submission.url && (
                              <a
                                href={submission.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                제출물 보기 →
                              </a>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 mt-2">
                            <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                              <X className="w-3 h-3 text-white" />
                            </div>
                            <span className="text-sm text-zinc-500 dark:text-zinc-400">
                              미제출
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-zinc-500 dark:text-zinc-400">
              등록된 과제가 없습니다.
            </p>
          )}
        </div>

        {/* 통계 정보 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800">
            <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">
              전체 과제
            </div>
            <div className="text-2xl font-semibold text-black dark:text-zinc-50">
              {assignmentsData?.length || 0}
            </div>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800">
            <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">
              제출 완료
            </div>
            <div className="text-2xl font-semibold text-green-600 dark:text-green-400">
              {homeworksData?.length || 0}
            </div>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800">
            <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">
              제출률
            </div>
            <div className="text-2xl font-semibold text-black dark:text-zinc-50">
              {assignmentsData && assignmentsData.length > 0
                ? Math.round(
                    ((homeworksData?.length || 0) / assignmentsData.length) *
                      100,
                  )
                : 0}
              %
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
