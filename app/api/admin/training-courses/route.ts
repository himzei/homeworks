import { NextResponse } from "next/server";

import {
  normalizeCourseSlug,
  validateCourseSlug,
} from "@/lib/admin/course-slug";
import { syncTrainingCourseGroupName } from "@/lib/admin/sync-training-course-group-name";
import { verifyAdminSession } from "@/lib/admin/verify-admin";
import { mapTrainingCourseError } from "@/lib/admin/training-course-errors";
import {
  createDefaultCourseFormValues,
  formValuesToDbPayload,
  type CourseFormValues,
} from "@/lib/courses";
import {
  parseCustomExcludedDatesInput,
  parseCustomHolidays,
  parseEventSchedules,
} from "@/lib/course-schedule";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

function parseCourseFormBody(body: unknown): CourseFormValues | null {
  if (!body || typeof body !== "object") return null;
  const defaults = createDefaultCourseFormValues();
  const raw = body as Record<string, unknown>;

  return {
    ...defaults,
    name: typeof raw.name === "string" ? raw.name : defaults.name,
    slug: typeof raw.slug === "string" ? raw.slug : defaults.slug,
    description:
      typeof raw.description === "string"
        ? raw.description
        : defaults.description,
    isLegacy: typeof raw.isLegacy === "boolean" ? raw.isLegacy : defaults.isLegacy,
    sortOrder:
      typeof raw.sortOrder === "string" ? raw.sortOrder : defaults.sortOrder,
    preEducationStartDate:
      typeof raw.preEducationStartDate === "string"
        ? raw.preEducationStartDate
        : defaults.preEducationStartDate,
    preEducationEndDate:
      typeof raw.preEducationEndDate === "string"
        ? raw.preEducationEndDate
        : defaults.preEducationEndDate,
    preEducationCurriculum: Array.isArray(raw.preEducationCurriculum)
      ? (raw.preEducationCurriculum as CourseFormValues["preEducationCurriculum"])
      : defaults.preEducationCurriculum,
    mainEducationStartDate:
      typeof raw.mainEducationStartDate === "string"
        ? raw.mainEducationStartDate
        : defaults.mainEducationStartDate,
    mainEducationEndDate:
      typeof raw.mainEducationEndDate === "string"
        ? raw.mainEducationEndDate
        : defaults.mainEducationEndDate,
    mainEducationCurriculum: Array.isArray(raw.mainEducationCurriculum)
      ? (raw.mainEducationCurriculum as CourseFormValues["mainEducationCurriculum"])
      : defaults.mainEducationCurriculum,
    excludeSaturday:
      typeof raw.excludeSaturday === "boolean"
        ? raw.excludeSaturday
        : defaults.excludeSaturday,
    excludeSunday:
      typeof raw.excludeSunday === "boolean"
        ? raw.excludeSunday
        : defaults.excludeSunday,
    excludeLegalHolidays:
      typeof raw.excludeLegalHolidays === "boolean"
        ? raw.excludeLegalHolidays
        : defaults.excludeLegalHolidays,
    excludeSubstituteHolidays:
      typeof raw.excludeSubstituteHolidays === "boolean"
        ? raw.excludeSubstituteHolidays
        : defaults.excludeSubstituteHolidays,
    customHolidays: Array.isArray(raw.customHolidays)
      ? parseCustomHolidays(raw.customHolidays)
      : typeof raw.customExcludedDatesInput === "string"
        ? parseCustomHolidays(
            [],
            parseCustomExcludedDatesInput(raw.customExcludedDatesInput),
          )
        : defaults.customHolidays,
    eventSchedules: Array.isArray(raw.eventSchedules)
      ? parseEventSchedules(raw.eventSchedules)
      : defaults.eventSchedules,
  };
}

/**
 * POST: 과정 등록
 * PATCH: 과정 수정 { id, ...formFields }
 */
