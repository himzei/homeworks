"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Loader2, UserMinus, X } from "lucide-react";

import { Button } from "@/app/_components/ui/button";
import { getMemberActivityLabel } from "@/lib/profile-members";
import {
  getApprovalStatusLabel,
  PROFILE_APPROVAL_STATUS,
} from "@/lib/profile-approval";

export type AdminMemberListItem = {
  id: string;
  name: string;
  groupName: string | null;
  phone: string | null;
  createdAtLabel: string;
  approvalStatus: string;
  isDormant: boolean;
};

type AdminMemberManagementListProps = {
  members: AdminMemberListItem[];
  emptyMessage?: string;
};

/**
 * 전체 회원 목록 — 승인·거절·탈퇴(휴면) 처리
 */
export default function AdminMemberManagementList({
  members,
  emptyMessage = "등록된 회원이 없습니다.",
}: AdminMemberManagementListProps) {
  const router = useRouter();
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleAction = async (
    userId: string,
    action: "approve" | "reject" | "withdraw",
  ) => {
    const member = members.find((row) => row.id === userId);
    const memberName = member?.name ?? "회원";

    const confirmMessage =
      action === "approve"
        ? `"${memberName}" 님의 가입을 승인할까요?`
        : action === "reject"
          ? `"${memberName}" 님의 가입을 거절할까요?`
          : `"${memberName}" 님을 탈퇴(휴면) 처리할까요?\n과정이 미분류로 바뀌며 모든 화면에서 숨겨집니다.`;

    if (!window.confirm(confirmMessage)) return;

    setBusyUserId(userId);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/admin/member-management", {
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
      <p className="rounded-lg border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        {emptyMessage}
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

      <ul className="divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
        {members.map((member) => {
          const isBusy = busyUserId === member.id;
          const isPending =
            member.approvalStatus === PROFILE_APPROVAL_STATUS.pending;
          const canWithdraw = !member.isDormant && !isPending;

          return (
            <li
              key={member.id}
              className="flex flex-col gap-3 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between dark:bg-zinc-950"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-black dark:text-zinc-50">
                    {member.name}
                  </p>
                  <span
                    className={
                      member.isDormant
                        ? "rounded-full bg-zinc-200 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                        : "rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                    }
                  >
                    {getMemberActivityLabel(member.isDormant)}
                  </span>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                    {getApprovalStatusLabel(member.approvalStatus)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {member.groupName ?? "미분류"}
                  {member.phone ? ` · ${member.phone}` : ""}
                </p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  가입 {member.createdAtLabel}
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                {isPending ? (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      disabled={isBusy}
                      onClick={() => void handleAction(member.id, "approve")}
                      className="bg-emerald-600 text-white hover:bg-emerald-700"
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
                      onClick={() => void handleAction(member.id, "reject")}
                      className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/40"
                    >
                      {isBusy ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <X className="size-4" />
                      )}
                      거절
                    </Button>
                  </>
                ) : null}

                {canWithdraw ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isBusy}
                    onClick={() => void handleAction(member.id, "withdraw")}
                    className="border-zinc-300 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                  >
                    {isBusy ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <UserMinus className="size-4" />
                    )}
                    탈퇴
                  </Button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
