"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/app/_components/ui/button";
import type { CourseEventSchedule } from "@/lib/course-schedule";
import { normalizeEventTimeInput } from "@/lib/course-schedule";
import { cn } from "@/lib/utils";

const inputClassName =
  "rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500";

const timeInputClassName = cn(inputClassName, "w-[5.5rem] tabular-nums text-center");

/** HH:mm 직접 입력 (14:00, 1400, 9:30 등) */
function EventTimeInput({
  value,
  onChange,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  "aria-label": string;
}) {
  const handleChange = (next: string) => {
    if (next === "" || /^[0-9:]*$/.test(next)) {
      onChange(next);
    }
  };

  const handleBlur = () => {
    const normalized = normalizeEventTimeInput(value);
    if (normalized === null) {
      onChange("");
      return;
    }
    onChange(normalized);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={value}
      onChange={(e) => handleChange(e.target.value)}
      onBlur={handleBlur}
      placeholder="14:00"
      maxLength={5}
      className={timeInputClassName}
      aria-label={ariaLabel}
    />
  );
}

type EventScheduleEditorProps = {
  schedules: CourseEventSchedule[];
  onChange: (schedules: CourseEventSchedule[]) => void;
};

type EventScheduleField = keyof Pick<
  CourseEventSchedule,
  "date" | "label" | "startTime" | "endTime"
>;

function sortSchedules(items: CourseEventSchedule[]): CourseEventSchedule[] {
  return [...items].sort((a, b) => a.date.localeCompare(b.date));
}

function normalizeTimeField(value: string): string | undefined {
  const normalized = normalizeEventTimeInput(value);
  if (normalized === null || normalized === "") return undefined;
  return normalized;
}

function EventScheduleRow({
  item,
  onUpdate,
  onRemove,
}: {
  item: CourseEventSchedule;
  onUpdate: (id: string, field: EventScheduleField, value: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <li className="flex flex-wrap items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 p-2">
      <input
        type="date"
        value={item.date}
        onChange={(e) => onUpdate(item.id, "date", e.target.value)}
        className={cn(inputClassName, "w-[10.5rem] shrink-0")}
        aria-label={`${item.label} 날짜`}
      />
      <input
        type="text"
        value={item.label}
        onChange={(e) => onUpdate(item.id, "label", e.target.value)}
        placeholder="행사명"
        className={cn(inputClassName, "min-w-[7rem] flex-1")}
        aria-label={`${item.date} 행사명`}
      />
      <EventTimeInput
        value={item.startTime ?? ""}
        onChange={(v) => onUpdate(item.id, "startTime", v)}
        aria-label={`${item.label} 시작 시간`}
      />
      <span className="text-xs text-zinc-400 shrink-0" aria-hidden>
        ~
      </span>
      <EventTimeInput
        value={item.endTime ?? ""}
        onChange={(v) => onUpdate(item.id, "endTime", v)}
        aria-label={`${item.label} 종료 시간`}
      />
      <button
        type="button"
        onClick={() => onRemove(item.id)}
        className="inline-flex shrink-0 items-center gap-1 px-2 py-1.5 text-xs text-zinc-500 hover:text-red-600 dark:hover:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30"
        aria-label={`${item.label} 삭제`}
      >
        <Trash2 className="size-3.5" />
      </button>
    </li>
  );
}

/**
 * 행사 일정 입력 — 날짜·행사명·시작·종료 시간 (한 줄)
 */
export default function EventScheduleEditor({
  schedules,
  onChange,
}: EventScheduleEditorProps) {
  const [draftDate, setDraftDate] = useState("");
  const [draftLabel, setDraftLabel] = useState("");
  const [draftStartTime, setDraftStartTime] = useState("");
  const [draftEndTime, setDraftEndTime] = useState("");
  const [addError, setAddError] = useState<string | null>(null);

  const handleAdd = () => {
    const label = draftLabel.trim();
    if (!draftDate) {
      setAddError("날짜를 선택해 주세요.");
      return;
    }
    if (!label) {
      setAddError("행사 이름을 입력해 주세요.");
      return;
    }

    onChange(
      sortSchedules([
        ...schedules,
        {
          id: crypto.randomUUID(),
          date: draftDate,
          label,
          startTime: normalizeTimeField(draftStartTime),
          endTime: normalizeTimeField(draftEndTime),
        },
      ]),
    );
    setDraftDate("");
    setDraftLabel("");
    setDraftStartTime("");
    setDraftEndTime("");
    setAddError(null);
  };

  const handleRemove = (id: string) => {
    onChange(schedules.filter((item) => item.id !== id));
  };

  const handleUpdate = (id: string, field: EventScheduleField, value: string) => {
    onChange(
      sortSchedules(
        schedules.map((item) => {
          if (item.id !== id) return item;
          if (field === "startTime" || field === "endTime") {
            return { ...item, [field]: value || undefined };
          }
          return { ...item, [field]: value };
        }),
      ),
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <input
          type="date"
          value={draftDate}
          onChange={(e) => {
            setDraftDate(e.target.value);
            setAddError(null);
          }}
          className={cn(inputClassName, "w-[10.5rem]")}
          aria-label="행사 날짜"
        />
        <input
          type="text"
          value={draftLabel}
          onChange={(e) => {
            setDraftLabel(e.target.value);
            setAddError(null);
          }}
          placeholder="행사명 (예: OT, 수료식)"
          className={cn(inputClassName, "min-w-[7rem] flex-1")}
        />
        <EventTimeInput
          value={draftStartTime}
          onChange={setDraftStartTime}
          aria-label="시작 시간"
        />
        <span className="text-xs text-zinc-400 shrink-0" aria-hidden>
          ~
        </span>
        <EventTimeInput
          value={draftEndTime}
          onChange={setDraftEndTime}
          aria-label="종료 시간"
        />
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

      {schedules.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 px-4 py-4 text-center">
          등록된 행사 일정이 없습니다.
        </p>
      ) : (
        <ul className="space-y-2">
          {schedules.map((item) => (
            <EventScheduleRow
              key={item.id}
              item={item}
              onUpdate={handleUpdate}
              onRemove={handleRemove}
            />
          ))}
        </ul>
      )}

      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        시간은 14:00처럼 직접 입력할 수 있습니다 (1400, 9:30도 가능). 포커스를
        벗어나면 HH:mm 형식으로 맞춰집니다.
      </p>
    </div>
  );
}
