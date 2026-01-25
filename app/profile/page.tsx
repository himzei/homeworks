"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  // 폼 상태 관리
  const [groupName, setGroupName] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // UI 상태 관리
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

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
          setGithubUrl(profile.github_url || "");
          setAvatarUrl(profile.avatar_url || null);
          setAvatarPreview(profile.avatar_url || null);
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

  // 아바타 이미지 업로드 처리
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // 파일 타입 검증 (이미지만 허용)
    if (!file.type.startsWith("image/")) {
      setError("이미지 파일만 업로드할 수 있습니다.");
      return;
    }

    // 파일 크기 검증 (5MB 제한)
    if (file.size > 5 * 1024 * 1024) {
      setError("이미지 크기는 5MB 이하여야 합니다.");
      return;
    }

    setIsUploadingAvatar(true);
    setError(null);

    try {
      // 기존 아바타가 있으면 삭제
      if (avatarUrl) {
        const oldFileName = avatarUrl.split("/").pop();
        if (oldFileName) {
          await supabase.storage
            .from("avatars")
            .remove([`${user.id}/${oldFileName}`]);
        }
      }

      // 새 파일명 생성 (타임스탬프 + 원본 파일명)
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Supabase Storage에 업로드
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // 공개 URL 가져오기
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      // 미리보기 업데이트
      setAvatarPreview(publicUrl);
      setAvatarUrl(publicUrl);

      // 프로필에 아바타 URL 저장
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setSuccess("아바타 이미지가 업로드되었습니다!");
      setTimeout(() => {
        setSuccess(null);
      }, 2000);
    } catch (err: any) {
      console.error("아바타 업로드 실패:", err);
      setError(err.message || "아바타 업로드 중 오류가 발생했습니다.");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // 아바타 이미지 삭제 처리
  const handleAvatarDelete = async () => {
    if (!user || !avatarUrl) return;

    setIsUploadingAvatar(true);
    setError(null);

    try {
      // Storage에서 파일 삭제
      const fileName = avatarUrl.split("/").pop();
      if (fileName) {
        await supabase.storage
          .from("avatars")
          .remove([`${user.id}/${fileName}`]);
      }

      // 프로필에서 아바타 URL 제거
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setAvatarUrl(null);
      setAvatarPreview(null);

      setSuccess("아바타 이미지가 삭제되었습니다!");
      setTimeout(() => {
        setSuccess(null);
      }, 2000);
    } catch (err: any) {
      console.error("아바타 삭제 실패:", err);
      setError(err.message || "아바타 삭제 중 오류가 발생했습니다.");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

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
      // GitHub URL 유효성 검증 (URL 형식이거나 비어있어야 함)
      let validatedGithubUrl = githubUrl.trim();
      if (validatedGithubUrl && !validatedGithubUrl.match(/^https?:\/\/.+/)) {
        // http:// 또는 https://로 시작하지 않으면 추가
        if (
          !validatedGithubUrl.startsWith("http://") &&
          !validatedGithubUrl.startsWith("https://")
        ) {
          validatedGithubUrl = `https://${validatedGithubUrl}`;
        }
      }

      // 프로필 정보 저장 또는 업데이트
      const { error: upsertError } = await supabase.from("profiles").upsert({
        id: user.id,
        group_name: groupName,
        name: name,
        phone: phone,
        bio: bio,
        github_url: validatedGithubUrl || null,
        avatar_url: avatarUrl,
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
            {/* 아바타 이미지 업로드 */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                프로필 사진
              </label>
              <div className="flex items-center gap-4">
                {/* 아바타 미리보기 */}
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center overflow-hidden border-2 border-zinc-300 dark:border-zinc-600">
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="프로필 사진"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-3xl text-zinc-400 dark:text-zinc-500">
                        {name ? name.charAt(0).toUpperCase() : "?"}
                      </div>
                    )}
                  </div>
                  {isUploadingAvatar && (
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>

                {/* 업로드 버튼 */}
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="avatar-upload"
                    className="px-4 py-2 text-sm font-medium bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors cursor-pointer text-center"
                  >
                    {isUploadingAvatar
                      ? "업로드 중..."
                      : avatarPreview
                        ? "변경"
                        : "업로드"}
                  </label>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    disabled={isUploadingAvatar}
                    className="hidden"
                  />
                  {avatarPreview && (
                    <button
                      type="button"
                      onClick={handleAvatarDelete}
                      disabled={isUploadingAvatar}
                      className="px-4 py-2 text-sm font-medium border border-red-300 dark:border-red-700 rounded-lg bg-white dark:bg-zinc-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      삭제
                    </button>
                  )}
                </div>
              </div>
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                이미지 파일만 업로드 가능합니다. (최대 5MB)
              </p>
            </div>

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
                {/* 기본 선택 옵션 */}
                <option value="">선택하세요</option>
                {/* 과정 선택 옵션 */}
                <option value="13기 교육생 - 빅데이터 전문가 양성과정">
                  13기 교육생 - 빅데이터 전문가 양성과정
                </option>
                {/* 필요시 여기에 추가 옵션을 넣을 수 있습니다 */}
              </select>
            </div>

            {/* 이름 */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
              >
                닉네임
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

            {/* GitHub 주소 */}
            <div>
              <label
                htmlFor="githubUrl"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
              >
                GitHub 주소
              </label>
              <input
                id="githubUrl"
                type="url"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://github.com/username"
              />
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                GitHub URL을 입력하세요. (선택사항)
              </p>
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
