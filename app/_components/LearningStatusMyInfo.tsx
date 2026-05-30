import Link from "next/link";
import { Edit } from "lucide-react";

type LearningStatusMyInfoProps = {
  profile: {
    name: string;
    avatar_url: string | null;
  };
};

/** 학습현황 — 내 정보 (컴팩트) */
export default function LearningStatusMyInfo({
  profile,
}: LearningStatusMyInfoProps) {
  return (
    <section className="h-full rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-black dark:text-zinc-50">
          내 정보
        </h2>
        <Link
          href="/profile"
          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
        >
          <Edit className="size-3.5" />
          프로필 수정
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-zinc-300 bg-zinc-200 dark:border-zinc-600 dark:bg-zinc-700">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.name}
              className="size-full object-cover"
            />
          ) : (
            <span className="text-lg text-zinc-400 dark:text-zinc-500">
              {profile.name ? profile.name.charAt(0).toUpperCase() : "?"}
            </span>
          )}
        </div>
        <p className="text-base font-semibold text-black dark:text-zinc-50">
          {profile.name}
        </p>
      </div>
    </section>
  );
}
