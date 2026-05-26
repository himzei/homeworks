"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutGrid, Loader2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { GROUP_OPTIONS } from "@/lib/constants";
import type { GroupOption } from "@/lib/fetch-group-options";
import { fetchSeatingStudents } from "@/lib/fetch-group-students";
import { buildAvatarUrlByName, parseAisleColumnsInput } from "@/lib/seating";
import {
  applyRosterDrop,
  applySeatDrop,
  type SeatingDragPayload,
} from "@/lib/seating-drag";
import { Button } from "@/app/_components/ui/button";
import {
  applyTeamBadgeVisibility,
  buildOfficerInfoByStudentName,
  mergeHonorBadgesIntoOfficerByStudentName,
  fetchClassRoleStudents,
  ensureClassPresidentInOfficerByStudentName,
  type StudentOfficerInfo,
} from "@/lib/class-officers";
import { fetchClassPresidentIdForGroup } from "@/lib/apply-class-roles";
import { isGroupTeamAssignmentActive } from "@/lib/class-role-snapshots";
import { fetchHonorBadgeLabelsByProfileId } from "@/lib/honor-badges";
import {
  buildSeatingChartDefaultTitle,
  type CourseScheduleForTitle,
} from "@/lib/seating-chart-title";

import SeatingGrid from "./SeatingGrid";
import SeatingStudentRoster from "./SeatingStudentRoster";

type SeatingChartFormProps = {
  /** 탭에서 선택한 과정 기본값 */
  initialGroupName?: string;
  /** 서버에서 조회한 과정 옵션 */
  groupOptions?: GroupOption[];
  /** 수정 모드: 기존 데이터가 있으면 전달 */
  initialData?: {
    id: string;
    title: string;
    groupName: string | null;
    rowCount: number;
    colCount: number;
    aisleAfterColumns: number[];
    seatAssignments: Record<string, string>;
    officerByStudentName?: Record<string, StudentOfficerInfo>;
  };
  /** 저장 후 이동할 목록 URL */
  listHref: string;
  /** 과정명 → 본교육 일정 (제목 자동 생성용) */
  courseSchedulesByGroupName?: Record<string, CourseScheduleForTitle>;
  /** 신규 작성 시 제목 초기값 */
  initialSuggestedTitle?: string;
};

/**
 * 자리배치도 작성·수정 폼
 * 1) 행/열/통로 입력 → 책상 생성
 * 2) 학생 이름 입력 → 저장
 */
