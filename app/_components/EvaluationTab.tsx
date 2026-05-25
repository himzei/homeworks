"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  ChevronDown,
  ChevronUp,
  Download,
  GripVertical,
  Loader2,
  Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAdmin } from "@/lib/auth/SessionProvider";
import {
  downloadElementAsPng,
  sanitizeDownloadFilename,
} from "@/lib/download-element-as-image";

// 과제 데이터 타입 정의
interface Assignment {
  id: string;
  title: string; // 숙제 제목
  content?: string; // 숙제 내용 (선택적)
  startDate: Date; // 게시 시작일
  endDate: Date; // 게시 종료일
}

// 사용자 정보 타입 정의
interface User {
  id: string;
  name: string;
}

// 추가 평가 필드(시험, 프로젝트 등)
interface ExtraEvaluationField {
  id: string;
  title: string;
  group_name: string | null;
  sort_order: number;
  /** 그리드 표시·정렬용 날짜 (YYYY-MM-DD), 없으면 created_at 사용 */
  field_date: string | null;
  created_at: string;
}

// 평가 상태 타입 정의
type EvaluationStatus = "미제출" | "검토중" | "수정필요" | "승인" | "모범답안";

// 평가 점수 매핑 (DB status ↔ 화면 점수)
const EVALUATION_SCORES: Record<EvaluationStatus, number> = {
  미제출: 0,
  검토중: 0,
  수정필요: 7, // 미흡
  승인: 10,
  모범답안: 13,
};

/** 과제 점수 입력 허용 값 */
const ALLOWED_ASSIGNMENT_SCORES = [0, 7, 10, 13] as const;

const ASSIGNMENT_SCORE_MIN = 0;
const ASSIGNMENT_SCORE_MAX = 13;

const SCORE_TO_STATUS = {
  0: "검토중",
  7: "수정필요",
  10: "승인",
  13: "모범답안",
} as const satisfies Record<
  (typeof ALLOWED_ASSIGNMENT_SCORES)[number],
  Exclude<EvaluationStatus, "미제출">
>;

/** 평가 그리드 열 너비 (이름 · 총합·과제·추가 필드 박스) */
const EVALUATION_NAME_COLUMN_WIDTH = "96px";
const EVALUATION_FIELD_COLUMN_WIDTH = "88px";

/** 입력 점수를 허용 값(0·7·10·13) 중 가장 가까운 값으로 맞춤 */
function snapAssignmentScore(score: number): (typeof ALLOWED_ASSIGNMENT_SCORES)[number] {
  const clamped = Math.min(
    ASSIGNMENT_SCORE_MAX,
    Math.max(ASSIGNMENT_SCORE_MIN, Math.round(score)),
  );
  let nearest: (typeof ALLOWED_ASSIGNMENT_SCORES)[number] = 0;
  let minDiff = Number.POSITIVE_INFINITY;
  for (const allowed of ALLOWED_ASSIGNMENT_SCORES) {
    const diff = Math.abs(allowed - clamped);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = allowed;
    }
  }
  return nearest;
}

/** 점수를 DB 저장용 상태로 변환 */
function scoreToEvaluationStatus(
  score: number,
): Exclude<EvaluationStatus, "미제출"> {
  return SCORE_TO_STATUS[snapAssignmentScore(score)];
}

/** 상태를 화면 표시용 점수로 변환 */
function evaluationStatusToScore(status: EvaluationStatus): number {
  return EVALUATION_SCORES[status];
}

