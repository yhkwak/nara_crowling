// ─── 데이터 소스 식별자 ──────────────────────────────

/** 현재 지원하는 공공데이터 소스 (확장 시 여기에 추가) */
export type DataSource = "bizinfo" | "g2b" | "ntis";

// ─── 소스별 Raw Item 타입 ────────────────────────────

/**
 * 기업마당 API 원본 응답의 개별 아이템 타입.
 * 실제 API 응답 필드명을 그대로 사용한다.
 */
export interface BizinfoRawItem {
  pblancId?: string;                       // 공고 고유 ID
  seq?: string;                            // 순번 (pblancId 없을 때 대체)
  title?: string;                          // 사업명
  pblancNm?: string;                       // 사업명 (별칭)
  link?: string;                           // 상세 URL
  pblancUrl?: string;                      // 상세 URL (별칭)
  jrsdInsttNm?: string;                    // 소관기관
  author?: string;                         // 소관기관 (별칭)
  excInsttNm?: string;                     // 수행기관
  rcptInsttNm?: string;                    // 접수기관
  pldirSportRealmLclasCodeNm?: string;     // 분야(대분류)
  lcategory?: string;                      // 분야(대분류) 별칭
  reqstBeginEndDe?: string;                // 신청기간 "2025.01.01~2025.03.31"
  reqstDt?: string;                        // 신청기간 (별칭)
  creatPnttm?: string;                     // 등록일
  pubDate?: string;                        // 등록일 (별칭)
  trgetNm?: string;                        // 지원대상
  bsnsSumryCn?: string;                    // 사업요약
  description?: string;                    // 사업설명 (별칭)
  hashtags?: string;                       // 해시태그
  hashTags?: string;                       // 해시태그 (별칭)
  [key: string]: unknown;
}

/**
 * 나라장터 공공데이터개방표준서비스 입찰공고 원본 응답 타입.
 * API: getDataSetOpnStdBidPblancInfo
 * 응답 경로: response.body.items[n]
 */
export interface PpsRawItem {
  bidNtceNo?: string;              // 입찰공고번호 (PK 1)
  bidNtceOrd?: string;             // 입찰공고차수 (PK 2)
  reNtceYn?: string;               // 재공고여부 (Y/N)
  bidNtceNm?: string;              // 입찰공고명
  ntceInsttNm?: string;            // 공고기관명
  ntceInsttCd?: string;            // 공고기관코드
  dminsttNm?: string;              // 수요기관명
  dminsttCd?: string;              // 수요기관코드
  bidNtceDt?: string;              // 입찰공고일시 "2025-02-20 10:00:00"
  bidClseDt?: string;              // 입찰마감일시
  opengDt?: string;                // 개찰일시
  bidBeginDt?: string;             // 입찰개시일시
  ntceKindNm?: string;             // 공고종류명
  cntrctCnclsMthdNm?: string;      // 계약체결방법명
  bidQlfctRgstDt?: string;         // 입찰참가자격등록마감일시
  presmptPrce?: string;            // 추정가격
  asignBdgtAmt?: string;           // 배정예산금액
  bssamt?: string;                 // 기초금액
  dtilPrdctClsfcNoNm?: string;     // 세부품명분류번호명
  bidNtceDtlUrl?: string;          // 입찰공고상세URL
  rgstDt?: string;                 // 등록일시
  bfSpecRgstNo?: string;           // 사전규격등록번호
  sucsfbidMthdNm?: string;         // 낙찰방법명
  intrntnlDivNm?: string;          // 국제구분명
  prtcptLmtRgnNm?: string;         // 참가제한지역명
  bidPrdctNo?: string;             // 입찰분류번호
  [key: string]: unknown;
}

/**
 * TODO: 국가R&D NTIS API 원본 응답 타입
 * NTIS 과제검색 API 기준 예상 필드:
 *   mngNo          — 과제고유번호 (source_id)
 *   prjNm          — 과제명 (title)
 *   astOrgNm       — 전문기관명 (agency)
 *   excOrg         — 수행기관명 (executor)
 *   rschAreaNm     — 연구분야 (category)
 *   prjAbstr       — 과제요약 (summary)
 *   rcptStartDe    — 접수시작일 (apply_start)
 *   rcptEndDe      — 접수마감일 (apply_end)
 *   announceDt     — 공고일자 (published_at)
 *   detailUrl      — 상세페이지 URL (detail_url)
 */