export async function POST(request: Request) {
  try {
    const session = await verifyAdminSession();
    if (session.error) {
      return NextResponse.json(
        { error: session.error },
        {
          status: session.error === "로그인이 필요합니다." ? 401 : 403,
        },
      );
    }

    const formValues = parseCourseFormBody(await request.json());
    if (!formValues) {
      return NextResponse.json(
        { error: "요청 형식이 올바르지 않습니다." },
        { status: 400 },
      );
    }

    const trimmedName = formValues.name.trim();
    if (!trimmedName) {
      return NextResponse.json(
        { error: "과정명을 입력해 주세요." },
        { status: 400 },
      );
    }

    const normalizedSlug = normalizeCourseSlug(formValues.slug);
    const slugError = validateCourseSlug(normalizedSlug);
    if (slugError) {
      return NextResponse.json({ error: slugError }, { status: 400 });
    }

    const db = getServiceRoleClient() ?? session.supabase!;
    const payload = formValuesToDbPayload(formValues, session.user!.id);

    const { data, error } = await db
      .from("training_courses")
      .insert(payload)
      .select("id")
      .single();

    if (error) {
      console.error("training-courses POST:", error);
      return NextResponse.json(
        { error: mapTrainingCourseError(error) },
        { status: 400 },
      );
    }

    return NextResponse.json({ id: data.id });
  } catch (error) {
    console.error("POST /api/admin/training-courses:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await verifyAdminSession();
    if (session.error) {
      return NextResponse.json(
        { error: session.error },
        {
          status: session.error === "로그인이 필요합니다." ? 401 : 403,
        },
      );
    }

    const body = await request.json();
    const courseId =
      body && typeof body === "object" && typeof (body as { id?: string }).id === "string"
        ? (body as { id: string }).id
        : null;

    if (!courseId) {
      return NextResponse.json(
        { error: "과정 ID가 필요합니다." },
        { status: 400 },
      );
    }

    const formValues = parseCourseFormBody(body);
    if (!formValues) {
      return NextResponse.json(
        { error: "요청 형식이 올바르지 않습니다." },
        { status: 400 },
      );
    }

    const db = getServiceRoleClient() ?? session.supabase!;

    const { data: existingCourse, error: fetchError } = await db
      .from("training_courses")
      .select("name, slug")
      .eq("id", courseId)
      .single();

    if (fetchError || !existingCourse) {
      return NextResponse.json(
        { error: "과정을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const trimmedName = formValues.name.trim();
    if (!trimmedName) {
      return NextResponse.json(
        { error: "과정명을 입력해 주세요." },
        { status: 400 },
      );
    }

    const normalizedSlug = normalizeCourseSlug(formValues.slug);
    const slugError = validateCourseSlug(normalizedSlug);
    if (slugError) {
      return NextResponse.json({ error: slugError }, { status: 400 });
    }

    const isRenamingCourse = trimmedName !== existingCourse.name.trim();
    if (isRenamingCourse) {
      const syncResult = await syncTrainingCourseGroupName(
        db,
        existingCourse.name,
        trimmedName,
      );
      if (!syncResult.ok) {
        return NextResponse.json({ error: syncResult.error }, { status: 400 });
      }
    }

    const payload = formValuesToDbPayload(formValues);

    const { error } = await db
      .from("training_courses")
      .update(payload)
      .eq("id", courseId);

    if (error) {
      console.error("training-courses PATCH:", error);
      return NextResponse.json(
        { error: mapTrainingCourseError(error) },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PATCH /api/admin/training-courses:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await verifyAdminSession();
    if (session.error) {
      return NextResponse.json(
        { error: session.error },
        {
          status: session.error === "로그인이 필요합니다." ? 401 : 403,
        },
      );
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("id");

    if (!courseId) {
      return NextResponse.json(
        { error: "과정 ID가 필요합니다." },
        { status: 400 },
      );
    }

    const db = getServiceRoleClient() ?? session.supabase!;
    const { error } = await db
      .from("training_courses")
      .delete()
      .eq("id", courseId);

    if (error) {
      console.error("training-courses DELETE:", error);
      return NextResponse.json(
        { error: mapTrainingCourseError(error) },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/admin/training-courses:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
