"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAdmin } from "@/lib/auth/SessionProvider";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/app/_components/ui/avatar";
import StudentConsultationModal from "@/app/_components/StudentConsultationModal";

// 학생 프로필 타입 정의
interface StudentProfile {
  id: string;
  name: string;
  email: string | null;
  group_name: string | null;
  phone: string | null;
  bio: string | null;
  avatar_url: string | null;
  github_url: string | null;
  university: string | null;
  major: string | null;
  created_at: string;
  // 상담 관련 정보
  latest_consultation_date: string | null; // 최근 상담일
  consultation_count: number; // 상담 횟수
}

export default function ConsultationTab() {
  // 전역 세션에서 관리자 권한 가져오기
  const { isAdmin, isCheckingAdmin } = useAdmin();

  // 학생 목록 상태
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 학생 상담 모달 상태
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(
    null,
  );
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // 학생 목록 가져오기
  useEffect(() => {
    const fetchStudents = async () => {
      if (isCheckingAdmin) return;

      try {
        setIsLoading(true);

        // Supabase 클라이언트 생성 (effect 내부에서 생성하여 의존성 문제 방지)
        const client = createClient();

        // 관리자가 아닌 학생들만 조회
        const { data, error: fetchError } = await client
          .from("profiles")
          .select(
            "id, name, group_name, phone, bio, avatar_url, github_url, university, major, created_at",
          )
          .neq("role", "admin") // 관리자 제외
          .order("name", { ascending: true }); // 이름 오름차순으로 정렬

        if (fetchError) {
          console.error("학생 목록 조회 실패:", fetchError);
          setError("학생 목록을 불러오는 중 오류가 발생했습니다.");
          setIsLoading(false);
          return;
        }

        // 학생 ID 배열 생성
        const studentIds = (data || []).map((student) => student.id);

        // 이메일 정보 가져오기 (RPC 함수 사용)
        let emailMap = new Map<string, string>();
        if (studentIds.length > 0) {
          const { data: emailData, error: emailError } = await client.rpc(
            "get_user_emails",
            { user_ids: studentIds },
          );

          if (!emailError && emailData) {
            // 이메일 맵 생성
            emailData.forEach((item: { user_id: string; email: string }) => {
              emailMap.set(item.user_id, item.email);
            });
          }
        }

        // 학생 데이터에 이메일 추가
        const studentsWithEmail = (data || []).map((student) => ({
          ...student,
          email: emailMap.get(student.id) || null,
        }));

        // 각 학생의 상담일지 정보 가져오기 (최근 상담일 및 상담 횟수)
        const studentsWithConsultationInfo = await Promise.all(
          studentsWithEmail.map(async (student) => {
            try {
              // 해당 학생의 상담일지 조회
              const { data: consultationLogs, error: consultationError } =
                await client
                  .from("consultation_logs")
                  .select("consultation_date")
                  .eq("student_id", student.id)
                  .order("consultation_date", { ascending: false });

              if (consultationError) {
                console.error(
                  `학생 ${student.id}의 상담일지 조회 실패:`,
                  consultationError,
                );
                return {
                  ...student,
                  latest_consultation_date: null,
                  consultation_count: 0,
                };
              }

              // 최근 상담일 (가장 최근 상담일지의 날짜)
              const latestDate =
                consultationLogs && consultationLogs.length > 0
                  ? consultationLogs[0].consultation_date
                  : null;

              // 상담 횟수
              const count = consultationLogs?.length || 0;

              return {
                ...student,
                latest_consultation_date: latestDate,
                consultation_count: count,
              };
            } catch (error) {
              console.error(
                `학생 ${student.id}의 상담일지 정보 가져오기 중 오류:`,
                error,
              );
              return {
                ...student,
                latest_consultation_date: null,
                consultation_count: 0,
              };
            }
          }),
        );

        setStudents(studentsWithConsultationInfo);
      } catch (error) {
        console.error("학생 목록 가져오기 중 오류:", error);
        setError("학생 목록을 불러오는 중 예기치 않은 오류가 발생했습니다.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCheckingAdmin]);

  // 에러가 발생한 경우 에러 메시지 표시
  if (error) {
    return (
      <div className="w-full space-y-4">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 text-center">
          <p className="text-yellow-700 dark:text-yellow-300 font-medium">
            {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* 헤더 */}
      <div>
        <h2 className="text-2xl font-semibold text-black dark:text-zinc-50 mb-2">
          학생 상담
        </h2>
        <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          {isAdmin
            ? "모든 학생의 상담 내역을 확인하고 답변할 수 있습니다."
            : "상담을 작성하고 관리자의 답변을 확인할 수 있습니다."}
        </p>
      </div>

      {/* 학생 목록 - 4열 그리드 */}
      {students.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-8 text-center">
          <p className="text-zinc-500 dark:text-zinc-400">
            등록된 학생이 없습니다.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {students.map((student) => (
            <div
              key={student.id}
              onClick={() => {
                setSelectedStudent(student);
                setIsModalOpen(true);
              }}
              className="bg-white h-64 flex flex-col justify-between dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-4 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="h-full flex flex-col">
                {/* 학생 아바타 및 이름 */}
                <div className="flex items-center gap-3 mb-3">
                  <Avatar size="lg" className="shrink-0">
                    {student.avatar_url ? (
                      <AvatarImage
                        src={student.avatar_url}
                        alt={student.name || "학생"}
                        className="object-cover"
                      />
                    ) : null}
                    <AvatarFallback className="bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 text-mdfont-medium">
                      {student.name
                        ? student.name.charAt(0).toUpperCase()
                        : "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-black dark:text-zinc-50 truncate">
                      {student.name || "이름 없음"}
                    </h3>
                    {student.email && (
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 truncate">
                        {student.email}
                      </p>
                    )}
                  </div>
                </div>

                {/* 그룹명 */}
                {student.group_name && (
                  <div className="mb-2">
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      <span className="font-medium">그룹:</span>{" "}
                      {student.group_name}
                    </p>
                  </div>
                )}

                {/* GitHub 주소 */}
                {student.github_url && (
                  <div className="mb-2">
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 overflow-hidden text-ellipsis whitespace-nowrap">
                      <a
                        href={student.github_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {student.github_url}
                      </a>
                    </p>
                  </div>
                )}

                {/* 전화번호 */}
                {student.phone && (
                  <div className="mb-2">
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      <span className="font-medium">전화:</span> {student.phone}
                    </p>
                  </div>
                )}

                {/* 자기소개 */}
                {student.bio && (
                  <div className="mb-3">
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 line-clamp-2">
                      {student.bio}
                    </p>
                  </div>
                )}
              </div>

              {/* 최근 상담일 및 상담 횟수 */}
              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                {student.latest_consultation_date ? (
                  <div className="space-y-1">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      최근 상담일:{" "}
                      {new Date(
                        student.latest_consultation_date,
                      ).toLocaleDateString("ko-KR", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      상담 횟수: {student.consultation_count}회
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    상담 이력 없음
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 학생 상담 모달 */}
      <StudentConsultationModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedStudent(null);
        }}
        student={selectedStudent}
      />
    </div>
  );
}
