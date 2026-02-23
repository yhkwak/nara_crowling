/**
 * 모든 데이터 소스 일괄 수집 스크립트
 *
 * 사용법:
 *   npx tsx scripts/fetch_all.ts
 *   npm run fetch:all
 *
 * 각 소스별 API 키가 .env에 설정된 것만 실행된다.
 */
import "dotenv/config";
import { createBizinfoFetcher } from "../src/services/bizinfoFetcher.js";
// import { createPpsFetcher } from "../src/services/ppsFetcher.js";
// import { createRdFetcher } from "../src/services/rdFetcher.js";
import { runCollector } from "../src/lib/collector.js";
import { logger } from "../src/lib/logger.js";
import type { Fetcher } from "../src/lib/types.js";

async function main() {
  const fetchers: Fetcher[] = [];

  // ── 기업마당 ──
  const bizinfoKey = process.env.BIZINFO_API_KEY;
  if (bizinfoKey) {
    fetchers.push(createBizinfoFetcher(bizinfoKey));
  } else {
    logger.warn("BIZINFO_API_KEY 미설정 → 기업마당 수집 건너뜀");
  }

  // ── 나라장터 (TODO: 구현 후 주석 해제) ──
  // const ppsKey = process.env.PPS_API_KEY;
  // if (ppsKey) {
  //   fetchers.push(createPpsFetcher(ppsKey));
  // } else {
  //   logger.warn("PPS_API_KEY 미설정 → 나라장터 수집 건너뜀");
  // }

  // ── 국가R&D (TODO: 구현 후 주석 해제) ──
  // const rdKey = process.env.RD_API_KEY;
  // if (rdKey) {
  //   fetchers.push(createRdFetcher(rdKey));
  // } else {
  //   logger.warn("RD_API_KEY 미설정 → 국가R&D 수집 건너뜀");
  // }

  if (fetchers.length === 0) {
    logger.error("활성화된 수집기가 없습니다. .env 파일에 API 키를 설정하세요.");
    process.exit(1);
  }

  logger.info(`=== 전체 수집 시작 (${fetchers.length}개 소스) ===`);

  for (const fetcher of fetchers) {
    logger.info(`--- [${fetcher.source}] 수집 시작 ---`);
    try {
      const result = await runCollector(fetcher);
      logger.info(
        `--- [${fetcher.source}] 수집 완료: ${result.totalFetched}건 수신, ${result.totalSaved}건 저장 ---`,
      );
    } catch (err) {
      logger.error(`--- [${fetcher.source}] 수집 실패 ---`, err);
    }
  }

  logger.info("=== 전체 수집 종료 ===");
}

main().catch((err) => {
  logger.error("스크립트 실행 실패:", err);
  process.exit(1);
});
