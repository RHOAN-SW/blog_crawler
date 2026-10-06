import { afterEach,test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { monthlySearchVolumes,searchAdHeaders } from "../lib/naverSearchAd";

const previous={
  apiKey:process.env.NAVER_SEARCHAD_API_KEY,
  secret:process.env.NAVER_SEARCHAD_SECRET_KEY,
  customer:process.env.NAVER_SEARCHAD_CUSTOMER_ID,
};
const originalFetch=globalThis.fetch;
afterEach(()=>{
  globalThis.fetch=originalFetch;
  for(const [name,value] of Object.entries({NAVER_SEARCHAD_API_KEY:previous.apiKey,NAVER_SEARCHAD_SECRET_KEY:previous.secret,NAVER_SEARCHAD_CUSTOMER_ID:previous.customer})){
    if(value===undefined)delete process.env[name];else process.env[name]=value;
  }
});

test("검색광고 API 키가 없으면 임의의 월간검색량을 만들지 않음",async()=>{
  delete process.env.NAVER_SEARCHAD_API_KEY;
  delete process.env.NAVER_SEARCHAD_SECRET_KEY;
  delete process.env.NAVER_SEARCHAD_CUSTOMER_ID;
  const result=await monthlySearchVolumes(["카드단말기"]);
  assert.equal(result.status,"not_configured");
  assert.equal(result.volumes.size,0);
});

test("검색광고 API에 서명해 PC·모바일 정확한 검색량만 합산하고 관련어는 제외",async()=>{
  process.env.NAVER_SEARCHAD_API_KEY="license";
  process.env.NAVER_SEARCHAD_SECRET_KEY="secret";
  process.env.NAVER_SEARCHAD_CUSTOMER_ID="123";
  const expected=createHmac("sha256","secret").update("12345.GET./keywordstool").digest("base64");
  assert.equal(searchAdHeaders("12345")["X-Signature"],expected);
  const calls:string[]=[];
  globalThis.fetch=async(input,init)=>{
    const url=new URL(String(input));
    assert.equal(url.origin,"https://api.searchad.naver.com");
    assert.equal(url.pathname,"/keywordstool");
    assert.equal(url.searchParams.get("includeHintKeywords"),"1");
    assert.equal(url.searchParams.get("showDetail"),"1");
    assert.ok(new Headers(init?.headers).get("X-Signature"));
    calls.push(url.searchParams.get("hintKeywords")!);
    return Response.json({keywordList:[
      {relKeyword:"카드단말기",monthlyPcQcCnt:100,monthlyMobileQcCnt:250},
      {relKeyword:"네이버커넥트",monthlyPcQcCnt:"< 10",monthlyMobileQcCnt:20},
      {relKeyword:"관련없는키워드",monthlyPcQcCnt:999999,monthlyMobileQcCnt:999999},
    ]});
  };
  const result=await monthlySearchVolumes(["카드 단말기","네이버커넥트"]);
  assert.equal(result.status,"connected");
  assert.deepEqual(calls,["카드단말기,네이버커넥트"]);
  assert.equal(result.volumes.get("카드 단말기"),350);
  assert.equal(result.volumes.has("네이버커넥트"),false);
  assert.equal(result.unavailable.has("네이버커넥트"),true);
  assert.ok(result.related.some(item=>item.keyword==="카드단말기"&&item.monthlySearches===350));
});

test("검색광고 인증 오류가 나면 남은 배치를 호출하지 않음",async()=>{
  process.env.NAVER_SEARCHAD_API_KEY="license";
  process.env.NAVER_SEARCHAD_SECRET_KEY="secret";
  process.env.NAVER_SEARCHAD_CUSTOMER_ID="123";
  let requests=0;
  globalThis.fetch=async()=>{requests++;return new Response("forbidden",{status:403});};
  const result=await monthlySearchVolumes(["첫번째","두번째","세번째","네번째","다섯번째","여섯번째"]);
  assert.equal(result.status,"failed");
  assert.equal(requests,1);
});
