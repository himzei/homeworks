/** 피드백 댓글 (DB JSON) */
export type TeamProjectFeedbackCommentRecord = {
  id: string;
  content: string;
  author_id: string;
  author_name: string;
  created_at: string;
};

/** 피드백 댓글 (UI·API) */
export type TeamProjectFeedbackComment = {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
};

/** DB team_projects JSONB 한 조 항목 */
export type TeamProjectRecord = {
  topic?: string | null;
  /** @deprecated feedback_comments 사용 */
  feedback?: string | null;
  feedback_comments?: TeamProjectFeedbackCommentRecord[] | null;
  github_url?: string | null;
  ppt_storage_path?: string | null;
  ppt_file_name?: string | null;
};

/** UI·API용 조별 프로젝트 */
export type TeamProjectInfo = {
  topic: string;
  feedbackComments: TeamProjectFeedbackComment[];
  githubUrl: string;
  pptStoragePath: string | null;
  pptFileName: string | null;
};

/** 조 프로젝트 첨부 허용 확장자 */
export const TEAM_ATTACHMENT_EXTENSIONS = [
  ".ppt",
  ".pptx",
  ".pdf",
  ".hwp",
  ".hwpx",
  ".xls",
  ".xlsx",
  ".csv",
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".bmp",
] as const;

/** file input accept 속성 */
export const TEAM_ATTACHMENT_ACCEPT = TEAM_ATTACHMENT_EXTENSIONS.join(",");

/** UI 안내 문구 */
export const TEAM_ATTACHMENT_HINT =
  "PPT, PDF, 한글(.hwp), 엑셀, 그림 파일(jpg, png 등)";

const MAX_TEAM_ATTACHMENT_BYTES = 50 * 1024 * 1024;

/** 피드백 댓글 파싱 (구버전 단일 문자열 호환) */
function parseFeedbackComments(row: TeamProjectRecord): TeamProjectFeedbackComment[] {
  if (Array.isArray(row.feedback_comments)) {
    const comments: TeamProjectFeedbackComment[] = [];
    for (const item of row.feedback_comments) {
      if (!item || typeof item !== "object") continue;
      const record = item as TeamProjectFeedbackCommentRecord;
      const content =
        typeof record.content === "string" ? record.content.trim() : "";
      if (!content) continue;
      comments.push({
        id: typeof record.id === "string" ? record.id : crypto.randomUUID(),
        content,
        authorId:
          typeof record.author_id === "string" ? record.author_id : "",
        authorName:
          typeof record.author_name === "string" && record.author_name.trim()
            ? record.author_name.trim()
            : "관리자",
        createdAt:
          typeof record.created_at === "string"
            ? record.created_at
            : new Date().toISOString(),
      });
    }
    return comments.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  if (typeof row.feedback === "string" && row.feedback.trim()) {
    return [
      {
        id: "legacy-feedback",
        content: row.feedback.trim(),
        authorId: "",
        authorName: "관리자",
        createdAt: new Date(0).toISOString(),
      },
    ];
  }

  return [];
}

/** JSONB → 조 번호별 맵 */
export function parseTeamProjectsFromJson(
  raw: unknown,
): Record<number, TeamProjectInfo> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }

  const result: Record<number, TeamProjectInfo> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const teamNumber = Number.parseInt(key, 10);
    if (!Number.isFinite(teamNumber) || teamNumber < 1) continue;
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;

    const row = value as TeamProjectRecord;
    result[teamNumber] = {
      topic: typeof row.topic === "string" ? row.topic.trim() : "",
      feedbackComments: parseFeedbackComments(row),
      githubUrl:
        typeof row.github_url === "string" ? row.github_url.trim() : "",
      pptStoragePath:
        typeof row.ppt_storage_path === "string" && row.ppt_storage_path.trim()
          ? row.ppt_storage_path.trim()
          : null,
      pptFileName:
        typeof row.ppt_file_name === "string" && row.ppt_file_name.trim()
          ? row.ppt_file_name.trim()
          : null,
    };
  }

  return result;
}

