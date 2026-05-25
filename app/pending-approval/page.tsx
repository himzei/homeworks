import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/app/_components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { isApprovedMember } from "@/lib/profile-approval";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "가입 승인 대기",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

/**
 * 관리자 승인 전·거절된 회원 안내
 */
export default async function PendingApprovalPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const isRejected = params?.status === "rejected";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/?login_required=1");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, approval_status, name")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role === "admin" || isApprovedMember(profile)) {
    redirect("/home");
  }

  if (!profile) {
    redirect("/profile");
  }

  const title = isRejected ? "가입이 거절되었습니다" : "관리자 승인 대기 중";
  const description = isRejected
    ? "관리자에 의해 가입이 거절되었습니다. 문의가 필요하면 운영자에게 연락해 주세요."
    : "회원가입 정보가 접수되었습니다. 관리자가 승인하면 과제·교육일정 등 모든 기능을 이용할 수 있습니다.";

  return (
    <div className="flex min-h-full items-center justify-center bg-zinc-50 dark:bg-black px-4 py-12">
      <div className="w-full max-w-lg rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-black dark:text-zinc-50">
            {title}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {description}
          </p>
          {profile.name ? (
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              신청자:{" "}
              <span className="font-medium text-black dark:text-zinc-50">
                {profile.name}
              </span>
            </p>
          ) : null}
        </div>

        {!isRejected ? (
          <ul className="text-sm text-zinc-600 dark:text-zinc-400 space-y-2 list-disc pl-5">
            <li>프로필 정보는 아래에서 수정할 수 있습니다.</li>
            <li>승인 완료 후 자동으로 서비스를 이용할 수 있습니다.</li>
          </ul>
        ) : null}

        <Link href="/profile">
          <Button type="button" variant="outline">
            프로필 수정
          </Button>
        </Link>
      </div>
    </div>
  );
}
