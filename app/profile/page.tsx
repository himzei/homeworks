"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  
  // 폼 상태 관리
  const [groupName, setGroupName] = useState("test1");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  
  // UI 상태 관리
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  // 사용자 정보 및 프로필 데이터 로드
  useEffect(() => {
    const loadProfile = async () => {
      try {
        // 현재 로그인한 사용자 확인
        const {
          data: { user: currentUser },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !currentUser) {
          // 로그인하지 않은 경우 홈으로 리다이렉트
          router.push("/");
          return;
        }

        setUser(currentUser);

        // 프로필 정보 가져오기 (profiles 테이블에서)
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", currentUser.id)
          .single();

        if (profileError && profileError.code !== "PGRST116") {
          // PGRST116은 데이터가 없을 때 발생하는 에러 (정상)
          console.error("프로필 로드 실패:", profileError);
        }

        // 프로필 데이터가 있으면 폼에 채우기
        if (profile) {
          setGroupName(profile.group_name || "");
          setName(profile.name || "");
          setPhone(profile.phone || "");
          setBio(profile.bio || "");
        }
      } catch (err: any) {
        console.error("프로필 로드 중 오류:", err);
        setError("프로필 정보를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [router, supabase]);

  // 프로필 저장 처리
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!user) {
      setError("로그인이 필요합니다.");
      return;
    }

    setIsSaving(true);

    try {
      // 프로필 정보 저장 또는 업데이트
      const { error: upsertError } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          group_name: groupName,
          name: name,
          phone: phone,
          bio: bio,
          updated_at: new Date().toISOString(),
        });

      if (upsertError) throw upsertError;

      setSuccess("프로필이 성공적으로 저장되었습니다!");
      
      // 2초 후 성공 메시지 숨기기
      setTimeout(() => {
        setSuccess(null);
      }, 2000);
    } catch (err: any) {
      console.error("프로필 저장 실패:", err);
      setError(err.message || "프로필 저장 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  // 로딩 중
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-zinc-500">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-2xl flex-col py-8 px-4 sm:px-8 bg-white dark:bg-black">
        <div className="w-full">
          {/* 헤더 */}
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-black dark:text-zinc-50 mb-2">
              개인정보 수정
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400">
              프로필 정보를 수정할 수 있습니다.
            </p>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* 성공 메시지 */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-600 dark:text-green-400">
              {success}
            </div>
          )}

          {/* 프로필 수정 폼 */}
          <form onSubmit={handleSave} className="space-y-6">
            {/* 그룹명 */}
            <div>
              <label
                htmlFor="groupName"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
              >
                과정명
              </label>
              <select
                id="groupName"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="test1">test1</option>
                {/* 필요시 여기에 추가 옵션을 넣을 수 있습니다 */}
              </select>
            </div>

            {/* 이름 */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
              >
                이름
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="이름을 입력하세요"
              />
            </div>

          

            {/* 자기소개 */}
            <div>
              <label
                htmlFor="bio"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
              >
                자기소개
              </label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={6}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="자기소개를 입력하세요"
              />
            </div>

            {/* 버튼 영역 */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => router.push("/")}
                className="flex-1 px-4 py-2 text-sm font-medium border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 px-4 py-2 text-sm font-medium bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                {isSaving ? "저장 중..." : "저장"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
