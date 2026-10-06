import { test } from "node:test";
import assert from "node:assert/strict";
import { isExcludedContent } from "../lib/contentPolicy";
import { classifyTopics } from "../lib/topicClassifier";

test("쇼핑·여행·브랜드 제휴 글은 단말기 관련 근거가 없으면 제외",()=>{
  for(const brand of ["쇼핑 커넥트","쇼핑커넥트","여행 커넥트","브랜드커넥트"]){
    assert.equal(isExcludedContent("가을 여행 추천",`이 포스팅은 네이버 ${brand} 활동의 일환으로 판매 발생 시 수수료를 제공받습니다.`),true);
  }
  assert.equal(isExcludedContent("쿠팡 파트너스 청소기 추천","판매 수수료 지급"),true);
});
test("결제 단말기 리뷰와 사용자 추가 검색어의 정상 글은 유지",()=>{
  assert.equal(isExcludedContent("네이버 커넥트 설치 후기","쇼핑커넥트 활동으로 수수료를 제공받습니다."),false);
  assert.equal(isExcludedContent("무선 카드단말기 비교","쿠팡 파트너스 활동으로 수수료를 제공받습니다."),false);
  assert.equal(isExcludedContent("카드수수료 환급 신청 방법"),false);
  assert.equal(isExcludedContent("PAYCONNECT 사용 안내"),false);
});
test("포스팅·포스터·포스코·영문 부분 문자열은 POS가 아님",()=>{
  for(const title of ["오늘의 포스팅","포스터 제작","포스코 소식","post position deposit"])
    assert.equal(classifyTopics(title).includes("POS 연동"),false,title);
  for(const title of ["POS 연동","POS기 설치","포스기 설치","포스 시스템","포스 연동"])
    assert.equal(classifyTopics(title).includes("POS 연동"),true,title);
});
test("유지한 단말기 리뷰에서도 제휴 고지는 수수료 주제로 세지 않음",()=>{
  const disclosure="이 포스팅은 네이버 쇼핑커넥트 활동의 일환으로 수수료를 제공받습니다.";
  assert.equal(classifyTopics("네이버 커넥트 설치 후기",disclosure).includes("수수료 / 환급"),false);
  assert.equal(classifyTopics("카드 수수료 환급 안내",disclosure).includes("수수료 / 환급"),true);
});
