"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface TabsProps {
  items: TabItem[];
  defaultTabId?: string;
}

export default function Tabs({ items, defaultTabId }: TabsProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // URL 쿼리 파라미터에서 탭 ID 가져오기
  const tabIdFromUrl = searchParams.get("tab");

  // 유효한 탭 ID인지 확인
  const isValidTabId = (id: string | null): boolean => {
    if (!id) return false;
    return items.some((item) => item.id === id);
  };

  // 초기 탭 ID 결정: URL 파라미터 > defaultTabId > 첫 번째 탭
  const getInitialTabId = (): string => {
    if (isValidTabId(tabIdFromUrl)) {
      return tabIdFromUrl!;
    }
    return defaultTabId || items[0]?.id || "";
  };

  const [activeTabId, setActiveTabId] = useState<string>(getInitialTabId());

  // URL 파라미터가 변경되면 탭 ID 업데이트 (브라우저 뒤로가기/앞으로가기 대응)
  useEffect(() => {
    if (isValidTabId(tabIdFromUrl) && tabIdFromUrl !== activeTabId) {
      setActiveTabId(tabIdFromUrl!);
    }
  }, [tabIdFromUrl, activeTabId]);

  // 브라우저 뒤로가기/앞으로가기 버튼 처리
  useEffect(() => {
    const handlePopState = () => {
      // URL에서 탭 ID 읽어오기
      const currentParams = new URLSearchParams(window.location.search);
      const currentTabId = currentParams.get("tab");
      if (isValidTabId(currentTabId) && currentTabId !== activeTabId) {
        setActiveTabId(currentTabId!);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [activeTabId, items]);

  // 탭 변경 핸들러: URL 쿼리 파라미터 업데이트 (서버 컴포넌트 재실행 방지)
  const handleTabChange = (tabId: string) => {
    setActiveTabId(tabId);
    // window.history.pushState를 사용하여 URL만 변경하고 서버 컴포넌트 재실행 방지
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tabId);
    const newUrl = `${pathname}?${params.toString()}`;
    // 브라우저 히스토리만 업데이트 (서버 컴포넌트 재실행 없음)
    window.history.pushState({}, "", newUrl);
  };

  return (
    <div className="w-full">
      {/* 탭 헤더 - 모바일에서 가로 스크롤 가능 */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto scrollbar-hide">
        {items.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`
              px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0
              ${
                activeTabId === tab.id
                  ? "border-b-2 border-black dark:border-white text-black dark:text-white"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 - 모든 탭을 렌더링하되 비활성 탭은 숨김 */}
      <div className="mt-4 sm:mt-6">
        {items.map((tab) => (
          <div
            key={tab.id}
            className={activeTabId === tab.id ? "block" : "hidden"}
          >
            {tab.content}
          </div>
        ))}
      </div>
    </div>
  );
}
