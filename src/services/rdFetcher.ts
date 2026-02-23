import { fetchJson } from "../lib/httpClient.js";
import { logger } from "../lib/logger.js";
import type { NtisRawItem, Fetcher, SupportProgramRow } from "../lib/types.js";

// ────────────────────────────────────────────────────────
// 국가R&D 과제검색 API (NTIS)
//
// API 문서 : https://www.ntis.go.kr → OpenAPI → 과제검색
// 인증키   : NTIS 회원가입 후 OpenAPI 활용 신청
// 환경변수 : RD_API_KEY
//
// TODO: 구현 체크리스트
// ☐ 1. NTIS API 엔드포인트 URL 확인
// ☐ 2. fetchPage — NTIS API 페이지네이션 호출
// ☐ 3. getSourceId — 과제고유번호(mngNo) 추출
// ☐ 4. refine — raw → SupportProgramRow 필드 매핑
// ☐ 5. raw_ntis 테이블 생성 (마이그레이션 SQL 참고)
// ☐ 6. scripts/fetch_all.ts 에서 주석 해제
// ────────────────────────────────────────────────────────

// TODO: 실제 엔드포인트로 교체
const NTIS_API_BASE_URL = "https://www.ntis.go.kr/rndopen/openApi/task";

/**
 * 국가R&D 전용 Fetcher 생성.
 *
 * API 응답 → SupportProgramRow 필드 매핑 가이드:
 *   mngNo        → source_id    (과제고유번호)
 *   prjNm        → title        (과제명)
 *   astOrgNm     → agency       (전문기관명)
 *   excOrg       → executor     (수행기관명)
 *   rschAreaNm   → category     (연구분야)
 *   prjAbstr     → summary      (과제요약)
 *   rcptStartDe  → apply_start  (접수시작일)
 *   rcptEndDe    → apply_end    (접수마감일)
 *   announceDt   → published_at (공고일자)
 *   detailUrl    → detail_url   (상세페이지 URL)
 */
export function createRdFetcher(rdApiKey: string): Fetcher {
  return {
    source: "ntis",
    rawTable: "raw_ntis",

    async fetchPage(pageNumber: number, itemsPerPage: number): Promise<NtisRawItem[]> {
      logger.info(`NTIS API 호출: page=${pageNumber}, size=${itemsPerPage}`);

      // TODO: 실제 API 호출로 교체
      // const ntisApiResponse = await fetchJson<{ resultData?: NtisRawItem[] }>(
      //   NTIS_API_BASE_URL,
      //   {
      //     params: {
      //       key: rdApiKey,
      //       returnType: "json",
      //       pageNo: String(pageNumber),
      //       numOfRows: String(itemsPerPage),
      //     },
      //   },
      // );
      // return ntisApiResponse.resultData ?? [];

      throw new Error("국가R&D fetcher 미구현 — TODO: 위 주석의 API 호출 코드를 활성화하세요");
    },

    getSourceId(rawItem: unknown): string {
      const taskItem = rawItem as NtisRawItem;
      // TODO: return String(taskItem.mngNo ?? "");
      throw new Error("국가R&D fetcher 미구현");
    },

    refine(rawItem: unknown): SupportProgramRow | null {
      const taskItem = rawItem as NtisRawItem;

      // TODO: 아래 매핑 완성
      // return {
      //   source: "ntis",
      //   source_id: String(taskItem.mngNo),
      //   title: String(taskItem.prjNm ?? ""),
      //   category: String(taskItem.rschAreaNm ?? null),
      //   agency: String(taskItem.astOrgNm ?? null),
      //   executor: String(taskItem.excOrg ?? null),
      //   target: null,
      //   summary: String(taskItem.prjAbstr ?? null),
      //   apply_start: String(taskItem.rcptStartDe ?? null),
      //   apply_end: String(taskItem.rcptEndDe ?? null),
      //   detail_url: String(taskItem.detailUrl ?? null),
      //   published_at: String(taskItem.announceDt ?? null),
      //   raw_json: taskItem as Record<string, unknown>,
      // };

      throw new Error("국가R&D fetcher 미구현");
    },
  };
}
