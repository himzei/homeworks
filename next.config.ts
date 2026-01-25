import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // 외부 이미지 도메인 허용
    remotePatterns: [
      {
        protocol: "https",
        hostname: "datainstitute.knu.ac.kr",
        pathname: "/**",
      },
    ],
    // 이미지 최적화 비활성화 옵션 (필요시)
    // unoptimized: true,
  },
};

export default nextConfig;
