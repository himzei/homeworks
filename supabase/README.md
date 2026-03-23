# Supabase CLI — `db push` 사용법

이 폴더는 [Supabase CLI](https://supabase.com/docs/guides/cli)로 원격 DB에 스키마를 반영(`db push`)할 때 사용합니다.

## 사전 준비

1. **CLI 설치** (미설치 시)

   ```bash
   brew install supabase/tap/supabase
   ```

2. **로그인** (한 번만)

   ```bash
   supabase login
   ```

## 원격 프로젝트 연결 (`link`)

대시보드 URL `https://supabase.com/dashboard/project/<project-ref>` 의 **project-ref** 를 사용합니다.

```bash
npm run supabase:link
# 또는
supabase link --project-ref YOUR_PROJECT_REF
```

DB 비밀번호는 Supabase **Project Settings → Database** 에서 확인합니다.

## 마이그레이션 적용 (`db push`)

```bash
npm run supabase:push
# 또는
supabase db push
```

적용된 마이그레이션 목록 확인:

```bash
npm run supabase:status
```

## 스키마 수정 흐름

1. `supabase/migrations/` 에 새 파일 추가  
   예: `supabase migration new add_some_column`
2. 생성된 `.sql` 에 `ALTER TABLE` 등 작성
3. `supabase db push` 로 원격에 반영

> **참고:** 루트의 `supabase-setup.sql` 과 동기화하려면, 변경 후 마이그레이션 SQL을 맞춰 두는 것을 권장합니다.

## 이미 SQL Editor로 스키마를 넣은 DB인 경우

원격에 테이블이 이미 있으면 `db push` 가 **이미 존재** 오류로 실패할 수 있습니다. 그때는 다음 중 하나를 선택합니다.

- **새 프로젝트**에만 `db push` 사용 (권장)
- 또는 Supabase 문서의 [migration repair](https://supabase.com/docs/guides/cli/managing-environments#migration-history) 로 히스토리 정렬

## 로컬 전용 파일

`.temp`, `.branches` 는 CLI가 생성하며 `supabase/.gitignore` 에 의해 커밋되지 않습니다.
