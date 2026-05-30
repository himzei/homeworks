"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isSessionExpiredError } from "@/lib/auth/is-session-expired-error";
import { isApprovedMember, PROFILE_APPROVAL_STATUS } from "@/lib/profile-approval";
import {
  fetchProfileGroupOptions,
  type GroupOption,
} from "@/lib/fetch-group-options";

/** useSearchParams를 사용하는 내부 컴포넌트 (Suspense boundary 필요) */
function ProfilePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const isGroupRequired = searchParams.get("group_required") === "1";

  // 폼 상태 관리
  const [groupName, setGroupName] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [university, setUniversity] = useState("");
  const [major, setMajor] = useState("");
  const [isGraduated, setIsGraduated] = useState<boolean>(false);

  // UI 상태 관리
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  // 과정 선택 콤보박스 옵션(서버/DB에서 조회, 실패 시 내부 폴백)
  const [groupOptions, setGroupOptions] = useState<GroupOption[]>([
    { value: "", label: "선택하세요" },
  ]);
  // 관리자 승인 후 과정명 변경 불가
  const [isGroupNameEditable, setIsGroupNameEditable] = useState(true);
  const [savedGroupName, setSavedGroupName] = useState("");
  // 사용자 정보 및 프로필 데이터 로드
  useEffect(() => {
    const loadProfile = async () => {
      try {
        // 현재 로그인한 사용자 확인
        const {
          data: { user: currentUser },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          if (isSessionExpiredError(userError)) {
            console.warn("세션이 만료되었습니다. 자동 로그아웃합니다.");
            await supabase.auth.signOut();
            router.push("/");
            return;
          }
          // 일시적 오류 — 기존 화면 유지 (새로고침 없이 복구 가능)
          console.warn("프로필 로드 중 인증 확인 실패:", userError.message);
          return;
        }

        if (!currentUser) {
          // 로그인하지 않은 경우 홈으로 리다이렉트
          router.push("/");
          return;
        }

        setUser(currentUser);

        // 과정 옵션 조회 (RLS 상 인증된 사용자만 조회 가능)
        // - 실패/데이터 없음 상황은 fetchProfileGroupOptions 내부에서 폴백 처리됨
        const fetchedGroupOptions = await fetchProfileGroupOptions(supabase);
        setGroupOptions(fetchedGroupOptions);

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
          const profileGroupName = profile.group_name || "";
          setGroupName(profileGroupName);
          setSavedGroupName(profileGroupName);
          setIsGroupNameEditable(
            profile.role === "admin" ||
              profile.approval_status !== PROFILE_APPROVAL_STATUS.approved,
          );
          setName(profile.name || "");
          setPhone(profile.phone || "");
          setBio(profile.bio || "");
          setGithubUrl(profile.github_url || "");
          setAvatarUrl(profile.avatar_url || null);
          setAvatarPreview(profile.avatar_url || null);
          setUniversity(profile.university || "");
          setMajor(profile.major || "");
          setIsGraduated(profile.is_graduated || false);
        }
      } catch (err: any) {
        // refresh token 에러 체크
        if (
          err?.message?.includes("Refresh Token") ||
          err?.message?.includes("refresh_token") ||
          err?.status === 401
        ) {
          console.warn("세션이 만료되었습니다. 자동 로그아웃합니다.");
          await supabase.auth.signOut();
          router.push("/");
          return;
        }
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
        group_name: isGroupNameEditable ? groupName : savedGroupName,
        name: name,
        phone: phone,
        bio: bio,
        github_url: validatedGithubUrl || null,
        avatar_url: avatarUrl,
        university: university.trim() || null,
        major: major.trim() || null,
        is_graduated: isGraduated,
        updated_at: new Date().toISOString(),
      });

      if (upsertError) throw upsertError;

      const { data: savedProfile } = await supabase
        .from("profiles")
        .select("role, approval_status")
        .eq("id", user.id)
        .maybeSingle();

      if (!isApprovedMember(savedProfile)) {
        setSuccess(
          "저장되었습니다. 관리자 승인 후 과제·교육일정 등을 이용할 수 있습니다.",
        );
        setTimeout(() => router.push("/pending-approval"), 1500);
      } else {
        setSuccess("저장이 완료되었습니다.");
        setTimeout(() => router.push("/home"), 1500);
      }
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
      <div className="flex min-h-full items-center justify-center">
        <div className="text-zinc-500">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-full w-full container flex-col py-8 px-4 sm:px-8 bg-white dark:bg-black">
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

          {/* 과정 미설정 안내 (group_required로 리다이렉트된 경우) */}
          {isGroupRequired && (
            <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-200">
              홈 화면을 이용하려면 아래에서 <strong>과정명</strong>을 선택해
              저장해주세요.
            </div>
          )}

          {/* 에러 메시지 */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* 저장 완료 인포팁은 fixed 토스트로 표시 (아래 영역) */}

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

            {/* 과정명 — 승인 전에만 선택·변경 가능 */}
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
                disabled={!isGroupNameEditable}
                className={`w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  isGroupNameEditable
                    ? "bg-white dark:bg-zinc-800"
                    : "cursor-not-allowed bg-zinc-100 text-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-400"
                }`}
                aria-disabled={!isGroupNameEditable}
              >
                {groupOptions.map((opt) => (
                  <option key={opt.value || "empty"} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {!isGroupNameEditable ? (
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  관리자 승인 후에는 과정명을 변경할 수 없습니다.
                </p>
              ) : null}
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

            {/* 대학교 */}
            <div>
              <label
                htmlFor="university"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
              >
                대학교
              </label>
              <input
                id="university"
                type="text"
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="대학교를 입력하세요"
              />
            </div>

            {/* 전공 */}
            <div>
              <label
                htmlFor="major"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
              >
                전공
              </label>
              <input
                id="major"
                type="text"
                value={major}
                onChange={(e) => setMajor(e.target.value)}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="전공을 입력하세요"
              />
            </div>

            {/* 졸업여부 */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                졸업여부
              </label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="graduationStatus"
                    checked={!isGraduated}
                    onChange={() => setIsGraduated(false)}
                    className="w-4 h-4 text-blue-500 border-zinc-300 dark:border-zinc-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">
                    재학 중
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="graduationStatus"
                    checked={isGraduated}
                    onChange={() => setIsGraduated(true)}
                    className="w-4 h-4 text-blue-500 border-zinc-300 dark:border-zinc-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">
                    졸업
                  </span>
                </label>
              </div>
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

        {/* 저장 완료 인포팁 (화면 하단 중앙 토스트) */}
        {success && (
          <div
            role="status"
            aria-live="polite"
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-medium shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-300"
          >
            {success}
          </div>
        )}
      </main>
    </div>
  );
}

/** useSearchParams를 Suspense로 감싸 빌드 시 prerender 오류 방지 */
export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-full items-center justify-center">
          <div className="text-zinc-500">로딩 중...</div>
        </div>
      }
    >
      <ProfilePageContent />
    </Suspense>
  );
}
