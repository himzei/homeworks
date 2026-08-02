"use client";

import { useEffect, useState } from "react";

import { DOCKER_SECTIONS } from "@/app/docker/sections";
import { cn } from "@/lib/utils";

/** 상단 고정 서브메뉴 높이만큼 여유를 둔 스크롤 위치 보정값(px) */
const SCROLL_OFFSET = 72;

/**
 * 도커 페이지 오른쪽 목차.
 * - 클릭하면 해당 섹션으로 부드럽게 이동
 * - 스크롤 위치에 따라 현재 섹션을 강조
 */
export default function DockerToc() {
  const [activeId, setActiveId] = useState<string>(DOCKER_SECTIONS[0].id);

  useEffect(() => {
    // 화면 상단에 가장 가까운 섹션을 현재 위치로 판단
    const updateActiveSection = () => {
      let currentId = DOCKER_SECTIONS[0].id;

      for (const section of DOCKER_SECTIONS) {
        const element = document.getElementById(section.id);
        if (!element) continue;
        if (element.getBoundingClientRect().top - SCROLL_OFFSET <= 0) {
          currentId = section.id;
        }
      }

      setActiveId(currentId);
    };

    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("resize", updateActiveSection, { passive: true });

    return () => {
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, []);

  const handleClick = (
    event: React.MouseEvent<HTMLAnchorElement>,
    id: string,
  ) => {
    const element = document.getElementById(id);
    if (!element) return;

    // 고정 헤더에 가려지지 않도록 위치를 보정해서 이동
    event.preventDefault();
    const top =
      element.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET;
    window.scrollTo({ top, behavior: "smooth" });
    setActiveId(id);
    window.history.replaceState(null, "", `#${id}`);
  };

  return (
    <aside className="hidden xl:block w-60 shrink-0">
      <nav
        aria-label="페이지 목차"
        className="sticky top-16 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          목차
        </p>
        <ul className="space-y-0.5">
          {DOCKER_SECTIONS.map((section) => {
            const isActive = activeId === section.id;

            return (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  onClick={(event) => handleClick(event, section.id)}
                  aria-current={isActive ? "true" : undefined}
                  className={cn(
                    "block rounded-md border-l-2 py-1.5 pl-3 pr-2 text-sm transition-colors",
                    isActive
                      ? "border-sky-500 bg-sky-50 font-medium text-sky-700 dark:bg-sky-900/20 dark:text-sky-300"
                      : "border-transparent text-zinc-600 hover:bg-zinc-50 hover:text-black dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-100",
                  )}
                >
                  {section.label}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
