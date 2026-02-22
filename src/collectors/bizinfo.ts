import { supabase } from "../lib/supabase.js";
import { logger } from "../lib/logger.js";
import type {
  BizinfoRawItem,
  RawBizinfoRow,
  SupportProgramRow,
} from "../lib/types.js";

const API_URL = "https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do";

interface FetchOptions {
  apiKey: string;
  pageNo?: number;
  numOfRows?: number;
  keyword?: string;
}

/**
 * 기업마당 API 한 페이지 호출
 */
async function fetchPage(opts: FetchOptions): Promise<BizinfoRawItem[]> {
  const params = new URLSearchParams({
    crtfcKey: opts.apiKey,
    dataType: "json",
    pageNo: String(opts.pageNo ?? 1),
    numOfRows: String(opts.numOfRows ?? 100),
  });
  if (opts.keyword) {
    params.set("keyword", opts.keyword);
  }

  const url = `${API_URL}?${params.toString()}`;
  logger.info(`API 호출: page=${opts.pageNo ?? 1}, rows=${opts.numOfRows ?? 100}`);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`API 응답 오류: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();

  // 기업마당 API 응답 구조: jsonArray 또는 items 또는 item 배열
  const items: BizinfoRawItem[] =
    json?.jsonArray ?? json?.items ?? json?.item ?? json?.response?.body?.items ?? [];

  if (!Array.isArray(items)) {
    logger.warn("API 응답에서 배열을 찾을 수 없습니다. 응답 키:", Object.keys(json));
    return [];
  }

  return items;
}

/**
 * raw item에서 source_id 추출
 */
function getSourceId(item: BizinfoRawItem): string {
  return item.pblancId ?? item.seq ?? "";
}

/**
 * raw item → 정제된 SupportProgramRow 변환
 */
function refineItem(item: BizinfoRawItem): SupportProgramRow | null {
  const sourceId = getSourceId(item);
  if (!sourceId) return null;

  const title = item.title ?? item.pblancNm ?? "";
  if (!title) return null;

  // 신청기간 파싱: "2025-01-01~2025-03-31" 형태
  let applyStart: string | null = null;
  let applyEnd: string | null = null;
  const period = item.reqstBeginEndDe ?? "";
  if (period.includes("~")) {
    const [s, e] = period.split("~").map((d) => d.trim());
    applyStart = s || null;
    applyEnd = e || null;
  }

  return {
    source: "bizinfo",
    source_id: sourceId,
    title,
    category:
      item.pldirSportRealmLclasCodeNm ?? item.lcategory ?? null,
    agency: item.jrsdInsttNm ?? item.author ?? null,
    executor: item.excInsttNm ?? null,
    target: item.trgetNm ?? null,
    summary: item.bsnsSumryCn ?? null,
    apply_start: applyStart,
    apply_end: applyEnd,
    detail_url: item.link ?? item.pblancUrl ?? null,
    published_at: item.creatPnttm ?? item.pubDate ?? null,
    raw_json: item,
  };
}

/**
 * 기업마당 데이터 전체 수집 + 저장 메인 함수
 */
export async function collectBizinfo(apiKey: string): Promise<void> {
  // 1) fetch_logs에 실행 기록 시작
  const { data: logRow, error: logErr } = await supabase
    .from("fetch_logs")
    .insert({ source: "bizinfo", status: "running" })
    .select("id")
    .single();

  if (logErr) {
    logger.error("fetch_logs 기록 실패:", logErr.message);
  }
  const logId = logRow?.id;

  let totalFetched = 0;
  let totalSaved = 0;

  try {
    let pageNo = 1;
    const numOfRows = 100;
    let hasMore = true;

    while (hasMore) {
      const items = await fetchPage({ apiKey, pageNo, numOfRows });
      totalFetched += items.length;
      logger.info(`페이지 ${pageNo}: ${items.length}건 수신`);

      if (items.length === 0) {
        hasMore = false;
        break;
      }

      // 2) raw_bizinfo에 원본 저장 (upsert)
      const rawRows: RawBizinfoRow[] = items
        .filter((item) => getSourceId(item))
        .map((item) => ({
          source_id: getSourceId(item),
          fetched_at: new Date().toISOString(),
          raw_json: item,
        }));

      if (rawRows.length > 0) {
        const { error: rawErr } = await supabase
          .from("raw_bizinfo")
          .upsert(rawRows, { onConflict: "source_id" });

        if (rawErr) {
          logger.error("raw_bizinfo 저장 오류:", rawErr.message);
        }
      }

      // 3) support_programs에 정제 데이터 저장 (upsert)
      const refined = items
        .map(refineItem)
        .filter((r): r is SupportProgramRow => r !== null);

      if (refined.length > 0) {
        const { error: refErr } = await supabase
          .from("support_programs")
          .upsert(
            refined.map((r) => ({
              ...r,
              updated_at: new Date().toISOString(),
            })),
            { onConflict: "source,source_id" }
          );

        if (refErr) {
          logger.error("support_programs 저장 오류:", refErr.message);
        } else {
          totalSaved += refined.length;
        }
      }

      // 받은 건수가 요청한 건수보다 적으면 마지막 페이지
      if (items.length < numOfRows) {
        hasMore = false;
      } else {
        pageNo++;
      }
    }

    logger.info(
      `수집 완료: 총 ${totalFetched}건 수신, ${totalSaved}건 저장/갱신`
    );

    // 4) fetch_logs 완료 기록
    if (logId) {
      await supabase
        .from("fetch_logs")
        .update({
          finished_at: new Date().toISOString(),
          status: "success",
          total_fetched: totalFetched,
          total_saved: totalSaved,
        })
        .eq("id", logId);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("수집 중 오류 발생:", msg);

    if (logId) {
      await supabase
        .from("fetch_logs")
        .update({
          finished_at: new Date().toISOString(),
          status: "error",
          total_fetched: totalFetched,
          total_saved: totalSaved,
          error_message: msg,
        })
        .eq("id", logId);
    }

    throw err;
  }
}
