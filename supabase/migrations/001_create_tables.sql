-- =============================================
-- 1) raw_bizinfo: 기업마당 API 원본 JSON 저장
-- =============================================
CREATE TABLE IF NOT EXISTS raw_bizinfo (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_id   TEXT NOT NULL,                         -- pblancId (공고 고유 ID)
  fetched_at  TIMESTAMPTZ NOT NULL DEFAULT now(),    -- 수집 시각
  raw_json    JSONB NOT NULL,                        -- API 응답 원본
  UNIQUE (source_id)                                 -- 중복 수집 방지
);

CREATE INDEX IF NOT EXISTS idx_raw_bizinfo_source_id
  ON raw_bizinfo (source_id);

CREATE INDEX IF NOT EXISTS idx_raw_bizinfo_fetched_at
  ON raw_bizinfo (fetched_at DESC);


-- =============================================
-- 2) raw_g2b: 나라장터 API 원본 JSON 저장
-- TODO: ppsFetcher.ts 구현 시 이 테이블을 Supabase에 생성
-- =============================================
CREATE TABLE IF NOT EXISTS raw_g2b (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_id   TEXT NOT NULL,                         -- bidNtceNo (입찰공고번호)
  fetched_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  raw_json    JSONB NOT NULL,
  UNIQUE (source_id)
);

CREATE INDEX IF NOT EXISTS idx_raw_g2b_source_id
  ON raw_g2b (source_id);

CREATE INDEX IF NOT EXISTS idx_raw_g2b_fetched_at
  ON raw_g2b (fetched_at DESC);


-- =============================================
-- 3) raw_ntis: 국가R&D API 원본 JSON 저장
-- TODO: rdFetcher.ts 구현 시 이 테이블을 Supabase에 생성
-- =============================================
CREATE TABLE IF NOT EXISTS raw_ntis (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_id   TEXT NOT NULL,                         -- mngNo (과제고유번호)
  fetched_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  raw_json    JSONB NOT NULL,
  UNIQUE (source_id)
);

CREATE INDEX IF NOT EXISTS idx_raw_ntis_source_id
  ON raw_ntis (source_id);

CREATE INDEX IF NOT EXISTS idx_raw_ntis_fetched_at
  ON raw_ntis (fetched_at DESC);


-- =============================================
-- 4) support_programs: 정제된 지원사업 통합 테이블
--    기업마당 + 나라장터 + R&D 등 모든 소스 통합
-- =============================================
CREATE TABLE IF NOT EXISTS support_programs (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source        TEXT NOT NULL,                           -- 'bizinfo' | 'g2b' | 'ntis'
  source_id     TEXT NOT NULL,                           -- 각 소스별 고유 ID
  title         TEXT NOT NULL,                           -- 사업명 / 공고명
  category      TEXT,                                    -- 분야 (금융, 기술, 인력 등)
  agency        TEXT,                                    -- 소관/공고 기관
  executor      TEXT,                                    -- 수행/수요 기관
  target        TEXT,                                    -- 지원대상
  summary       TEXT,                                    -- 사업요약
  apply_start   DATE,                                    -- 신청 시작일
  apply_end     DATE,                                    -- 신청 종료일
  detail_url    TEXT,                                    -- 상세 공고 URL
  published_at  DATE,                                    -- 등록/게시일
  raw_json      JSONB,                                   -- 원본 참조용
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source, source_id)
);

CREATE INDEX IF NOT EXISTS idx_support_programs_source
  ON support_programs (source);

CREATE INDEX IF NOT EXISTS idx_support_programs_category
  ON support_programs (category);

CREATE INDEX IF NOT EXISTS idx_support_programs_apply_end
  ON support_programs (apply_end DESC);

CREATE INDEX IF NOT EXISTS idx_support_programs_published_at
  ON support_programs (published_at DESC);


-- =============================================
-- 5) fetch_logs: 수집 실행 이력 관리
-- =============================================
CREATE TABLE IF NOT EXISTS fetch_logs (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source        TEXT NOT NULL,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at   TIMESTAMPTZ,
  status        TEXT NOT NULL DEFAULT 'running',         -- 'running' | 'success' | 'error'
  total_fetched INTEGER DEFAULT 0,
  total_saved   INTEGER DEFAULT 0,
  error_message TEXT
);


-- =============================================
-- TODO: 대시보드에서 자주 쓸 대표 쿼리 예시
-- (RPC로 만들거나, 프론트에서 Supabase JS로 호출)
-- =============================================

-- ① 현재 신청 가능한 사업 (마감일 임박순)
-- SELECT title, source, agency, category, apply_end, detail_url
--   FROM support_programs
--  WHERE apply_end >= CURRENT_DATE
--  ORDER BY apply_end ASC
--  LIMIT 50;

-- ② 소스별 수집 현황 카운트
-- SELECT source, COUNT(*) AS program_count
--   FROM support_programs
--  GROUP BY source;

-- ③ 분야(category)별 집계
-- SELECT category, COUNT(*) AS category_count
--   FROM support_programs
--  WHERE category IS NOT NULL
--  GROUP BY category
--  ORDER BY category_count DESC;

-- ④ 최근 수집 로그
-- SELECT source, status, total_fetched, total_saved,
--        started_at, finished_at
--   FROM fetch_logs
--  ORDER BY started_at DESC
--  LIMIT 10;

-- ⑤ 키워드 검색
-- SELECT title, source, agency, apply_end, detail_url
--   FROM support_programs
--  WHERE title ILIKE '%AI%' OR summary ILIKE '%AI%'
--  ORDER BY published_at DESC;
