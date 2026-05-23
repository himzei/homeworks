/** 과제 제출 방법 Notion 페이지 */
export const HOMEWORK_GUIDE_URL =
  "https://himzei.notion.site/13-2fcd0a6ad3d780468f31c3eff7e9a23b?source=copy_link";

export type HeaderNavItem = {
  href: string;
  label: string;
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

/** 비로그인·공통 안내 링크 */
export const PUBLIC_NAV_ITEMS: HeaderNavItem[] = [
  { href: "/", label: "소개", guestOnly: true },
  { href: "/home", label: "과제 홈", guestOnly: true },
  { href: "/git-how", label: "깃이란?" },
  { href: HOMEWORK_GUIDE_URL, label: "과제제출방법", external: true },
];

/** 로그인 후 과제 홈 탭 링크 (제목 클릭 → /home) */
export const STUDENT_NAV_ITEMS: HeaderNavItem[] = [
  {
    href: "/home?tab=homework",
    label: "오늘의숙제",
    authRequired: true,
    tab: "homework",
  },
  {
    href: "/home?tab=progress",
    label: "진행과정",
    authRequired: true,
    tab: "progress",
  },
  {
    href: "/home?tab=survey",
    label: "설문조사",
    authRequired: true,
    tab: "survey",
  },
  {
    href: "/ladder",
    label: "사다리게임",
    authRequired: true,
  },
  {
    href: "/vote",
    label: "투표",
    authRequired: true,
  },
];

/** 관리자 패널 진입 */
export const ADMIN_NAV_ITEM: HeaderNavItem = {
  href: "/admin",
  label: "관리자",
  adminOnly: true,
  pathPrefix: true,
};

/** 헤더에 표시할 메뉴 목록 조합 */
export function getHeaderNavItems(options: {
  isLoggedIn: boolean;
  isAdmin: boolean;
}): HeaderNavItem[] {
  const { isLoggedIn, isAdmin } = options;

  const items: HeaderNavItem[] = [];

  for (const item of PUBLIC_NAV_ITEMS) {
    if (item.guestOnly && isLoggedIn) continue;
    if (item.authRequired && !isLoggedIn) continue;
    items.push(item);
  }

  if (isLoggedIn) {
    items.push(...STUDENT_NAV_ITEMS);
  }

  if (isAdmin) {
    items.push(ADMIN_NAV_ITEM);
  }

  return items;
}

/** 현재 경로·탭 기준 active 여부 */
export function isHeaderNavItemActive(
  item: HeaderNavItem,
  pathname: string,
  currentTab: string | null,
): boolean {
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