/** mm/dd 형식으로 날짜 표시 */
function formatDateMMDD(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}/${day}`;
}

/** date input(YYYY-MM-DD)용 로컬 날짜 문자열 */
function dateToInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** YYYY-MM-DD → 해당 일 00:00 (로컬). 잘못된 값이면 null */
function parseInputDateAsLocalDay(value: string): Date | null {
  if (!value) return null;
  const parts = value.split("-").map(Number);
  if (parts.length !== 3) return null;
  const [year, month, day] = parts;
  if (!year || !month || !day) return null;
  const parsed = new Date(year, month - 1, day);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

/** 그리드 열 배경·테두리 (과제 / 추가 필드) */
const EVALUATION_COLUMN_CELL_STYLES = {
  assignment: {
    headerContainer:
      "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800",
    headerTitle: "text-black dark:text-zinc-50",
    scoreCell:
      "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800",
    scoreInput:
      "border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 focus:ring-blue-500",
  },
  extra: {
    headerContainer:
      "bg-zinc-50 dark:bg-zinc-900/80 border-zinc-200 dark:border-zinc-700",
    headerTitle: "text-zinc-800 dark:text-zinc-200",
    scoreCell:
      "bg-zinc-50/90 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-700",
    scoreInput:
      "border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 focus:ring-zinc-500",
  },
} as const;

/** 평가 그리드 열 헤더: 날짜 · 제목 */
function EvaluationColumnHeader({
  dateLabel,
  title,
  stickyClassName = "",
  containerClassName,
  titleClassName,
}: {
  dateLabel: string;
  title: string;
  stickyClassName?: string;
  containerClassName: string;
  titleClassName: string;
}) {
  return (
    <div
      className={`${stickyClassName} ${containerClassName} evaluation-grid-column-header relative flex flex-col items-center justify-center gap-0.5 min-h-[60px] px-2 py-2 shadow-sm border rounded-lg`}
    >
      <span className="text-[14px] font-medium text-zinc-500 dark:text-zinc-400 tabular-nums">
        {dateLabel}
      </span>
      <span
        className={`w-full text-[10px] font-medium text-center line-clamp-2 ${titleClassName}`}
      >
        {title}
      </span>
    </div>
  );
}

/** 그리드 열: 과제 또는 추가 필드 */
type EvaluationGridColumn =
  | { kind: "assignment"; assignment: Assignment }
  | { kind: "extra"; field: ExtraEvaluationField };

/** 추가 필드 표시·정렬용 날짜 (field_date 우선) */
function getExtraFieldDisplayDate(field: ExtraEvaluationField): Date {
  if (field.field_date) {
    const parsed = parseInputDateAsLocalDay(field.field_date.slice(0, 10));
    if (parsed) return parsed;
  }
  return new Date(field.created_at);
}

/** date input 값 (field_date 또는 생성일) */
function getExtraFieldDateInputValue(field: ExtraEvaluationField): string {
  if (field.field_date) {
    return field.field_date.slice(0, 10);
  }
  return dateToInputValue(new Date(field.created_at));
}

function sortExtraFieldsByDisplayDate(
  fields: ExtraEvaluationField[],
): ExtraEvaluationField[] {
  return fields.toSorted(
    (fieldA, fieldB) =>
      getExtraFieldDisplayDate(fieldB).getTime() -
      getExtraFieldDisplayDate(fieldA).getTime(),
  );
}

/** 열 정렬용 시각 (과제=시작일, 추가 필드=표시 날짜) */
function getEvaluationColumnSortTime(column: EvaluationGridColumn): number {
  if (column.kind === "assignment") {
    return column.assignment.startDate.getTime();
  }
  return getExtraFieldDisplayDate(column.field).getTime();
}

/** 날짜 내림차순(최신 먼저), 동일 시 제목 내림차순 */
function compareEvaluationColumnsDesc(
  columnA: EvaluationGridColumn,
  columnB: EvaluationGridColumn,
): number {
  const timeDiff =
    getEvaluationColumnSortTime(columnB) - getEvaluationColumnSortTime(columnA);
  if (timeDiff !== 0) return timeDiff;

  const titleA =
    columnA.kind === "assignment"
      ? columnA.assignment.title
      : columnA.field.title;
  const titleB =
    columnB.kind === "assignment"
      ? columnB.assignment.title
      : columnB.field.title;
  return titleB.localeCompare(titleA, "ko-KR");
}

/** 과제 시작일이 필터 구간(일 단위)에 포함되는지 */
function isAssignmentInDateRange(
  assignmentStartDate: Date,
  rangeStart: Date,
  rangeEnd: Date,
): boolean {
  const toDayTimestamp = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

  const assignmentDay = toDayTimestamp(assignmentStartDate);
  const startDay = toDayTimestamp(rangeStart);
  const endDay = toDayTimestamp(rangeEnd);
  return assignmentDay >= startDay && assignmentDay <= endDay;
}

interface EvaluationTabProps {
  assignments: Assignment[];
  /** 과정 필터 - 지정 시 해당 과정 학생만 표시 */
  selectedGroup?: string | null;
}

export default function EvaluationTab({
  assignments,
  selectedGroup = null,
}: EvaluationTabProps) {
  // Supabase 클라이언트를 메모이제이션하여 무한 루프 방지
  const supabase = useMemo(() => createClient(), []);

  // 전역 세션에서 관리자 권한 가져오기
  const { isAdmin, isCheckingAdmin } = useAdmin();

  // 사용자 목록 상태
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(true);
  // 타임아웃 방지를 위한 ref
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // isCheckingAdmin이 너무 오래 true인 경우를 감지하기 위한 ref
  const checkingAdminTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // 과제 점수 입력 시작 시점의 상태 (저장 실패 시 롤백용)
  const assignmentEditRollbackRef = useRef<Record<string, EvaluationStatus>>(
    {},
  );
  // 과제 점수 입력 중 표시용 (10·13 등 여러 자리 입력 시 깜빡임 방지)
  const [assignmentScoreDraftByKey, setAssignmentScoreDraftByKey] = useState<
    Record<string, string>
  >({});

  // 평가 상태 저장: { "userId-assignmentId": "미제출" | "수정필요" | "승인" | "모범답안" }
  const [evaluationStatuses, setEvaluationStatuses] = useState<
    Record<string, EvaluationStatus>
  >({});

  // 제출 정보 저장: { "userId-assignmentId": { url: string, submittedAt: string } }
  const [submissionData, setSubmissionData] = useState<
    Record<string, { url: string; submittedAt: string }>
  >({});

  // 추가 필드(시험·프로젝트 등) 및 학생별 점수
  const [extraFields, setExtraFields] = useState<ExtraEvaluationField[]>([]);
  const [extraScores, setExtraScores] = useState<Record<string, number>>({});
  const [isLoadingExtraFields, setIsLoadingExtraFields] = useState(false);
  const [showAddFieldForm, setShowAddFieldForm] = useState(false);
  /** 추가 필드 관리 목록 접기/펴기 (기본: 접힘) */
  const [isExtraFieldManagerExpanded, setIsExtraFieldManagerExpanded] =
    useState(false);
  const [newFieldTitle, setNewFieldTitle] = useState("");
  const [newFieldDate, setNewFieldDate] = useState(() =>
    dateToInputValue(new Date()),
  );
  const [isAddingField, setIsAddingField] = useState(false);
  const [isReorderingFields, setIsReorderingFields] = useState(false);
  const [updatingFieldDateId, setUpdatingFieldDateId] = useState<string | null>(
    null,
  );
  const [deletingFieldId, setDeletingFieldId] = useState<string | null>(null);
  const [draggedFieldId, setDraggedFieldId] = useState<string | null>(null);
  const [dragOverFieldId, setDragOverFieldId] = useState<string | null>(null);
  const [isDownloadingImage, setIsDownloadingImage] = useState(false);
  const gridExportRef = useRef<HTMLDivElement>(null);

  const isFieldActionBusy =
    isReorderingFields ||
    isLoadingExtraFields ||
    deletingFieldId !== null ||
    updatingFieldDateId !== null;

  // 기수(현재 props) 과제 시작일의 최소·최대 — 날짜 필터 기본값
  const cohortDateBounds = useMemo(() => {
    if (assignments.length === 0) return null;

    let minTimestamp = assignments[0].startDate.getTime();
    let maxTimestamp = assignments[0].startDate.getTime();

    for (const assignment of assignments) {
      const timestamp = assignment.startDate.getTime();
      if (timestamp < minTimestamp) minTimestamp = timestamp;
      if (timestamp > maxTimestamp) maxTimestamp = timestamp;
    }

    const minDate = new Date(minTimestamp);
    const maxDate = new Date(maxTimestamp);

    return {
      minDate,
      maxDate,
      minInput: dateToInputValue(minDate),
      maxInput: dateToInputValue(maxDate),
    };
  }, [assignments]);

  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  // 기수·과제 목록이 바뀌면 해당 기간 전체를 기본으로 맞춤
  useEffect(() => {
    if (!cohortDateBounds) {
      setFilterStartDate("");
      setFilterEndDate("");
      return;
    }
    setFilterStartDate(cohortDateBounds.minInput);
    setFilterEndDate(cohortDateBounds.maxInput);
  }, [cohortDateBounds]);

  const filteredAssignments = useMemo(() => {
    const rangeStart = parseInputDateAsLocalDay(filterStartDate);
    const rangeEnd = parseInputDateAsLocalDay(filterEndDate);

    if (!rangeStart || !rangeEnd) {
      return assignments.toSorted(
        (assignmentA, assignmentB) =>
          assignmentB.startDate.getTime() - assignmentA.startDate.getTime(),
      );
    }

    const effectiveStart =
      rangeStart.getTime() <= rangeEnd.getTime() ? rangeStart : rangeEnd;
    const effectiveEnd =
      rangeStart.getTime() <= rangeEnd.getTime() ? rangeEnd : rangeStart;

    const inRange = assignments.filter((assignment) =>
      isAssignmentInDateRange(
        assignment.startDate,
        effectiveStart,
        effectiveEnd,
      ),
    );

    return inRange.toSorted(
      (assignmentA, assignmentB) =>
        assignmentB.startDate.getTime() - assignmentA.startDate.getTime(),
    );
  }, [assignments, filterStartDate, filterEndDate]);

  // 과제·추가 필드를 날짜 기준 최신순(내림차순)으로 한 줄에 정렬
  const sortedGridColumns = useMemo((): EvaluationGridColumn[] => {
    const columns: EvaluationGridColumn[] = [
      ...filteredAssignments.map((assignment) => ({
        kind: "assignment" as const,
        assignment,
      })),
      ...extraFields.map((field) => ({
        kind: "extra" as const,
        field,
      })),
    ];

    return columns.toSorted(compareEvaluationColumnsDesc);
  }, [filteredAssignments, extraFields]);

  const handleFilterStartDateChange = (value: string) => {
    setFilterStartDate(value);
    if (filterEndDate && value > filterEndDate) {
      setFilterEndDate(value);
    }
  };

  const handleFilterEndDateChange = (value: string) => {
    setFilterEndDate(value);
    if (filterStartDate && value < filterStartDate) {
      setFilterStartDate(value);
    }
  };

  const handleResetDateFilter = () => {
    if (!cohortDateBounds) return;
    setFilterStartDate(cohortDateBounds.minInput);
    setFilterEndDate(cohortDateBounds.maxInput);
  };

  // 관리자 권한은 전역 세션에서 관리하므로 별도 확인 불필요

  // 사용자 목록 가져오기 (관리자 제외)
  useEffect(() => {
    // 기존 타임아웃 클리어
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
    if (checkingAdminTimeoutRef.current) {
      clearTimeout(checkingAdminTimeoutRef.current);
      checkingAdminTimeoutRef.current = null;
    }

    const fetchUsers = async () => {
      // 관리자가 아니거나 권한 확인 중이면 실행하지 않음
      if (!isAdmin || isCheckingAdmin) {
        // 관리자가 아닌 경우 로딩 상태 해제
        if (!isCheckingAdmin && !isAdmin) {
          setIsLoadingUsers(false);
        }
        // 권한 확인 중인 경우 타임아웃 설정 (5초 후 강제로 로딩 해제)
        if (isCheckingAdmin) {
          loadingTimeoutRef.current = setTimeout(() => {
            console.warn("관리자 권한 확인 타임아웃 - 로딩 상태 해제");
            setIsLoadingUsers(false);
          }, 5000);

          // isCheckingAdmin이 너무 오래 true인 경우를 감지 (10초 후 경고)
          checkingAdminTimeoutRef.current = setTimeout(() => {
            console.warn(
              "isCheckingAdmin이 10초 이상 true 상태입니다. 세션 확인에 문제가 있을 수 있습니다.",
            );
          }, 10000);
        }
        return;
      }

      try {
        setIsLoadingUsers(true);
        let profilesQuery = supabase
          .from("profiles")
          .select("id, name, role")
          .eq("approval_status", "approved")
          .order("created_at", { ascending: true });

        if (selectedGroup) {
          profilesQuery = profilesQuery.eq("group_name", selectedGroup);
        }

        const { data: profilesData, error } = await profilesQuery;

        if (error) {
          console.error("사용자 목록 조회 실패:", error);
          setIsLoadingUsers(false);
          return;
        }

        // 관리자가 아닌 사용자만 필터링하고 이름 오름차순 정렬
        const usersList: User[] =
          profilesData
            ?.filter((profile) => profile.role !== "admin")
            .map((profile) => ({
              id: profile.id,
              name: profile.name || "이름 없음",
            }))
            .sort((a, b) => {
              // 이름을 오름차순으로 정렬 (한글 정렬 지원)
              return a.name.localeCompare(b.name, "ko-KR");
            }) || [];

        setUsers(usersList);
      } catch (error) {
        console.error("사용자 목록 가져오기 중 오류:", error);
      } finally {
        setIsLoadingUsers(false);
        // 타임아웃 클리어
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
          loadingTimeoutRef.current = null;
        }
      }
    };

    fetchUsers();

    // 클린업 함수: 컴포넌트 언마운트 시 타임아웃 클리어
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      if (checkingAdminTimeoutRef.current) {
        clearTimeout(checkingAdminTimeoutRef.current);
        checkingAdminTimeoutRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, isCheckingAdmin, selectedGroup]); // supabase는 메모이제이션되어 있으므로 의존성에서 제외

  // 제출 정보 가져오기
  useEffect(() => {
    const fetchSubmissions = async () => {
      if (!isAdmin || isCheckingAdmin || assignments.length === 0) return;

      try {
        const assignmentIds = assignments.map((a) => a.id);
        const { data: homeworks, error } = await supabase
          .from("homeworks")
          .select("user_id, assignment_id, url, created_at, status")
          .in("assignment_id", assignmentIds);

        if (error) {
          console.error("제출 정보 조회 실패:", error);
          return;
        }

        // 제출 정보를 맵으로 변환
        const submissionsMap: Record<
          string,
          { url: string; submittedAt: string }
        > = {};

        homeworks?.forEach((homework) => {
          const key = `${homework.user_id}-${homework.assignment_id}`;
          submissionsMap[key] = {
            url: homework.url,
            submittedAt: new Date(homework.created_at).toLocaleString("ko-KR"),
          };
        });

        setSubmissionData(submissionsMap);

        // 제출된 과제의 상태를 데이터베이스에서 가져온 값으로 초기화
        const initialStatuses: Record<string, EvaluationStatus> = {};
        homeworks?.forEach((homework) => {
          const key = `${homework.user_id}-${homework.assignment_id}`;
          // 데이터베이스에서 가져온 상태가 있으면 사용하고, 없으면 기본값 "검토중"
          const status = (homework.status as EvaluationStatus) || "검토중";
          initialStatuses[key] = status;
        });

        if (Object.keys(initialStatuses).length > 0) {
          setEvaluationStatuses((prev) => ({ ...prev, ...initialStatuses }));
        }
      } catch (error) {
        console.error("제출 정보 가져오기 중 오류:", error);
      }
    };

    fetchSubmissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, isCheckingAdmin, assignments]); // supabase는 메모이제이션되어 있으므로 의존성에서 제외

  // 추가 평가 필드 목록 조회
  useEffect(() => {
    const fetchExtraFields = async () => {
      if (!isAdmin || isCheckingAdmin) return;

      setIsLoadingExtraFields(true);
      try {
        const groupQuery = selectedGroup
          ? `?group=${encodeURIComponent(selectedGroup)}`
          : "";
        const res = await fetch(`/api/admin/evaluation-fields${groupQuery}`);
        const payload = (await res.json().catch(() => ({}))) as {
          fields?: ExtraEvaluationField[];
          error?: string;
        };

        if (!res.ok) {
          console.error("추가 필드 조회 실패:", payload.error);
          setExtraFields([]);
          return;
        }

        const normalizedFields = (payload.fields ?? []).map((field) => ({
          ...field,
          field_date: field.field_date ?? null,
        }));
        setExtraFields(sortExtraFieldsByDisplayDate(normalizedFields));
      } catch (error) {
        console.error("추가 필드 조회 중 오류:", error);
        setExtraFields([]);
      } finally {
        setIsLoadingExtraFields(false);
      }
    };

    fetchExtraFields();
  }, [isAdmin, isCheckingAdmin, selectedGroup]);

  // 추가 필드 점수 조회
  useEffect(() => {
    const fetchExtraScores = async () => {
      if (!isAdmin || isCheckingAdmin || extraFields.length === 0) {
        setExtraScores({});
        return;
      }

      try {
        const fieldIds = extraFields.map((field) => field.id);
        const { data, error } = await supabase
          .from("evaluation_extra_scores")
          .select("user_id, field_id, score")
          .in("field_id", fieldIds);

        if (error) {
          console.error("추가 점수 조회 실패:", error);
          return;
        }

        const scoreMap: Record<string, number> = {};
        data?.forEach((row) => {
          scoreMap[`${row.user_id}-${row.field_id}`] = row.score ?? 0;
        });
        setExtraScores(scoreMap);
      } catch (error) {
        console.error("추가 점수 조회 중 오류:", error);
      }
    };

    fetchExtraScores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, isCheckingAdmin, extraFields]);

  // 평가 상태 키 생성 함수
  const getEvaluationKey = (userId: string, assignmentId: string): string => {
    return `${userId}-${assignmentId}`;
  };

  // 특정 사용자의 특정 과제 평가 상태 가져오기
  const getEvaluationStatus = (
    userId: string,
    assignmentId: string,
  ): EvaluationStatus => {
    const key = getEvaluationKey(userId, assignmentId);
    return evaluationStatuses[key] || "미제출";
  };

  // 특정 사용자의 특정 과제 점수 가져오기
  const getScore = (userId: string, assignmentId: string): number => {
    const status = getEvaluationStatus(userId, assignmentId);
    return EVALUATION_SCORES[status];
  };

  const getExtraScoreKey = (userId: string, fieldId: string): string =>
    `${userId}-${fieldId}`;

  const getExtraScore = (userId: string, fieldId: string): number => {
    return extraScores[getExtraScoreKey(userId, fieldId)] ?? 0;
  };

  // 특정 사용자의 총점 계산 (날짜 필터된 과제 + 추가 필드 점수)
  const getTotalScore = (userId: string): number => {
    const assignmentTotal = filteredAssignments.reduce((total, assignment) => {
      return total + getScore(userId, assignment.id);
    }, 0);
    const extraTotal = extraFields.reduce((total, field) => {
      return total + getExtraScore(userId, field.id);
    }, 0);
    return assignmentTotal + extraTotal;
  };

  const updateExtraScore = useCallback(
    async (userId: string, fieldId: string, score: number) => {
      const key = getExtraScoreKey(userId, fieldId);
      const rollbackFrom = extraScores[key] ?? 0;

      setExtraScores((prev) => ({ ...prev, [key]: score }));

      try {
        const res = await fetch("/api/admin/evaluation-scores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, fieldId, score }),
        });
        const payload = (await res.json().catch(() => ({}))) as {
          error?: string;
        };

        if (!res.ok) {
          setExtraScores((prev) => ({ ...prev, [key]: rollbackFrom }));
          alert(
            typeof payload?.error === "string"
              ? payload.error
              : "점수 저장에 실패했습니다.",
          );
        }
      } catch (error) {
        console.error("추가 점수 저장 중 오류:", error);
        setExtraScores((prev) => ({ ...prev, [key]: rollbackFrom }));
        alert("점수 저장 중 오류가 발생했습니다.");
      }
    },
    [extraScores],
  );

  const updateExtraFieldDate = async (fieldId: string, fieldDate: string) => {
    if (!fieldDate) {
      alert("표시 날짜를 선택해주세요.");
      return;
    }

    const previousFields = extraFields;
    setUpdatingFieldDateId(fieldId);
    setExtraFields((prev) =>
      prev.map((field) =>
        field.id === fieldId ? { ...field, field_date: fieldDate } : field,
      ),
    );

    try {
      const res = await fetch("/api/admin/evaluation-fields", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fieldId,
          fieldDate,
          groupName: selectedGroup ?? null,
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        field?: ExtraEvaluationField;
        error?: string;
      };

      if (!res.ok || !payload.field) {
        setExtraFields(previousFields);
        alert(
          typeof payload?.error === "string"
            ? payload.error
            : "날짜 저장에 실패했습니다.",
        );
        return;
      }

      setExtraFields((prev) =>
        sortExtraFieldsByDisplayDate(
          prev.map((field) =>
            field.id === fieldId ? payload.field! : field,
          ),
        ),
      );
    } catch (error) {
      console.error("필드 날짜 수정 중 오류:", error);
      setExtraFields(previousFields);
      alert("날짜 저장 중 오류가 발생했습니다.");
    } finally {
      setUpdatingFieldDateId(null);
    }
  };

  const handleAddExtraField = async () => {
    const trimmedTitle = newFieldTitle.trim();
    if (!trimmedTitle) {
      alert("필드 이름을 입력해주세요.");
      return;
    }
    if (!newFieldDate) {
      alert("표시 날짜를 선택해주세요.");
      return;
    }

    setIsAddingField(true);
    try {
      const res = await fetch("/api/admin/evaluation-fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmedTitle,
          fieldDate: newFieldDate,
          groupName: selectedGroup ?? null,
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        field?: ExtraEvaluationField;
        error?: string;
      };

      if (!res.ok || !payload.field) {
        alert(
          typeof payload?.error === "string"
            ? payload.error
            : "필드 추가에 실패했습니다.",
        );
        return;
      }

      setExtraFields((prev) =>
        sortExtraFieldsByDisplayDate([...prev, payload.field!]),
      );
      setNewFieldTitle("");
      setNewFieldDate(dateToInputValue(new Date()));
      setShowAddFieldForm(false);
    } catch (error) {
      console.error("필드 추가 중 오류:", error);
      alert("필드 추가 중 오류가 발생했습니다.");
    } finally {
      setIsAddingField(false);
    }
  };

  // 추가 필드 열 순서 저장 (드래그·버튼 공통)
  const saveExtraFieldOrder = async (
    reorderedFields: ExtraEvaluationField[],
  ) => {
    const previousFields = extraFields;

    setExtraFields(reorderedFields);
    setIsReorderingFields(true);

    try {
      const res = await fetch("/api/admin/evaluation-fields", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderedFieldIds: reorderedFields.map((field) => field.id),
          groupName: selectedGroup ?? null,
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        fields?: ExtraEvaluationField[];
        error?: string;
      };

      if (!res.ok) {
        setExtraFields(previousFields);
        alert(
          typeof payload?.error === "string"
            ? payload.error
            : "필드 순서 저장에 실패했습니다.",
        );
        return;
      }

      if (payload.fields?.length) {
        setExtraFields(payload.fields);
      }
    } catch (error) {
      console.error("필드 순서 변경 중 오류:", error);
      setExtraFields(previousFields);
      alert("필드 순서 변경 중 오류가 발생했습니다.");
    } finally {
      setIsReorderingFields(false);
    }
  };

  // 한 칸 앞(왼쪽 열) / 뒤(오른쪽 열)로 이동
  const moveExtraField = (fieldIndex: number, direction: -1 | 1) => {
    const targetIndex = fieldIndex + direction;
    if (
      targetIndex < 0 ||
      targetIndex >= extraFields.length ||
      isFieldActionBusy
    ) {
      return;
    }

    const reorderedFields = [...extraFields];
    const [movedField] = reorderedFields.splice(fieldIndex, 1);
    reorderedFields.splice(targetIndex, 0, movedField);
    void saveExtraFieldOrder(reorderedFields);
  };

  const handleFieldDragStart = (
    event: React.DragEvent<HTMLLIElement>,
    fieldId: string,
  ) => {
    if (isFieldActionBusy) {
      event.preventDefault();
      return;
    }
    setDraggedFieldId(fieldId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", fieldId);
  };

  const handleFieldDragOver = (
    event: React.DragEvent<HTMLLIElement>,
    fieldId: string,
  ) => {
    event.preventDefault();
    if (draggedFieldId && draggedFieldId !== fieldId) {
      setDragOverFieldId(fieldId);
      event.dataTransfer.dropEffect = "move";
    }
  };

  const handleFieldDrop = (
    event: React.DragEvent<HTMLLIElement>,
    targetFieldId: string,
  ) => {
    event.preventDefault();
    setDragOverFieldId(null);

    if (
      !draggedFieldId ||
      draggedFieldId === targetFieldId ||
      isFieldActionBusy
    ) {
      setDraggedFieldId(null);
      return;
    }

    const fromIndex = extraFields.findIndex(
      (field) => field.id === draggedFieldId,
    );
    const toIndex = extraFields.findIndex(
      (field) => field.id === targetFieldId,
    );
    setDraggedFieldId(null);

    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

    const reorderedFields = [...extraFields];
    const [movedField] = reorderedFields.splice(fromIndex, 1);
    reorderedFields.splice(toIndex, 0, movedField);
    void saveExtraFieldOrder(reorderedFields);
  };

  const handleFieldDragEnd = () => {
    setDraggedFieldId(null);
    setDragOverFieldId(null);
  };

  // 추가 필드 삭제 (연결된 점수도 함께 삭제됨)
  const deleteExtraField = async (field: ExtraEvaluationField) => {
    const confirmed = confirm(
      `"${field.title}" 필드를 삭제하시겠습니까?\n입력된 점수도 함께 삭제되며 되돌릴 수 없습니다.`,
    );
    if (!confirmed) return;

    const previousFields = extraFields;
    const previousScores = extraScores;

    setDeletingFieldId(field.id);
    setExtraFields((prev) => prev.filter((item) => item.id !== field.id));
    setExtraScores((prev) => {
      const next: Record<string, number> = {};
      const suffix = `-${field.id}`;
      for (const [key, value] of Object.entries(prev)) {
        if (!key.endsWith(suffix)) {
          next[key] = value;
        }
      }
      return next;
    });

    try {
      const groupQuery = selectedGroup
        ? `&group=${encodeURIComponent(selectedGroup)}`
        : "";
      const res = await fetch(
        `/api/admin/evaluation-fields?id=${encodeURIComponent(field.id)}${groupQuery}`,
        { method: "DELETE" },
      );
      const payload = (await res.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!res.ok) {
        setExtraFields(previousFields);
        setExtraScores(previousScores);
        alert(
          typeof payload?.error === "string"
            ? payload.error
            : "필드 삭제에 실패했습니다.",
        );
      }
    } catch (error) {
      console.error("필드 삭제 중 오류:", error);
      setExtraFields(previousFields);
      setExtraScores(previousScores);
      alert("필드 삭제 중 오류가 발생했습니다.");
    } finally {
      setDeletingFieldId(null);
    }
  };

  // 제출 상태를 서버 API로 DB에 저장 (숙제리스트 탭과 동일: 관리자 검증 + RLS/서비스롤)
  // rollbackFrom: 낙관적 업데이트 전 값 — 콤보 변경 직전에 넘겨야 롤백이 정확함
  const updateEvaluationStatus = useCallback(
    async (
      userId: string,
      assignmentId: string,
      status: EvaluationStatus,
      rollbackFrom: EvaluationStatus,
    ) => {
      const key = getEvaluationKey(userId, assignmentId);

      const statusToSave: "검토중" | "승인" | "수정필요" | "모범답안" =
        status === "미제출" ? "검토중" : status;

      try {
        const res = await fetch("/api/admin/homework-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, assignmentId, status: statusToSave }),
        });

        const payload = (await res.json().catch(() => ({}))) as {
          error?: string;
        };

        if (!res.ok) {
          console.error("상태 업데이트 실패:", payload);
          setEvaluationStatuses((prev) => ({
            ...prev,
            [key]: rollbackFrom,
          }));
          alert(
            typeof payload?.error === "string"
              ? payload.error
              : "상태 저장에 실패했습니다.",
          );
          return;
        }

        setEvaluationStatuses((prev) => ({
          ...prev,
          [key]: status,
        }));
      } catch (error) {
        console.error("상태 업데이트 중 오류:", error);
        setEvaluationStatuses((prev) => ({
          ...prev,
          [key]: rollbackFrom,
        }));
        alert("상태 저장 중 오류가 발생했습니다.");
      }
    },
    [],
  );

  // CSV 파일 다운로드 함수
  const handleDownloadCSV = () => {
    // CSV 헤더 생성 (부분합을 이름 뒤로 이동)
    const headers = [
      "이름",
      "총합",
      ...sortedGridColumns.map((column) =>
        column.kind === "assignment"
          ? column.assignment.title
          : column.field.title,
      ),
    ];

    // CSV 데이터 행 생성 (부분합을 이름 뒤로 이동)
    const rows = users.map((user) => {
      const columnScores = sortedGridColumns.map((column) => {
        if (column.kind === "assignment") {
          return String(getScore(user.id, column.assignment.id));
        }
        return String(getExtraScore(user.id, column.field.id));
      });
      const totalScore = getTotalScore(user.id);
      return [user.name, String(totalScore), ...columnScores];
    });

    // CSV 내용 생성
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    // BOM 추가 (한글 깨짐 방지)
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    // 파일 다운로드
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `과제평가_${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /** 평가 그리드를 PNG로 저장 (CSV 버튼 옆) */
  const handleDownloadImage = useCallback(async () => {
    const element = gridExportRef.current;
    if (!element || users.length === 0) return;

    setIsDownloadingImage(true);

    // sticky 헤더·이름 열은 캡처 시 레이아웃이 깨질 수 있어 잠시 해제
    const stickySelectors =
      ".evaluation-grid-sticky-corner, .evaluation-grid-sticky-header, .evaluation-grid-sticky-name";
    const stickyNodes = element.querySelectorAll(stickySelectors);
    const restoreStickyStyles: Array<() => void> = [];

    stickyNodes.forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      const previousPosition = node.style.position;
      node.style.position = "static";
      restoreStickyStyles.push(() => {
        if (previousPosition) {
          node.style.position = previousPosition;
        } else {
          node.style.removeProperty("position");
        }
      });
    });

    try {
      const groupLabel = selectedGroup
        ? sanitizeDownloadFilename(selectedGroup)
        : "전체";
      const dateLabel = new Date().toISOString().slice(0, 10);
      await downloadElementAsPng(
        element,
        `${groupLabel}_과제평가_${dateLabel}.png`,
      );
    } catch {
      window.alert("이미지 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      for (let index = restoreStickyStyles.length - 1; index >= 0; index -= 1) {
        restoreStickyStyles[index]();
      }
      setIsDownloadingImage(false);
    }
  }, [selectedGroup, users.length]);

  const canExportGrid = users.length > 0 && sortedGridColumns.length > 0;

  // 그리드 열 템플릿 (이름 · 총합 · 날짜순 정렬된 점수 열 — 필드 박스 너비 통일)
  const scoreColumnWidths = sortedGridColumns
    .map(() => EVALUATION_FIELD_COLUMN_WIDTH)
    .join(" ");
  const gridCols = `${EVALUATION_NAME_COLUMN_WIDTH} ${EVALUATION_FIELD_COLUMN_WIDTH}${scoreColumnWidths ? ` ${scoreColumnWidths}` : ""}`;

  // 관리자 권한 확인 중이거나 사용자 목록 로딩 중일 때 로딩 표시
  // isCheckingAdmin이 false로 바뀌지 않으면 무한 로딩이 될 수 있으므로,
  // 타임아웃 처리는 useEffect에서 처리됨

  if (!isAdmin) {
    return (
      <div className="w-full space-y-4">
        <div className="text-center py-12">
          <p className="text-zinc-500 dark:text-zinc-400">
            평가 기능은 관리자만 사용할 수 있습니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* 헤더 */}
      <div>
        <h2 className="text-2xl font-semibold text-black dark:text-zinc-50 mb-2">
          과제 평가
        </h2>
        <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          모든 과제의 제출물을 평가할 수 있습니다.
        </p>
      </div>

      {/* 범례 · 날짜 필터 · 필드 추가 */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-4 space-y-4">
        {cohortDateBounds ? (
          <div className="flex flex-wrap items-end gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex flex-col gap-1">
              <label
                htmlFor="eval-filter-start-date"
                className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
              >
                시작 날짜
              </label>
              <input
                id="eval-filter-start-date"
                type="date"
                value={filterStartDate}
                min={cohortDateBounds.minInput}
                max={filterEndDate || cohortDateBounds.maxInput}
                onChange={(event) =>
                  handleFilterStartDateChange(event.target.value)
                }
                className="text-sm px-3 py-1.5 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label
                htmlFor="eval-filter-end-date"
                className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
              >
                종료 날짜
              </label>
              <input
                id="eval-filter-end-date"
                type="date"
                value={filterEndDate}
                min={filterStartDate || cohortDateBounds.minInput}
                max={cohortDateBounds.maxInput}
                onChange={(event) =>
                  handleFilterEndDateChange(event.target.value)
                }
                className="text-sm px-3 py-1.5 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="button"
              onClick={handleResetDateFilter}
              className="px-3 py-1.5 text-sm font-medium rounded-lg border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              기간 초기화
            </button>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 pb-1.5">
              과제 시작일 기준 · {filteredAssignments.length}/
              {assignments.length}개 과제 · 그리드{" "}
              {sortedGridColumns.length}열(날짜 최신순)
              {cohortDateBounds
                ? ` (기본 ${formatDateMMDD(cohortDateBounds.minDate)}~${formatDateMMDD(cohortDateBounds.maxDate)})`
                : ""}
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAddFieldForm((prev) => !prev)}
              className="px-3 py-1.5 text-sm font-medium rounded-lg border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              필드 추가
            </button>
            <button
              type="button"
              onClick={handleDownloadCSV}
              disabled={!canExportGrid}
              data-export-ignore
              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="size-4" aria-hidden />
              CSV 다운로드
            </button>
            <button
              type="button"
              onClick={() => void handleDownloadImage()}
              disabled={!canExportGrid || isDownloadingImage}
              data-export-ignore
              className="px-3 py-1.5 text-sm font-medium rounded-lg border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDownloadingImage ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  저장 중...
                </>
              ) : (
                <>
                  <Download className="size-4" aria-hidden />
                  이미지 다운로드
                </>
              )}
            </button>
            {isLoadingExtraFields ? (
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                필드 불러오는 중…
              </span>
            ) : null}
          </div>
        </div>

        {showAddFieldForm ? (
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800">
            <input
              type="text"
              value={newFieldTitle}
              onChange={(e) => setNewFieldTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleAddExtraField();
              }}
              placeholder="예: 중간시험, 최종프로젝트 (제목에 시험/프로젝트 포함)"
              maxLength={50}
              className="flex-1 min-w-[160px] text-sm px-3 py-1.5 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="date"
              value={newFieldDate}
              onChange={(e) => setNewFieldDate(e.target.value)}
              aria-label="새 필드 표시 날짜"
              className="text-sm px-3 py-1.5 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              disabled={isAddingField}
              onClick={() => void handleAddExtraField()}
              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50 transition-colors"
            >
              {isAddingField ? "추가 중…" : "추가"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddFieldForm(false);
                setNewFieldTitle("");
                setNewFieldDate(dateToInputValue(new Date()));
              }}
              className="px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
            >
              취소
            </button>
          </div>
        ) : null}

        {extraFields.length > 0 ? (
          <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 max-w-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  추가 필드 관리
                  <span className="ml-1.5 text-xs font-normal text-zinc-500 dark:text-zinc-400">
                    ({extraFields.length}개)
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setIsExtraFieldManagerExpanded((prev) => !prev)
                  }
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors"
                  aria-expanded={isExtraFieldManagerExpanded}
                  aria-label={
                    isExtraFieldManagerExpanded
                      ? "추가 필드 목록 접기"
                      : "추가 필드 목록 펴기"
                  }
                >
                  {isExtraFieldManagerExpanded ? (
                    <>
                      <ChevronUp className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      접기
                    </>
                  ) : (
                    <>
                      <ChevronDown
                        className="h-3.5 w-3.5 shrink-0"
                        aria-hidden
                      />
                      펴기
                    </>
                  )}
                </button>
              </div>
              {isReorderingFields ? (
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  순서 저장 중…
                </span>
              ) : null}
              {deletingFieldId ? (
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  삭제 중…
                </span>
              ) : null}
              {updatingFieldDateId ? (
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  날짜 저장 중…
                </span>
              ) : null}
            </div>
            {isExtraFieldManagerExpanded ? (
            <div className="space-y-2">
            <ol className="space-y-2 max-w-lg">
              {extraFields.map((field, fieldIndex) => (
                <li
                  key={field.id}
                  draggable={!isFieldActionBusy}
                  onDragStart={(event) => handleFieldDragStart(event, field.id)}
                  onDragOver={(event) => handleFieldDragOver(event, field.id)}
                  onDragLeave={() => setDragOverFieldId(null)}
                  onDrop={(event) => handleFieldDrop(event, field.id)}
                  onDragEnd={handleFieldDragEnd}
                  className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 transition-colors ${
                    draggedFieldId === field.id
                      ? "opacity-50 border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10"
                      : dragOverFieldId === field.id
                        ? "border-amber-400 dark:border-amber-500 bg-amber-100/80 dark:bg-amber-900/30 ring-2 ring-amber-400/60"
                        : "border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-900/20"
                  } ${!isFieldActionBusy ? "cursor-grab active:cursor-grabbing" : ""}`}
                >
                  <GripVertical
                    className="h-4 w-4 shrink-0 text-amber-700/70 dark:text-amber-300/70"
                    aria-hidden
                  />
                  <span className="flex-1 min-w-0 text-sm font-medium text-amber-900 dark:text-amber-100 truncate">
                    {fieldIndex + 1}. {field.title}
                  </span>
                  <input
                    type="date"
                    value={getExtraFieldDateInputValue(field)}
                    disabled={
                      isFieldActionBusy || updatingFieldDateId === field.id
                    }
                    onChange={(event) => {
                      const nextDate = event.target.value;
                      if (nextDate === getExtraFieldDateInputValue(field)) {
                        return;
                      }
                      void updateExtraFieldDate(field.id, nextDate);
                    }}
                    className="shrink-0 text-xs px-2 py-1 border border-amber-300 dark:border-amber-700 rounded-md bg-white dark:bg-zinc-900 text-amber-900 dark:text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
                    aria-label={`${field.title} 표시 날짜`}
                    title="그리드에 표시되는 날짜"
                  />
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      disabled={fieldIndex === 0 || isFieldActionBusy}
                      onClick={() => moveExtraField(fieldIndex, -1)}
                      className="p-1 rounded text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      aria-label={`${field.title} 왼쪽 열로 이동`}
                      title="왼쪽 열로"
                    >
                      <ChevronUp className="h-4 w-4" aria-hidden />
                    </button>
                    <button
                      type="button"
                      disabled={
                        fieldIndex === extraFields.length - 1 ||
                        isFieldActionBusy
                      }
                      onClick={() => moveExtraField(fieldIndex, 1)}
                      className="p-1 rounded text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      aria-label={`${field.title} 오른쪽 열로 이동`}
                      title="오른쪽 열로"
                    >
                      <ChevronDown className="h-4 w-4" aria-hidden />
                    </button>
                    <button
                      type="button"
                      disabled={
                        isFieldActionBusy || deletingFieldId === field.id
                      }
                      onClick={() => void deleteExtraField(field)}
                      className="p-1 rounded text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      aria-label={`${field.title} 삭제`}
                      title="삭제"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                </li>
              ))}
            </ol>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              그리드 열은 과제(시작일)·추가 필드(표시 날짜)를 합쳐 날짜
              최신순(내림차순)으로 표시됩니다. 날짜를 바꾸면 열 위치가 함께
              바뀝니다.
            </p>
            </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* 평가 그리드 (1행·1열 고정 스크롤) — PNG 캡처 영역 */}
      <div
        ref={gridExportRef}
        className="w-full bg-zinc-50 dark:bg-black rounded-lg p-2 sm:p-4"
      >
        <div className="mb-3 space-y-1 px-1">
          <p className="text-base font-bold text-black dark:text-zinc-50">
            과제 평가
          </p>
          {selectedGroup ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {selectedGroup}
            </p>
          ) : null}
          {filterStartDate && filterEndDate ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              기간 {filterStartDate.replace(/-/g, ". ")} ~{" "}
              {filterEndDate.replace(/-/g, ". ")}
            </p>
          ) : null}
        </div>
        <div
          className="evaluation-grid-scroll rounded-lg"
          data-export-expand
        >
          <div className="inline-block min-w-full pt-2">
            <div
              className="inline-grid gap-2"
              style={{ gridTemplateColumns: gridCols }}
            >
              {/* 헤더 셀 (왼쪽 상단 — 행·열 모두 고정) */}
              <div className="evaluation-grid-sticky-corner bg-white dark:bg-zinc-900 rounded-lg px-2 py-2 shadow-sm border border-zinc-200 dark:border-zinc-800 flex items-center justify-center">
                <span className="text-sm font-medium text-black dark:text-zinc-50">
                  이름
                </span>
              </div>

              {/* 총합 헤더 (필드 제목만 중앙 정렬) */}
              <div className="evaluation-grid-sticky-header evaluation-grid-total-header bg-blue-50 dark:bg-blue-900/20 rounded-lg px-2 py-2 shadow-md border-2 border-blue-200 dark:border-blue-700">
                <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
                  총합
                </span>
              </div>

              {/* 점수 열 헤더 (과제·추가 필드 통합, 날짜 내림차순) */}
              {sortedGridColumns.map((column) => {
                if (column.kind === "assignment") {
                  const assignmentStyles =
                    EVALUATION_COLUMN_CELL_STYLES.assignment;
                  return (
                    <EvaluationColumnHeader
                      key={`header-assignment-${column.assignment.id}`}
                      dateLabel={formatDateMMDD(column.assignment.startDate)}
                      title={column.assignment.title}
                      stickyClassName="evaluation-grid-sticky-header"
                      containerClassName={assignmentStyles.headerContainer}
                      titleClassName={assignmentStyles.headerTitle}
                    />
                  );
                }

                const extraStyles = EVALUATION_COLUMN_CELL_STYLES.extra;

                return (
                  <EvaluationColumnHeader
                    key={`header-extra-${column.field.id}`}
                    dateLabel={formatDateMMDD(
                      getExtraFieldDisplayDate(column.field),
                    )}
                    title={column.field.title}
                    stickyClassName="evaluation-grid-sticky-header"
                    containerClassName={extraStyles.headerContainer}
                    titleClassName={extraStyles.headerTitle}
                  />
                );
              })}

              {/* 사용자 행들 */}
              {users.map((user) => (
                <div
                  key={`user-row-${user.id}`}
                  style={{ display: "contents" }}
                >
                  {/* 사용자 이름 셀 (1열 고정) */}
                  <div className="evaluation-grid-sticky-name bg-white dark:bg-zinc-900 rounded-lg px-2 py-2 shadow-sm border border-zinc-200 dark:border-zinc-800 flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400 truncate max-w-full">
                      {user.name}
                    </span>
                  </div>

                  {/* 총합 점수 셀 (제목 외 — 오른쪽 정렬) */}
                  <div className="evaluation-grid-total-cell bg-blue-50/80 dark:bg-blue-900/15 rounded-lg px-2 py-2 shadow-md border-2 border-blue-200 dark:border-blue-800">
                    <span className="text-sm font-bold text-blue-700 dark:text-blue-300 whitespace-nowrap">
                      {getTotalScore(user.id)}점
                    </span>
                  </div>

                  {/* 점수 셀 (과제·추가 필드 통합, 날짜 내림차순) */}
                  {sortedGridColumns.map((column) => {
                    if (column.kind === "assignment") {
                      const { assignment } = column;
                      const assignmentStyles =
                        EVALUATION_COLUMN_CELL_STYLES.assignment;
                      const currentStatus = getEvaluationStatus(
                        user.id,
                        assignment.id,
                      );
                      const key = getEvaluationKey(user.id, assignment.id);
                      const hasSubmission = !!submissionData[key];
                      const currentScore =
                        evaluationStatusToScore(currentStatus);

                      return (
                        <div
                          key={`${user.id}-assignment-${assignment.id}`}
                          className={`${assignmentStyles.scoreCell} rounded-lg px-2 py-2 shadow-sm border flex items-center justify-center`}
                        >
                          {hasSubmission ? (
                            <input
                              type="text"
                              inputMode="numeric"
                              value={
                                assignmentScoreDraftByKey[key] ??
                                String(currentScore)
                              }
                              onFocus={() => {
                                assignmentEditRollbackRef.current[key] =
                                  currentStatus;
                                setAssignmentScoreDraftByKey((prev) => ({
                                  ...prev,
                                  [key]: String(currentScore),
                                }));
                              }}
                              onChange={(e) => {
                                const raw = e.target.value;
                                if (raw !== "" && !/^\d+$/.test(raw)) {
                                  return;
                                }
                                setAssignmentScoreDraftByKey((prev) => ({
                                  ...prev,
                                  [key]: raw,
                                }));
                                if (raw === "") {
                                  return;
                                }
                                const parsed = Number.parseInt(raw, 10);
                                if (
                                  (
                                    ALLOWED_ASSIGNMENT_SCORES as readonly number[]
                                  ).includes(parsed)
                                ) {
                                  const newStatus =
                                    scoreToEvaluationStatus(parsed);
                                  setEvaluationStatuses((prev) => ({
                                    ...prev,
                                    [key]: newStatus,
                                  }));
                                }
                              }}
                              onBlur={async (e) => {
                                const raw = e.target.value.trim();
                                const parsed =
                                  raw === ""
                                    ? 0
                                    : Math.min(
                                        ASSIGNMENT_SCORE_MAX,
                                        Math.max(
                                          ASSIGNMENT_SCORE_MIN,
                                          Number.parseInt(raw, 10) || 0,
                                        ),
                                      );
                                const next = snapAssignmentScore(parsed);
                                const newStatus =
                                  scoreToEvaluationStatus(next);
                                const beforeStatus =
                                  assignmentEditRollbackRef.current[key] ??
                                  currentStatus;
                                setEvaluationStatuses((prev) => ({
                                  ...prev,
                                  [key]: newStatus,
                                }));
                                setAssignmentScoreDraftByKey((prev) => {
                                  const next = { ...prev };
                                  delete next[key];
                                  return next;
                                });
                                await updateEvaluationStatus(
                                  user.id,
                                  assignment.id,
                                  newStatus,
                                  beforeStatus,
                                );
                                delete assignmentEditRollbackRef.current[key];
                              }}
                              className={`evaluation-score-input text-sm font-semibold px-1 py-1 border rounded-md focus:outline-none focus:ring-2 ${assignmentStyles.scoreInput}`}
                              aria-label={`${user.name} ${assignment.title} 점수`}
                            />
                          ) : (
                            <span
                              className="evaluation-score-display text-center text-sm font-semibold text-zinc-400 dark:text-zinc-500"
                              title="미제출"
                            >
                              —
                            </span>
                          )}
                        </div>
                      );
                    }

                    const { field } = column;
                    const extraStyles = EVALUATION_COLUMN_CELL_STYLES.extra;
                    const scoreKey = getExtraScoreKey(user.id, field.id);
                    const currentScore = extraScores[scoreKey] ?? 0;

                    return (
                      <div
                        key={`${user.id}-extra-${field.id}`}
                        className={`${extraStyles.scoreCell} rounded-lg px-2 py-2 shadow-sm border flex items-center justify-center`}
                      >
                        <input
                          type="number"
                          min={0}
                          max={999}
                          inputMode="numeric"
                          value={currentScore}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const next =
                              raw === ""
                                ? 0
                                : Math.min(
                                    999,
                                    Math.max(0, Number.parseInt(raw, 10) || 0),
                                  );
                            setExtraScores((prev) => ({
                              ...prev,
                              [scoreKey]: next,
                            }));
                          }}
                          onBlur={(e) => {
                            const next = Math.min(
                              999,
                              Math.max(
                                0,
                                Number.parseInt(e.target.value, 10) || 0,
                              ),
                            );
                            void updateExtraScore(user.id, field.id, next);
                          }}
                          className={`evaluation-score-input text-sm font-semibold px-1 py-1 border rounded-md focus:outline-none focus:ring-2 ${extraStyles.scoreInput}`}
                          aria-label={`${user.name} ${field.title} 점수`}
                        />
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
