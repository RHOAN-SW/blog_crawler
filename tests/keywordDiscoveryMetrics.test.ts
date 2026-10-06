import { afterEach,test } from "node:test";
import assert from "node:assert/strict";
import { POST } from "../app/api/keyword-discovery/metrics/route";

const originalFetch=globalThis.fetch;
const original=Object.fromEntries(["DEMO_MODE","NAVER_CLIENT_ID","NAVER_CLIENT_SECRET","NAVER_SEARCHAD_API_KEY","NAVER_SEARCHAD_SECRET_KEY","NAVER_SEARCHAD_CUSTOMER_ID"].map(name=>[name,process.env[name]]));
afterEach(()=>{
  globalThis.fetch=originalFetch;
  for(const [name,value] of Object.entries(original)){if(value===undefined)delete process.env[name];else process.env[name]=value;}
});

test("글감 추천 지표는 검색광고 API 검색량만 반환하고 과거 보관함 숫자로 대체하지 않음",async()=>{
  process.env.DEMO_MODE="false";
  process.env.NAVER_CLIENT_ID="hub-id";
  process.env.NAVER_CLIENT_SECRET="hub-secret";
  process.env.NAVER_SEARCHAD_API_KEY="ad-license";
  process.env.NAVER_SEARCHAD_SECRET_KEY="ad-secret";
  process.env.NAVER_SEARCHAD_CUSTOMER_ID="123";
  let searched=true;
  globalThis.fetch=async(input)=>{
    const url=new URL(String(input));
    if(url.hostname==="api.searchad.naver.com")return Response.json({keywordList:searched?[{relKeyword:"카드단말기",monthlyPcQcCnt:100,monthlyMobileQcCnt:200}]:[]});
    assert.equal(url.pathname,"/search/v1/blog");
    return Response.json({total:600});
  };
  const request=()=>new Request("https://localhost/api/keyword-discovery/metrics",{method:"POST",headers:{origin:"https://localhost",host:"localhost","Content-Type":"application/json"},body:JSON.stringify({keywords:["카드단말기"]})});
  const response=await POST(request());
  assert.equal(response.status,200);
  const result=await response.json();
  assert.deepEqual(result.results,[{keyword:"카드단말기",monthlySearches:300,blogDocuments:600}]);
  searched=false;
  const missing=await POST(request());
  assert.equal(missing.status,200);
  assert.deepEqual((await missing.json()).results,[{keyword:"카드단말기",monthlySearches:null,blogDocuments:600}]);
});
