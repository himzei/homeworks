/** 과제 제출 방법 Notion 원본 페이지 */
export const HOMEWORK_GUIDE_URL =
  "https://himzei.notion.site/13-2fcd0a6ad3d780468f31c3eff7e9a23b?source=copy_link";

/** 블로그 페이지 */
export const BLOG_PATH = "/blog";

/** Git 기초 가이드 페이지 */
export const GIT_HOW_PATH = "/git-how";

/** 과제 제출 방법 안내 페이지 */
export const HOW_WORK_PATH = "/how-work";

/** 사용방법 드롭다운 하위 메뉴 */
export const USAGE_GUIDE_NAV_ITEM: HeaderNavItem = {
  label: "사용방법",
  children: [
    { href: GIT_HOW_PATH, label: "깃이란?" },
    { href: HOW_WORK_PATH, label: "과제제출방법" },
  ],
};

export type HeaderNavItem = {
  href?: string;
  label: string;
  /** 하위 메뉴가 있으면 드롭다운으로 표시 */
  children?: HeaderNavItem[];
  /** 외부 링크(새 탭) */
  external?: boolean;
  /** 관리자만 표시 */
  adminOnly?: boolean;
  /** 로그인한 사용자만 표시 */
  authRequired?: boolean;
  /** 비로그인 사용자만 표시 */
  guestOnly?: boolean;
  /** URL tab 쿼리와 매칭 (/home?tab=...) */
  tab?: string;
  /** pathname이 이 경로로 시작하면 active (관리자 등) */
  pathPrefix?: boolean;
};

/** 비로그인 전용 링크 */
export const PUBLIC_NAV_ITEMS: HeaderNavItem[] = [
  { href: "/", label: "소개", guestOnly: true },
  { href: "/home", label: "과제 홈", guestOnly: true },
];

/** 로그인 후 메뉴 (과제 → 커뮤니티 → 교육일정 → 사용방법) */
export const ASSIGNMENT_NAV_ITEM: HeaderNavItem = {
  label: "과제",
  authRequired: true,
  children: [
    { href: "/homework", label: "오늘의과제", authRequired: true },
    { href: "/progress", label: "진행과정", authRequired: true },
  ],
};

/** 블로그 메뉴 (로그인 여부와 관계없이 표시) */
export const BLOG_NAV_ITEM: HeaderNavItem = {
  href: BLOG_PATH,
  label: "블로그",
};

/** 커뮤니티 드롭다운 */
export const COMMUNITY_NAV_ITEM: HeaderNavItem = {
  label: "커뮤니티",
  authRequired: true,
  children: [
    { href: "/survey", label: "설문조사", authRequired: true },
    { href: "/ladder", label: "사다리게임", authRequired: true },
    { href: "/vote", label: "투표", authRequired: true },
    { href: "/company-inquiry", label: "기업(문의)", authRequired: true },
  ],
};

/** 관련뉴스 드롭다운 */
export const RELATED_NEWS_NAV_ITEM: HeaderNavItem = {
  label: "관련뉴스",
  authRequired: true,
  children: [
    { href: "/related-news/sl", label: "SL", authRequired: true },
    { href: "/related-news/thn", label: "THN", authRequired: true },
    { href: "/related-news/ajin", label: "아진산업", authRequired: true },
  ],
};

/** 교육일정 (로그인 회원 전용) */
export const EDUCATION_SCHEDULE_PATH = "/schedule";

export const EDUCATION_SCHEDULE_NAV_ITEM: HeaderNavItem = {
  href: EDUCATION_SCHEDULE_PATH,
  label: "교육일정",
  authRequired: true,
};

export const STUDENT_NAV_ITEMS: HeaderNavItem[] = [
  ASSIGNMENT_NAV_ITEM,
  COMMUNITY_NAV_ITEM,
  EDUCATION_SCHEDULE_NAV_ITEM,
  USAGE_GUIDE_NAV_ITEM,
  RELATED_NEWS_NAV_ITEM,
  BLOG_NAV_ITEM,
];

/** 과제 섹션 서브메뉴 */
export const ASSIGNMENT_SUB_NAV_ITEMS = ASSIGNMENT_NAV_ITEM.children ?? [];

/** 과제 섹션 경로 여부 */
export function isAssignmentSectionPath(pathname: string): boolean {
  return ASSIGNMENT_SUB_NAV_ITEMS.some((item) => item.href === pathname);
}

/** 커뮤니티 섹션 서브메뉴 */
export const COMMUNITY_SUB_NAV_ITEMS = COMMUNITY_NAV_ITEM.children ?? [];

/** 커뮤니티 섹션 경로 여부 */
export function isCommunitySectionPath(pathname: string): boolean {
  return COMMUNITY_SUB_NAV_ITEMS.some((item) => item.href === pathname);
}

/** 사용방법 섹션 서브메뉴 */
export const USAGE_GUIDE_SUB_NAV_ITEMS = USAGE_GUIDE_NAV_ITEM.children ?? [];

/** 사용방법 섹션 경로 여부 */
export function isUsageGuideSectionPath(pathname: string): boolean {
  return USAGE_GUIDE_SUB_NAV_ITEMS.some((item) => item.href === pathname);
}

/** 로그인 없이 메뉴 클릭 시 안내 문구 */
export const LOGIN_REQUIRED_MESSAGE = "로그인이 필요한 서비스입니다.";

/** 비로그인 사용자가 해당 메뉴를 눌렀을 때 로그인 안내가 필요한지 */
export function isHeaderNavLoginRequired(
  item: HeaderNavItem,
  parentAuthRequired = false,
): boolean {
  return Boolean(item.authRequired || parentAuthRequired);
}

/** 헤더에 표시할 메뉴 목록 (로그인 여부와 무관하게 동일 메뉴 표시) */
export function getHeaderNavItems(_options: {
  isLoggedIn: boolean;
}): HeaderNavItem[] {
  return STUDENT_NAV_ITEMS;
}

/** 현재 경로·탭 기준 active 여부 */
export function isHeaderNavItemActive(
  item: HeaderNavItem,
  pathname: string,
  currentTab: string | null,
): boolean {
  if (item.children?.length) {
    return item.children.some((child) =>
      isHeaderNavItemActive(child, pathname, currentTab),
    );
  }

  if (!item.href) return false;
  if (item.external) return false;

  if (item.pathPrefix) {
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }

  if (item.tab) {
    if (pathname !== "/home") return false;
    const effectiveTab = currentTab || "homework";
    return effectiveTab === item.tab;
  }

  return pathname === item.href;
}

/** 드롭다운 하위 메뉴 active 여부 */
export function isHeaderNavChildActive(
  item: HeaderNavItem,
  pathname: string,
  currentTab: string | null,
): boolean {
  if (item.children?.length) return false;
  return isHeaderNavItemActive(item, pathname, currentTab);
}
