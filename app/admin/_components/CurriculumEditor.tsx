"use client";

import { useState } from "react";
import { GripVertical, Plus, Trash2 } from "lucide-react";

import {
  createEmptyCurriculumItem,
  reorderCurriculumItems,
  type CurriculumItem,
} from "@/lib/course-schedule";
import { Button } from "@/app/_components/ui/button";
import { cn } from "@/lib/utils";

type CurriculumEditorProps = {
  label: string;
  items: CurriculumItem[];
  onChange: (items: CurriculumItem[]) => void;
};

const inputClassName =
  "w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500";

type CurriculumField = keyof Pick<
  CurriculumItem,
  "curriculum" | "instructor" | "lectureDays"
>;

const fieldConfigs: Array<{
  key: CurriculumField;
  placeholder: string;
  className?: string;
}> = [
  {
    key: "curriculum",
    placeholder: "커리큘럼",
  },
  {
    key: "instructor",
    placeholder: "강사",
  },
  {
    key: "lectureDays",
    placeholder: "강의일수",
    className: "w-24 shrink-0",
  },
];

/**
 * 커리큘럼 항목 추가·삭제·드래그 순서 변경 에디터
 */
export default function CurriculumEditor({
  label,
  items,
  onChange,
}: CurriculumEditorProps) {
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);

  const handleAdd = () => {
    onChange([...items, createEmptyCurriculumItem(items.length)]);
  };

  const handleRemove = (id: string) => {
    onChange(
      items
        .filter((item) => item.id !== id)
        .map((item, index) => ({ ...item, sort_order: index })),
    );
  };

  const handleFieldChange = (
    id: string,
    field: CurriculumField,
    value: string,
  ) => {
    onChange(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  };

  const handleDragStart = (
    event: React.DragEvent<HTMLButtonElement>,
    itemId: string,
  ) => {
    setDraggedItemId(itemId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", itemId);
  };

  const handleDragOver = (
    event: React.DragEvent<HTMLLIElement>,
    itemId: string,
  ) => {
    event.preventDefault();
    if (draggedItemId && draggedItemId !== itemId) {
      setDragOverItemId(itemId);
      event.dataTransfer.dropEffect = "move";
    }
  };

  const handleDrop = (
    event: React.DragEvent<HTMLLIElement>,
    targetItemId: string,
  ) => {
    event.preventDefault();
    setDragOverItemId(null);

    if (!draggedItemId || draggedItemId === targetItemId) {
      setDraggedItemId(null);
      return;
    }

    const reordered = reorderCurriculumItems(
      items,
      draggedItemId,
      targetItemId,
    );
    setDraggedItemId(null);

    if (reordered) {
      onChange(reordered);
    }
  };

  const handleDragEnd = () => {
    setDraggedItemId(null);
    setDragOverItemId(null);
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
          커리큘럼 항목이 없습니다. 「항목 추가」로 커리큘럼·강사·강의일수를
          등록하세요.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item, index) => (
            <li
              key={item.id}
              onDragOver={(event) => handleDragOver(event, item.id)}
              onDragLeave={() => {
                if (dragOverItemId === item.id) {
                  setDragOverItemId(null);
                }
              }}
              onDrop={(event) => handleDrop(event, item.id)}
              onDragEnd={handleDragEnd}
              className={cn(
                "flex flex-nowrap items-center gap-2 sm:gap-3 rounded-lg border p-3 transition-colors overflow-x-auto",
                draggedItemId === item.id
                  ? "opacity-50 border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/10"
                  : dragOverItemId === item.id
                    ? "border-blue-400 dark:border-blue-500 bg-blue-100/80 dark:bg-blue-900/30 ring-2 ring-blue-400/60"
                    : "border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30",
              )}
            >
              <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-medium text-zinc-500 dark:text-zinc-400">
                <button
                  type="button"
                  draggable
                  onDragStart={(event) => handleDragStart(event, item.id)}
                  className="inline-flex items-center justify-center rounded p-0.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 cursor-grab active:cursor-grabbing touch-none"
                  aria-label={`${index + 1}번째 항목 순서 변경`}
                >
                  <GripVertical className="size-3.5" aria-hidden />
                </button>
                {index + 1}번째 항목
              </span>

              {fieldConfigs.map((field) => (
                <input
                  key={field.key}
                  type="text"
                  value={item[field.key]}
                  onChange={(e) =>
                    handleFieldChange(item.id, field.key, e.target.value)
                  }
                  placeholder={field.placeholder}
                  aria-label={field.placeholder}
                  className={cn(
                    inputClassName,
                    field.className ?? "min-w-0 flex-1",
                  )}
                />
              ))}

              <button
                type="button"
                onClick={() => handleRemove(item.id)}
                className="inline-flex shrink-0 items-center gap-1 px-2 py-2 text-xs text-zinc-500 hover:text-red-600 dark:hover:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 whitespace-nowrap"
                aria-label={`${index + 1}번째 커리큘럼 삭제`}
              >
                <Trash2 className="size-3.5" />
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}

      {items.length > 1 ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          ⋮⋮ 핸들을 드래그해 항목 순서를 바꿀 수 있습니다.
        </p>
      ) : null}
    </div>
  );
}