export interface NtisRawItem {
  [key: string]: unknown;
}

// ─── raw 테이블 행 타입 ──────────────────────────────

/** raw_bizinfo 테이블에 저장될 행 */
export interface RawBizinfoRow {
  source_id: string;
  fetched_at: string;
  raw_json: BizinfoRawItem;
}

// ─── 정제 데이터 (모든 소스 공통) ────────────────────

/**
 * support_programs 테이블에 저장될 정제 데이터.
 * 기업마당·나라장터·R&D 모든 소스가 이 하나의 형태로 통합된다.
 *
 * ※ 프론트엔드(대시보드)는 이 타입만 import하면 된다.
 *   수집 로직(services/)은 프론트에서 절대 import하지 않는다.
 */
export interface SupportProgramRow {
  source: DataSource;
  source_id: string;
  title: string;
  category: string | null;
  agency: string | null;       // 소관/공고 기관
  executor: string | null;     // 수행/수요 기관
  target: string | null;       // 지원대상
  summary: string | null;      // 사업요약
  apply_start: string | null;  // 신청 시작일 (YYYY-MM-DD)
  apply_end: string | null;    // 신청 종료일 (YYYY-MM-DD)
  detail_url: string | null;   // 원문 상세 페이지
  published_at: string | null; // 등록/게시일 (YYYY-MM-DD)
  raw_json: Record<string, unknown>;
}

// ─── 공통 Fetcher 인터페이스 ─────────────────────────

/**
 * 모든 수집기가 구현해야 할 공통 인터페이스.
 *
 * 새 소스를 추가할 때:
 *   1. 이 인터페이스를 구현하는 createXxxFetcher() 작성
 *   2. collector.ts 의 runCollector()에 넘기면 끝
 *
 * 프론트엔드 코드는 이 인터페이스를 알 필요 없다.
 * (수집은 scripts/ → services/ → lib/ 로만 흐른다)
 */
export interface Fetcher {
  /** 데이터 소스 식별자 */
  readonly source: DataSource;

  /** raw 데이터를 저장할 Supabase 테이블명 (예: "raw_bizinfo") */
  readonly rawTable: string;

  /** 한 페이지 분량의 raw 아이템을 API에서 가져온다 */
  fetchPage(pageNumber: number, itemsPerPage: number): Promise<unknown[]>;

  /** raw 아이템에서 source_id(고유 식별자)를 추출한다 */
  getSourceId(rawItem: unknown): string;

  /** raw 아이템 → SupportProgramRow 정제. 변환 불가하면 null */
  refine(rawItem: unknown): SupportProgramRow | null;
}

/** runCollector() 실행 결과 */
export interface CollectResult {
  source: DataSource;
  totalFetched: number;
  totalSaved: number;
}

// ─── 대시보드용 쿼리 예시 (TODO: UI 붙일 때 참고) ────

/**
 * TODO: 대시보드에서 사용할 대표 Supabase 쿼리 예시
 *
 * ① 현재 신청 가능한 사업 목록 (마감일 임박순)
 *    supabase
 *      .from("support_programs")
 *      .select("title, agency, category, apply_end, detail_url, source")
 *      .gte("apply_end", new Date().toISOString().slice(0, 10))
 *      .order("apply_end", { ascending: true })
 *      .limit(50)
 *
 * ② 소스별 수집 현황 카운트
 *    supabase
 *      .from("support_programs")
 *      .select("source", { count: "exact", head: true })
 *
 * ③ 분야(category)별 집계
 *    supabase
 *      .from("support_programs")
 *      .select("category")
 *      // → 프론트에서 groupBy 처리 또는 Supabase RPC 사용
 *
 * ④ 최근 수집 로그 조회
 *    supabase
 *      .from("fetch_logs")
 *      .select("*")
 *      .order("started_at", { ascending: false })
 *      .limit(10)
 *
 * ⑤ 키워드 검색 (title 또는 summary에서)
 *    supabase
 *      .from("support_programs")
 *      .select("*")
 *      .or(`title.ilike.%${keyword}%,summary.ilike.%${keyword}%`)
 *      .order("published_at", { ascending: false })
 */
