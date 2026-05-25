import { ImageResponse } from "next/og";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo/site";

export const alt = SITE_NAME;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** SNS·검색 미리보기용 OG 이미지 */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #eff6ff 0%, #ffffff 45%, #f5f3ff 100%)",
          padding: 72,
        }}
      >
        <div
          style={{
            fontSize: 26,
            color: "#2563eb",
            marginBottom: 20,
            fontWeight: 600,
          }}
        >
          K-Digital Training
        </div>
        <div
          style={{
            fontSize: 58,
            fontWeight: 700,
            color: "#0f172a",
            textAlign: "center",
            lineHeight: 1.15,
            marginBottom: 20,
          }}
        >
          {SITE_NAME}
        </div>
        <div
          style={{
            fontSize: 26,
            color: "#475569",
            textAlign: "center",
            maxWidth: 880,
            lineHeight: 1.4,
          }}
        >
          {SITE_DESCRIPTION}
        </div>
      </div>
    ),
    { ...size },
  );
}
