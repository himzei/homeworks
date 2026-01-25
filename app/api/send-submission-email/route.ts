import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import nodemailer from "nodemailer";

// 이메일 전송 API Route (nodemailer 사용)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { assignmentId, userEmail, assignmentTitle, submissionUrl } = body;

    // 필수 파라미터 검증
    if (!assignmentId || !userEmail) {
      return NextResponse.json(
        { error: "필수 파라미터가 누락되었습니다." },
        { status: 400 },
      );
    }

    // Supabase 클라이언트 생성
    const supabase = await createClient();

    // 현재 로그인한 유저 정보 가져오기
    const {
      data: { user: currentUser },
      error: userError,
    } = await supabase.auth.getUser();

    // 유저 이름 가져오기 (profiles 테이블에서)
    let userName = "";
    if (currentUser) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", currentUser.id)
        .single();

      userName = profile?.name || "";
    }

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
    const submissionDateTime = new Date().toLocaleString("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // HTML 이메일 본문
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>과제 제출 완료</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">과제 제출 완료</h1>
        </div>
        
        <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; margin-bottom: 20px;">안녕하세요${userName ? `, ${userName}님` : ""},</p>
          
          <p style="font-size: 16px; margin-bottom: 20px;">
            과제 제출이 성공적으로 완료되었습니다.
          </p>
          
          <div style="background-color: #f9fafb; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0 0 10px 0;"><strong style="color: #374151;">과제명:</strong> <span style="color: #111827;">${title}</span></p>
            <p style="margin: 0 0 10px 0;"><strong style="color: #374151;">제출 URL:</strong> <a href="${submissionUrl || "#"}" style="color: #667eea; text-decoration: none;">${submissionUrl || "URL 없음"}</a></p>
            <p style="margin: 0;"><strong style="color: #374151;">제출 일시:</strong> <span style="color: #111827;">${submissionDateTime}</span></p>
          </div>
          
          <p style="font-size: 16px; margin-top: 30px; margin-bottom: 10px;">
            제출 기한 내에 언제든지 URL을 수정할 수 있습니다.
          </p>
          
          <p style="font-size: 14px; color: #6b7280; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            감사합니다.<br>
            <strong style="color: #374151;">빅데이터 전문가 양성과정</strong>
          </p>
        </div>
      </body>
      </html>
    `;

    // 텍스트 이메일 본문 (HTML을 지원하지 않는 클라이언트용)
    const textContent = `
안녕하세요${userName ? `, ${userName}님` : ""},

과제 제출이 성공적으로 완료되었습니다.

과제명: ${title}
제출 URL: ${submissionUrl || "URL 없음"}
제출 일시: ${submissionDateTime}

제출 기한 내에 언제든지 URL을 수정할 수 있습니다.

감사합니다.
빅데이터 전문가 양성과정
    `.trim();

    // nodemailer 설정
    // 환경 변수에서 SMTP 설정 가져오기
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = parseInt(process.env.SMTP_PORT || "587");
    const smtpUser = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASSWORD;
    const smtpFrom = process.env.SMTP_FROM || smtpUser;

    // SMTP 설정이 없으면 에러 반환
    if (!smtpHost || !smtpUser || !smtpPassword) {
      console.error("SMTP 설정이 완료되지 않았습니다.");
      console.log("이메일 전송 요청 (SMTP 미설정):", {
        to: userEmail,
        subject: emailSubject,
        body: textContent,
      });

      return NextResponse.json(
        {
          success: false,
          error: "SMTP 설정이 필요합니다.",
          message: "개발 환경에서는 콘솔에 이메일 내용이 출력됩니다.",
        },
        { status: 500 },
      );
    }

    // nodemailer transporter 생성
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // 465 포트는 SSL 사용
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
      // Gmail 사용 시 추가 설정
      ...(smtpHost.includes("gmail") && {
        service: "gmail",
      }),
    });

    // 이메일 전송
    const mailOptions = {
      from: `"빅데이터 전문가 양성과정" <${smtpFrom}>`,
      to: userEmail,
      subject: emailSubject,
      text: textContent,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log("이메일 전송 성공:", info.messageId);

    return NextResponse.json({
      success: true,
      message: "이메일이 성공적으로 전송되었습니다.",
      messageId: info.messageId,
    });
  } catch (error) {
    console.error("이메일 전송 API 오류:", error);

    // nodemailer 에러 상세 정보
    if (error instanceof Error) {
      console.error("에러 메시지:", error.message);
    }

    return NextResponse.json(
      {
        error: "이메일 전송 중 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : "알 수 없는 오류",
      },
      { status: 500 },
    );
  }
}
