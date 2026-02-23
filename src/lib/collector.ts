import { supabase } from "./supabase.js";
import { logger } from "./logger.js";
import type { Fetcher, CollectResult, SupportProgramRow } from "./types.js";

/**
 * 공통 수집 실행기.
 * Fetcher 인터페이스만 구현하면 어떤 소스든 동일한 흐름으로 동작한다.
 *
 *   1) fetch_logs 기록 시작
 *   2) fetchPage()로 페이지네이션
 *   3) raw 테이블에 원본 upsert
 *   4) refine() → support_programs에 정제 데이터 upsert
 *   5) fetch_logs 기록 완료
 */
export async function runCollector(
  fetcher: Fetcher,
  pageSize = 100,
): Promise<CollectResult> {
  // ── 1) fetch_logs 시작 ──
  const { data: logRow, error: logErr } = await supabase
    .from("fetch_logs")
    .insert({ source: fetcher.source, status: "running" })
    .select("id")
    .single();

  if (logErr) {
    logger.error("fetch_logs 기록 실패:", logErr.message);
  }
  const logId = logRow?.id;

  let totalFetched = 0;
  let totalSaved = 0;

  try {
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const items = await fetcher.fetchPage(page, pageSize);
      totalFetched += items.length;
      logger.info(`페이지 ${page}: ${items.length}건 수신`);

      if (items.length === 0) break;

      // ── 2) raw 테이블에 원본 저장 (upsert) ──
      const rawRows = items
        .filter((item) => fetcher.getSourceId(item))
        .map((item) => ({
          source_id: fetcher.getSourceId(item),
          fetched_at: new Date().toISOString(),
          raw_json: item,
        }));

      if (rawRows.length > 0) {
        const { error: rawErr } = await supabase
          .from(fetcher.rawTable)
          .upsert(rawRows, { onConflict: "source_id" });

        if (rawErr) {
          logger.error(`${fetcher.rawTable} 저장 오류:`, rawErr.message);
        }
      }

      // ── 3) support_programs에 정제 데이터 저장 (upsert) ──
      const refined = items
        .map((item) => fetcher.refine(item))
        .filter((r): r is SupportProgramRow => r !== null);

      if (refined.length > 0) {
        const { error: refErr } = await supabase
          .from("support_programs")
          .upsert(
            refined.map((r) => ({
              ...r,
              updated_at: new Date().toISOString(),
            })),
            { onConflict: "source,source_id" },
          );

        if (refErr) {
          logger.error("support_programs 저장 오류:", refErr.message);
        } else {
          totalSaved += refined.length;
        }
      }

      hasMore = items.length >= pageSize;
      page++;
    }

    logger.info(
      `수집 완료: 총 ${totalFetched}건 수신, ${totalSaved}건 저장/갱신`,
    );

    // ── 4) fetch_logs 성공 기록 ──
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

    return { source: fetcher.source, totalFetched, totalSaved };
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
