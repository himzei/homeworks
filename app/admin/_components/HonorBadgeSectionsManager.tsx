"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Medal, Plus, Trash2 } from "lucide-react";

import { Button } from "@/app/_components/ui/button";
import { cn } from "@/lib/utils";
import type { ClassRoleStudent } from "@/lib/class-officers";
import { extractCourseShortLabel } from "@/lib/courses";
import type { HonorBadgeSectionWithBadges } from "@/lib/honor-badges";

import HonorBadgesDragBoard, {
  type HonorBadgeDraft,
} from "./HonorBadgesDragBoard";
import HonorStudentRoster from "./HonorStudentRoster";

/** 편집 중 섹션 */
export type HonorBadgeSectionDraft = {
  id: string;
  title: string;
  badges: HonorBadgeDraft[];
};

type HonorBadgeSectionsManagerProps = {
  groupName: string;
  students: ClassRoleStudent[];
  initialSections: HonorBadgeSectionWithBadges[];
};

function toSectionDrafts(
  sections: HonorBadgeSectionWithBadges[],
): HonorBadgeSectionDraft[] {
  return sections.map((section) => ({
    id: section.id,
    title: section.title,
    badges: section.badges.map((b) => ({
      id: b.id,
      label: b.label,
      profileIds: [...b.profileIds],
    })),
  }));
}

function createEmptySection(defaultTitle: string): HonorBadgeSectionDraft {
  return {
    id: `new-section-${crypto.randomUUID()}`,
    title: defaultTitle,
    badges: [],
  };
}

/**
 * 명예 배지 섹션 목록 — 섹션 추가·제목 편집·드래그 부여
 */
