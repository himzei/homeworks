"use client";

import { useState } from "react";

export default function HomeworkSubmission() {
  // URL 입력 상태 관리
  const [url, setUrl] = useState<string>("");
  // 저장 성공/실패 상태 관리
  const [isSaved, setIsSaved] = useState<boolean>(false);
  // 저장 중 상태 관리
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // 저장 버튼 클릭 핸들러
  const handleSave = async () => {
    // URL 유효성 검사
    if (!url.trim()) {
      alert("URL을 입력해주세요.");
      return;
    }

    // URL 형식 검사 (간단한 검증)
    try {
      new URL(url);
    } catch {
      alert("올바른 URL 형식이 아닙니다.");
      return;
    }

    setIsSaving(true);

    // 실제로는 API 호출로 서버에 저장
    // 여기서는 시뮬레이션을 위해 setTimeout 사용
    setTimeout(() => {
      setIsSaving(false);
      setIsSaved(true);
      // 3초 후 성공 메시지 숨기기
      setTimeout(() => setIsSaved(false), 3000);
    }, 500);
  };

  return (
    <div className="w-full bg-white dark:bg-zinc-900 rounded-lg shadow-md border border-zinc-200 dark:border-zinc-800 p-6 mt-8">
      {/* 제목 */}
      <h3 className="text-xl font-semibold text-black dark:text-zinc-50 text-center mb-4">
        과제 제출하기
      </h3>

      {/* 안내 텍스트 */}
      <div className="space-y-2 mb-6 text-center">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          제출 방법에 맞는 URL을 여기에 붙여 넣으세요.
        </p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          제출 기한 내에 언제든 해당 URL을 수정할 수 있습니다.
        </p>
      </div>

      {/* URL 입력 필드와 저장 버튼 */}
      <div className="flex gap-3">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste your awesome URL here!"
          className="flex-1 px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          onKeyDown={(e) => {
            // Enter 키로 저장 가능
            if (e.key === "Enter") {
              handleSave();
            }
          }}
        />
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors whitespace-nowrap"
        >
          {isSaving ? "저장 중..." : "저장"}
        </button>
      </div>

      {/* 저장 성공 메시지 */}
      {isSaved && (
        <div className="mt-4 text-center text-sm text-green-600 dark:text-green-400">
          저장되었습니다!
        </div>
      )}
    </div>
  );
}
