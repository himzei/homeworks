import { NextResponse } from "next/server";

import { verifyAdminSession } from "@/lib/admin/verify-admin";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

export type EvaluationExtraFieldRow = {
  id: string;
  title: string;
  group_name: string | null;
  sort_order: number;
  field_date: string | null;
  created_at: string;
};

const FIELD_SELECT =
  "id, title, group_name, sort_order, field_date, created_at";

/** YYYY-MM-DD 형식 검증 */
function parseFieldDateInput(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;

  const [year, month, day] = trimmed.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return trimmed;
}

/** 그룹 필터와 필드 소속이 일치하는지 검증 */
function validateFieldGroupAccess(
  rowGroup: string | null,
  filterGroup: string | null,
): string | null {
  if (filterGroup) {
    if (rowGroup !== null && rowGroup !== filterGroup) {
      return "다른 과정에 속한 필드는 변경할 수 없습니다.";
    }
    return null;
  }
  if (rowGroup !== null) {
    return "과정 전용 필드는 전체 보기에서 변경할 수 없습니다.";
  }
  return null;
}

/**
 * GET: 평가 추가 필드 목록
 * POST: 새 필드 추가 { title, groupName? }
 * PATCH: 순서 변경 { orderedFieldIds, groupName? }
 *       또는 표시 날짜 변경 { fieldId, fieldDate, groupName? }
 * DELETE: 필드 삭제 ?id=필드UUID&group=과정명(선택)
 */
