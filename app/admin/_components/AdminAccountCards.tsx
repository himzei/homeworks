import Link from "next/link";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/app/_components/ui/avatar";
import { Shield } from "lucide-react";

/** 관리자 계정 카드에 표시할 프로필 정보 */
export interface AdminAccountItem {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  university: string | null;
  major: string | null;
}

interface AdminAccountCardsProps {
  admins: AdminAccountItem[];
}

/**
 * 관리자 대시보드 - 관리자 계정 카드 그리드
 * (학생 상담 화면과 동일한 카드 레이아웃, 관리자 전용 섹션)
 */
export default function AdminAccountCards({ admins }: AdminAccountCardsProps) {
  if (admins.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-card p-8 text-center">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          등록된 관리자 계정이 없습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {admins.map((admin) => (
        <Link
          key={admin.id}
          href={`/user/${admin.id}`}
          className="bg-white flex flex-col gap-3 dark:bg-zinc-900 rounded-lg shadow-sm border border-purple-200 dark:border-purple-800/60 p-4 hover:shadow-md transition-shadow"
        >
          {/* 아바타 · 이름 */}
          <div className="flex items-center gap-3">
            <Avatar size="lg" className="shrink-0">
              {admin.avatar_url ? (
                <AvatarImage
                  src={admin.avatar_url}
                  alt={admin.name || "관리자"}
                  className="object-cover"
                />
              ) : null}
              <AvatarFallback className="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-md font-medium">
                {admin.name ? admin.name.charAt(0).toUpperCase() : "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-lg font-semibold text-black dark:text-zinc-50 truncate">
                  {admin.name || "이름 없음"}
                </h3>
                <span className="inline-flex items-center gap-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-[10px] font-medium px-1.5 py-0.5">
                  <Shield className="size-2.5" />
                  관리자
                </span>
              </div>
              {admin.email ? (
                <p className="text-sm text-zinc-600 dark:text-zinc-400 truncate">
                  {admin.email}
                </p>
              ) : null}
            </div>
          </div>

          {/* 전화 */}
          {admin.phone ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              <span className="font-medium">전화:</span> {admin.phone}
            </p>
          ) : null}

          {/* 하단: 소속 정보 */}
          <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1">
              {[admin.university, admin.major].filter(Boolean).join(" · ") ||
                "프로필 보기"}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