export default function SeatingChartForm({
  initialGroupName = "",
  initialData,
  listHref,
  groupOptions,
  courseSchedulesByGroupName = {},
  initialSuggestedTitle = "",
}: SeatingChartFormProps) {
  const router = useRouter();
  const isEditMode = !!initialData;
  const resolvedGroupOptions = groupOptions ?? GROUP_OPTIONS;
  const titleManuallyEditedRef = useRef(!!initialData?.title);

  const [title, setTitle] = useState(
    initialData?.title ?? initialSuggestedTitle,
  );
  const [groupName, setGroupName] = useState(
    initialData?.groupName ?? initialGroupName,
  );
  const [rowCountInput, setRowCountInput] = useState(
    String(initialData?.rowCount ?? 4),
  );
  const [colCountInput, setColCountInput] = useState(
    String(initialData?.colCount ?? 6),
  );
  const [aisleInput, setAisleInput] = useState(
    initialData?.aisleAfterColumns.join(", ") ?? "2, 4",
  );

  // 생성된 그리드 상태
  const [gridGenerated, setGridGenerated] = useState(isEditMode);
  const [rowCount, setRowCount] = useState(initialData?.rowCount ?? 0);
  const [colCount, setColCount] = useState(initialData?.colCount ?? 0);
  const [aisleAfterColumns, setAisleAfterColumns] = useState<number[]>(
    initialData?.aisleAfterColumns ?? [],
  );
  const [seatAssignments, setSeatAssignments] = useState<
    Record<string, string>
  >(initialData?.seatAssignments ?? {});

  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingRoster, setIsLoadingRoster] = useState(false);
  const [studentRoster, setStudentRoster] = useState<string[]>([]);
  const [avatarUrlByName, setAvatarUrlByName] = useState<
    Record<string, string>
  >({});
  const [officerByStudentName, setOfficerByStudentName] = useState<
    Record<string, StudentOfficerInfo>
  >(initialData?.officerByStudentName ?? {});
  const [showTeamBadges, setShowTeamBadges] = useState(true);

  /** 선택 기수 학생 명단·반·조 불러오기 */
  const loadStudentRoster = useCallback(async (targetGroupName: string) => {
    const supabase = createClient();
    const [students, roleStudents] = await Promise.all([
      fetchSeatingStudents(supabase, targetGroupName),
      fetchClassRoleStudents(supabase, targetGroupName),
    ]);
    const names = students.map((student) => student.name);
    setStudentRoster(names);
    setAvatarUrlByName(buildAvatarUrlByName(students));
    const honorLabelsByProfileId = await fetchHonorBadgeLabelsByProfileId(
      supabase,
      roleStudents.map((s) => s.id),
    );
    const teamBadgesVisible = await isGroupTeamAssignmentActive(
      supabase,
      targetGroupName,
    );
    setShowTeamBadges(teamBadgesVisible);
    const classPresidentId = await fetchClassPresidentIdForGroup(
      supabase,
      targetGroupName,
    );
    setOfficerByStudentName(
      applyTeamBadgeVisibility(
        ensureClassPresidentInOfficerByStudentName(
          mergeHonorBadgesIntoOfficerByStudentName(
            buildOfficerInfoByStudentName(roleStudents),
            roleStudents,
            honorLabelsByProfileId,
          ),
          roleStudents,
          classPresidentId,
        ),
        teamBadgesVisible,
      ),
    );
    return names;
  }, []);

  /** 수정 모드: 그리드가 이미 있으면 명단 자동 로드 */
  useEffect(() => {
    if (!isEditMode || !groupName || !gridGenerated) return;
    void loadStudentRoster(groupName);
  }, [isEditMode, groupName, gridGenerated, loadStudentRoster]);

  /** 신규 작성: 대상 과정·본교육 시작일 기준 제목 자동 제안 (예: 15기 2주차 자리배치도) */
  useEffect(() => {
    if (isEditMode || titleManuallyEditedRef.current) return;

    const trimmedGroup = groupName.trim();
    if (!trimmedGroup) return;

    const suggestedTitle = buildSeatingChartDefaultTitle(
      trimmedGroup,
      courseSchedulesByGroupName[trimmedGroup],
    );
    setTitle(suggestedTitle);
  }, [isEditMode, groupName, courseSchedulesByGroupName]);

  /** 책상 배치 생성 + 해당 기수 명단 불러오기 */
  const handleGenerateGrid = useCallback(async () => {
    setFormError(null);

    const trimmedGroup = groupName.trim();
    if (!trimmedGroup) {
      setFormError("학생 명단을 불러오려면 대상 과정(기수)을 선택해 주세요.");
      return;
    }

    const parsedRows = Number(rowCountInput);
    const parsedCols = Number(colCountInput);

    if (!Number.isInteger(parsedRows) || parsedRows < 1 || parsedRows > 30) {
      setFormError("행은 1~30 사이의 정수로 입력해 주세요.");
      return;
    }
    if (!Number.isInteger(parsedCols) || parsedCols < 1 || parsedCols > 30) {
      setFormError("열은 1~30 사이의 정수로 입력해 주세요.");
      return;
    }

    const { values: aisleCols, error: aisleError } = parseAisleColumnsInput(
      aisleInput,
      parsedCols,
    );
    if (aisleError) {
      setFormError(aisleError);
      return;
    }

    setIsLoadingRoster(true);
    try {
      const names = await loadStudentRoster(trimmedGroup);
      if (names.length === 0) {
        setFormError(
          "선택한 기수에 등록된 학생이 없습니다. 프로필 기수 설정을 확인해 주세요.",
        );
        return;
      }

      setRowCount(parsedRows);
      setColCount(parsedCols);
      setAisleAfterColumns(aisleCols);

      setSeatAssignments((prev) => {
        const next: Record<string, string> = {};
        for (let row = 1; row <= parsedRows; row++) {
          for (let col = 1; col <= parsedCols; col++) {
            const key = `${row}-${col}`;
            if (prev[key]) next[key] = prev[key];
          }
        }
        return next;
      });

      setGridGenerated(true);
    } finally {
      setIsLoadingRoster(false);
    }
  }, [
    groupName,
    rowCountInput,
    colCountInput,
    aisleInput,
    loadStudentRoster,
  ]);

  const handleSeatChange = useCallback((seatKey: string, name: string) => {
    setSeatAssignments((prev) => ({ ...prev, [seatKey]: name }));
  }, []);

  const handleSeatDrop = useCallback(
    (seatKey: string, payload: SeatingDragPayload) => {
      setSeatAssignments((prev) => applySeatDrop(prev, seatKey, payload));
    },
    [],
  );

  const handleRosterDrop = useCallback((payload: SeatingDragPayload) => {
    setSeatAssignments((prev) => applyRosterDrop(prev, payload));
  }, []);

  const groupLabel =
    resolvedGroupOptions.find((opt) => opt.value === groupName)?.label ??
    groupName ??
    "선택 기수";

  /** DB 저장 */
  const handleSave = useCallback(async () => {
    setFormError(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setFormError("제목을 입력해 주세요.");
      return;
    }
    if (!gridGenerated || rowCount < 1 || colCount < 1) {
      setFormError("먼저 '책상 배치 생성' 버튼을 눌러 주세요.");
      return;
    }

  // 빈 문자열 키 정리
    const cleanedAssignments: Record<string, string> = {};
    for (const [key, name] of Object.entries(seatAssignments)) {
      const trimmed = name.trim();
      if (trimmed) cleanedAssignments[key] = trimmed;
    }

    setIsSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setFormError("로그인이 필요합니다.");
        return;
      }

      // 저장 시점의 반장·조장·조원을 스냅샷으로 고정
      let officersSnapshot = officerByStudentName;
      const trimmedGroup = groupName.trim();
      if (trimmedGroup) {
        const roleStudents = await fetchClassRoleStudents(
          supabase,
          trimmedGroup,
        );
        const honorLabelsByProfileId = await fetchHonorBadgeLabelsByProfileId(
          supabase,
          roleStudents.map((s) => s.id),
        );
        const showTeamBadges = await isGroupTeamAssignmentActive(
          supabase,
          trimmedGroup,
        );
        const classPresidentId = await fetchClassPresidentIdForGroup(
          supabase,
          trimmedGroup,
        );
        officersSnapshot = applyTeamBadgeVisibility(
          ensureClassPresidentInOfficerByStudentName(
            mergeHonorBadgesIntoOfficerByStudentName(
              buildOfficerInfoByStudentName(roleStudents),
              roleStudents,
              honorLabelsByProfileId,
            ),
            roleStudents,
            classPresidentId,
          ),
          showTeamBadges,
        );
        setOfficerByStudentName(officersSnapshot);
      }

      const payload = {
        title: trimmedTitle,
        group_name: groupName || null,
        row_count: rowCount,
        col_count: colCount,
        aisle_after_columns: aisleAfterColumns,
        seat_assignments: cleanedAssignments,
        officer_by_student_name: officersSnapshot,
      };

      if (isEditMode && initialData) {
        const { error } = await supabase
          .from("seating_charts")
          .update(payload)
          .eq("id", initialData.id);

        if (error) {
          console.error("자리배치도 수정 오류:", error);
          setFormError("저장 중 오류가 발생했습니다. 다시 시도해 주세요.");
          return;
        }

        router.push(`/admin/seating/${initialData.id}`);
        router.refresh();
      } else {
        const { data, error } = await supabase
          .from("seating_charts")
          .insert({ ...payload, created_by: user.id })
          .select("id")
          .single();

        if (error || !data) {
          console.error("자리배치도 저장 오류:", error);
          setFormError("저장 중 오류가 발생했습니다. 다시 시도해 주세요.");
          return;
        }

        router.push(`/admin/seating/${data.id}`);
        router.refresh();
      }
    } catch (e) {
      console.error("자리배치도 저장 예외:", e);
      setFormError("저장 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  }, [
    title,
    groupName,
    gridGenerated,
    rowCount,
    colCount,
    aisleAfterColumns,
    seatAssignments,
    isEditMode,
    initialData,
    router,
  ]);

  return (
    <div className="space-y-8">
      {/* 기본 정보 */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
          기본 정보
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5 sm:col-span-2">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              제목 <span className="text-red-500">*</span>
            </span>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                titleManuallyEditedRef.current = true;
                setTitle(e.target.value);
              }}
              placeholder="예: 15기 2주차 자리배치도"
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={100}
            />
            {!isEditMode ? (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                대상 과정의 본교육 시작일과 오늘 날짜(휴일 제외)로 주차를
                계산해 기본 제목을 채웁니다. 직접 수정하면 자동 변경되지
                않습니다.
              </p>
            ) : null}
          </label>

          <label className="block space-y-1.5 sm:col-span-2">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              대상 과정
            </span>
            <select
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">전체 공통</option>
              {resolvedGroupOptions.filter((opt) => opt.value).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {/* 배치 설정 */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
          좌석 배치 설정
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              행 (앞→뒤)
            </span>
            <input
              type="number"
              min={1}
              max={30}
              value={rowCountInput}
              onChange={(e) => setRowCountInput(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              열 (좌→우)
            </span>
            <input
              type="number"
              min={1}
              max={30}
              value={colCountInput}
              onChange={(e) => setColCountInput(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>

          <label className="block space-y-1.5 sm:col-span-1">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              통로 열
            </span>
            <input
              type="text"
              value={aisleInput}
              onChange={(e) => setAisleInput(e.target.value)}
              placeholder="예: 2, 4"
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              해당 열 뒤에 통로가 생깁니다 (쉼표로 구분)
            </span>
          </label>
        </div>

        <Button
          type="button"
          onClick={() => void handleGenerateGrid()}
          variant="outline"
          disabled={isLoadingRoster}
        >
          {isLoadingRoster ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              명단 불러오는 중...
            </>
          ) : (
            <>
              <LayoutGrid className="size-4" />
              책상 배치 생성
            </>
          )}
        </Button>
      </section>

      {/* 생성된 그리드 + 학생 입력 */}
      {gridGenerated && rowCount > 0 && colCount > 0 ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
            학생 배치
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            위 명단에서 이름을 드래그해 책상에 놓거나, 책상에 직접 입력할 수
            있습니다. ({rowCount}행 × {colCount}열
            {aisleAfterColumns.length > 0
              ? `, 통로: ${aisleAfterColumns.join("·")}열 뒤`
              : ""}
            )
          </p>
          <div className="flex flex-col gap-6">
            <SeatingStudentRoster
              roster={studentRoster}
              seatAssignments={seatAssignments}
              groupLabel={groupLabel}
              onDropFromDesk={handleRosterDrop}
              className="w-full"
            />
            <div className="w-full overflow-x-auto">
              <SeatingGrid
                rowCount={rowCount}
                colCount={colCount}
                aisleAfterColumns={aisleAfterColumns}
                seatAssignments={seatAssignments}
                editable
                dragDropEnabled={studentRoster.length > 0}
                onSeatChange={handleSeatChange}
                onSeatDrop={handleSeatDrop}
                avatarUrlByName={avatarUrlByName}
                officerByStudentName={officerByStudentName}
                showTeamBadges={showTeamBadges}
              />
            </div>
          </div>
        </section>
      ) : null}

      {formError ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {formError}
        </p>
      ) : null}

      {/* 저장 버튼 */}
      <div className="flex flex-wrap gap-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
        <Button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !gridGenerated}
          className="bg-blue-500 hover:bg-blue-600 text-white"
        >
          {isSaving ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              저장 중...
            </>
          ) : isEditMode ? (
            "수정 완료"
          ) : (
            "저장하기"
          )}
        </Button>
        <Button type="button" variant="outline" asChild>
          <a href={listHref}>취소</a>
        </Button>
      </div>
    </div>
  );
}
