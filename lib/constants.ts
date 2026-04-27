/**
 * 과정(그룹) 선택 옵션 - 숙제 생성, 관리자 필터 등에서 공통 사용
 */
export const GROUP_OPTIONS = [
  { value: "", label: "선택하세요" },
  {
    value: "15기 교육생 - 빅데이터 전문가 양성과정",
    label: "15기 교육생 - 빅데이터 전문가 양성과정",
  },
  {
    value: "14기 교육생 - 빅데이터 전문가 양성과정",
    label: "14기 교육생 - 빅데이터 전문가 양성과정",
  },
  {
    value: "13기 교육생 - 빅데이터 전문가 양성과정",
    label: "13기 교육생 - 빅데이터 전문가 양성과정",
  },
] as const;

/** 프로필 수정용 과정명 - 13기(LEGACY) 제외한 신규 기수만 선택 */
export const PROFILE_GROUP_OPTIONS = [
  { value: "", label: "선택하세요" },
  ...GROUP_OPTIONS.filter(
    (opt) =>
      opt.value &&
      !opt.value.startsWith("13기 교육생 -"),
  ),
];

/**
 * group_name 도입 전에 생성된 과제(null)가 포함되는 과정
 * 이전 과정 선택 시 null 과제도 함께 표시
 */
export const LEGACY_GROUPS = [
  "13기 교육생 - 빅데이터 전문가 양성과정",
] as const;
