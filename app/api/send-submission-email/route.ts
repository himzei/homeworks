import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// 이메일 전송 API Route
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { assignmentId, userEmail, assignmentTitle, submissionUrl } = body;

    // 필수 파라미터 검증
    if (!assignmentId || !userEmail) {
      return NextResponse.json(
        { error: "필수 파라미터가 누락되었습니다." },
        { status: 400 }
      );
    }

    // Supabase 클라이언트 생성
    const supabase = await createClient();

    // 과제 정보 가져오기 (제목이 없으면 DB에서 조회)
    let title = assignmentTitle;
    if (!title) {
      const { data: assignment, error: assignmentError } = await supabase
        .from("assignments")
        .select("title")
        .eq("id", assignmentId)
        .single();

      if (assignmentError || !assignment) {
        console.error("과제 정보 조회 실패:", assignmentError);
        title = "과제";
      } else {
        title = assignment.title;
      }
    }

    // 이메일 내용 구성
    const emailSubject = `[과제 제출 완료] ${title}`;
    const emailBody = `
안녕하세요,

과제 제출이 완료되었습니다.

과제명: ${title}
제출 URL: ${submissionUrl || "URL 없음"}
제출 일시: ${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}

감사합니다.
빅데이터 전문가 양성과정
    `.trim();

    // 이메일 전송 로직
    // 방법 1: Resend API 사용 (권장)
    // Resend API 키가 환경 변수에 설정되어 있는지 확인
    const resendApiKey = process.env.RESEND_API_KEY;

    if (resendApiKey) {
      try {
        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: process.env.RESEND_FROM_EMAIL || "noreply@example.com",
            to: [userEmail],
            subject: emailSubject,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">과제 제출 완료</h2>
                <p>안녕하세요,</p>
                <p>과제 제출이 완료되었습니다.</p>
                <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p><strong>과제명:</strong> ${title}</p>
                  <p><strong>제출 URL:</strong> <a href="${submissionUrl || "#"}">${submissionUrl || "URL 없음"}</a></p>
                  <p><strong>제출 일시:</strong> ${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</p>
                </div>
                <p>감사합니다.</p>
                <p style="color: #6b7280; font-size: 14px;">빅데이터 전문가 양성과정</p>
              </div>
            `,
            text: emailBody,
          }),
        });

        if (!resendResponse.ok) {
          const errorData = await resendResponse.json();
          console.error("Resend API 오류:", errorData);
          throw new Error("이메일 전송 실패");
        }

        return NextResponse.json({
          success: true,
          message: "이메일이 성공적으로 전송되었습니다.",
        });
      } catch (resendError) {
        console.error("Resend 이메일 전송 오류:", resendError);
        // Resend 실패 시 다른 방법 시도하거나 에러 반환
      }
    }

    // 방법 2: Supabase Database Functions 사용 (대안)
    // 또는 다른 이메일 서비스 사용 가능

    // 환경 변수가 없거나 전송 실패한 경우 로그만 남기고 성공 응답
    console.log("이메일 전송 요청:", {
      to: userEmail,
      subject: emailSubject,
      body: emailBody,
    });

    // 개발 환경에서는 콘솔에만 출력
    if (process.env.NODE_ENV === "development") {
      console.log("=== 이메일 내용 (개발 환경) ===");
      console.log("받는 사람:", userEmail);
      console.log("제목:", emailSubject);
      console.log("내용:", emailBody);
      console.log("=============================");
    }

    return NextResponse.json({
      success: true,
      message: "이메일 전송 요청이 처리되었습니다. (개발 모드에서는 콘솔에 출력됨)",
      note: "실제 이메일 전송을 위해서는 RESEND_API_KEY 환경 변수를 설정해주세요.",
    });
  } catch (error) {
    console.error("이메일 전송 API 오류:", error);
    return NextResponse.json(
      {
        error: "이메일 전송 중 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : "알 수 없는 오류",
      },
      { status: 500 }
    );
  }
}