export async function GET(request: Request) {
  try {
    const { supabase, error } = await verifyAdminSession();
    if (error) {
      return NextResponse.json({ error }, { status: error === "로그인이 필요합니다." ? 401 : 403 });
    }

    const { searchParams } = new URL(request.url);
    const groupName = searchParams.get("group");

    let query = supabase!
      .from("evaluation_extra_fields")
      .select(FIELD_SELECT)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (groupName) {
      const escaped = groupName.replace(/"/g, '""');
      query = query.or(`group_name.is.null,group_name.eq."${escaped}"`);
    } else {
      query = query.is("group_name", null);
    }

    const { data, error: fetchError } = await query;

    if (fetchError) {
      console.error("evaluation-fields GET:", fetchError);
      return NextResponse.json(
        { error: fetchError.message ?? "필드 목록 조회에 실패했습니다." },
        { status: 400 },
      );
    }

    return NextResponse.json({ fields: data ?? [] });
  } catch (e) {
    console.error("GET /api/admin/evaluation-fields:", e);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await verifyAdminSession();
    if (session.error) {
      return NextResponse.json(
        { error: session.error },
        { status: session.error === "로그인이 필요합니다." ? 401 : 403 },
      );
    }

    const body = await request.json();
    const { title, groupName, fieldDate } = body as {
      title?: string;
      groupName?: string | null;
      fieldDate?: string;
    };

    const trimmedTitle = typeof title === "string" ? title.trim() : "";
    if (!trimmedTitle) {
      return NextResponse.json({ error: "필드 이름을 입력해주세요." }, { status: 400 });
    }
    if (trimmedTitle.length > 50) {
      return NextResponse.json(
        { error: "필드 이름은 50자 이하로 입력해주세요." },
        { status: 400 },
      );
    }

    const service = getServiceRoleClient() ?? session.supabase;
    if (!service) {
      return NextResponse.json({ error: "DB 연결에 실패했습니다." }, { status: 500 });
    }

    const { data: maxRow } = await service
      .from("evaluation_extra_fields")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextSort = (maxRow?.sort_order ?? -1) + 1;
    const normalizedGroup =
      typeof groupName === "string" && groupName.trim() ? groupName.trim() : null;
    const parsedFieldDate =
      fieldDate !== undefined
        ? parseFieldDateInput(fieldDate)
        : parseFieldDateInput(new Date().toISOString().slice(0, 10));

    if (fieldDate !== undefined && fieldDate !== "" && !parsedFieldDate) {
      return NextResponse.json(
        { error: "표시 날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)" },
        { status: 400 },
      );
    }

    const { data: inserted, error: insertError } = await service
      .from("evaluation_extra_fields")
      .insert({
        title: trimmedTitle,
        group_name: normalizedGroup,
        sort_order: nextSort,
        field_date: parsedFieldDate,
      })
      .select(FIELD_SELECT)
      .single();

    if (insertError) {
      console.error("evaluation-fields POST:", insertError);
      return NextResponse.json(
        { error: insertError.message ?? "필드 추가에 실패했습니다." },
        { status: 400 },
      );
    }

    return NextResponse.json({ field: inserted });
  } catch (e) {
    console.error("POST /api/admin/evaluation-fields:", e);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

/**
 * PATCH: 표시 날짜 변경 { fieldId, fieldDate, groupName? }
 *       또는 순서 변경 { orderedFieldIds, groupName? }
 */
export async function PATCH(request: Request) {
  try {
    const session = await verifyAdminSession();
    if (session.error) {
      return NextResponse.json(
        { error: session.error },
        { status: session.error === "로그인이 필요합니다." ? 401 : 403 },
      );
    }

    const body = await request.json();
    const { orderedFieldIds, groupName, fieldId, fieldDate } = body as {
      orderedFieldIds?: unknown;
      groupName?: string | null;
      fieldId?: string;
      fieldDate?: string;
    };

    const normalizedGroup =
      typeof groupName === "string" && groupName.trim() ? groupName.trim() : null;

    const service = getServiceRoleClient() ?? session.supabase;
    if (!service) {
      return NextResponse.json({ error: "DB 연결에 실패했습니다." }, { status: 500 });
    }

    // 표시 날짜 수정
    if (typeof fieldId === "string" && fieldId.trim()) {
      const parsedFieldDate = parseFieldDateInput(fieldDate);
      if (!parsedFieldDate) {
        return NextResponse.json(
          { error: "표시 날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)" },
          { status: 400 },
        );
      }

      const { data: existingRow, error: fetchError } = await service
        .from("evaluation_extra_fields")
        .select("id, group_name")
        .eq("id", fieldId.trim())
        .maybeSingle();

      if (fetchError) {
        console.error("evaluation-fields PATCH date fetch:", fetchError);
        return NextResponse.json(
          { error: fetchError.message ?? "필드 조회에 실패했습니다." },
          { status: 400 },
        );
      }

      if (!existingRow) {
        return NextResponse.json({ error: "필드를 찾을 수 없습니다." }, { status: 404 });
      }

      const accessError = validateFieldGroupAccess(
        existingRow.group_name ?? null,
        normalizedGroup,
      );
      if (accessError) {
        return NextResponse.json({ error: accessError }, { status: 400 });
      }

      const { data: updatedField, error: updateError } = await service
        .from("evaluation_extra_fields")
        .update({ field_date: parsedFieldDate })
        .eq("id", fieldId.trim())
        .select(FIELD_SELECT)
        .single();

      if (updateError) {
        console.error("evaluation-fields PATCH date:", updateError);
        return NextResponse.json(
          { error: updateError.message ?? "날짜 저장에 실패했습니다." },
          { status: 400 },
        );
      }

      return NextResponse.json({ field: updatedField });
    }

    if (!Array.isArray(orderedFieldIds) || orderedFieldIds.length === 0) {
      return NextResponse.json(
        { error: "순서를 변경할 필드 목록이 필요합니다." },
        { status: 400 },
      );
    }

    const fieldIds = orderedFieldIds.filter(
      (id): id is string => typeof id === "string" && id.length > 0,
    );
    if (fieldIds.length !== orderedFieldIds.length) {
      return NextResponse.json({ error: "유효하지 않은 필드 ID입니다." }, { status: 400 });
    }

    const uniqueIds = new Set(fieldIds);
    if (uniqueIds.size !== fieldIds.length) {
      return NextResponse.json({ error: "중복된 필드 ID가 있습니다." }, { status: 400 });
    }

    const { data: existingRows, error: fetchError } = await service
      .from("evaluation_extra_fields")
      .select("id, group_name")
      .in("id", fieldIds);

    if (fetchError) {
      console.error("evaluation-fields PATCH fetch:", fetchError);
      return NextResponse.json(
        { error: fetchError.message ?? "필드 조회에 실패했습니다." },
        { status: 400 },
      );
    }

    if (!existingRows || existingRows.length !== fieldIds.length) {
      return NextResponse.json(
        { error: "일부 필드를 찾을 수 없습니다." },
        { status: 400 },
      );
    }

    for (const row of existingRows) {
      const accessError = validateFieldGroupAccess(row.group_name ?? null, normalizedGroup);
      if (accessError) {
        return NextResponse.json({ error: accessError }, { status: 400 });
      }
    }

    const updateResults = await Promise.all(
      fieldIds.map((id, index) =>
        service
          .from("evaluation_extra_fields")
          .update({ sort_order: index })
          .eq("id", id),
      ),
    );

    const failedUpdate = updateResults.find((result) => result.error);
    if (failedUpdate?.error) {
      console.error("evaluation-fields PATCH update:", failedUpdate.error);
      return NextResponse.json(
        { error: failedUpdate.error.message ?? "순서 저장에 실패했습니다." },
        { status: 400 },
      );
    }

    const { data: updatedFields, error: refetchError } = await service
      .from("evaluation_extra_fields")
      .select(FIELD_SELECT)
      .in("id", fieldIds)
      .order("sort_order", { ascending: true });

    if (refetchError) {
      console.error("evaluation-fields PATCH refetch:", refetchError);
      return NextResponse.json(
        { error: refetchError.message ?? "순서 저장 후 조회에 실패했습니다." },
        { status: 400 },
      );
    }

    return NextResponse.json({ fields: updatedFields ?? [] });
  } catch (e) {
    console.error("PATCH /api/admin/evaluation-fields:", e);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

/**
 * DELETE: 추가 필드 삭제 (연결된 점수는 CASCADE로 함께 삭제)
 */
export async function DELETE(request: Request) {
  try {
    const session = await verifyAdminSession();
    if (session.error) {
      return NextResponse.json(
        { error: session.error },
        { status: session.error === "로그인이 필요합니다." ? 401 : 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const fieldId = searchParams.get("id")?.trim() ?? "";
    const groupName = searchParams.get("group");

    if (!fieldId) {
      return NextResponse.json({ error: "삭제할 필드 ID가 필요합니다." }, { status: 400 });
    }

    const service = getServiceRoleClient() ?? session.supabase;
    if (!service) {
      return NextResponse.json({ error: "DB 연결에 실패했습니다." }, { status: 500 });
    }

    const { data: existingRow, error: fetchError } = await service
      .from("evaluation_extra_fields")
      .select("id, title, group_name")
      .eq("id", fieldId)
      .maybeSingle();

    if (fetchError) {
      console.error("evaluation-fields DELETE fetch:", fetchError);
      return NextResponse.json(
        { error: fetchError.message ?? "필드 조회에 실패했습니다." },
        { status: 400 },
      );
    }

    if (!existingRow) {
      return NextResponse.json({ error: "필드를 찾을 수 없습니다." }, { status: 404 });
    }

    const normalizedGroup =
      typeof groupName === "string" && groupName.trim() ? groupName.trim() : null;
    const accessError = validateFieldGroupAccess(
      existingRow.group_name ?? null,
      normalizedGroup,
    );
    if (accessError) {
      return NextResponse.json({ error: accessError }, { status: 400 });
    }

    const { error: deleteError } = await service
      .from("evaluation_extra_fields")
      .delete()
      .eq("id", fieldId);

    if (deleteError) {
      console.error("evaluation-fields DELETE:", deleteError);
      return NextResponse.json(
        { error: deleteError.message ?? "필드 삭제에 실패했습니다." },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true, deletedId: fieldId });
  } catch (e) {
    console.error("DELETE /api/admin/evaluation-fields:", e);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
