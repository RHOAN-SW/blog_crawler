import { test,afterEach } from "node:test";
import assert from "node:assert/strict";
import { searchNaver,stripHtml } from "../lib/naver";
import { AppError } from "../lib/errors";
import { validSession, createSession, matchesPassword, assertSameOrigin } from "../lib/auth";
const originalFetch=globalThis.fetch;
afterEach(()=>{globalThis.fetch=originalFetch;});
test("HTML 강조 태그와 엔티티를 일반 텍스트로 변환",()=>{assert.equal(stripHtml('<b>커넥트</b> &amp; &#54620; &quot;결제&quot;'), '커넥트 & 한 "결제"');});
test("API HUB 주소·인증 헤더로 요청 후 네이버 글만 날짜 필터·정규화·중복 제거",async()=>{
 process.env.NAVER_CLIENT_ID="test";process.env.NAVER_CLIENT_SECRET="test";
 globalThis.fetch=async(input,init)=>{
  const url=new URL(String(input));assert.equal(url.hostname,"naverapihub.apigw.ntruss.com");assert.equal(url.pathname,"/search/v1/blog");assert.equal(url.searchParams.get("sort"),"date");assert.equal(url.searchParams.get("display"),"100");assert.equal(url.searchParams.get("format"),"json");
  const headers=init?.headers as Record<string,string>;
  assert.equal(headers["X-NCP-APIGW-API-KEY-ID"],"test");assert.equal(headers["X-NCP-APIGW-API-KEY"],"test");assert.equal(headers["X-Naver-Client-Secret"],undefined);
  const item={title:"<b>네이버 커넥트</b> 수수료",description:"요약",bloggername:"테스트",bloggerlink:"https://blog.naver.com/test",postdate:"20260929"};
  return Response.json({total:5,items:[{...item,link:"https://m.blog.naver.com/test/223123"},{...item,link:"https://blog.naver.com/test/223123?ref=1"},{...item,link:"https://tistory.com/223123"},{...item,postdate:"20250901",link:"https://blog.naver.com/test/223124"},{...item,postdate:"20261001",link:"https://blog.naver.com/test/223125"}]});
 };
 const result=await searchNaver("커넥트","2026-09-16","2026-09-29");
 assert.equal(result.posts.length,1);assert.equal(result.posts[0].post_url,"https://blog.naver.com/test/223123");assert.equal(result.posts[0].query_hit_count,1);assert.deepEqual(result.posts[0].matched_queries,["커넥트"]);
});
test("페이지가 모두 기간 내라면 다음 100건을 검색",async()=>{
 let calls=0;globalThis.fetch=async()=>{calls++;const count=calls===1?100:1;return Response.json({total:101,items:Array.from({length:count},(_,i)=>({title:"커넥트",description:"",bloggername:"test",bloggerlink:"https://blog.naver.com/test",postdate:"20260929",link:"https://blog.naver.com/test/"+(calls*1000+i)}))});};
 const result=await searchNaver("커넥트","2026-09-16","2026-09-29");assert.equal(calls,2);assert.equal(result.posts.length,101);
});

test("제휴 글 100건을 제외한 뒤에도 다음 페이지의 실제 단말기 글을 수집",async()=>{
 let calls=0;
 globalThis.fetch=async()=>{
  calls++;
  const base={bloggername:"test",bloggerlink:"https://blog.naver.com/test",postdate:"20260929"};
  return Response.json({total:101,items:calls===1
   ?Array.from({length:100},(_,i)=>({...base,title:"가을 여행 추천",description:"이 포스팅은 네이버 여행 커넥트 활동으로 수수료를 제공받습니다.",link:"https://blog.naver.com/test/"+(1000+i)}))
   :[{...base,title:"네이버 커넥트 POS 연동",description:"설치 가이드",link:"https://blog.naver.com/test/2000"}]});
 };
 const result=await searchNaver("네이버 커넥트","2026-09-16","2026-09-29");
 assert.equal(calls,2);assert.equal(result.posts.length,1);
 assert.equal(result.posts[0].post_url,"https://blog.naver.com/test/2000");
 assert.deepEqual(result.posts[0].detected_topics,["POS 연동","설치방법"]);
});
test("인증 실패와 rate limit을 한국어 오류로 반환",async()=>{
 for(const [status,pattern] of [[401,/인증/],[429,/한도/]] as const){
  globalThis.fetch=async()=>new Response("",{status});
  await assert.rejects(searchNaver("커넥트","2026-09-16","2026-09-29"),(e:unknown)=>e instanceof AppError && pattern.test(e.message));
 }
});
test("빈 API 응답은 빈 결과이며 잘못된 응답은 오류",async()=>{
 globalThis.fetch=async()=>Response.json({total:0,items:[]});assert.equal((await searchNaver("커넥트","2026-09-16","2026-09-29")).posts.length,0);
 globalThis.fetch=async()=>Response.json({unexpected:true});await assert.rejects(searchNaver("커넥트","2026-09-16","2026-09-29"),/응답 형식/);
});
test("서명된 로그인 쿠키를 검증하고 변조·만료를 거부",()=>{
 process.env.DASHBOARD_PASSWORD="test-password";process.env.AUTH_SECRET="test-auth-secret-long-enough-32-characters";
 assert.equal(matchesPassword("test-password"),true);assert.equal(matchesPassword("bad"),false);
 const token=createSession();assert.equal(validSession(token),true);assert.equal(validSession(token+"a"),false);assert.equal(validSession("1."+token.split(".")[1]),false);assert.equal(validSession(undefined),false);
});
test("다른 사이트에서 발생한 변경 요청 거부",()=>{
 assert.doesNotThrow(()=>assertSameOrigin(new Request("https://monitor.example/api/search",{headers:{origin:"https://monitor.example"}})));
 assert.throws(()=>assertSameOrigin(new Request("https://monitor.example/api/search",{headers:{origin:"https://evil.example"}})),/허용되지/);
});

test("프록시 내부 URL보다 실제 Host 헤더를 기준으로 Origin 검증",()=>{
 assert.doesNotThrow(()=>assertSameOrigin(new Request("http://localhost:3000/api/auth",{headers:{host:"127.0.0.1:3000",origin:"http://127.0.0.1:3000"}})));
 assert.throws(()=>assertSameOrigin(new Request("http://localhost:3000/api/auth",{headers:{host:"127.0.0.1:3000",origin:"https://evil.example"}})),/허용되지/);
});
