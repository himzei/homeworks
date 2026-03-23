# Skills.sh 설정

이 프로젝트는 [skills.sh](https://skills.sh/)를 사용해 AI 에이전트(Cursor 등)에 전문화된 스킬을 적용합니다.

## 설치된 스킬

- **vercel-react-best-practices** - React/Next.js 성능 최적화 가이드
- **vercel-composition-patterns** - 컴포넌트 합성 패턴, React 19 대응
- **vercel-react-native-skills** - React Native/Expo 모바일 앱 베스트 프랙티스
- **web-design-guidelines** - UI 리뷰, 접근성, UX 가이드라인
- **deploy-to-vercel** - Vercel 배포 워크플로우
- **vercel-cli-with-tokens** - Vercel CLI 토큰 설정

## 명령어

```bash
# 설치된 스킬 목록 보기
npm run skills

# 새 스킬 검색 및 설치
npm run skills:find [검색어]
npm run skills:add <owner/repo>

# 스킬 업데이트
npm run skills:update
```

## 디렉터리 구조

스킬은 `.agents/skills/` 에 저장되며, Cursor가 자동으로 인식합니다.
