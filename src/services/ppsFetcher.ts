import type { Fetcher } from "../lib/types.js";

// ────────────────────────────────────────────────────
// 나라장터 입찰공고정보 서비스 (조달청 OpenAPI)
// API 문서: https://www.data.go.kr → "나라장터 입찰공고정보서비스"
// 환경변수: PPS_API_KEY
// ────────────────────────────────────────────────────

// TODO: 구현 시 아래 항목 작업
// 1. fetchPage — 나라장터 API 페이지네이션 호출
// 2. getSourceId — 입찰공고번호(bidNtceNo) 추출
// 3. refine — raw → SupportProgramRow 변환

export function createPpsFetcher(_apiKey: string): Fetcher {
  return {
    source: "g2b",
    rawTable: "raw_g2b",

    async fetchPage(_page: number, _pageSize: number) {
      // TODO: 나라장터 API 호출 구현
      throw new Error("나라장터 fetcher 미구현");
    },

    getSourceId(_item: unknown): string {
      // TODO: 입찰공고번호 추출
      throw new Error("나라장터 fetcher 미구현");
    },

    refine(_item: unknown) {
      // TODO: raw → SupportProgramRow 변환
      throw new Error("나라장터 fetcher 미구현");
    },
  };
}
