/**
 * 기업마당 지원사업정보 수집 스크립트
 *
 * 사용법:
 *   npx tsx scripts/fetch_bizinfo.ts
 *   npm run fetch:bizinfo
 */
import "dotenv/config";
import { collectBizinfo } from "../src/collectors/bizinfo.js";
import { logger } from "../src/lib/logger.js";

async function main() {
  const apiKey = process.env.BIZINFO_API_KEY;
  if (!apiKey) {
    logger.error(
      "BIZINFO_API_KEY 환경변수가 설정되지 않았습니다. .env 파일을 확인하세요."
    );
    process.exit(1);
  }

  logger.info("=== 기업마당 지원사업정보 수집 시작 ===");
  await collectBizinfo(apiKey);
  logger.info("=== 기업마당 지원사업정보 수집 종료 ===");
}

main().catch((err) => {
  logger.error("스크립트 실행 실패:", err);
  process.exit(1);
});
