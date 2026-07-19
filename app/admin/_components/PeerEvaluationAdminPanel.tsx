"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BarChart3, Pencil, PencilLine, Trash2, X } from "lucide-react";

import PeerEvaluationCriteriaEditor from "@/app/admin/_components/PeerEvaluationCriteriaEditor";
import { Button } from "@/app/_components/ui/button";
import {
  PEER_EVALUATION_STATUS_LABEL,
  type PeerEvaluationStatus,
} from "@/lib/peer-evaluation/constants";
import { DEFAULT_PEER_EVALUATION_CRITERIA } from "@/lib/peer-evaluation/criteria";
import type {
  PeerEvaluationCriterion,
  PeerEvaluationProject,
} from "@/lib/peer-evaluation/types";
import { extractCourseShortLabel } from "@/lib/courses";

type Props = {
  projects: PeerEvaluationProject[];
  selectedGroup: string | null;
  groupQuery: string;
};

const STATUS_BADGE_CLASS: Record<PeerEvaluationStatus, string> = {
  draft:
    "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  open: "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300",
  closed:
    "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
};

const inputClassName =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900";

/**
 * 관리자 — 동료평가 프로젝트 생성·수정·상태 변경·결과 이동
 */
export default function PeerEvaluationAdminPanel({
  projects,
  selectedGroup,
  groupQuery,
}: Props) {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [criteria, setCriteria] = useState<PeerEvaluationCriterion[]>(() =>
    DEFAULT_PEER_EVALUATION_CRITERIA.map((item) => ({ ...item })),
  );
  const [openImmediately, setOpenImmediately] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingProjectId, setPendingProjectId] = useState<string | null>(
    null,
  );

  // 인라인 수정 상태
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCriteria, setEditCriteria] = useState<PeerEvaluationCriterion[]>(
    [],
  );
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const startEditing = (project: PeerEvaluationProject) => {
    setEditingProjectId(project.id);
    setEditTitle(project.title);
    setEditDescription(project.description ?? "");
    setEditCriteria(project.criteria.map((item) => ({ ...item })));
    setEditError(null);
    setActionError(null);
  };

  const cancelEditing = () => {
    setEditingProjectId(null);
    setEditTitle("");
    setEditDescription("");
    setEditCriteria([]);
    setEditError(null);
  };

  const handleSaveEdit = async (projectId: string) => {
    const trimmedTitle = editTitle.trim();
    if (!trimmedTitle) {
      setEditError("제목을 입력해 주세요.");
      return;
    }

    setIsSavingEdit(true);
    setEditError(null);

    try {
      const response = await fetch(
        `/api/admin/peer-evaluations/${projectId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: trimmedTitle,
            description: editDescription.trim() || null,
            criteria: editCriteria,
          }),
        },
      );
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setEditError(result.error ?? "수정에 실패했습니다.");
        return;
      }

      cancelEditing();
      router.refresh();
    } catch (error) {
      console.error("동료평가 수정 예외:", error);
      setEditError("수정 중 오류가 발생했습니다.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleCreate = async () => {
    if (!selectedGroup) {
      setFormError("과정을 선택한 뒤 프로젝트를 만들어 주세요.");
      return;
    }
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setFormError("제목을 입력해 주세요.");
      return;
    }

    setIsCreating(true);
    setFormError(null);

    try {
      const response = await fetch("/api/admin/peer-evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmedTitle,
          description: description.trim() || null,
          groupName: selectedGroup,
          status: openImmediately ? "open" : "draft",
          criteria,
        }),
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setFormError(result.error ?? "생성에 실패했습니다.");
        return;
      }

      setTitle("");
      setDescription("");
      setCriteria(
        DEFAULT_PEER_EVALUATION_CRITERIA.map((item) => ({ ...item })),
      );
      router.refresh();
    } catch (error) {
      console.error("동료평가 생성 예외:", error);
      setFormError("생성 중 오류가 발생했습니다.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleStatusChange = async (
    projectId: string,
    status: PeerEvaluationStatus,
  ) => {
    setPendingProjectId(projectId);
    setActionError(null);

    try {
      const response = await fetch(
        `/api/admin/peer-evaluations/${projectId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        },
      );
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setActionError(result.error ?? "상태 변경에 실패했습니다.");
        return;
      }

      router.refresh();
    } catch (error) {
      console.error("동료평가 상태 변경 예외:", error);
      setActionError("상태 변경 중 오류가 발생했습니다.");
    } finally {
      setPendingProjectId(null);
    }
  };

  const handleDelete = async (project: PeerEvaluationProject) => {
    if (
      !window.confirm(
        `"${project.title}" 프로젝트를 삭제할까요?\n제출된 평가도 함께 삭제됩니다.`,
      )
    ) {
      return;
    }

    setPendingProjectId(project.id);
    setActionError(null);

    try {
      const response = await fetch(
        `/api/admin/peer-evaluations/${project.id}`,
        { method: "DELETE" },
      );
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setActionError(result.error ?? "삭제에 실패했습니다.");
        return;
      }

      if (editingProjectId === project.id) {
        cancelEditing();
      }

      router.refresh();
    } catch (error) {
      console.error("동료평가 삭제 예외:", error);
      setActionError("삭제 중 오류가 발생했습니다.");
    } finally {
      setPendingProjectId(null);
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          동료평가 프로젝트 만들기
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          선택한 기수 학생들이 서로를 평가합니다. 학생이 받은 점수는 학생
          화면에 공개되지 않습니다.
        </p>

        {!selectedGroup ? (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
            상단에서 과정을 선택해야 프로젝트를 만들 수 있습니다.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              대상 과정:{" "}
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {selectedGroup}
              </span>
            </p>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 1차 팀 프로젝트 동료평가"
              maxLength={120}
              disabled={isCreating}
              className={inputClassName}
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="안내 문구 (선택)"
              rows={3}
              disabled={isCreating}
              className={inputClassName}
            />
            <PeerEvaluationCriteriaEditor
              criteria={criteria}
              onChange={setCriteria}
              disabled={isCreating}
            />
            <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <input
                type="checkbox"
                checked={openImmediately}
                onChange={(e) => setOpenImmediately(e.target.checked)}
                disabled={isCreating}
              />
              만들자마자 진행중으로 열기
            </label>
            {formError ? (
              <p className="text-sm text-red-600 dark:text-red-400">
                {formError}
              </p>
            ) : null}
            <Button type="button" onClick={handleCreate} disabled={isCreating}>
              <PencilLine className="size-4" aria-hidden />
              {isCreating ? "만드는 중..." : "프로젝트 만들기"}
            </Button>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          프로젝트 목록
        </h2>
        {actionError ? (
          <p className="text-sm text-red-600 dark:text-red-400">{actionError}</p>
        ) : null}

        {projects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
            등록된 동료평가 프로젝트가 없습니다.
          </div>
        ) : (
          <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {projects.map((project) => {
              const isBusy = pendingProjectId === project.id;
              const isEditing = editingProjectId === project.id;

              return (
                <li
                  key={project.id}
                  className="bg-white px-4 py-4 sm:px-5 dark:bg-zinc-950"
                >
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          프로젝트 수정
                        </p>
                        <button
                          type="button"
                          onClick={cancelEditing}
                          disabled={isSavingEdit}
                          className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          aria-label="수정 취소"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        maxLength={120}
                        disabled={isSavingEdit}
                        className={inputClassName}
                        placeholder="제목"
                      />
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        rows={3}
                        disabled={isSavingEdit}
                        className={inputClassName}
                        placeholder="안내 문구 (선택)"
                      />
                      <PeerEvaluationCriteriaEditor
                        criteria={editCriteria}
                        onChange={setEditCriteria}
                        disabled={isSavingEdit}
                      />
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        항목을 바꾸면 이미 제출된 점수와 맞지 않을 수 있습니다.
                        가능하면 시작 전에 확정해 주세요.
                      </p>
                      {editError ? (
                        <p className="text-sm text-red-600 dark:text-red-400">
                          {editError}
                        </p>
                      ) : null}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          disabled={isSavingEdit}
                          onClick={() => void handleSaveEdit(project.id)}
                        >
                          {isSavingEdit ? "저장 중..." : "저장"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={isSavingEdit}
                          onClick={cancelEditing}
                        >
                          취소
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                            {project.title}
                          </span>
                          <span
                            className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASS[project.status]}`}
                          >
                            {PEER_EVALUATION_STATUS_LABEL[project.status]}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {extractCourseShortLabel(project.groupName)} ·{" "}
                          {new Date(project.createdAt).toLocaleString("ko-KR")}
                        </p>
                        {project.description ? (
                          <p className="line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                            {project.description}
                          </p>
                        ) : null}
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          평가항목 {project.criteria.length}개 ·{" "}
                          {project.criteria.map((item) => item.label).join(", ")}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {project.status === "draft" ? (
                          <Button
                            type="button"
                            size="sm"
                            disabled={isBusy}
                            onClick={() =>
                              handleStatusChange(project.id, "open")
                            }
                          >
                            시작
                          </Button>
                        ) : null}
                        {project.status === "open" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={isBusy}
                            onClick={() =>
                              handleStatusChange(project.id, "closed")
                            }
                          >
                            종료
                          </Button>
                        ) : null}
                        {project.status === "closed" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={isBusy}
                            onClick={() =>
                              handleStatusChange(project.id, "open")
                            }
                          >
                            다시 열기
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={isBusy}
                          onClick={() => startEditing(project)}
                        >
                          <Pencil className="size-4" aria-hidden />
                          수정
                        </Button>
                        <Button asChild size="sm" variant="secondary">
                          <Link
                            href={`/admin/peer-evaluations/${project.id}${groupQuery}`}
                          >
                            <BarChart3 className="size-4" aria-hidden />
                            실시간 결과
                          </Link>
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={isBusy}
                          onClick={() => handleDelete(project)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="size-4" aria-hidden />
                          삭제
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
