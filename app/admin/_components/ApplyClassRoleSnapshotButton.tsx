"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/app/_components/ui/button";

type ApplyClassRoleSnapshotButtonProps = {
  snapshotId: string;
  title: string;
};

/**
 * 과거 반·조 글을 현재 적용 상태로 전환
 */
export default function ApplyClassRoleSnapshotButton({
  snapshotId,
  title,
}: ApplyClassRoleSnapshotButtonProps) {
  const router = useRouter();
  const [isApplying, setIsApplying] = useState(false);

  const handleApply = async () => {
    if (
      !window.confirm(
        `"${title}" 설정을 현재 적용 상태로 바꿀까요?\n학생 프로필·진행과정에 반영됩니다.`,
      )
    ) {
      return;
    }

    setIsApplying(true);
    try {
      const response = await fetch(
        `/api/admin/class-role-snapshots/${snapshotId}/apply`,
        { method: "POST" },
      );
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        alert(result.error ?? "적용에 실패했습니다.");
        return;
      }

      router.refresh();
    } catch (error) {
      console.error("반·조 적용 오류:", error);
      alert("네트워크 오류가 발생했습니다.");
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleApply}
      disabled={isApplying}
      className="border-green-300 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950/30"
    >
      <CheckCircle2 className="size-4" />
      {isApplying ? "적용 중..." : "이 설정 적용"}
    </Button>
  );
}