/** 맵 → DB JSONB */
export function teamProjectsMapToJson(
  projects: Record<number, TeamProjectInfo>,
): Record<string, TeamProjectRecord> {
  const json: Record<string, TeamProjectRecord> = {};
  for (const [teamKey, project] of Object.entries(projects)) {
    const teamNumber = Number.parseInt(teamKey, 10);
    if (!Number.isFinite(teamNumber) || teamNumber < 1) continue;

    const topic = project.topic.trim();
    const githubUrl = project.githubUrl.trim();
    const pptPath = project.pptStoragePath?.trim() || null;
    const pptName = project.pptFileName?.trim() || null;
    const hasFeedback = project.feedbackComments.length > 0;

    if (!topic && !hasFeedback && !githubUrl && !pptPath) continue;

    json[String(teamNumber)] = {
      topic: topic || null,
      feedback_comments: hasFeedback
        ? project.feedbackComments.map((comment) => ({
            id: comment.id,
            content: comment.content,
            author_id: comment.authorId,
            author_name: comment.authorName,
            created_at: comment.createdAt,
          }))
        : null,
      github_url: githubUrl || null,
      ppt_storage_path: pptPath,
      ppt_file_name: pptName,
    };
  }
  return json;
}

/** 피드백 댓글 추가 */
export function appendTeamProjectFeedbackComment(
  project: TeamProjectInfo,
  input: {
    content: string;
    authorId: string;
    authorName: string;
  },
): TeamProjectInfo {
  const content = input.content.trim();
  if (!content) return project;

  const comment: TeamProjectFeedbackComment = {
    id: crypto.randomUUID(),
    content,
    authorId: input.authorId,
    authorName: input.authorName.trim() || "관리자",
    createdAt: new Date().toISOString(),
  };

  return {
    ...project,
    feedbackComments: [...project.feedbackComments, comment],
  };
}

/** 피드백 댓글 수정 */
export function updateTeamProjectFeedbackComment(
  project: TeamProjectInfo,
  commentId: string,
  content: string,
): TeamProjectInfo | null {
  const trimmedContent = content.trim();
  if (!trimmedContent) return null;

  const commentIndex = project.feedbackComments.findIndex(
    (comment) => comment.id === commentId,
  );
  if (commentIndex === -1) return null;

  const nextComments = [...project.feedbackComments];
  nextComments[commentIndex] = {
    ...nextComments[commentIndex],
    content: trimmedContent,
  };

  return { ...project, feedbackComments: nextComments };
}

/** 피드백 댓글 삭제 */
export function deleteTeamProjectFeedbackComment(
  project: TeamProjectInfo,
  commentId: string,
): TeamProjectInfo {
  return {
    ...project,
    feedbackComments: project.feedbackComments.filter(
      (comment) => comment.id !== commentId,
    ),
  };
}

export function teamProjectHasContent(project: TeamProjectInfo): boolean {
  return !!(
    project.topic.trim() ||
    project.feedbackComments.length > 0 ||
    project.githubUrl.trim() ||
    project.pptStoragePath
  );
}

/** GitHub URL 정규화 (프로필 페이지와 동일 패턴) */
export function normalizeGithubUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/** 첨부 파일 확장자 검사 */
export function isAllowedTeamAttachmentFileName(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return TEAM_ATTACHMENT_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/**
 * Supabase Storage 객체 키용 파일명 (비 ASCII·공백 제거)
 * 원본 표시명은 ppt_file_name에 별도 저장
 */
export function buildTeamAttachmentStorageFileName(fileName: string): string {
  const trimmed = fileName.replace(/[/\\]/g, "_").trim();
  const extensionMatch = /\.([a-z0-9]+)$/i.exec(trimmed);
  const rawExt = extensionMatch ? extensionMatch[1].toLowerCase() : "";
  const dottedExt = rawExt ? `.${rawExt}` : "";

  const allowedExtension = TEAM_ATTACHMENT_EXTENSIONS.includes(
    dottedExt as (typeof TEAM_ATTACHMENT_EXTENSIONS)[number],
  )
    ? dottedExt
    : ".bin";

  return `file-${crypto.randomUUID()}${allowedExtension}`;
}

export function assertTeamAttachmentFileSize(byteSize: number): string | null {
  if (byteSize <= 0) return "파일이 비어 있습니다.";
  if (byteSize > MAX_TEAM_ATTACHMENT_BYTES) {
    return "첨부 파일은 50MB 이하만 업로드할 수 있습니다.";
  }
  return null;
}

export { MAX_TEAM_ATTACHMENT_BYTES };
