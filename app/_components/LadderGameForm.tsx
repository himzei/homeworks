"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Download, Loader2 } from "lucide-react";

import { Button } from "@/app/_components/ui/button";
import { useSession } from "@/lib/auth/SessionProvider";
import { createClient } from "@/lib/supabase/client";
import { fetchGroupStudentNames } from "@/lib/fetch-group-students";
import {
  MAX_PARTICIPANTS,
  MIN_PARTICIPANTS,
  SELECTABLE_LADDER_GROUPS,
  createLadderGame,
  toSelectableLadderGroups,
  type SelectableLadderGroup,
} from "@/lib/ladder";

const DEFAULT_PARTICIPANT_COUNT = 4;

/**
 * 문자열 배열을 지정된 길이에 맞춰 정리.
 * - 더 길면 잘라내고, 짧으면 빈 칸으로 채움
 * - 참가자 명단·결과 항목 양쪽에서 공통 사용
 */
function normalizeStringArrayToCount(
  values: string[],
  count: number,
): string[] {
  if (count <= 0) return [];
  if (values.length >= count) return values.slice(0, count);
  return [
    ...values,
    ...Array.from({ length: count - values.length }, () => ""),
  ];
}

/**
 * 게시판 글쓰기 폼.
 * - 제목 + 인원 수 입력 → 빈 사다리게임 생성
 * - (선택) 기수를 골라 "참가자 불러오기"를 누르면 사다리 위쪽 칸이
 *   해당 기수의 학생 이름으로 자동 채워진 채 생성됨
 * - 아래쪽(결과 항목)은 상세 페이지에서 편집
 */
