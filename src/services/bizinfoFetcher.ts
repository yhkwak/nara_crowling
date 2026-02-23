import { fetchJson } from "../lib/httpClient.js";
import { logger } from "../lib/logger.js";
import type { BizinfoRawItem, Fetcher, SupportProgramRow } from "../lib/types.js";

const API_URL = "https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do";

/**
 * 기업마당 전용 Fetcher 생성.
 * API 호출 · raw 파싱 · 정제 로직만 담당하며,
 * 페이지네이션 · DB 저장 · 로그는 공통 collector가 처리한다.
 */
export function createBizinfoFetcher(apiKey: string): Fetcher {
  return {
    source: "bizinfo",
    rawTable: "raw_bizinfo",

    // ── API 한 페이지 호출 ──
    async fetchPage(page: number, pageSize: number): Promise<BizinfoRawItem[]> {
      logger.info(`API 호출: pageIndex=${page}, pageUnit=${pageSize}`);

      const json = await fetchJson<{ jsonArray?: BizinfoRawItem[] | BizinfoRawItem }>(
        API_URL,
        {
          params: {
            crtfcKey: apiKey,
            dataType: "json",
            pageIndex: String(page),
            pageUnit: String(pageSize),
          },
        },
      );

      let items = json.jsonArray ?? [];
      if (!Array.isArray(items)) {
        if (typeof items === "object" && items !== null) {
          items = [items];
        } else {
          logger.warn("API 응답에서 jsonArray를 찾을 수 없습니다.");
          return [];
        }
      }

      return items;
    },

    // ── source_id 추출 ──
    getSourceId(item: unknown): string {
      const i = item as BizinfoRawItem;
      return i.pblancId ?? i.seq ?? "";
    },

    // ── raw → SupportProgramRow 정제 ──
    refine(item: unknown): SupportProgramRow | null {
      const i = item as BizinfoRawItem;
      const sourceId = i.pblancId ?? i.seq ?? "";
      if (!sourceId) return null;

      const title = i.title ?? i.pblancNm ?? "";
      if (!title) return null;

      // 신청기간 파싱: "2025.01.01~2025.03.31"
      let applyStart: string | null = null;
      let applyEnd: string | null = null;
      const period = i.reqstBeginEndDe ?? i.reqstDt ?? "";
      if (period.includes("~")) {
        const [s, e] = period.split("~").map((d) => d.trim().replace(/\./g, "-"));
        // YYYY-MM-DD 형식인지 간단 검증 (비정상 값 "20일" 등 걸러냄)
        const datePattern = /^\d{4}-\d{2}-\d{2}$/;
        applyStart = datePattern.test(s) ? s : null;
        applyEnd = datePattern.test(e) ? e : null;
      }

      return {
        source: "bizinfo",
        source_id: sourceId,
        title,
        category: i.pldirSportRealmLclasCodeNm ?? i.lcategory ?? null,
        agency: i.jrsdInsttNm ?? i.author ?? null,
        executor: i.excInsttNm ?? null,
        target: i.trgetNm ?? null,
        summary: i.bsnsSumryCn ?? i.description ?? null,
        apply_start: applyStart,
        apply_end: applyEnd,
        detail_url: i.link ?? i.pblancUrl ?? null,
        published_at: i.creatPnttm ?? i.pubDate ?? null,
        raw_json: i as Record<string, unknown>,
      };
    },
  };
}
