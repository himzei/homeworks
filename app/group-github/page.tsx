import Link from "next/link";

/** GitHub Organization 초대 수락 단계 */
const inviteSteps = [
  {
    step: 1,
    title: "초대 메일 확인",
    description:
      "강사 또는 운영진이 보낸 GitHub Organization 초대 메일을 확인합니다. 메일 제목에 organization 이름이 포함되어 있습니다.",
  },
  {
    step: 2,
    title: "Join organization 클릭",
    description:
      "메일 본문의 Join organization(또는 View invitation) 버튼을 클릭해 GitHub에 로그인합니다.",
  },
  {
    step: 3,
    title: "초대 수락",
    description:
      "GitHub 화면에서 Accept invitation을 눌러 조직에 가입합니다. 가입 후 우측 상단 프로필 → Your organizations에서 소속을 확인할 수 있습니다.",
  },
];

/** 팀 저장소 협업 단계 */
const collaborationSteps = [
  {
    step: 1,
    title: "팀 저장소 확인",
    description:
      "Organization 페이지에서 팀별로 생성된 저장소(repository)를 확인합니다. 저장소 이름은 보통 기수·조 번호 등으로 구분됩니다.",
  },
  {
    step: 2,
    title: "저장소 클론",
    description: "로컬 PC에서 작업할 저장소를 클론합니다.",
    code: `git clone https://github.com/조직이름/팀저장소이름.git
cd 팀저장소이름`,
  },
  {
    step: 3,
    title: "브랜치에서 작업 후 푸시",
    description:
      "main 브랜치에 바로 push하지 말고, 기능별 브랜치를 만들어 작업한 뒤 Pull Request로 병합하는 것을 권장합니다.",
    code: `git checkout -b feature/작업내용
# 파일 수정 후
git add .
git commit -m "작업 내용 설명"
git push -u origin feature/작업내용`,
  },
  {
    step: 4,
    title: "Pull Request 생성",
    description:
      "GitHub 저장소 페이지에서 Compare & pull request를 클릭해 PR을 만듭니다. 팀원 리뷰 후 main에 병합합니다.",
  },
];

/** himzei 등록 단계 */
const registerSteps = [
  {
    step: 1,
    title: "프로필에 GitHub 주소 등록",
    description:
      "개인 GitHub 프로필 URL을 himzei 프로필에 등록하면 상담·학습현황 등에서 확인할 수 있습니다.",
    link: { href: "/profile", label: "프로필 수정으로 이동" },
  },
  {
    step: 2,
    title: "조별 프로젝트 URL 등록",
    description:
      "팀 프로젝트 진행 시, 조별 GitHub 저장소 URL을 학습현황·관리자 화면에 등록합니다. 저장소가 Private이면 강사에게 Collaborator 권한을 부여하세요.",
    link: { href: "/learning-status", label: "학습현황으로 이동" },
  },
];

