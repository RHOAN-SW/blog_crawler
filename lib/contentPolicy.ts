// 제휴 광고 고지 자체는 결제 단말기 관련성이나 수수료 주제의 근거가 아닙니다.
const affiliate = /(?:쇼핑|여행|브랜드)\s*커넥트|쿠팡\s*파트너스/iu;
const payment = /(?:네이버(?:페이)?|n\s*pay)\s*커넥트|pay\s*connect|페이스\s*사인|face\s*sign|카드\s*(?:단말기|리더|수수료)|결제\s*단말기|포스\s*(?:기|단말기|시스템)|\bpos\b/iu;

export function analysisText(text: string): string {
  return text.split(/(?<=[.!?。])|[\r\n]+/u).filter(sentence =>
    !(affiliate.test(sentence) && /활동|제휴|수수료|제공받|지급받/iu.test(sentence))
  ).join(" ");
}

export function isExcludedContent(title: string, description = ""): boolean {
  const text = title + " " + description;
  if (!affiliate.test(text)) return false;
  // 실제 단말기 리뷰에 제휴 고지가 함께 있는 경우 관련 본문은 유지합니다.
  return !payment.test(analysisText(title) + " " + analysisText(description));
}
