"use client";

import { useState } from "react";

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
  // 기본 탭 ID 설정 (없으면 첫 번째 탭)
  const [activeTabId, setActiveTabId] = useState<string>(
    defaultTabId || items[0]?.id || ""
  );

  return (
    <div className="w-full">
      {/* 탭 헤더 */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800">
        {items.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTabId(tab.id)}
            className={`
              px-6 py-3 text-sm font-medium transition-colors
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
      <div className="mt-6">
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
