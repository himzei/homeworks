"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/app/_components/ui/button";

type Props = {
  snapshotId: string;
  initialDate: string | null;
};

export default function ProjectEvaluationDateEditor({
  snapshotId,
  initialDate,
}: Props) {
  const router = useRouter();
  const [date, setDate] = useState<string>(initialDate ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // 한글 주석: 서버에서 내려준 평가일로 동기화(페이지 이동/refresh 시)
    setDate(initialDate ?? "");
  }, [initialDate]);

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const response = await fetch(
        `/api/admin/class-role-snapshots/${snapshotId}/project-evaluation-date`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date: date.trim() ? date.trim() : null }),
        },
      );

      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        setErrorMessage(payload.error ?? "저장에 실패했습니다.");
        return;
      }

      // 한글 주석: 서버 컴포넌트에 표시되는 평가일을 갱신한다.
      router.refresh();
    } catch {
      setErrorMessage("저장 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-950/40 p-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[220px]">
          <label
            htmlFor="project-evaluation-date"
            className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
          >
            평가일
          </label>
          <input
            id="project-evaluation-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={isSaving}
            className="mt-1 w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
          />
        </div>

        <Button
          type="button"
          size="sm"
          className="bg-blue-500 hover:bg-blue-600 text-white"
          disabled={isSaving}
          onClick={() => void handleSave()}
        >
          {isSaving ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              저장 중...
            </>
          ) : (
            "평가일 저장"
          )}
        </Button>
      </div>

      {errorMessage ? (
        <p role="alert" className="mt-2 text-xs text-rose-600 dark:text-rose-400">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}

