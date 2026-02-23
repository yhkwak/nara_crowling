/**
 * 기업마당 API 원본 응답의 개별 아이템 타입
 * 실제 API 응답 필드명을 그대로 사용
 */
export interface BizinfoRawItem {
  pblancId?: string;
  seq?: string;
  title?: string;
  pblancNm?: string;
  link?: string;
  pblancUrl?: string;
  jrsdInsttNm?: string; // 소관기관
  author?: string; // 소관기관 (별칭)
  excInsttNm?: string; // 수행기관
  rcptInsttNm?: string; // 접수기관
  pldirSportRealmLclasCodeNm?: string; // 분야(대분류)
  lcategory?: string; // 분야(대분류) - 별칭
  reqstBeginEndDe?: string; // 신청기간 "2025.01.01~2025.03.31"
  reqstDt?: string; // 신청기간 (별칭)
  creatPnttm?: string; // 등록일
  pubDate?: string; // 등록일 (별칭)
  trgetNm?: string; // 지원대상
  bsnsSumryCn?: string; // 사업요약
  description?: string; // 사업설명 (별칭)
  hashtags?: string; // 해시태그
  hashTags?: string; // 해시태그 (별칭)
  [key: string]: unknown; // 알 수 없는 추가 필드 허용
}

/**
 * raw_bizinfo 테이블에 저장될 행
 */
export interface RawBizinfoRow {
  source_id: string; // pblancId 또는 seq
  fetched_at: string; // ISO timestamp
  raw_json: BizinfoRawItem;
}

/**
 * support_programs 테이블에 저장될 정제 데이터
 */
export interface SupportProgramRow {
  source: DataSource;
  source_id: string;
  title: string;
  category: string | null;
  agency: string | null;
  executor: string | null;
  target: string | null;
  summary: string | null;
  apply_start: string | null;
  apply_end: string | null;
  detail_url: string | null;
  published_at: string | null;
  raw_json: Record<string, unknown>;
}

/**
 * 데이터 소스 식별자 (확장 시 추가)
 */
export type DataSource = "bizinfo" | "g2b" | "ntis";

// ─── 공통 Fetcher 인터페이스 ───────────────────────────

/**
 * 모든 수집기가 구현해야 할 공통 인터페이스.
 * collector.ts의 runCollector()가 이 인터페이스만으로 동작한다.
 */
export interface Fetcher {
  /** 데이터 소스 식별자 */
  readonly source: DataSource;

  /** raw 데이터를 저장할 Supabase 테이블명 (예: "raw_bizinfo") */
  readonly rawTable: string;

  /** 한 페이지 분량의 raw 아이템을 API에서 가져온다 */
  fetchPage(page: number, pageSize: number): Promise<unknown[]>;

  /** raw 아이템에서 source_id를 추출한다 */
  getSourceId(item: unknown): string;

  /** raw 아이템 → SupportProgramRow 정제. 변환 불가하면 null */
  refine(item: unknown): SupportProgramRow | null;
}

/**
 * runCollector() 실행 결과
 */
export interface CollectResult {
  source: DataSource;
  totalFetched: number;
  totalSaved: number;
}
