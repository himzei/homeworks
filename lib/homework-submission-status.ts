/** 과제 제출물 검토 상태 배지 스타일 */
export function getHomeworkSubmissionStatusStyle(status?: string) {
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
}
