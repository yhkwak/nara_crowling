/**
 * 나라장터 입찰공고정보 수집 스크립트
 *
 * 사용법:
 *   npx tsx scripts/fetch_pps.ts
 *   npm run fetch:pps
 */
import "dotenv/config";
import { createPpsFetcher } from "../src/services/ppsFetcher.js";
import { runCollector } from "../src/lib/collector.js";
import { logger } from "../src/lib/logger.js";

async function main() {
  const apiKey = process.env.PPS_API_KEY;
  if (!apiKey) {
    logger.error(
      "PPS_API_KEY 환경변수가 설정되지 않았습니다. .env 파일을 확인하세요."
    );
    process.exit(1);
  }

  logger.info("=== 나라장터 입찰공고정보 수집 시작 ===");
  const fetcher = createPpsFetcher(apiKey);
  await runCollector(fetcher);
  logger.info("=== 나라장터 입찰공고정보 수집 종료 ===");
}

main().catch((err) => {
  logger.error("스크립트 실행 실패:", err);
  process.exit(1);
});
