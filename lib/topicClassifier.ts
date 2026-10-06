import { analysisText } from "./contentPolicy";
const rules: [string, RegExp][] = [
  ["수수료 / 환급", /수수료|환급|캐시백/iu], ["무료설치 / 무상지원", /무료\s*설치|무상|무료지원/iu],
  ["POS 연동", /\bpos\b|포스\s*(?:기|단말기|시스템)|(?<![가-힣])포스(?![가-힣])|연동/iu], ["카드단말기", /카드\s*단말기|카드리더/iu],
  ["리뷰", /리뷰|후기/iu], ["네이버 플레이스", /플레이스/iu], ["페이스사인", /페이스\s*사인|facesign/iu],
  ["얼굴결제", /얼굴\s*결제|안면\s*결제/iu], ["음식점", /음식점|식당|레스토랑|분식/iu],
  ["카페", /카페|커피/iu], ["병원", /병원|의원|치과/iu], ["학원", /학원|교습/iu],
  ["미용 / 뷰티", /미용|뷰티|네일|헤어/iu], ["설치방법", /설치\s*(방법|가이드|과정|전)|설치하기/iu],
  ["사용방법", /사용\s*(방법|법|가이드)|직원\s*교육/iu], ["오류 / 문제해결", /오류|문제\s*해결|장애|고장/iu],
  ["신규창업", /창업|신규\s*오픈|개업/iu], ["프로모션", /프로모션|이벤트|혜택/iu],
];
export function classifyTopics(title: string, description = ""): string[] {
  const text = analysisText(title) + " " + analysisText(description);
  const topics = rules.filter(([, regex]) => regex.test(text)).map(([topic]) => topic);
  return topics.length ? topics : ["기타"];
}
