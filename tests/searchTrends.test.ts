import { test,afterEach } from "node:test";
import assert from "node:assert/strict";
import { getSearchTrends } from "../lib/searchTrends";
import { kstToday,shiftDate } from "../lib/dates";
const originalFetch=globalThis.fetch;
afterEach(()=>{globalThis.fetch=originalFetch;});
test("DataLab 상대지수의 같은 키워드 7일 증감률을 계산하며 빈 결과를 급상승으로 만들지 않음",async()=>{
 process.env.NAVER_CLIENT_ID="test";process.env.NAVER_CLIENT_SECRET="test";
 globalThis.fetch=async(input,init)=>{
  assert.equal(new URL(String(input)).pathname,"/search-trend/v1/search");
  const body=JSON.parse(String(init?.body));assert.equal(body.keywordGroups.length,2);assert.equal(body.endDate,shiftDate(kstToday(),-1));
  return Response.json({results:[{title:"네이버 커넥트 정산",data:Array.from({length:14},(_,i)=>({period:shiftDate(kstToday(),i-14),ratio:i<7?10:20}))},{title:"네이버 커넥트 해지",data:[]}]});
 };
 const result=await getSearchTrends(["네이버 커넥트 정산","네이버 커넥트 해지"]);
 assert.equal(result.results[0].growth,100);assert.equal(result.results[0].status,"rising");assert.equal(result.results[1].growth,null);assert.equal(result.results[1].status,"insufficient");
});
test("DataLab 미연결과 호출 제한을 구분하고 인증 정보를 노출하지 않음",async()=>{
 for(const [status,pattern] of [[401,/연결/],[403,/연결/],[429,/한도/]] as const){
  globalThis.fetch=async()=>new Response("",{status});
  await assert.rejects(getSearchTrends(["네이버 커넥트 정산"]),pattern);
 }
});
