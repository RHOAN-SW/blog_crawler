import { test } from "node:test";
import assert from "node:assert/strict";
import { articleCandidates,rankArticleKeywords } from "../lib/articleKeywords";
import { articleKeywordSheet,createArticleKeywordWorkbook } from "../lib/articleKeywordExport";
import { POST } from "../app/api/article-keywords/export/route";

test("40개 키워드를 XLSX로 만들되 API 미조회 검색량은 기존 후보도 빈 셀로 둠",async()=>{
  const article="카페를 새로 개업하면서 네이버 커넥트 카드단말기를 설치하려고 합니다. 기존 POS와 연동되는지, 무선 단말기를 구매할지 임대할지, 설치 비용과 카드 수수료 및 정산 주기를 비교해 봅니다.";
  const candidates=articleCandidates(article);
  const metrics=new Map(candidates.map(candidate=>[candidate.keyword,{blogDocuments:500,trendGrowth:20}]));
  const keywords=rankArticleKeywords(candidates,metrics);
  const result={keywords,metrics:{measured:40,searchTrends:40,volumeMeasured:0,volumeStatus:"not_configured"},notice:"검색광고 API에서 값을 받지 못한 키워드는 비워 둡니다."};
  const rows=articleKeywordSheet(result);
  assert.equal(rows.length,41);
  assert.equal(rows[0].length,11);
  const discoveredIndex=keywords.findIndex(item=>item.monthlySearches===null);
  assert.ok(discoveredIndex>=0);
  assert.equal(rows[discoveredIndex+1][5],null);
  assert.equal(rows[discoveredIndex+1][6],"미확인");
  assert.equal((rows[discoveredIndex+1][7] as {value:number}).value,500);
  assert.equal(rows[discoveredIndex+1][9],"검색량 확인 필요");
  assert.ok(keywords.some(item=>item.origin==="기존 후보"&&item.monthlySearches===null));
  const file=await createArticleKeywordWorkbook(result,new Date("2026-10-06T00:00:00Z"));
  assert.ok(file.length>2000);
  assert.equal(file.subarray(0,4).toString("hex"),"504b0304");
  const stale={...result,keywords:keywords.map((item,index)=>index===0?{...item,monthlySearches:5600,volumeSource:"미확인" as const}:item)};
  const rejected=await POST(new Request("https://localhost/api/article-keywords/export",{method:"POST",headers:{origin:"https://localhost",host:"localhost","Content-Type":"application/json"},body:JSON.stringify(stale)}));
  assert.equal(rejected.status,400);
});

test("잘못된 랭킹 자료는 다운로드 파일로 생성하지 않음",async()=>{
  const response=await POST(new Request("https://localhost/api/article-keywords/export",{method:"POST",headers:{origin:"https://localhost",host:"localhost","Content-Type":"application/json"},body:JSON.stringify({keywords:[]})}));
  assert.equal(response.status,400);
  assert.match((await response.json()).error,/결과/);
});
