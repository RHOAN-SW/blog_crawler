import { test } from "node:test";
import assert from "node:assert/strict";
import { keywordOpportunities, keywordTagForTopic } from "../lib/keywordOpportunities";
import { savedKeywordSnapshot, savedKeywordSuggestions, keywordTagLength, MAX_KEYWORD_TAG_LENGTH } from "../lib/savedKeywordDiscovery";
import { makeDemoData } from "../lib/demo";

test("제공된 36개는 후보명만 활용하고 정적 검색량을 추천에 반영하지 않음",()=>{
  assert.equal(savedKeywordSnapshot.rows.length,36);
  const connect=savedKeywordSnapshot.rows.find(row=>row.keyword==="네이버커넥트단말기")!;
  assert.ok(connect);
  const suggested=savedKeywordSuggestions("단말기").find(row=>row.keyword===connect.keyword)!;
  assert.equal(suggested.monthlySearches,null);
  assert.equal(suggested.blogDocuments,null);
  assert.equal(suggested.competitionRatio,null);
});

test("넓은 주제에서 VAN 관련 연관어를 펼치고 모든 추천 태그를 10자 이내로 제한",()=>{
  const terms=savedKeywordSuggestions("단말기");
  assert.ok(terms.some(item=>item.keyword==="네이버커넥트단말기"));
  assert.ok(terms.some(item=>item.keyword==="카드단말기"));
  assert.ok(terms.every(item=>keywordTagLength(item.keyword)<=MAX_KEYWORD_TAG_LENGTH));
  assert.ok(!savedKeywordSuggestions().some(item=>item.keyword==="네이버페이"||item.keyword==="결제수단"));
  const report=keywordOpportunities(makeDemoData().posts,[],"2026-10-01");
  assert.ok(report.candidates.every(item=>keywordTagLength(item.keyword)<=MAX_KEYWORD_TAG_LENGTH));
  assert.ok(keywordTagLength(keywordTagForTopic("네이버 커넥트 아주 긴 새 주제"))<=MAX_KEYWORD_TAG_LENGTH);
});

test("API 검색량과 문서 수가 모두 있을 때만 비율을 계산하고 문서 0건은 황금으로 취급하지 않음",()=>{
  const connect=savedKeywordSuggestions("단말기").find(item=>item.keyword==="네이버커넥트단말기")!;
  assert.equal(connect.competitionRatio,null);
  assert.equal(connect.grade,"검색량 확인 필요");
  const zero=savedKeywordSuggestions("커넥트",new Map([["PAYCONNECT",{monthlySearches:60,blogDocuments:0}]])).find(item=>item.keyword==="PAYCONNECT")!;
  assert.equal(zero.competitionRatio,null);
  assert.equal(zero.grade,"문서 0건 확인");
  const updated=savedKeywordSuggestions("커넥트",new Map([["네이버커넥트단말기",{monthlySearches:5000,blogDocuments:11200}]]))
    .find(item=>item.keyword==="네이버커넥트단말기")!;
  assert.equal(updated.blogDocuments,11200);
  assert.equal(updated.competitionRatio,11200/5000);
  assert.equal(updated.source,"네이버 API");
});
