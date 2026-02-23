import { fetchJson } from "../lib/httpClient.js";
import { logger } from "../lib/logger.js";
import type { PpsRawItem, Fetcher, SupportProgramRow } from "../lib/types.js";

// ────────────────────────────────────────────────────────
// 나라장터 공공데이터개방표준서비스 — 입찰공고정보
//
// API 문서 : https://www.data.go.kr/data/15058815/openapi.do
// 인증키   : 공공데이터포털에서 활용 신청 후 발급
// 환경변수 : PPS_API_KEY
// ────────────────────────────────────────────────────────

const PPS_API_URL =
  "https://apis.data.go.kr/1230000/ao/PubDataOpnStdService/getDataSetOpnStdBidPblancInfo";

/** 조회 범위: 최근 N개월 */
const INQUIRY_MONTHS = 3;

/** 나라장터 API 응답 최상위 구조 */
interface PpsApiResponse {
  response: {
    header: { resultCode: string; resultMsg: string };
    body: {
      items: PpsRawItem[];
      numOfRows: number;
      pageNo: number;
      totalCount: number;
    };
  };
}

/**
 * "2025-02-20 10:00:00" 형식의 일시 문자열에서 날짜(YYYY-MM-DD)만 추출.
 * 파싱 불가하면 null.
 */
function extractDatePart(datetime: string | undefined): string | null {
  if (!datetime) return null;
  const dateOnly = datetime.trim().slice(0, 10); // "2025-02-20"
  return /^\d{4}-\d{2}-\d{2}$/.test(dateOnly) ? dateOnly : null;
}

/**
 * 조회 시작·종료일을 "YYYYMMDDHHmm" 형식으로 생성.
 * 현재 시점 기준 최근 INQUIRY_MONTHS 개월.
 */
function buildInquiryDateRange(): { inqryBgnDt: string; inqryEndDt: string } {
  const now = new Date();
  const end =
    String(now.getFullYear()) +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0") +
    "2359";

  const begin = new Date(now);
  begin.setMonth(begin.getMonth() - INQUIRY_MONTHS);
  const bgnStr =
    String(begin.getFullYear()) +
    String(begin.getMonth() + 1).padStart(2, "0") +
    String(begin.getDate()).padStart(2, "0") +
    "0000";

  return { inqryBgnDt: bgnStr, inqryEndDt: end };
}

/**
 * 나라장터 전용 Fetcher 생성.
 *
 * 필드 매핑:
 *   bidNtceNo + bidNtceOrd → source_id
 *   bidNtceNm              → title
 *   ntceInsttNm            → agency
 *   dminsttNm              → executor
 *   bidNtceDt              → published_at
 *   bidBeginDt             → apply_start
 *   bidClseDt              → apply_end
 *   ntceKindNm             → category
 *   bidNtceDtlUrl          → detail_url
 */
export function createPpsFetcher(ppsApiKey: string): Fetcher {
  const { inqryBgnDt, inqryEndDt } = buildInquiryDateRange();

  return {
    source: "g2b",
    rawTable: "raw_g2b",

    // ── API 한 페이지 호출 ──
    async fetchPage(pageNumber: number, itemsPerPage: number): Promise<PpsRawItem[]> {
      logger.info(`나라장터 API 호출: pageNo=${pageNumber}, numOfRows=${itemsPerPage}`);

      const ppsResponse = await fetchJson<PpsApiResponse>(PPS_API_URL, {
        params: {
          serviceKey: ppsApiKey,
          type: "json",
          pageNo: String(pageNumber),
          numOfRows: String(itemsPerPage),
          inqryDiv: "1",           // 1: 입찰공고일시 기준
          inqryBgnDt,
          inqryEndDt,
        },
      });

      // 에러 응답 처리
      const header = ppsResponse.response?.header;
      if (header && header.resultCode !== "00") {
        throw new Error(
          `나라장터 API 오류: [${header.resultCode}] ${header.resultMsg}`,
        );
      }

      const items = ppsResponse.response?.body?.items;
      if (!items) return [];
      return Array.isArray(items) ? items : [items];
    },

    // ── source_id 추출 (공고번호-차수) ──
    getSourceId(rawItem: unknown): string {
      const bidItem = rawItem as PpsRawItem;
      const ntceNo = bidItem.bidNtceNo ?? "";
      const ntceOrd = bidItem.bidNtceOrd ?? "000";
      return ntceNo ? `${ntceNo}-${ntceOrd}` : "";
    },

    // ── raw → SupportProgramRow 정제 ──
    refine(rawItem: unknown): SupportProgramRow | null {
      const bidItem = rawItem as PpsRawItem;

      const bidNtceNo = bidItem.bidNtceNo ?? "";
      if (!bidNtceNo) return null;

      const bidTitle = bidItem.bidNtceNm ?? "";
      if (!bidTitle) return null;

      const sourceId = `${bidNtceNo}-${bidItem.bidNtceOrd ?? "000"}`;

      return {
        source: "g2b",
        source_id: sourceId,
        title: bidTitle,
        category: bidItem.ntceKindNm ?? null,
        agency: bidItem.ntceInsttNm ?? null,
        executor: bidItem.dminsttNm ?? null,
        target: null,                              // 나라장터에는 지원대상 필드 없음
        summary: bidItem.cntrctCnclsMthdNm ?? null, // 계약방법을 요약으로 활용
        apply_start: extractDatePart(bidItem.bidBeginDt),
        apply_end: extractDatePart(bidItem.bidClseDt),
        detail_url: bidItem.bidNtceDtlUrl ?? null,
        published_at: extractDatePart(bidItem.bidNtceDt),
        raw_json: bidItem as Record<string, unknown>,
      };
    },
  };
}
