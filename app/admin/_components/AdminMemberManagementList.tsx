"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Loader2, UserMinus, X } from "lucide-react";

import { Button } from "@/app/_components/ui/button";
import { isUnsetMemberGroupName } from "@/lib/admin/members-list-query";
import {
  formatShortGroupLabel,
  sortGroupOptionsByCohortDesc,
  type GroupOption,
} from "@/lib/fetch-group-options";
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
  university: string | null;
  major: string | null;
  createdAtLabel: string;
  approvalStatus: string;
  isDormant: boolean;
};

/** 학교·학과 표시 문자열 */
function formatUniversityMajorLabel(
  university: string | null,
  major: string | null,
): string {
  const label = [university, major].filter(Boolean).join(" · ");
  return label || "학교·학과 미입력";
}

type AdminMemberManagementListProps = {
  members: AdminMemberListItem[];
  groupOptions: GroupOption[];
  emptyMessage?: string;
};

/**
 * 전체 회원 목록 — 승인·거절·탈퇴(휴면)·과정 변경
 */
export default function AdminMemberManagementList({
  members,
  groupOptions,
  emptyMessage = "등록된 회원이 없습니다.",
}: AdminMemberManagementListProps) {
  const router = useRouter();
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<
    "approve" | "reject" | "withdraw" | "updateGroup" | null
  >(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [groupDraftByUserId, setGroupDraftByUserId] = useState<
    Record<string, string>
  >({});

  const courseOptions = sortGroupOptionsByCohortDesc(
    groupOptions.filter((option) => option.value),
  );

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
    setBusyAction(action);
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
      setBusyAction(null);
    }
  };

  const handleGroupChange = async (
    userId: string,
    memberName: string,
    nextGroupName: string,
  ): Promise<boolean> => {
    const selectedLabel = nextGroupName
      ? (courseOptions.find((option) => option.value === nextGroupName)?.label ??
        nextGroupName)
      : "미분류";

    if (
      !window.confirm(
        `"${memberName}" 님의 과정을 "${selectedLabel}"(으)로 변경할까요?`,
      )
    ) {
      return false;
    }

    setBusyUserId(userId);
    setBusyAction("updateGroup");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/admin/member-management", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          action: "updateGroup",
          groupName: nextGroupName || null,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        setErrorMessage(payload.error ?? "과정 변경에 실패했습니다.");
        return false;
      }

      router.refresh();
      return true;
    } catch {
      setErrorMessage("네트워크 오류가 발생했습니다. 다시 시도해 주세요.");
      return false;
    } finally {
      setBusyUserId(null);
      setBusyAction(null);
    }
  };

  const clearGroupDraft = (userId: string) => {
    setGroupDraftByUserId((previousDrafts) => {
      const nextDrafts = { ...previousDrafts };
      delete nextDrafts[userId];
      return nextDrafts;
    });
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
          const currentGroupValue = isUnsetMemberGroupName(member.groupName)
            ? ""
            : (member.groupName ?? "");
          const selectGroupValue =
            groupDraftByUserId[member.id] ?? currentGroupValue;

          return (
            <li
              key={member.id}
              className="flex flex-col gap-3 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between dark:bg-zinc-950"
            >
              <div className="min-w-0 flex-1">
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

                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <label className="sr-only" htmlFor={`member-group-${member.id}`}>
                    {member.name} 과정
                  </label>
                  <select
                    id={`member-group-${member.id}`}
                    value={selectGroupValue}
                    disabled={isBusy}
                    onChange={(event) => {
                      const nextGroupName = event.target.value;
                      if (nextGroupName === currentGroupValue) {
                        clearGroupDraft(member.id);
                        return;
                      }

                      setGroupDraftByUserId((previousDrafts) => ({
                        ...previousDrafts,
                        [member.id]: nextGroupName,
                      }));

                      void handleGroupChange(
                        member.id,
                        member.name,
                        nextGroupName,
                      ).then((isUpdated) => {
                        if (!isUpdated) {
                          clearGroupDraft(member.id);
                        }
                      });
                    }}
                    className="w-full max-w-md rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-black outline-none ring-blue-500 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                  >
                    <option value="">미분류</option>
                    {courseOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {formatShortGroupLabel(option.label)}
                      </option>
                    ))}
                    {!isUnsetMemberGroupName(member.groupName) &&
                    member.groupName &&
                    !courseOptions.some(
                      (option) => option.value === member.groupName,
                    ) ? (
                      <option value={member.groupName}>
                        {formatShortGroupLabel(member.groupName)} (현재)
                      </option>
                    ) : null}
                  </select>
                  {isBusy && busyAction === "updateGroup" ? (
                    <Loader2
                      className="size-4 shrink-0 animate-spin text-zinc-500"
                      aria-hidden
                    />
                  ) : null}
                </div>

                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {member.phone ? member.phone : "연락처 없음"}
                  {" · "}
                  {formatUniversityMajorLabel(member.university, member.major)}
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
