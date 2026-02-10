"use client";

import { useState } from "react";

export default function GitHowPage() {
  // 섹션 접기/펼치기 상태 관리
  const [expandedSections, setExpandedSections] = useState<Set<number>>(
    new Set([1, 2, 3, 4, 5]),
  );

  // 섹션 토글 함수
  const toggleSection = (sectionNum: number) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionNum)) {
      newExpanded.delete(sectionNum);
    } else {
      newExpanded.add(sectionNum);
    }
    setExpandedSections(newExpanded);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-black dark:text-zinc-50 mb-4">
            Git 기초 가이드
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            버전 관리 시스템의 기본을 배워봅시다
          </p>
        </div>

        {/* 섹션 1: Git이 뭔가요? */}
        <section className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
          <button
            onClick={() => toggleSection(1)}
            className="w-full flex items-center justify-between text-left mb-4"
          >
            <h2 className="text-2xl font-semibold text-black dark:text-zinc-50">
              1. Git이 뭔가요?
            </h2>
            <span className="text-zinc-500 dark:text-zinc-400">
              {expandedSections.has(1) ? "▼" : "▶"}
            </span>
          </button>

          {expandedSections.has(1) && (
            <div className="space-y-6">
              {/* 1-1 */}
              <div>
                <h3 className="text-xl font-semibold text-black dark:text-zinc-50 mb-3">
                  1-1. 이런 경험 있으신가요?
                </h3>
                <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4 mb-4">
                  <pre className="text-sm text-zinc-700 dark:text-zinc-300 font-mono">
                    {`보고서_최종.docx
보고서_최종_수정.docx
보고서_진짜최종.docx
보고서_진짜진짜최종_v2.docx`}
                  </pre>
                </div>
                <p className="text-zinc-700 dark:text-zinc-300">
                  파일을 수정할 때마다 이름을 바꿔서 저장한 경험, 다들 있으시죠?
                  코드도 마찬가지입니다. 기능을 추가하다가 갑자기 에러가 나면
                  "아까 되던 코드로 돌아가고 싶다!"는 생각이 들 때가 있습니다.
                </p>
                <p className="mt-2 font-semibold text-blue-600 dark:text-blue-400">
                  Git은 이 문제를 해결해줍니다.
                </p>
              </div>

              {/* 1-2 */}
              <div>
                <h3 className="text-xl font-semibold text-black dark:text-zinc-50 mb-3">
                  1-2. Git이란?
                </h3>
                <p className="text-zinc-700 dark:text-zinc-300 mb-2">
                  Git은 <strong>버전 관리 시스템(VCS)</strong>입니다. 쉽게 말해
                  코드의 <strong>타임머신</strong>이자{" "}
                  <strong>세이브 포인트</strong>입니다.
                </p>
                <p className="text-zinc-700 dark:text-zinc-300">
                  게임에서 세이브를 하면 언제든 그 시점으로 돌아갈 수 있죠?
                  Git도 마찬가지입니다. 코드가 잘 되는 시점에 "저장(커밋)"을
                  해두면, 나중에 코드가 망가져도 그 시점으로 돌아갈 수 있습니다.
                </p>
              </div>

              {/* 1-3 */}
              <div>
                <h3 className="text-xl font-semibold text-black dark:text-zinc-50 mb-3">
                  1-3. Git vs GitHub
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-zinc-300 dark:border-zinc-700">
                    <thead>
                      <tr className="bg-zinc-100 dark:bg-zinc-800">
                        <th className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-left text-black dark:text-zinc-50">
                          구분
                        </th>
                        <th className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-left text-black dark:text-zinc-50">
                          Git
                        </th>
                        <th className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-left text-black dark:text-zinc-50">
                          GitHub
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 font-medium text-black dark:text-zinc-50">
                          정체
                        </td>
                        <td className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-zinc-700 dark:text-zinc-300">
                          프로그램 (내 컴퓨터에 설치)
                        </td>
                        <td className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-zinc-700 dark:text-zinc-300">
                          웹사이트 (인터넷 저장소)
                        </td>
                      </tr>
                      <tr className="bg-zinc-50 dark:bg-zinc-800/50">
                        <td className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 font-medium text-black dark:text-zinc-50">
                          비유
                        </td>
                        <td className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-zinc-700 dark:text-zinc-300">
                          내 컴퓨터의 세이브 파일
                        </td>
                        <td className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-zinc-700 dark:text-zinc-300">
                          클라우드에 올린 세이브 파일
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 font-medium text-black dark:text-zinc-50">
                          역할
                        </td>
                        <td className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-zinc-700 dark:text-zinc-300">
                          버전 관리를 수행
                        </td>
                        <td className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-zinc-700 dark:text-zinc-300">
                          Git 저장소를 온라인에 보관
                        </td>
                      </tr>
                      <tr className="bg-zinc-50 dark:bg-zinc-800/50">
                        <td className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 font-medium text-black dark:text-zinc-50">
                          인터넷
                        </td>
                        <td className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-zinc-700 dark:text-zinc-300">
                          필요 없음
                        </td>
                        <td className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-zinc-700 dark:text-zinc-300">
                          필요함
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="mt-4 text-zinc-700 dark:text-zinc-300">
                  정리하면 Git은 내 컴퓨터에서 돌아가는 도구이고, GitHub는 그
                  결과물을 인터넷에 올려두는 서비스입니다.
                </p>
              </div>

              {/* 1-4 */}
              <div>
                <h3 className="text-xl font-semibold text-black dark:text-zinc-50 mb-3">
                  1-4. Git의 3가지 공간 (핵심 개념)
                </h3>
                <p className="text-zinc-700 dark:text-zinc-300 mb-4">
                  Git에는 파일이 거치는 3개의 공간이 있습니다. 이것만 이해하면
                  절반은 끝입니다.
                </p>
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-6 mb-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm sm:text-base">
                    <div className="text-center">
                      <div className="font-semibold text-black dark:text-zinc-50 mb-1">
                        작업 디렉토리
                      </div>
                      <div className="text-zinc-600 dark:text-zinc-400 text-xs">
                        (Working Dir)
                      </div>
                      <div className="text-zinc-500 dark:text-zinc-500 mt-2">
                        파일 수정
                      </div>
                    </div>
                    <div className="text-2xl text-zinc-400 dark:text-zinc-600">
                      →
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-black dark:text-zinc-50 mb-1">
                        스테이징 영역
                      </div>
                      <div className="text-zinc-600 dark:text-zinc-400 text-xs">
                        (Staging Area)
                      </div>
                      <div className="text-zinc-500 dark:text-zinc-500 mt-2">
                        git add
                      </div>
                    </div>
                    <div className="text-2xl text-zinc-400 dark:text-zinc-600">
                      →
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-black dark:text-zinc-50 mb-1">
                        저장소 (.git)
                      </div>
                      <div className="text-zinc-600 dark:text-zinc-400 text-xs">
                        (Repository)
                      </div>
                      <div className="text-zinc-500 dark:text-zinc-500 mt-2">
                        git commit
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                    비유로 설명하면:
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm">
                    <span className="text-zinc-700 dark:text-zinc-300">
                      📝 책상 위에서 작업
                    </span>
                    <span className="text-zinc-400">→</span>
                    <span className="text-zinc-700 dark:text-zinc-300">
                      📦 택배 상자에 담기
                    </span>
                    <span className="text-zinc-400">→</span>
                    <span className="text-zinc-700 dark:text-zinc-300">
                      ✅ 택배 발송 완료
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* 섹션 2: Git 설치 및 초기 설정 */}
        <section className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
          <button
            onClick={() => toggleSection(2)}
            className="w-full flex items-center justify-between text-left mb-4"
          >
            <h2 className="text-2xl font-semibold text-black dark:text-zinc-50">
              2. Git 설치 및 초기 설정
            </h2>
            <span className="text-zinc-500 dark:text-zinc-400">
              {expandedSections.has(2) ? "▼" : "▶"}
            </span>
          </button>

          {expandedSections.has(2) && (
            <div className="space-y-6">
              {/* 2-1 */}
              <div>
                <h3 className="text-xl font-semibold text-black dark:text-zinc-50 mb-3">
                  2-1. 설치 확인
                </h3>
                <p className="text-zinc-700 dark:text-zinc-300 mb-3">
                  터미널(명령 프롬프트)을 열고 아래 명령어를 입력하세요.
                </p>
                <div className="bg-zinc-900 dark:bg-black rounded-lg p-4">
                  <code className="text-green-400 font-mono text-sm">
                    git --version
                  </code>
                </div>
                <p className="mt-3 text-zinc-600 dark:text-zinc-400 text-sm">
                  <code className="bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">
                    git version 2.xx.x
                  </code>{" "}
                  같은 결과가 나오면 이미 설치되어 있는 것입니다.
                </p>
              </div>

              {/* 2-2 */}
              <div>
                <h3 className="text-xl font-semibold text-black dark:text-zinc-50 mb-3">
                  2-2. 설치가 안 되어 있다면
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-zinc-300 dark:border-zinc-700">
                    <thead>
                      <tr className="bg-zinc-100 dark:bg-zinc-800">
                        <th className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-left text-black dark:text-zinc-50">
                          운영체제
                        </th>
                        <th className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-left text-black dark:text-zinc-50">
                          설치 방법
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 font-medium text-black dark:text-zinc-50">
                          Windows
                        </td>
                        <td className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-zinc-700 dark:text-zinc-300">
                          https://git-scm.com 에서 다운로드 후 설치 (기본 설정
                          그대로 Next)
                        </td>
                      </tr>
                      <tr className="bg-zinc-50 dark:bg-zinc-800/50">
                        <td className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 font-medium text-black dark:text-zinc-50">
                          Mac
                        </td>
                        <td className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-zinc-700 dark:text-zinc-300">
                          터미널에서{" "}
                          <code className="bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded text-sm">
                            xcode-select --install
                          </code>{" "}
                          입력
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 2-3 */}
              <div>
                <h3 className="text-xl font-semibold text-black dark:text-zinc-50 mb-3">
                  2-3. 최초 1회 설정 (이름, 이메일)
                </h3>
                <p className="text-zinc-700 dark:text-zinc-300 mb-3">
                  Git을 처음 사용할 때 "나는 누구인지" 알려줘야 합니다. 아래
                  명령어에서 따옴표 안의 내용을 본인 정보로 바꿔 입력하세요.
                </p>
                <div className="bg-zinc-900 dark:bg-black rounded-lg p-4 mb-3">
                  <code className="text-green-400 font-mono text-sm block mb-2">
                    git config --global user.name "홍길동"
                  </code>
                  <code className="text-green-400 font-mono text-sm">
                    git config --global user.email "hong@example.com"
                  </code>
                </div>
                <p className="text-zinc-600 dark:text-zinc-400 text-sm">
                  설정이 잘 됐는지 확인하려면{" "}
                  <code className="bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">
                    git config --list
                  </code>{" "}
                  를 입력합니다.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* 섹션 3: 핵심 명령어 5개 */}
        <section className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
          <button
            onClick={() => toggleSection(3)}
            className="w-full flex items-center justify-between text-left mb-4"
          >
            <h2 className="text-2xl font-semibold text-black dark:text-zinc-50">
              3. 핵심 명령어 5개
            </h2>
            <span className="text-zinc-500 dark:text-zinc-400">
              {expandedSections.has(3) ? "▼" : "▶"}
            </span>
          </button>

          {expandedSections.has(3) && (
            <div className="space-y-6">
              {/* 명령어 한눈에 보기 */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <h3 className="font-semibold text-black dark:text-zinc-50 mb-3">
                  명령어 한눈에 보기
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <code className="bg-zinc-900 dark:bg-black text-green-400 px-2 py-1 rounded font-mono">
                      git init
                    </code>
                    <span className="text-zinc-600 dark:text-zinc-400">
                      → "여기서 Git 시작할게!"
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="bg-zinc-900 dark:bg-black text-green-400 px-2 py-1 rounded font-mono">
                      git status
                    </code>
                    <span className="text-zinc-600 dark:text-zinc-400">
                      → "지금 상태가 어때?"
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="bg-zinc-900 dark:bg-black text-green-400 px-2 py-1 rounded font-mono">
                      git add
                    </code>
                    <span className="text-zinc-600 dark:text-zinc-400">
                      → "이 파일 보낼 준비!"
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="bg-zinc-900 dark:bg-black text-green-400 px-2 py-1 rounded font-mono">
                      git commit
                    </code>
                    <span className="text-zinc-600 dark:text-zinc-400">
                      → "저장 확정!"
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="bg-zinc-900 dark:bg-black text-green-400 px-2 py-1 rounded font-mono">
                      git log
                    </code>
                    <span className="text-zinc-600 dark:text-zinc-400">
                      → "지금까지 기록 보여줘"
                    </span>
                  </div>
                </div>
              </div>

              {/* 각 명령어 설명 */}
              {[
                {
                  num: "3-1",
                  title: "git init — 저장소 만들기",
                  code: `mkdir my_project
cd my_project
git init`,
                  desc: "git init을 실행하면 해당 폴더가 Git 저장소가 됩니다. 숨겨진 .git 폴더가 생성되는데, 이 폴더가 모든 버전 기록을 보관합니다.",
                  warning:
                    "주의사항: .git 폴더를 절대 직접 수정하거나 삭제하지 마세요!",
                },
                {
                  num: "3-2",
                  title: "git status — 현재 상태 확인",
                  code: "git status",
                  desc: "이 명령어는 현재 어떤 파일이 수정되었고, 어떤 파일이 커밋 준비가 되었는지 알려줍니다.",
                  example: `On branch main

Untracked files:          ← "Git이 아직 모르는 새 파일이 있어요"
  hello.py

Changes not staged:       ← "수정했지만 아직 add 안 한 파일"
  modified: main.py

Changes to be committed:  ← "add 완료! 커밋하면 저장됩니다"
  new file: utils.py`,
                  tip: "팁: 뭘 해야 할지 모르겠으면 git status부터 치세요!",
                },
                {
                  num: "3-3",
                  title: "git add — 스테이징 (커밋 준비)",
                  code: `# 특정 파일 하나만 추가
git add hello.py

# 여러 파일 한번에 추가
git add hello.py main.py

# 현재 폴더의 모든 변경 파일 추가
git add .`,
                  desc: "git add는 '이 파일을 다음 커밋에 포함시키겠다'는 의미입니다.",
                },
                {
                  num: "3-4",
                  title: "git commit — 저장 확정",
                  code: `git commit -m "첫 번째 커밋: hello.py 추가"`,
                  desc: "-m 뒤에 오는 문자열은 커밋 메시지입니다. '이번에 뭘 했는지'를 간단히 적는 것입니다.",
                  goodBad: {
                    good: [
                      "로그인 기능 추가",
                      "비밀번호 유효성 검사 버그 수정",
                      "README 파일 작성",
                    ],
                    bad: ["수정", "asdf", "ㅋㅋ", "최종"],
                  },
                },
                {
                  num: "3-5",
                  title: "git log — 커밋 기록 보기",
                  code: `# 전체 로그 보기
git log

# 한 줄씩 간단히 보기 (추천!)
git log --oneline`,
                  example: `a1b2c3d (HEAD -> main) 비밀번호 검증 기능 추가
f4e5d6c 로그인 기능 구현
7a8b9c0 첫 번째 커밋: 프로젝트 생성`,
                  desc: "앞의 영문+숫자 조합은 커밋 ID입니다. 나중에 특정 시점으로 돌아갈 때 이 ID를 사용합니다.",
                },
              ].map((cmd) => (
                <div key={cmd.num} className="border-l-4 border-blue-500 pl-4">
                  <h3 className="text-xl font-semibold text-black dark:text-zinc-50 mb-3">
                    {cmd.title}
                  </h3>
                  <div className="bg-zinc-900 dark:bg-black rounded-lg p-4 mb-3">
                    <pre className="text-green-400 font-mono text-sm whitespace-pre-wrap">
                      {cmd.code}
                    </pre>
                  </div>
                  {cmd.desc && (
                    <p className="text-zinc-700 dark:text-zinc-300 mb-3">
                      {cmd.desc}
                    </p>
                  )}
                  {cmd.example && (
                    <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4 mb-3">
                      <p className="text-sm font-semibold text-black dark:text-zinc-50 mb-2">
                        출력 예시:
                      </p>
                      <pre className="text-sm text-zinc-700 dark:text-zinc-300 font-mono whitespace-pre-wrap">
                        {cmd.example}
                      </pre>
                    </div>
                  )}
                  {cmd.goodBad && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                      <div>
                        <p className="text-sm font-semibold text-green-600 dark:text-green-400 mb-2">
                          좋은 예:
                        </p>
                        <ul className="list-disc list-inside text-sm text-zinc-700 dark:text-zinc-300 space-y-1">
                          {cmd.goodBad.good.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2">
                          나쁜 예:
                        </p>
                        <ul className="list-disc list-inside text-sm text-zinc-700 dark:text-zinc-300 space-y-1">
                          {cmd.goodBad.bad.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                  {cmd.warning && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">
                        ⚠️ {cmd.warning}
                      </p>
                    </div>
                  )}
                  {cmd.tip && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        💡 {cmd.tip}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 섹션 4: 실습 */}
        <section className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
          <button
            onClick={() => toggleSection(4)}
            className="w-full flex items-center justify-between text-left mb-4"
          >
            <h2 className="text-2xl font-semibold text-black dark:text-zinc-50">
              4. 실습 — 나만의 첫 저장소
            </h2>
            <span className="text-zinc-500 dark:text-zinc-400">
              {expandedSections.has(4) ? "▼" : "▶"}
            </span>
          </button>

          {expandedSections.has(4) && (
            <div className="space-y-6">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <h3 className="font-semibold text-green-700 dark:text-green-300 mb-2">
                  실습 목표
                </h3>
                <p className="text-green-700 dark:text-green-300 text-sm">
                  파이썬 파일을 만들고, 수정하면서 Git으로 버전을 관리해봅니다.
                </p>
              </div>

              {[
                {
                  step: "Step 1",
                  title: "프로젝트 폴더 생성 및 Git 초기화",
                  code: `mkdir python_practice
cd python_practice
git init`,
                  result:
                    "Initialized empty Git repository in .../python_practice/.git/",
                },
                {
                  step: "Step 2",
                  title: "첫 번째 파일 만들기",
                  code: `# hello.py
print("안녕하세요! Git 실습입니다.")`,
                  file: "hello.py",
                },
                {
                  step: "Step 3",
                  title: "상태 확인 → 추가 → 커밋",
                  code: `git status          # hello.py가 Untracked로 표시됨
git add hello.py    # 스테이징
git status          # hello.py가 "Changes to be committed"로 변경됨
git commit -m "첫 번째 커밋: hello.py 생성"`,
                },
                {
                  step: "Step 4",
                  title: "파일 수정 후 두 번째 커밋",
                  code: `# hello.py
def greet(name):
    print(f"안녕하세요, {name}님! Git 실습입니다.")

greet("철수")`,
                  commands: `git status          # hello.py가 "modified"로 표시됨
git add hello.py
git commit -m "greet 함수 추가"`,
                  file: "hello.py",
                },
                {
                  step: "Step 5",
                  title: "새 파일 추가 후 세 번째 커밋",
                  code: `# calculator.py
def add(a, b):
    return a + b

def subtract(a, b):
    return a - b

print(add(3, 5))        # 8
print(subtract(10, 4))  # 6`,
                  commands: `git add calculator.py
git commit -m "계산기 함수 추가 (add, subtract)"`,
                  file: "calculator.py",
                },
                {
                  step: "Step 6",
                  title: "커밋 기록 확인",
                  code: "git log --oneline",
                  result: `c3d4e5f (HEAD -> main) 계산기 함수 추가 (add, subtract)
a1b2c3d greet 함수 추가
7a8b9c0 첫 번째 커밋: hello.py 생성`,
                  success:
                    "축하합니다! 3개의 버전(세이브 포인트)이 만들어졌습니다!",
                },
                {
                  step: "Step 7",
                  title: "과거 코드 확인해보기",
                  code: `# 첫 번째 커밋 시점의 hello.py 내용 보기
git show 7a8b9c0:hello.py`,
                  desc: "아까 작성한 첫 번째 버전의 코드가 보입니다. 이처럼 Git은 모든 변경 기록을 보관하고 있어서 언제든 과거 시점의 코드를 확인할 수 있습니다.",
                },
              ].map((step) => (
                <div
                  key={step.step}
                  className="border-l-4 border-green-500 pl-4 pb-4"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-3 py-1 rounded-full text-sm font-semibold">
                      {step.step}
                    </span>
                    <h3 className="text-lg font-semibold text-black dark:text-zinc-50">
                      {step.title}
                    </h3>
                  </div>
                  {step.file && (
                    <div className="mb-3">
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                        {step.file} 파일을 만들고 아래 내용을 작성하세요.
                      </p>
                    </div>
                  )}
                  {step.code && (
                    <div className="bg-zinc-900 dark:bg-black rounded-lg p-4 mb-3">
                      <pre className="text-green-400 font-mono text-sm whitespace-pre-wrap">
                        {step.code}
                      </pre>
                    </div>
                  )}
                  {step.commands && (
                    <div className="bg-zinc-900 dark:bg-black rounded-lg p-4 mb-3">
                      <pre className="text-green-400 font-mono text-sm whitespace-pre-wrap">
                        {step.commands}
                      </pre>
                    </div>
                  )}
                  {step.result && (
                    <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4 mb-3">
                      <p className="text-sm font-semibold text-black dark:text-zinc-50 mb-2">
                        결과:
                      </p>
                      <pre className="text-sm text-zinc-700 dark:text-zinc-300 font-mono whitespace-pre-wrap">
                        {step.result}
                      </pre>
                    </div>
                  )}
                  {step.success && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                      <p className="text-sm text-green-700 dark:text-green-300">
                        🎉 {step.success}
                      </p>
                    </div>
                  )}
                  {step.desc && (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {step.desc}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 섹션 5: GitHub에 올려보기 */}
        <section className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
          <button
            onClick={() => toggleSection(5)}
            className="w-full flex items-center justify-between text-left mb-4"
          >
            <h2 className="text-2xl font-semibold text-black dark:text-zinc-50">
              5. GitHub에 올려보기
            </h2>
            <span className="text-zinc-500 dark:text-zinc-400">
              {expandedSections.has(5) ? "▼" : "▶"}
            </span>
          </button>

          {expandedSections.has(5) && (
            <div className="space-y-6">
              {[
                {
                  num: "5-1",
                  title: "GitHub 가입",
                  desc: "https://github.com 에서 계정을 만듭니다 (무료).",
                },
                {
                  num: "5-2",
                  title: "새 저장소(Repository) 만들기",
                  steps: [
                    "GitHub 우측 상단 + 버튼 클릭하고 New repository를 선택합니다",
                    "Repository name에 python_practice를 입력합니다",
                    "Public(공개)을 선택합니다",
                    "나머지는 체크하지 않고 Create repository를 클릭합니다",
                  ],
                },
                {
                  num: "5-3",
                  title: "내 코드를 GitHub에 올리기",
                  code: `git remote add origin https://github.com/내아이디/python_practice.git
git branch -M main
git push -u origin main`,
                  table: [
                    {
                      cmd: "git remote add origin 주소",
                      meaning:
                        '"이 GitHub 주소를 origin이라는 이름으로 연결해줘"',
                    },
                    {
                      cmd: "git branch -M main",
                      meaning: '"현재 브랜치 이름을 main으로 할게"',
                    },
                    {
                      cmd: "git push -u origin main",
                      meaning: '"내 커밋들을 GitHub에 올려줘!"',
                    },
                  ],
                },
                {
                  num: "5-4",
                  title: "앞으로 코드를 수정할 때마다",
                  code: `# 1. 코드 수정
# 2. add + commit
git add .
git commit -m "변경 내용 설명"

# 3. GitHub에 반영
git push`,
                  desc: "이 3단계가 Git 사용의 기본 루틴입니다.",
                },
              ].map((section) => (
                <div
                  key={section.num}
                  className="border-l-4 border-purple-500 pl-4"
                >
                  <h3 className="text-xl font-semibold text-black dark:text-zinc-50 mb-3">
                    {section.title}
                  </h3>
                  {section.desc && (
                    <p className="text-zinc-700 dark:text-zinc-300 mb-3">
                      {section.desc}
                    </p>
                  )}
                  {section.steps && (
                    <ol className="list-decimal list-inside space-y-2 text-zinc-700 dark:text-zinc-300">
                      {section.steps.map((step, idx) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ol>
                  )}
                  {section.code && (
                    <div className="bg-zinc-900 dark:bg-black rounded-lg p-4 mb-3">
                      <pre className="text-green-400 font-mono text-sm whitespace-pre-wrap">
                        {section.code}
                      </pre>
                    </div>
                  )}
                  {section.table && (
                    <div className="overflow-x-auto mb-3">
                      <table className="w-full border-collapse border border-zinc-300 dark:border-zinc-700">
                        <thead>
                          <tr className="bg-zinc-100 dark:bg-zinc-800">
                            <th className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-left text-black dark:text-zinc-50">
                              명령어
                            </th>
                            <th className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-left text-black dark:text-zinc-50">
                              의미
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {section.table.map((row, idx) => (
                            <tr
                              key={idx}
                              className={
                                idx % 2 === 0
                                  ? "bg-white dark:bg-zinc-900"
                                  : "bg-zinc-50 dark:bg-zinc-800/50"
                              }
                            >
                              <td className="border border-zinc-300 dark:border-zinc-700 px-4 py-2">
                                <code className="bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded text-sm">
                                  {row.cmd}
                                </code>
                              </td>
                              <td className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-zinc-700 dark:text-zinc-300">
                                {row.meaning}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 명령어 치트시트 */}
        <section className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg shadow-sm border border-blue-200 dark:border-blue-800 p-6 mb-6">
          <h2 className="text-2xl font-semibold text-black dark:text-zinc-50 mb-4">
            명령어 정리
          </h2>
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 border border-zinc-200 dark:border-zinc-800">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {[
                { cmd: "git init", desc: "새 저장소 만들기" },
                { cmd: "git status", desc: "현재 상태 확인" },
                { cmd: "git add 파일명", desc: "커밋할 파일 지정" },
                { cmd: "git add .", desc: "모든 변경 파일 지정" },
                { cmd: 'git commit -m ""', desc: "변경사항 확정 저장" },
                { cmd: "git log", desc: "커밋 기록 보기" },
                { cmd: "git log --oneline", desc: "커밋 기록 한줄로 보기" },
                { cmd: "git remote add", desc: "GitHub 저장소 연결" },
                { cmd: "git push", desc: "GitHub에 업로드" },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg"
                >
                  <code className="bg-zinc-900 dark:bg-black text-green-400 px-2 py-1 rounded font-mono text-sm shrink-0">
                    {item.cmd}
                  </code>
                  <span className="text-zinc-700 dark:text-zinc-300 text-sm">
                    {item.desc}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-zinc-200 dark:border-zinc-700 pt-4">
              <p className="text-sm font-semibold text-black dark:text-zinc-50 mb-2">
                [일상 루틴]
              </p>
              <div className="bg-zinc-900 dark:bg-black rounded-lg p-4">
                <code className="text-green-400 font-mono text-sm">
                  코드 수정 → git add . → git commit -m "" → git push
                </code>
              </div>
            </div>
          </div>
        </section>

        {/* 자주 하는 실수 & 해결법 */}
        <section className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-6">
          <h2 className="text-2xl font-semibold text-black dark:text-zinc-50 mb-4">
            자주 하는 실수 & 해결법
          </h2>
          <div className="space-y-4">
            {[
              {
                title: "실수 1: '커밋할 게 없다고 나와요'",
                error: "nothing to commit, working tree clean",
                solution:
                  "add를 하지 않았거나, 파일을 수정하지 않은 상태입니다. git status로 현재 상태를 먼저 확인하세요.",
              },
              {
                title: "실수 2: '커밋 메시지를 안 썼어요' (vim 화면이 나올 때)",
                error:
                  "-m 옵션 없이 git commit만 입력하면 텍스트 편집기(vim)가 열립니다.",
                solution: `당황하지 말고 아래를 입력하세요.

:q!     ← 저장 안 하고 나가기

그런 다음 -m 옵션을 붙여서 다시 커밋하세요.

git commit -m "메시지 입력"`,
              },
              {
                title: "실수 3: 'add를 잘못했어요'",
                solution: `git reset HEAD 파일명     # 스테이징 취소 (파일 내용은 안 바뀜)`,
              },
              {
                title: "실수 4: '.git 폴더를 지워버렸어요'",
                solution:
                  ".git 폴더가 삭제되면 모든 커밋 기록이 사라집니다. 복구 불가능하므로 이 폴더는 절대 삭제하지 마세요.",
              },
            ].map((mistake, idx) => (
              <div
                key={idx}
                className="border-l-4 border-red-500 pl-4 bg-red-50 dark:bg-red-900/10 rounded-r-lg p-4"
              >
                <h3 className="font-semibold text-red-700 dark:text-red-400 mb-2">
                  {mistake.title}
                </h3>
                {mistake.error && (
                  <div className="bg-zinc-900 dark:bg-black rounded-lg p-3 mb-2">
                    <code className="text-red-400 font-mono text-sm">
                      {mistake.error}
                    </code>
                  </div>
                )}
                <div className="bg-white dark:bg-zinc-800 rounded-lg p-3">
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                    {mistake.solution}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
