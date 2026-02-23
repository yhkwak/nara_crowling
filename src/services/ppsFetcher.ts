import { fetchJson } from "../lib/httpClient.js";
import { logger } from "../lib/logger.js";
import type { PpsRawItem, Fetcher, SupportProgramRow } from "../lib/types.js";

// ────────────────────────────────────────────────────────
// 나라장터 입찰공고정보 서비스 (조달청 OpenAPI)
//
// API 문서 : https://www.data.go.kr → "나라장터 입찰공고정보서비스"
// 인증키   : 공공데이터포털에서 활용 신청 후 발급
// 환경변수 : PPS_API_KEY
//
// TODO: 구현 체크리스트
// ☐ 1. API 엔드포인트 URL 확인 (물품/공사/용역 등 구분)
// ☐ 2. fetchPage — 나라장터 API 페이지네이션 호출
// ☐ 3. getSourceId — 입찰공고번호(bidNtceNo) 추출
// ☐ 4. refine — raw → SupportProgramRow 필드 매핑
// ☐ 5. raw_g2b 테이블 생성 (마이그레이션 SQL 참고)
// ☐ 6. scripts/fetch_all.ts 에서 주석 해제
// ────────────────────────────────────────────────────────

// TODO: 실제 엔드포인트로 교체
const PPS_API_BASE_URL = "https://apis.data.go.kr/1230000/BidPublicInfoService04";

/**
 * 나라장터 전용 Fetcher 생성.
 *
 * API 응답 → SupportProgramRow 필드 매핑 가이드:
 *   bidNtceNo    → source_id   (입찰공고번호)
 *   bidNtceNm    → title       (입찰공고명)
 *   ntceInsttNm  → agency      (공고기관명)
 *   dminsttNm    → executor    (수요기관명)
 *   bidNtceDt    → published_at(입찰공고일시)
 *   bidClseDt    → apply_end   (입찰마감일시)
 *   ntceKindNm   → category    (공고종류)
 *   presmptPrce  → (raw_json 보존, 정제 컬럼 없음)
 *   dtilPgmUrl   → detail_url  (상세페이지 URL)
 */
export function createPpsFetcher(ppsApiKey: string): Fetcher {
  return {
    source: "g2b",
    rawTable: "raw_g2b",

    async fetchPage(pageNumber: number, itemsPerPage: number): Promise<PpsRawItem[]> {
      logger.info(`나라장터 API 호출: page=${pageNumber}, size=${itemsPerPage}`);

      // TODO: 실제 API 호출로 교체
      // const ppsApiResponse = await fetchJson<{ response: { body: { items: PpsRawItem[] } } }>(
      //   `${PPS_API_BASE_URL}/getBidPblancListInfoThng`,
      //   {
      //     params: {
      //       serviceKey: ppsApiKey,
      //       type: "json",
      //       pageNo: String(pageNumber),
      //       numOfRows: String(itemsPerPage),
      //       inqryDiv: "1",             // 1: 일반입찰
      //       inqryBgnDt: "202501010000", // TODO: 동적 날짜
      //       inqryEndDt: "202512312359",
      //     },
      //   },
      // );
      // return ppsApiResponse.response.body.items ?? [];

      throw new Error("나라장터 fetcher 미구현 — TODO: 위 주석의 API 호출 코드를 활성화하세요");
    },

    getSourceId(rawItem: unknown): string {
      const bidItem = rawItem as PpsRawItem;
      // TODO: return String(bidItem.bidNtceNo ?? "");
      throw new Error("나라장터 fetcher 미구현");
    },

    refine(rawItem: unknown): SupportProgramRow | null {
      const bidItem = rawItem as PpsRawItem;

      // TODO: 아래 매핑 완성
      // return {
      //   source: "g2b",
      //   source_id: String(bidItem.bidNtceNo),
      //   title: String(bidItem.bidNtceNm ?? ""),
      //   category: String(bidItem.ntceKindNm ?? null),
      //   agency: String(bidItem.ntceInsttNm ?? null),
      //   executor: String(bidItem.dminsttNm ?? null),
      //   target: null,
      //   summary: null,
      //   apply_start: null,
      //   apply_end: parsePpsDateTime(bidItem.bidClseDt),
      //   detail_url: String(bidItem.dtilPgmUrl ?? null),
      //   published_at: parsePpsDateTime(bidItem.bidNtceDt),
      //   raw_json: bidItem as Record<string, unknown>,
      // };

      throw new Error("나라장터 fetcher 미구현");
    },
  };
}
