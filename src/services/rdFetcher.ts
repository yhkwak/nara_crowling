import type { Fetcher } from "../lib/types.js";

// ────────────────────────────────────────────────────
// 국가R&D 과제검색 API (NTIS)
// API 문서: https://www.ntis.go.kr → OpenAPI
// 환경변수: RD_API_KEY
// ────────────────────────────────────────────────────

// TODO: 구현 시 아래 항목 작업
// 1. fetchPage — NTIS API 페이지네이션 호출
// 2. getSourceId — 과제고유번호 추출
// 3. refine — raw → SupportProgramRow 변환

export function createRdFetcher(_apiKey: string): Fetcher {
  return {
    source: "ntis",
    rawTable: "raw_ntis",

    async fetchPage(_page: number, _pageSize: number) {
      // TODO: NTIS API 호출 구현
      throw new Error("국가R&D fetcher 미구현");
    },

    getSourceId(_item: unknown): string {
      // TODO: 과제고유번호 추출
      throw new Error("국가R&D fetcher 미구현");
    },

    refine(_item: unknown) {
      // TODO: raw → SupportProgramRow 변환
      throw new Error("국가R&D fetcher 미구현");
    },
  };
}
