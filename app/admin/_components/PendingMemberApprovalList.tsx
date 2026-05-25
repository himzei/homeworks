"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Loader2, X } from "lucide-react";

import { Button } from "@/app/_components/ui/button";
import { getApprovalStatusLabel } from "@/lib/profile-approval";

export type PendingMemberItem = {
  id: string;
  name: string;
  groupName: string | null;
  phone: string | null;
  createdAtLabel: string;
  approvalStatus: string;
};

type PendingMemberApprovalListProps = {
  members: PendingMemberItem[];
};

/**
 * 가입 승인 대기 회원 목록 — 승인/거절
 */
export default function PendingMemberApprovalList({
  members,
}: PendingMemberApprovalListProps) {
  const router = useRouter();
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleApproval = async (
    userId: string,
    action: "approve" | "reject",
  ) => {
    const memberName = members.find((member) => member.id === userId)?.name;
    const confirmMessage =
      action === "approve"
        ? `"${memberName ?? "회원"}" 님의 가입을 승인할까요?`
        : `"${memberName ?? "회원"}" 님의 가입을 거절할까요?`;

    if (!window.confirm(confirmMessage)) return;

    setBusyUserId(userId);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/admin/member-approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        setErrorMessage(payload.error ?? "처리에 실패했습니다.");
        return;
      }

      router.refresh();
    } catch {
      setErrorMessage("네트워크 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setBusyUserId(null);
    }
  };

  if (members.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
        승인 대기 중인 회원이 없습니다.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {errorMessage ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <ul className="divide-y divide-zinc-200 dark:divide-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {members.map((member) => {
          const isBusy = busyUserId === member.id;

          return (
            <li
              key={member.id}
              className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-4 bg-white dark:bg-zinc-950"
            >
              <div className="min-w-0">
                <p className="font-semibold text-black dark:text-zinc-50">
                  {member.name}
                </p>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {member.groupName ?? "과정 미지정"}
                  {member.phone ? ` · ${member.phone}` : ""}
                </p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  가입 신청 {member.createdAtLabel} ·{" "}
                  {getApprovalStatusLabel(member.approvalStatus)}
                </p>
              </div>

              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={isBusy}
                  onClick={() => void handleApproval(member.id, "approve")}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {isBusy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Check className="size-4" />
                  )}
                  승인
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isBusy}
                  onClick={() => void handleApproval(member.id, "reject")}
                  className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/40"
                >
                  {isBusy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <X className="size-4" />
                  )}
                  거절
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