export default function GroupGithubPage() {
  return (
    <div className="min-h-full bg-zinc-50 dark:bg-zinc-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="container max-w-3xl">
        <header className="mb-8">
          <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2">
            빅데이터 전문가 양성과정
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-black dark:text-zinc-50 mb-3">
            그룹 깃허브
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed">
            교육 과정 GitHub Organization 가입, 팀 저장소 협업, himzei에 URL
            등록하는 방법을 안내합니다.
          </p>
        </header>

        {/* 요약 카드 */}
        <section className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border border-purple-200 dark:border-purple-800 p-6 mb-8">
          <h2 className="text-lg font-semibold text-black dark:text-zinc-50 mb-3">
            한눈에 보기
          </h2>
          <ol className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
            <li>1. GitHub 계정 생성 (없는 경우)</li>
            <li>2. Organization 초대 메일 수락</li>
            <li>3. 팀 저장소 클론 → 브랜치 작업 → Pull Request</li>
            <li>4. himzei 프로필·조별 프로젝트에 저장소 URL 등록</li>
          </ol>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-4 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            GitHub 바로가기 →
          </a>
        </section>

        {/* 그룹 GitHub란? */}
        <section className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
          <h2 className="text-2xl font-semibold text-black dark:text-zinc-50 mb-4">
            그룹 GitHub란?
          </h2>
          <p className="text-zinc-700 dark:text-zinc-300 text-sm leading-relaxed mb-4">
            <strong>그룹 GitHub</strong>는 교육 과정 전용{" "}
            <strong>GitHub Organization(조직)</strong>입니다. 기수·조별 팀
            프로젝트 코드를 한곳에서 관리하고, 팀원끼리 협업할 수 있도록
            제공됩니다.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-zinc-300 dark:border-zinc-700 text-sm">
              <thead>
                <tr className="bg-zinc-100 dark:bg-zinc-800">
                  <th className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-left text-black dark:text-zinc-50">
                    구분
                  </th>
                  <th className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-left text-black dark:text-zinc-50">
                    개인 GitHub
                  </th>
                  <th className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-left text-black dark:text-zinc-50">
                    그룹 GitHub (Organization)
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 font-medium text-black dark:text-zinc-50">
                    용도
                  </td>
                  <td className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-zinc-700 dark:text-zinc-300">
                    개인 과제(Gist), 포트폴리오
                  </td>
                  <td className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-zinc-700 dark:text-zinc-300">
                    조별·팀 프로젝트 협업
                  </td>
                </tr>
                <tr className="bg-zinc-50 dark:bg-zinc-800/50">
                  <td className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 font-medium text-black dark:text-zinc-50">
                    접근
                  </td>
                  <td className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-zinc-700 dark:text-zinc-300">
                    본인 계정으로 자유롭게 생성
                  </td>
                  <td className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-zinc-700 dark:text-zinc-300">
                    초대 수락 후 Organization 멤버
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
            개인 과제 제출은{" "}
            <Link
              href="/how-work"
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              과제제출방법
            </Link>
            의 Gist 방식을, 팀 프로젝트는 그룹 GitHub 저장소를 사용합니다.
          </p>
        </section>

        {/* 1. Organization 가입 */}
        <section className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
          <h2 className="text-2xl font-semibold text-black dark:text-zinc-50 mb-2">
            1. Organization 초대 수락하기
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6 text-sm">
            GitHub 계정이 없다면{" "}
            <a
              href="https://github.com/signup"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              github.com/signup
            </a>
            에서 먼저 가입하세요.
          </p>

          <ol className="space-y-6">
            {inviteSteps.map((item) => (
              <li key={item.step} className="flex gap-4">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-100 text-sm font-bold text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
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
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* 2. 팀 저장소 협업 */}
        <section className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
          <h2 className="text-2xl font-semibold text-black dark:text-zinc-50 mb-6">
            2. 팀 저장소에서 협업하기
          </h2>

          <ol className="space-y-6">
            {collaborationSteps.map((item) => (
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
                  {item.code ? (
                    <div className="mt-3 bg-zinc-900 dark:bg-black rounded-lg p-4">
                      <pre className="text-green-400 font-mono text-sm whitespace-pre-wrap">
                        {item.code}
                      </pre>
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* 3. himzei 등록 */}
        <section className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
          <h2 className="text-2xl font-semibold text-black dark:text-zinc-50 mb-6">
            3. himzei에 GitHub URL 등록하기
          </h2>

          <ol className="space-y-6">
            {registerSteps.map((item) => (
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
            협업 시 주의사항
          </h2>
          <ul className="space-y-2 text-sm text-yellow-900 dark:text-yellow-200/90 list-disc list-inside">
            <li>
              Organization 초대 메일이 오지 않으면 강사 또는 운영진에게
              GitHub 아이디(사용자명)를 알려주세요.
            </li>
            <li>
              팀 저장소 URL은{" "}
              <code className="bg-yellow-100 dark:bg-yellow-900/30 px-1 rounded text-xs">
                https://github.com/조직/저장소
              </code>{" "}
              형식으로 등록하세요.
            </li>
            <li>
              Private 저장소는 강사·운영진이 코드를 확인할 수 있도록 Read
              권한 이상을 부여해야 합니다.
            </li>
            <li>
              Git 기초가 필요하면{" "}
              <Link
                href="/git-how"
                className="font-medium text-yellow-800 underline dark:text-yellow-300"
              >
                깃이란?
              </Link>{" "}
              페이지를 먼저 참고하세요.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