export default function HonorBadgeSectionsManager({
  groupName,
  students,
  initialSections,
}: HonorBadgeSectionsManagerProps) {
  const router = useRouter();
  const cohortLabel = extractCourseShortLabel(groupName);
  const defaultSectionTitle = `${cohortLabel} 명예 배지`;

  const [sections, setSections] = useState<HonorBadgeSectionDraft[]>(() =>
    toSectionDrafts(initialSections),
  );
  /** 펼쳐진 섹션 id (없으면 접힘) */
  const [expandedSectionIds, setExpandedSectionIds] = useState<Set<string>>(
    () => new Set(initialSections.map((s) => s.id)),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    const drafts = toSectionDrafts(initialSections);
    setSections((prevSections) => {
      const prevIdSet = new Set(prevSections.map((s) => s.id));
      setExpandedSectionIds((prevExpanded) => {
        const next = new Set<string>();
        for (const section of drafts) {
          if (prevIdSet.has(section.id)) {
            if (prevExpanded.has(section.id)) next.add(section.id);
          } else {
            next.add(section.id);
          }
        }
        return next;
      });
      return drafts;
    });
  }, [initialSections, groupName]);

  const toggleSectionExpanded = (sectionId: string) => {
    setExpandedSectionIds((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  const handleAddSection = () => {
    const newSection = createEmptySection(defaultSectionTitle);
    setSections((prev) => [...prev, newSection]);
    setExpandedSectionIds((prev) => new Set(prev).add(newSection.id));
    setSaveMessage(null);
    setFormError(null);
  };

  const handleRemoveSection = (sectionId: string) => {
    setSections((prev) => prev.filter((s) => s.id !== sectionId));
    setExpandedSectionIds((prev) => {
      const next = new Set(prev);
      next.delete(sectionId);
      return next;
    });
  };

  const updateSection = (
    sectionId: string,
    patch: Partial<HonorBadgeSectionDraft>,
  ) => {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, ...patch } : s)),
    );
  };

  const handleSave = async () => {
    setFormError(null);
    setSaveMessage(null);

    const emptyTitle = sections.find((s) => !s.title.trim());
    if (emptyTitle) {
      setFormError("섹션 제목을 입력해 주세요.");
      return;
    }

    const sectionTitles = sections.map((s) => s.title.trim());
    if (new Set(sectionTitles).size !== sectionTitles.length) {
      setFormError("같은 제목의 섹션이 중복되었습니다.");
      return;
    }

    for (const section of sections) {
      const emptyBadge = section.badges.find((b) => !b.label.trim());
      if (emptyBadge) {
        setFormError(`「${section.title}」 섹션의 배지 이름을 입력해 주세요.`);
        return;
      }
      const labels = section.badges.map((b) => b.label.trim());
      if (new Set(labels).size !== labels.length) {
        setFormError(
          `「${section.title}」 섹션에 같은 이름의 배지가 있습니다.`,
        );
        return;
      }
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/admin/honor-badges", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupName,
          sections: sections.map((section) => ({
            id: section.id,
            title: section.title.trim(),
            badges: section.badges.map((b) => ({
              id: b.id,
              label: b.label.trim(),
              profileIds: b.profileIds,
            })),
          })),
        }),
      });

      const result = (await response.json()) as {
        error?: string;
        sections?: HonorBadgeSectionWithBadges[];
      };

      if (!response.ok) {
        setFormError(result.error ?? "저장에 실패했습니다.");
        return;
      }

      if (result.sections) {
        const saved = toSectionDrafts(result.sections);
        setSections(saved);
        setExpandedSectionIds(new Set(saved.map((s) => s.id)));
      }

      setSaveMessage("명예 배지가 저장되었습니다.");
      router.refresh();
    } catch (error) {
      console.error("명예 배지 저장 오류:", error);
      setFormError("네트워크 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  if (students.length === 0) {
    return null;
  }

  return (
    <div className="mb-8 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          이달의 우수학생 등 배지 섹션을 추가하고, 제목과 배지를 직접
          설정하세요.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddSection}
          className="shrink-0 border-emerald-300 text-emerald-800 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-200 dark:hover:bg-emerald-950/40"
        >
          <Plus className="size-4" />
          명예 배지 섹션 추가
        </Button>
      </div>

      {formError ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
        >
          {formError}
        </p>
      ) : null}
      {saveMessage ? (
        <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300">
          {saveMessage}
        </p>
      ) : null}

      {sections.length === 0 ? (
        <div className="rounded-xl border border-dashed border-emerald-300 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/20 px-6 py-10 text-center">
          <Medal className="mx-auto size-10 text-emerald-400 dark:text-emerald-600 mb-3" />
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            아직 명예 배지 섹션이 없습니다.
            <br />
            버튼을 눌러 섹션을 추가한 뒤 제목과 배지를 설정하세요.
          </p>
          <Button
            type="button"
            onClick={handleAddSection}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="size-4" />
            첫 섹션 추가
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <HonorStudentRoster cohortLabel={cohortLabel} students={students} />

          {sections.map((section) => {
            const isExpanded = expandedSectionIds.has(section.id);
            const assignedCount = section.badges.reduce(
              (sum, badge) => sum + badge.profileIds.length,
              0,
            );

            return (
              <section
                key={section.id}
                className={cn(
                  "rounded-xl border border-emerald-200 dark:border-emerald-900/50",
                  "bg-white dark:bg-zinc-950 p-4 sm:p-6",
                  isExpanded ? "space-y-4" : "",
                )}
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <Medal
                      className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-2"
                      aria-hidden
                    />
                    <label className="flex-1 min-w-0 space-y-1">
                      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        섹션 제목
                        {!isExpanded ? (
                          <span className="font-normal text-zinc-400 dark:text-zinc-500">
                            {" "}
                            · 배지 {section.badges.length}개 · 부여{" "}
                            {assignedCount}건
                          </span>
                        ) : null}
                      </span>
                      <input
                        type="text"
                        value={section.title}
                        onChange={(e) =>
                          updateSection(section.id, { title: e.target.value })
                        }
                        placeholder="예: 이달의 우수학생"
                        className={cn(
                          "w-full rounded-lg border border-zinc-300 dark:border-zinc-700",
                          "bg-white dark:bg-zinc-900 px-3 py-2 text-base font-semibold",
                          "text-black dark:text-zinc-50",
                          "focus:outline-none focus:ring-2 focus:ring-emerald-500",
                        )}
                        maxLength={60}
                      />
                    </label>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleSectionExpanded(section.id)}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors"
                      aria-expanded={isExpanded}
                      aria-controls={`honor-badge-section-${section.id}`}
                      aria-label={
                        isExpanded
                          ? `${section.title || "명예 배지"} 섹션 접기`
                          : `${section.title || "명예 배지"} 섹션 펴기`
                      }
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="size-3.5 shrink-0" aria-hidden />
                          접기
                        </>
                      ) : (
                        <>
                          <ChevronDown
                            className="size-3.5 shrink-0"
                            aria-hidden
                          />
                          펴기
                        </>
                      )}
                    </button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveSection(section.id)}
                      className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/40"
                    >
                      <Trash2 className="size-4" />
                      섹션 삭제
                    </Button>
                  </div>
                </div>

                {isExpanded ? (
                  <div
                    id={`honor-badge-section-${section.id}`}
                    className="space-y-4"
                  >
                    <HonorBadgesDragBoard
                      students={students}
                      badges={section.badges}
                      onBadgesChange={(badges) =>
                        updateSection(section.id, { badges })
                      }
                    />
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      )}

      {sections.length > 0 ? (
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isSaving ? "저장 중..." : "명예 배지 저장"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
