import { supabase } from "./supabase.js";
import { logger } from "./logger.js";
import type { Fetcher, CollectResult, SupportProgramRow } from "./types.js";

/**
 * 공통 수집 실행기.
 * Fetcher 인터페이스만 구현하면 어떤 소스든 동일한 흐름으로 동작한다.
 *
 * 흐름:
 *   1) fetch_logs 기록 시작
 *   2) fetchPage()로 페이지네이션 반복
 *   3) raw 테이블에 원본 upsert
 *   4) refine() → support_programs에 정제 데이터 upsert
 *   5) fetch_logs 기록 완료
 *
 * ※ 이 함수는 순수 백엔드 수집 로직이다.
 *   프론트엔드(대시보드)에서는 직접 호출하지 않는다.
 */
export async function runCollector(
  fetcher: Fetcher,
  itemsPerPage = 100,
): Promise<CollectResult> {
  // ── 1) fetch_logs에 "수집 중" 상태 기록 ──
  const { data: fetchLogRow, error: fetchLogInsertError } = await supabase
    .from("fetch_logs")
    .insert({ source: fetcher.source, status: "running" })
    .select("id")
    .single();

  if (fetchLogInsertError) {
    logger.error("fetch_logs 기록 실패:", fetchLogInsertError.message);
  }
  const fetchLogId = fetchLogRow?.id;

  let totalFetchedCount = 0;
  let totalSavedCount = 0;

  try {
    let currentPageNumber = 1;
    let hasMorePages = true;

    while (hasMorePages) {
      // ── API에서 한 페이지 가져오기 ──
      const rawItemsFromApi = await fetcher.fetchPage(currentPageNumber, itemsPerPage);
      totalFetchedCount += rawItemsFromApi.length;
      logger.info(`페이지 ${currentPageNumber}: ${rawItemsFromApi.length}건 수신`);

      if (rawItemsFromApi.length === 0) break;

      // ── 2) raw 테이블에 원본 저장 (upsert) ──
      const rawRowsToSave = rawItemsFromApi
        .filter((rawItem) => fetcher.getSourceId(rawItem))
        .map((rawItem) => ({
          source_id: fetcher.getSourceId(rawItem),
          fetched_at: new Date().toISOString(),
          raw_json: rawItem,
        }));

      if (rawRowsToSave.length > 0) {
        const { error: rawTableUpsertError } = await supabase
          .from(fetcher.rawTable)
          .upsert(rawRowsToSave, { onConflict: "source_id" });

        if (rawTableUpsertError) {
          logger.error(`${fetcher.rawTable} 저장 오류:`, rawTableUpsertError.message);
        }
      }

      // ── 3) support_programs에 정제 데이터 저장 (upsert) ──
      const refinedPrograms = rawItemsFromApi
        .map((rawItem) => fetcher.refine(rawItem))
        .filter((row): row is SupportProgramRow => row !== null);

      if (refinedPrograms.length > 0) {
        const { error: programsUpsertError } = await supabase
          .from("support_programs")
          .upsert(
            refinedPrograms.map((program) => ({
              ...program,
              updated_at: new Date().toISOString(),
            })),
            { onConflict: "source,source_id" },
          );

        if (programsUpsertError) {
          logger.error("support_programs 저장 오류:", programsUpsertError.message);
        } else {
          totalSavedCount += refinedPrograms.length;
        }
      }

      // 받은 건수가 요청한 건수보다 적으면 마지막 페이지
      hasMorePages = rawItemsFromApi.length >= itemsPerPage;
      currentPageNumber++;
    }

    logger.info(
      `수집 완료: 총 ${totalFetchedCount}건 수신, ${totalSavedCount}건 저장/갱신`,
    );

    // ── 4) fetch_logs 성공 기록 ──
    if (fetchLogId) {
      await supabase
        .from("fetch_logs")
        .update({
          finished_at: new Date().toISOString(),
          status: "success",
          total_fetched: totalFetchedCount,
          total_saved: totalSavedCount,
        })
        .eq("id", fetchLogId);
    }

    return {
      source: fetcher.source,
      totalFetched: totalFetchedCount,
      totalSaved: totalSavedCount,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("수집 중 오류 발생:", errorMessage);

    if (fetchLogId) {
      await supabase
        .from("fetch_logs")
        .update({
          finished_at: new Date().toISOString(),
          status: "error",
          total_fetched: totalFetchedCount,
          total_saved: totalSavedCount,
          error_message: errorMessage,
        })
        .eq("id", fetchLogId);
    }

    throw error;
  }
}
