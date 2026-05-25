"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/app/_components/ui/button";
import type { CustomHoliday } from "@/lib/course-schedule";
import { cn } from "@/lib/utils";

const inputClassName =
  "rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500";

type CustomHolidayEditorProps = {
  holidays: CustomHoliday[];
  onChange: (holidays: CustomHoliday[]) => void;
};

function sortHolidays(items: CustomHoliday[]): CustomHoliday[] {
  return [...items].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * 휴일 직접 입력 — 날짜 + 표시 이름
 */
export default function CustomHolidayEditor({
  holidays,
  onChange,
}: CustomHolidayEditorProps) {
  const [draftDate, setDraftDate] = useState("");
  const [draftLabel, setDraftLabel] = useState("");
  const [addError, setAddError] = useState<string | null>(null);

  const handleAdd = () => {
    const label = draftLabel.trim();
    if (!draftDate) {
      setAddError("날짜를 선택해 주세요.");
      return;
    }
    if (!label) {
      setAddError("휴일 이름을 입력해 주세요.");
      return;
    }
    if (holidays.some((item) => item.date === draftDate)) {
      setAddError("이미 등록된 날짜입니다.");
      return;
    }

    onChange(
      sortHolidays([
        ...holidays,
        {
          id: crypto.randomUUID(),
          date: draftDate,
          label,
        },
      ]),
    );
    setDraftDate("");
    setDraftLabel("");
    setAddError(null);
  };

  const handleRemove = (id: string) => {
    onChange(holidays.filter((item) => item.id !== id));
  };

  const handleUpdate = (
    id: string,
    field: "date" | "label",
    value: string,
  ) => {
    onChange(
      sortHolidays(
        holidays.map((item) =>
          item.id === id ? { ...item, [field]: value } : item,
        ),
      ),
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <label
            htmlFor="custom-holiday-date"
            className="block text-xs font-medium text-zinc-500 dark:text-zinc-400"
          >
            날짜
          </label>
          <input
            id="custom-holiday-date"
            type="date"
            value={draftDate}
            onChange={(e) => {
              setDraftDate(e.target.value);
              setAddError(null);
            }}
            className={cn(inputClassName, "w-[11rem]")}
          />
        </div>
        <div className="space-y-1 min-w-0 flex-1 sm:max-w-xs">
          <label
            htmlFor="custom-holiday-label"
            className="block text-xs font-medium text-zinc-500 dark:text-zinc-400"
          >
            휴일 이름
          </label>
          <input
            id="custom-holiday-label"
            type="text"
            value={draftLabel}
            onChange={(e) => {
              setDraftLabel(e.target.value);
              setAddError(null);
            }}
            placeholder="예: 방학, 연수, 개강 전 휴식"
            className={inputClassName}
          />
        </div>
        <Button type="button" variant="outline" size="sm" onClick={handleAdd}>
          <Plus className="size-4" />
          등록
        </Button>
      </div>

      {addError ? (
        <p className="text-xs text-red-600 dark:text-red-400" role="alert">
          {addError}
        </p>
      ) : null}

      {holidays.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 px-4 py-4 text-center">
          직접 지정한 휴일이 없습니다. 날짜와 이름을 입력해 등록하세요.
        </p>
      ) : (
        <ul className="space-y-2">
          {holidays.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 p-2"
            >
              <input
                type="date"
                value={item.date}
                onChange={(e) =>
                  handleUpdate(item.id, "date", e.target.value)
                }
                className={cn(inputClassName, "w-[11rem] shrink-0")}
                aria-label={`${item.label} 날짜`}
              />
              <input
                type="text"
                value={item.label}
                onChange={(e) =>
                  handleUpdate(item.id, "label", e.target.value)
                }
                placeholder="휴일 이름"
                className={cn(inputClassName, "min-w-0 flex-1")}
                aria-label={`${item.date} 휴일 이름`}
              />
              <button
                type="button"
                onClick={() => handleRemove(item.id)}
                className="inline-flex shrink-0 items-center gap-1 px-2 py-2 text-xs text-zinc-500 hover:text-red-600 dark:hover:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30"
                aria-label={`${item.label} 삭제`}
              >
                <Trash2 className="size-3.5" />
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        입력한 이름이 캘린더에 빨간 글씨로 표시되며, 해당 날짜는 교육일에서
        제외됩니다.
      </p>
    </div>
  );
}
