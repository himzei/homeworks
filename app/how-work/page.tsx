import Link from "next/link";
import { HOMEWORK_GUIDE_URL } from "@/lib/navigation";

/** GitHub Gist 작성 단계 */
const gistSteps = [
  {
    step: 1,
    title: "Gist description 입력",
    description:
      "Gist 설명란에 과제 번호를 입력합니다. 예: assignment1",
    example: "assignment1",
  },
  {
    step: 2,
    title: "파일명 입력",
    description:
      "Filename including extension(확장자 포함 파일명)에 과제 파일명을 입력합니다.",
    example: "assignment1.txt",
  },
  {
    step: 3,
    title: "과제 내용 작성",
    description:
      "과제 내용을 복사해 컨텐츠 영역에 붙여넣은 뒤, 문제를 모두 풀어 작성합니다.",
  },
  {
    step: 4,
    title: "Secret Gist 생성",
    description:
      "오른쪽 하단의 초록색 버튼 Create secret gist를 클릭합니다.",
    highlight: "Create secret gist",
  },
  {
    step: 5,
    title: "공유 모드로 변경",
    description:
      "오른쪽 위 콤보박스에서 embed로 표시된 항목을 클릭한 뒤 Share로 변경합니다.",
    highlight: "embed → Share",
  },
  {
    step: 6,
    title: "링크 복사",
    description: "링크 복사 버튼을 클릭해 Gist URL을 복사합니다.",
  },
];

/** himzei 제출 단계 */
const submitSteps = [
  {
    step: 7,
    title: "로그인",
    description: "himzei.com에 로그인합니다.",
    link: { href: "/home", label: "과제 홈으로 이동" },
  },
  {
    step: 8,
    title: "과제 URL 제출",
    description:
      "오늘의 과제 페이지에서 과제 제출 박스에 복사한 Gist 링크를 붙여넣고 제출합니다.",
    link: { href: "/homework", label: "오늘의 과제로 이동" },
  },
  {
    step: 9,
    title: "제출 확인",
    description:
      "제출이 완료되면 과제 제출 확인 메일을 받을 수 있습니다.",
  },
];

export default function WorkHowPage() {
  return (
    <div className="min-h-full bg-zinc-50 dark:bg-zinc-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="container max-w-3xl">
        {/* 요약 카드 */}
        <section className="bg-gradient-to-br from-blue-50 to-emerald-50 dark:from-blue-900/20 dark:to-emerald-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-6 mb-8">
          <h2 className="text-lg font-semibold text-black dark:text-zinc-50 mb-3">
            한눈에 보기
          </h2>
          <ol className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
            <li>1. GitHub Gist에서 과제 작성 후 Secret Gist 생성</li>
            <li>2. embed → Share로 변경 후 링크 복사</li>
            <li>3. himzei 로그인 → 과제 제출 박스에 URL 붙여넣기</li>
            <li>4. 제출 확인 메일 수신</li>
          </ol>
          <a
            href="https://gist.github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-4 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            GitHub Gist 바로가기 →
          </a>
        </section>

        {/* 1. Gist 작성 */}
        <section className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
          <h2 className="text-2xl font-semibold text-black dark:text-zinc-50 mb-2">
            1. GitHub Gist에 과제 작성하기
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6 text-sm">
            GitHub 계정으로{" "}
            <a
              href="https://gist.github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              gist.github.com
            </a>
            에 접속합니다.
          </p>

          <ol className="space-y-6">
            {gistSteps.map((item) => (
              <li key={item.step} className="flex gap-4">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                  aria-hidden
                >
                  {item.step}
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-black dark:text-zinc-50 mb-1">
                    {item.title}
                  </h3>
                  <p className="text-zinc-700 dark:text-zinc-300 text-sm leading-relaxed">
                    {item.description}
                  </p>
                  {item.example ? (
                    <div className="mt-3 bg-zinc-900 dark:bg-black rounded-lg px-4 py-3">
                      <code className="text-green-400 font-mono text-sm">
                        {item.example}
                      </code>
                    </div>
                  ) : null}
                  {item.highlight ? (
                    <p className="mt-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                      → {item.highlight}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* 2. himzei 제출 */}
        <section className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
          <h2 className="text-2xl font-semibold text-black dark:text-zinc-50 mb-6">
            2. himzei에서 과제 제출하기
          </h2>

          <ol className="space-y-6">
            {submitSteps.map((item) => (
              <li key={item.step} className="flex gap-4">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                  aria-hidden
                >
                  {item.step}
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-black dark:text-zinc-50 mb-1">
                    {item.title}
                  </h3>
                  <p className="text-zinc-700 dark:text-zinc-300 text-sm leading-relaxed">
                    {item.description}
                  </p>
                  {item.link ? (
                    <Link
                      href={item.link.href}
                      className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {item.link.label} →
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* 주의사항 */}
        <section className="bg-yellow-50 dark:bg-yellow-900/10 rounded-lg border border-yellow-200 dark:border-yellow-800 p-6 mb-6">
          <h2 className="text-lg font-semibold text-yellow-800 dark:text-yellow-300 mb-3">
            제출 전 확인사항
          </h2>
          <ul className="space-y-2 text-sm text-yellow-900 dark:text-yellow-200/90 list-disc list-inside">
            <li>
              Gist는 반드시 <strong>Secret Gist</strong>로 생성하고, 공유
              설정을 <strong>Share</strong>로 변경해야 합니다.
            </li>
            <li>
              파일명과 description은 과제 안내에 맞게 입력하세요. (예:
              assignment1, assignment1.txt)
            </li>
            <li>과제 내용을 모두 작성한 뒤 링크를 복사해 제출하세요.</li>
            <li>
              제출 후 확인 메일이 오지 않으면 URL이 올바른지 다시 확인하세요.
            </li>
          </ul>
        </section>

        {/* 원본 Notion 링크 */}
        <footer className="text-center text-sm text-zinc-500 dark:text-zinc-500">
          <a
            href={HOMEWORK_GUIDE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-zinc-700 dark:hover:text-zinc-300 hover:underline"
          >
            원본 Notion 가이드 보기
          </a>
        </footer>
      </div>
    </div>
  );
}
