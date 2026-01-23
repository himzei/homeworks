import Tabs from "@/app/_components/Tabs";
import ProgressGrid from "@/app/_components/ProgressGrid";
import HomeworkSubmission from "@/app/_components/HomeworkSubmission";

export default function Home() {
  // 샘플 데이터 - 실제로는 API나 데이터베이스에서 가져올 수 있습니다
  const currentUserId = "himzei"; // 현재 로그인한 사용자 ID

  // 과제 목록 데이터
  const assignments = [
    { id: "assignment-1", name: "Assignment 1" },
    { id: "assignment-2", name: "Assignment 2" },
    { id: "assignment-3", name: "Assignment 3" },
    { id: "assignment-4", name: "Assignment 4" },
    { id: "assignment-5", name: "Assignment 5" },
    { id: "assignment-6", name: "Assignment 6" },
  ];

  // 사용자 목록 데이터
  const users = [
    { id: "himzei", name: "himzei", section: "your" as const },
    { id: "eddiekim", name: "eddiekim", section: "everyone" as const },
    { id: "hasong925", name: "hasong925", section: "everyone" as const },
    { id: "ciel", name: "ciel", section: "everyone" as const },
    { id: "cheese.woo", name: "cheese.woo", section: "everyone" as const },
    { id: "pictur96", name: "pictur96", section: "everyone" as const },
    { id: "yunsup.j", name: "yunsup.j", section: "everyone" as const },
    { id: "enjoyg", name: "enjoyg", section: "everyone" as const },
  ];

  // 진행 상태 데이터 - 이미지에 맞춰 설정
  const progressData = [
    // YOUR PROGRESS (himzei)
    { userId: "himzei", assignmentId: "assignment-1", status: "completed" as const },
    { userId: "himzei", assignmentId: "assignment-2", status: "completed" as const },
    { userId: "himzei", assignmentId: "assignment-3", status: "completed" as const },
    { userId: "himzei", assignmentId: "assignment-4", status: "completed" as const },
    { userId: "himzei", assignmentId: "assignment-5", status: "not_completed" as const },
    { userId: "himzei", assignmentId: "assignment-6", status: "completed" as const },

    // EVERYONE'S PROGRESS - eddiekim
    { userId: "eddiekim", assignmentId: "assignment-1", status: "not_completed" as const },
    { userId: "eddiekim", assignmentId: "assignment-2", status: "completed" as const },
    { userId: "eddiekim", assignmentId: "assignment-3", status: "completed" as const },
    { userId: "eddiekim", assignmentId: "assignment-4", status: "completed" as const },
    { userId: "eddiekim", assignmentId: "assignment-5", status: "completed" as const },
    { userId: "eddiekim", assignmentId: "assignment-6", status: "completed" as const },

    // EVERYONE'S PROGRESS - hasong925
    { userId: "hasong925", assignmentId: "assignment-1", status: "completed" as const },
    { userId: "hasong925", assignmentId: "assignment-2", status: "not_completed" as const },
    { userId: "hasong925", assignmentId: "assignment-3", status: "completed" as const },
    { userId: "hasong925", assignmentId: "assignment-4", status: "completed" as const },
    { userId: "hasong925", assignmentId: "assignment-5", status: "completed" as const },
    { userId: "hasong925", assignmentId: "assignment-6", status: "completed" as const },

    // EVERYONE'S PROGRESS - ciel
    { userId: "ciel", assignmentId: "assignment-1", status: "completed" as const },
    { userId: "ciel", assignmentId: "assignment-2", status: "not_completed" as const },
    { userId: "ciel", assignmentId: "assignment-3", status: "completed" as const },
    { userId: "ciel", assignmentId: "assignment-4", status: "completed" as const },
    { userId: "ciel", assignmentId: "assignment-5", status: "completed" as const },
    { userId: "ciel", assignmentId: "assignment-6", status: "completed" as const },

    // EVERYONE'S PROGRESS - cheese.woo
    { userId: "cheese.woo", assignmentId: "assignment-1", status: "completed" as const },
    { userId: "cheese.woo", assignmentId: "assignment-2", status: "not_completed" as const },
    { userId: "cheese.woo", assignmentId: "assignment-3", status: "not_completed" as const },
    { userId: "cheese.woo", assignmentId: "assignment-4", status: "not_completed" as const },
    { userId: "cheese.woo", assignmentId: "assignment-5", status: "completed" as const },
    { userId: "cheese.woo", assignmentId: "assignment-6", status: "completed" as const },

    // EVERYONE'S PROGRESS - pictur96 (모두 완료)
    { userId: "pictur96", assignmentId: "assignment-1", status: "completed" as const },
    { userId: "pictur96", assignmentId: "assignment-2", status: "completed" as const },
    { userId: "pictur96", assignmentId: "assignment-3", status: "completed" as const },
    { userId: "pictur96", assignmentId: "assignment-4", status: "completed" as const },
    { userId: "pictur96", assignmentId: "assignment-5", status: "completed" as const },
    { userId: "pictur96", assignmentId: "assignment-6", status: "completed" as const },

    // EVERYONE'S PROGRESS - yunsup.j (모두 완료)
    { userId: "yunsup.j", assignmentId: "assignment-1", status: "completed" as const },
    { userId: "yunsup.j", assignmentId: "assignment-2", status: "completed" as const },
    { userId: "yunsup.j", assignmentId: "assignment-3", status: "completed" as const },
    { userId: "yunsup.j", assignmentId: "assignment-4", status: "completed" as const },
    { userId: "yunsup.j", assignmentId: "assignment-5", status: "completed" as const },
    { userId: "yunsup.j", assignmentId: "assignment-6", status: "completed" as const },

    // EVERYONE'S PROGRESS - enjoyg (모두 완료)
    { userId: "enjoyg", assignmentId: "assignment-1", status: "completed" as const },
    { userId: "enjoyg", assignmentId: "assignment-2", status: "completed" as const },
    { userId: "enjoyg", assignmentId: "assignment-3", status: "completed" as const },
    { userId: "enjoyg", assignmentId: "assignment-4", status: "completed" as const },
    { userId: "enjoyg", assignmentId: "assignment-5", status: "completed" as const },
    { userId: "enjoyg", assignmentId: "assignment-6", status: "completed" as const },
  ];

  // 탭 아이템 정의
  const tabItems = [
    {
      id: "homework",
      label: "오늘의숙제",
      content: (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-black dark:text-zinc-50">
            오늘의 숙제
          </h2>
          <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            오늘 해야 할 숙제 목록이 여기에 표시됩니다.
          </p>
          {/* 여기에 숙제 목록 컴포넌트를 추가할 수 있습니다 */}
          
          {/* URL 제출 박스 */}
          <HomeworkSubmission />
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
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-7xl flex-col py-8 px-4 sm:px-8 bg-white dark:bg-black sm:items-start">
        <Tabs items={tabItems} defaultTabId="homework" />
      </main>
    </div>
  );
}