export default function LadderGameForm() {
  const router = useRouter();
  const { profile, isAdmin, isLoading: isSessionLoading } = useSession();

  const [title, setTitle] = useState("");
  const [participantCount, setParticipantCount] = useState<number>(
    DEFAULT_PARTICIPANT_COUNT,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 결과 항목 (인원수와 같은 길이의 배열로 유지)
  const [resultItems, setResultItems] = useState<string[]>(() =>
    Array.from({ length: DEFAULT_PARTICIPANT_COUNT }, () => ""),
  );

  // 기수 콤보박스 상태
  const [selectedGroupValue, setSelectedGroupValue] = useState<string>("");
  const [loadedNames, setLoadedNames] = useState<string[]>([]);
  const [loadedGroupLabel, setLoadedGroupLabel] = useState<string | null>(null);
  /** 참가자를 불러온 기수 원본 과정명 (사다리 group_name 저장용) */
  const [loadedGroupName, setLoadedGroupName] = useState<string | null>(null);
  const [isLoadingGroup, setIsLoadingGroup] = useState(false);
  const [groupNotice, setGroupNotice] = useState<string | null>(null);
  // DB 과정 목록 (실패 시 정적 폴백)
  const [allLadderGroups, setAllLadderGroups] = useState<
    SelectableLadderGroup[]
  >(SELECTABLE_LADDER_GROUPS);
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);

  /**
   * 로그인 사용자의 소속 기수.
   * - profile.group_name 이 문자열로 들어 있으면 그대로 사용
   * - 그 외(미설정/관리자 등): 빈 문자열
   */
  const userGroupName =
    typeof profile?.group_name === "string" ? profile.group_name : "";

  /** training_courses 활성 과정 → 사다리 기수 콤보 (폴백: constants) */
  useEffect(() => {
    let cancelled = false;

    async function loadLadderGroups() {
      setIsLoadingGroups(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("training_courses")
          .select("name")
          .eq("is_active", true)
          .order("sort_order", { ascending: false })
          .order("created_at", { ascending: false });

        if (cancelled) return;

        if (error || !data?.length) {
          if (error) {
            console.error("사다리 기수 목록 조회 오류:", error);
          }
          setAllLadderGroups(SELECTABLE_LADDER_GROUPS);
          return;
        }

        // DB 과정 + 정적 폴백(16·17기 등) 병합 — DB에 아직 없는 기수도 선택 가능
        const mergedNames = [
          ...data.map((row) => row.name),
          ...SELECTABLE_LADDER_GROUPS.map((group) => group.value),
        ];
        setAllLadderGroups(toSelectableLadderGroups(mergedNames));
      } catch (error) {
        if (!cancelled) {
          console.error("사다리 기수 목록 조회 실패:", error);
          setAllLadderGroups(SELECTABLE_LADDER_GROUPS);
        }
      } finally {
        if (!cancelled) setIsLoadingGroups(false);
      }
    }

    void loadLadderGroups();
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * 콤보박스에 노출할 기수 목록.
   * - 관리자: 모든 기수 선택 가능
   * - 회원: 본인이 속한 기수만 (없으면 빈 목록)
   */
  const availableGroups = useMemo(() => {
    if (isAdmin) return allLadderGroups;
    if (!userGroupName) return [];
    return allLadderGroups.filter((option) => option.value === userGroupName);
  }, [allLadderGroups, isAdmin, userGroupName]);

  /**
   * 회원이고 선택 가능한 기수가 단 1개(=본인 기수) 라면 자동 선택.
   * - 관리자는 직접 고르도록 자동 선택하지 않음
   * - 이미 사용자가 다른 값을 골랐다면 덮어쓰지 않음
   */
  useEffect(() => {
    if (isAdmin) return;
    if (availableGroups.length !== 1) return;
    const onlyValue = availableGroups[0].value;
    setSelectedGroupValue((prev) => (prev ? prev : onlyValue));
  }, [isAdmin, availableGroups]);

  /**
   * 선택된 기수가 더 이상 노출 목록에 없으면 초기화.
   * - 예: 관리자에서 회원으로 권한이 바뀐 경우 방어
   */
  useEffect(() => {
    if (!selectedGroupValue) return;
    const stillAvailable = availableGroups.some(
      (option) => option.value === selectedGroupValue,
    );
    if (!stillAvailable) {
      setSelectedGroupValue("");
    }
  }, [availableGroups, selectedGroupValue]);

  /** 콤보박스를 사용할 수 없는 안내 문구 (없으면 정상 동작) */
  const groupPickerDisabledNotice = useMemo(() => {
    if (isSessionLoading || isLoadingGroups) return null;
    if (isAdmin) return null;
    if (!profile) return "로그인하면 본인 기수에서 참가자를 불러올 수 있어요.";
    if (!userGroupName) return "프로필에 기수가 설정되어 있지 않습니다.";
    if (availableGroups.length === 0) {
      return "현재 등록된 기수 목록에서 본인 기수를 찾지 못했습니다.";
    }
    return null;
  }, [
    availableGroups.length,
    isAdmin,
    isLoadingGroups,
    isSessionLoading,
    profile,
    userGroupName,
  ]);

  const isGroupPickerDisabled =
    isSessionLoading ||
    isLoadingGroups ||
    isLoadingGroup ||
    availableGroups.length === 0;

  const handleCountChange = useCallback(
    (rawValue: string) => {
      // 입력 도중 빈 값도 허용 (0으로 표시 후 제출 시 검증)
      if (rawValue === "") {
        setParticipantCount(0);
        // 인원수를 비우면 미리보기 명단·결과 항목 모두 비움 (혼동 방지)
        setLoadedNames((prev) => (prev.length > 0 ? [] : prev));
        setLoadedGroupLabel(null);
        setLoadedGroupName(null);
        setResultItems([]);
        return;
      }
      const parsed = Number.parseInt(rawValue, 10);
      if (Number.isNaN(parsed)) return;
      const nextCount = Math.max(0, Math.min(MAX_PARTICIPANTS, parsed));
      setParticipantCount(nextCount);
      // 이미 불러둔 명단이 있으면 인원수에 맞춰 자르거나 빈 칸 추가
      if (loadedNames.length > 0) {
        setLoadedNames((prev) => normalizeStringArrayToCount(prev, nextCount));
      }
      // 결과 항목도 인원수에 맞춰 길이 동기화
      setResultItems((prev) => normalizeStringArrayToCount(prev, nextCount));
      if (errorMessage) setErrorMessage(null);
    },
    [errorMessage, loadedNames.length],
  );

  const handleResultItemChange = useCallback(
    (index: number, value: string) => {
      setResultItems((prev) => {
        if (index < 0 || index >= prev.length) return prev;
        if (prev[index] === value) return prev;
        const next = [...prev];
        next[index] = value;
        return next;
      });
    },
    [],
  );

  const handleClearResults = useCallback(() => {
    setResultItems((prev) =>
      prev.length === 0 ? prev : Array.from({ length: prev.length }, () => ""),
    );
  }, []);

  /**
   * 기수에서 학생 명단 불러오기.
   * - 학생 수가 인원수보다 많으면: 인원수만큼 자르고 안내
   * - 학생 수가 인원수보다 적으면: 인원수를 학생 수에 맞춰 자동 축소
   */
  const handleLoadFromGroup = useCallback(async () => {
    const picked = allLadderGroups.find(
      (option) => option.value === selectedGroupValue,
    );
    if (!picked) return;
    if (isLoadingGroup) return;

    setIsLoadingGroup(true);
    setGroupNotice(null);
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const studentNames = await fetchGroupStudentNames(supabase, picked.value);

      if (studentNames.length === 0) {
        setLoadedNames([]);
        setLoadedGroupLabel(null);
        setLoadedGroupName(null);
        setGroupNotice(`"${picked.shortLabel}" 기수에 등록된 학생이 없습니다.`);
        return;
      }

      // 인원수가 0(미입력)이면 학생 수에 맞춰 자동 설정
      const targetCount =
        participantCount > 0
          ? Math.min(participantCount, MAX_PARTICIPANTS)
          : Math.min(studentNames.length, MAX_PARTICIPANTS);

      const normalized = normalizeStringArrayToCount(studentNames, targetCount);
      setLoadedNames(normalized);
      setLoadedGroupLabel(picked.shortLabel);
      setLoadedGroupName(picked.value);
      setParticipantCount(targetCount);
      // 인원수가 바뀌었으면 결과 항목 길이도 함께 동기화
      setResultItems((prev) => normalizeStringArrayToCount(prev, targetCount));

      if (studentNames.length > targetCount) {
        setGroupNotice(
          `${picked.shortLabel} 학생 ${studentNames.length}명 중 인원수(${targetCount}명)만큼만 채웠습니다. 인원수를 늘리면 더 많이 채울 수 있어요.`,
        );
      } else if (studentNames.length < targetCount) {
        setGroupNotice(
          `${picked.shortLabel} 학생 ${studentNames.length}명을 불러왔습니다. 나머지 ${
            targetCount - studentNames.length
          }칸은 비어 있어요.`,
        );
      } else {
        setGroupNotice(
          `${picked.shortLabel} 학생 ${studentNames.length}명을 모두 불러왔습니다.`,
        );
      }
    } catch (error) {
      console.error("기수 학생 불러오기 실패:", error);
      setGroupNotice("학생 명단을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setIsLoadingGroup(false);
    }
  }, [allLadderGroups, isLoadingGroup, participantCount, selectedGroupValue]);

  const handleClearLoaded = useCallback(() => {
    setLoadedNames([]);
    setLoadedGroupLabel(null);
    setLoadedGroupName(null);
    setGroupNotice(null);
  }, []);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (isSubmitting) return;

      if (
        participantCount < MIN_PARTICIPANTS ||
        participantCount > MAX_PARTICIPANTS
      ) {
        setErrorMessage(
          `인원 수는 ${MIN_PARTICIPANTS}~${MAX_PARTICIPANTS}명 사이여야 합니다.`,
        );
        return;
      }

      setIsSubmitting(true);
      try {
        // 불러둔 명단이 있다면 인원수에 맞춰 정리한 뒤 함께 전달
        const initialNames =
          loadedNames.length > 0
            ? normalizeStringArrayToCount(loadedNames, participantCount)
            : undefined;
        // 결과 항목도 인원수에 맞춰 정확한 길이로 정리하여 전달
        // 빈 칸은 상세 페이지에서 공백으로 표시됨
        const initialResults = normalizeStringArrayToCount(
          resultItems,
          participantCount,
        );

        const created = await createLadderGame({
          title: title.trim(),
          participantCount,
          participantNames: initialNames,
          resultItems: initialResults,
          groupName: loadedNames.length > 0 ? loadedGroupName : null,
        });
        router.push(`/ladder/${created.id}`);
      } catch {
        setErrorMessage("저장 중 문제가 발생했습니다. 다시 시도해 주세요.");
        setIsSubmitting(false);
      }
    },
    [
      isSubmitting,
      loadedGroupName,
      loadedNames,
      participantCount,
      resultItems,
      router,
      title,
    ],
  );

  const isCountValid =
    participantCount >= MIN_PARTICIPANTS &&
    participantCount <= MAX_PARTICIPANTS;

  // 채워진 결과 칸 개수 (0보다 큰 경우만 표시)
  const filledResultCount = resultItems.filter((item) =>
    item.trim().length > 0,
  ).length;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
      {/* 제목 */}
      <div className="space-y-2">
        <label
          htmlFor="ladder-title"
          className="block text-sm font-medium text-black dark:text-zinc-50"
        >
          제목
        </label>
        <input
          id="ladder-title"
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="예) 발표 순서 정하기"
          className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-black dark:text-zinc-50 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          maxLength={100}
        />
      </div>

      {/* 인원 생성 */}
      <div className="space-y-2">
        <label
          htmlFor="ladder-count"
          className="block text-sm font-medium text-black dark:text-zinc-50"
        >
          인원 생성
        </label>
        <div className="flex items-center gap-2">
          <input
            id="ladder-count"
            type="number"
            inputMode="numeric"
            min={MIN_PARTICIPANTS}
            max={MAX_PARTICIPANTS}
            value={participantCount === 0 ? "" : participantCount}
            onChange={(event) => handleCountChange(event.target.value)}
            className="w-28 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            명 ({MIN_PARTICIPANTS}~{MAX_PARTICIPANTS})
          </span>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          입력한 인원수만큼 위쪽 참가자 칸과 아래쪽 결과 칸이 만들어집니다.
        </p>
      </div>

      {/* 기수에서 참가자 불러오기 (선택) */}
      <div className="space-y-3 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50/60 dark:bg-zinc-900/30 p-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-black dark:text-zinc-50">
            기수에서 참가자 불러오기{" "}
            <span className="text-zinc-400 font-normal">(선택)</span>
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {isAdmin
              ? "관리자는 모든 기수에서 학생 명단을 불러올 수 있습니다."
              : "본인이 속한 기수의 학생 이름이 사다리 위쪽 칸에 자동으로 채워집니다."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="ladder-group-select">
            기수 선택
          </label>
          <select
            id="ladder-group-select"
            value={selectedGroupValue}
            onChange={(event) => setSelectedGroupValue(event.target.value)}
            disabled={isGroupPickerDisabled}
            className="h-9 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2 text-sm text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">
              {isSessionLoading || isLoadingGroups
                ? "기수 정보 확인 중..."
                : availableGroups.length === 0
                  ? "선택 가능한 기수 없음"
                  : "기수 선택"}
            </option>
            {availableGroups.map((option) => (
              <option
                key={option.value}
                value={option.value}
                title={option.fullLabel}
              >
                {option.shortLabel}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={
              !selectedGroupValue || isLoadingGroup || isGroupPickerDisabled
            }
            onClick={handleLoadFromGroup}
          >
            {isLoadingGroup ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Download className="size-4" aria-hidden />
            )}
            {isLoadingGroup ? "불러오는 중..." : "참가자 불러오기"}
          </Button>
          {loadedNames.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearLoaded}
            >
              초기화
            </Button>
          ) : null}
        </div>

        {groupPickerDisabledNotice ? (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            {groupPickerDisabledNotice}
          </p>
        ) : null}

        {groupNotice ? (
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            {groupNotice}
          </p>
        ) : null}

        {loadedNames.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              미리보기 ({loadedGroupLabel ?? "불러온 명단"})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {loadedNames.map((name, index) => (
                <span
                  key={`${name}-${index}`}
                  className="inline-flex items-center rounded-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-2 py-0.5 text-xs text-zinc-700 dark:text-zinc-200"
                >
                  {name || (
                    <span className="text-zinc-400">빈 칸 {index + 1}</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* 결과 항목 (선택) - 인원수만큼 자동 생성 */}
      {isCountValid ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="space-y-1">
              <p className="text-sm font-medium text-black dark:text-zinc-50">
                결과 항목{" "}
                <span className="text-zinc-400 font-normal">(선택)</span>
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                인원수만큼 최대 {participantCount}개까지 입력할 수 있어요. 빈
                칸은 공백으로 둘 수 있어요.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {filledResultCount}/{participantCount} 채움
              </span>
              {filledResultCount > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearResults}
                >
                  비우기
                </Button>
              ) : null}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {resultItems.map((item, index) => (
              <input
                key={index}
                type="text"
                value={item}
                onChange={(event) =>
                  handleResultItemChange(index, event.target.value)
                }
                placeholder={`${index + 1}번 결과`}
                maxLength={30}
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-black dark:text-zinc-50 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ))}
          </div>
        </div>
      ) : null}

      {errorMessage ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={!isCountValid || isSubmitting}>
          {isSubmitting ? "생성 중..." : "사다리 만들기"}
        </Button>
        <Button type="button" variant="ghost" asChild>
          <Link href="/ladder">취소</Link>
        </Button>
      </div>
    </form>
  );
}
