"use client";

import { GripVertical, Plus, Trash2 } from "lucide-react";

import { createEmptyCurriculumItem, type CurriculumItem } from "@/lib/course-schedule";
import { Button } from "@/app/_components/ui/button";

type CurriculumEditorProps = {
  label: string;
  items: CurriculumItem[];
  onChange: (items: CurriculumItem[]) => void;
};

/**
 * 커리큘럼 항목 추가·삭제 에디터
 */
export default function CurriculumEditor({
  label,
  items,
  onChange,
}: CurriculumEditorProps) {
  const handleAdd = () => {
    onChange([...items, createEmptyCurriculumItem(items.length)]);
  };

  const handleRemove = (id: string) => {
    onChange(items.filter((item) => item.id !== id));
  };

  const handleFieldChange = (
    id: string,
    field: "title" | "contents",
    value: string,
  ) => {
    onChange(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {label}
        </span>
        <Button type="button" variant="outline" size="sm" onClick={handleAdd}>
          <Plus className="size-4" />
          항목 추가
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 px-4 py-6 text-center">
          커리큘럼 항목이 없습니다. 「항목 추가」로 주제를 등록하세요.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item, index) => (
            <li
              key={item.id}
              className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 p-4 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  <GripVertical className="size-3.5" aria-hidden />
                  {index + 1}번째 항목
                </span>
                <button
                  type="button"
                  onClick={() => handleRemove(item.id)}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs text-zinc-500 hover:text-red-600 dark:hover:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30"
                  aria-label={`${index + 1}번째 커리큘럼 삭제`}
                >
                  <Trash2 className="size-3.5" />
                  삭제
                </button>
              </div>
              <input
                type="text"
                value={item.title}
                onChange={(e) =>
                  handleFieldChange(item.id, "title", e.target.value)
                }
                placeholder="주제 (예: Git 기초, Python 입문)"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <textarea
                value={item.contents}
                onChange={(e) =>
                  handleFieldChange(item.id, "contents", e.target.value)
                }
                rows={3}
                placeholder="학습 내용, 참고 자료, 실습 안내 등"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y min-h-[80px]"
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
