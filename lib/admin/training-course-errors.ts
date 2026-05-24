import type { PostgrestError } from "@supabase/supabase-js";

/** Supabase/Postgres 오류를 사용자용 메시지로 변환 */
export function mapTrainingCourseError(error: PostgrestError): string {
  const message = error.message ?? "";
  const code = error.code ?? "";

  if (
    code === "PGRST204" ||
    message.includes("column") ||
    message.includes("schema cache")
  ) {
    return (
      "DB에 과정 일정·커리큘럼 컬럼이 없습니다. " +
      "Supabase에 마이그레이션(20260524120000, 20260524140000)을 적용한 뒤 " +
      "대시보드 → Settings → API → Reload schema를 실행해 주세요."
    );
  }

  if (code === "42P01" || message.includes("training_courses")) {
    return (
      "training_courses 테이블이 없습니다. " +
      "supabase db push 로 마이그레이션을 적용해 주세요."
    );
  }

  if (code === "23505") {
    return "이미 동일한 이름의 과정이 있습니다.";
  }

  if (code === "42501" || message.toLowerCase().includes("permission")) {
    return "저장 권한이 없습니다. 관리자 계정으로 로그인했는지 확인해 주세요.";
  }

  return message || "저장 중 오류가 발생했습니다.";
}
