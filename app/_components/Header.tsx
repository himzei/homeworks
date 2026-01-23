export default function Header() {
  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black">

        <div className="container mx-auto flex items-center justify-between h-16">
          {/* 왼쪽 영역 (비어있음) */}
          <div className="">
            <h1 className="text-xl font-semibold text-black dark:text-zinc-50 text-center">
              과제제출
            </h1>
          </div>

            
          {/* 오른쪽 영역 - 회원가입, 로그인 버튼 */}
          <div className=" gap-3">
            <button className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white transition-colors">
              회원가입
            </button>
            <button className="px-4 py-2 text-sm font-medium bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors">
              로그인
            </button>
          </div>
        </div>

    </header>
  );
}