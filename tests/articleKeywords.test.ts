import {test,afterEach} from "node:test";
import assert from "node:assert/strict";
import seeds from "../data/keyword-seeds.json";
import {articleCandidates,gradeRatio,rankArticleKeywords,searchAdRelatedCandidates} from "../lib/articleKeywords";
import {recommendArticleKeywords} from "../lib/articleKeywordMetrics";
const article="카페를 새로 개업하면서 네이버 커넥트 카드단말기를 설치하려고 합니다. 기존 POS와 연동되는지, 무선 단말기를 구매할지 임대할지, 설치 비용과 약정 기간, 카드 수수료 및 정산 주기를 비교해 봅니다.";
const originalFetch=globalThis.fetch;
afterEach(()=>{globalThis.fetch=originalFetch;});

test("기존 36개는 키워드 이름만 후보로 사용하고 검색량은 가져오지 않음",()=>{
 assert.equal(seeds.rows.length,36);
 assert.deepEqual([gradeRatio(0),gradeRatio(9.99),gradeRatio(10),gradeRatio(49.99),gradeRatio(50),gradeRatio(null)],
  ["황금 키워드","황금 키워드","중간 키워드","중간 키워드","경쟁 키워드","검색량 확인 필요"]);
 const candidates=articleCandidates(article);
 assert.equal(candidates.filter(item=>item.origin==="기존 후보").length,36);
 assert.ok(candidates.every(item=>item.monthlySearches===null&&item.volumeSource==="미확인"));
 assert.ok(candidates.some(item=>item.keyword==="PAYCONNECT"&&item.monthlySearches===null));
 assert.ok(candidates.some(item=>item.keyword==="네이버커넥트단말기"&&item.relevance>=50));
 assert.ok(candidates.some(item=>item.keyword==="카페 무선 카드단말기"&&item.origin==="연관 발굴"));
});
test("글 적합도와 측정 가능한 등급으로 40개를 추천하고 새 키워드 검색량을 만들지 않음",()=>{
 const candidates=articleCandidates(article),metrics=new Map(candidates.map(item=>[item.keyword,{blogDocuments:1000,trendGrowth:null}]));
 const ranked=rankArticleKeywords(candidates,metrics);
 assert.equal(ranked.length,40);assert.equal(new Set(ranked.map(item=>item.keyword)).size,40);
 assert.ok(ranked.filter(item=>item.origin!=="기존 후보").length>=4);
 assert.ok(ranked.every(item=>item.monthlySearches===null&&item.competitionRatio===null&&item.grade==="검색량 확인 필요"));
 assert.ok(ranked.every((item,index)=>item.rank===index+1));
});
test("검색광고 연관어에서 짧고 단말기 판매에 맞는 정확한 검색량 후보를 추가",()=>{
 const existing=articleCandidates(article);
 const related=searchAdRelatedCandidates(article,[
  {keyword:"카드단말기대여",monthlySearches:1120},
  {keyword:"카드단말기설치",monthlySearches:290},
  {keyword:"마산카드단말기",monthlySearches:20},
  {keyword:"토스포스설치",monthlySearches:30},
  {keyword:"카드단말기용지",monthlySearches:480},
  {keyword:"비사업자카드단말기",monthlySearches:2680},
  {keyword:"쇼핑쿠폰",monthlySearches:5000},
  {keyword:"카드단말기구매비용비교",monthlySearches:300},
 ],existing);
 assert.ok(related.some(item=>item.keyword==="카드단말기대여"&&item.volumeSource==="검색광고 API"));
 assert.ok(related.some(item=>item.keyword==="카드단말기설치"));
 assert.ok(!related.some(item=>["마산카드단말기","토스포스설치","카드단말기용지","비사업자카드단말기","쇼핑쿠폰"].includes(item.keyword)));
 assert.ok(related.every(item=>[...item.keyword].length<=10));
});
test("적합하고 검색량이 확인된 후보가 40개면 통계 없는 표현을 랭킹에 넣지 않음",()=>{
 const candidates=articleCandidates(article);
 const measured=candidates.map((item,index)=>index<40?{...item,monthlySearches:100,volumeSource:"검색광고 API" as const}:item);
 const metrics=new Map(measured.map(item=>[item.keyword,{blogDocuments:500,trendGrowth:null}]));
 const ranked=rankArticleKeywords(measured,metrics);
 assert.equal(ranked.length,40);
 assert.ok(ranked.every(item=>item.monthlySearches!==null));
});
test("검색광고 검색량이 확인된 40개는 블로그 문서 수가 없거나 0이어도 모두 랭킹에 포함",()=>{
 const candidates=articleCandidates(article);
 assert.ok(candidates.length>40);
 const withVolumes=candidates.map((item,index)=>index<40?{...item,monthlySearches:100+index,volumeSource:"검색광고 API" as const}:item);
 const metrics=new Map(withVolumes.map((item,index)=>[item.keyword,{blogDocuments:index%2===0?null:0,trendGrowth:null}]));
 const ranked=rankArticleKeywords(withVolumes,metrics);
 assert.equal(ranked.length,40);
 assert.ok(ranked.every(item=>item.volumeSource==="검색광고 API"&&item.monthlySearches!==null));
 assert.ok(ranked.some(item=>item.blogDocuments===null));
 assert.ok(ranked.some(item=>item.blogDocuments===0));
 assert.ok(ranked.filter(item=>item.blogDocuments===null).every(item=>item.grade==="문서 수 확인 필요"));
});
test("검색광고 검색량이 확인된 후보를 미확인 후보보다 앞에 배치",()=>{
 const candidates=articleCandidates(article);
 const withVolumes=candidates.map((item,index)=>index<8?{...item,monthlySearches:100+index,volumeSource:"검색광고 API" as const}:item);
 const metrics=new Map(withVolumes.map(item=>[item.keyword,{blogDocuments:500,trendGrowth:null}]));
 const ranked=rankArticleKeywords(withVolumes,metrics);
 assert.equal(ranked.length,40);
 assert.ok(ranked.slice(0,8).every(item=>item.volumeSource==="검색광고 API"));
 assert.ok(ranked.slice(8).every(item=>item.monthlySearches===null));
});
test("블로그 문서가 0건이면 월간 검색량이 있어도 황금 키워드로 표시하지 않음",()=>{
 const candidate={...articleCandidates(article).find(item=>item.keyword==="PAYCONNECT")!,monthlySearches:100,volumeSource:"검색광고 API" as const};
 const ranked=rankArticleKeywords([candidate],new Map([[candidate.keyword,{blogDocuments:0,trendGrowth:null}]]));
 assert.equal(ranked[0].grade,"검색 의도 확인");
});
test("NAVER 블로그 총 문서 수와 DataLab 상대 추이를 실제 호출해 결과에 연결",async()=>{
 process.env.NAVER_CLIENT_ID="test";process.env.NAVER_CLIENT_SECRET="test";
 let blogs=0,trends=0;
 globalThis.fetch=async(input,init)=>{
  const url=new URL(String(input));
  assert.equal(new Headers(init?.headers).get("X-NCP-APIGW-API-KEY-ID"),"test");
  if(url.pathname==="/search/v1/blog"){
    blogs++;assert.equal(url.searchParams.get("display"),"1");
    return Response.json({total:500,items:[]});
  }
  assert.equal(url.pathname,"/search-trend/v1/search");trends++;
  const request=JSON.parse(String(init?.body));assert.ok(request.keywordGroups.length<=5);
  return Response.json({results:request.keywordGroups.map((group:{groupName:string})=>({title:group.groupName,data:[{period:"2026-10-01",ratio:20}]}))});
 };
 const result=await recommendArticleKeywords(article);
 assert.equal(result.keywords.length,40);assert.equal(result.metrics.measured,40);
 assert.ok(blogs>=40);assert.equal(trends,8);
 assert.equal(result.metrics.volumeMeasured,0);
 assert.ok(result.keywords.every(item=>item.monthlySearches===null&&item.competitionRatio===null&&item.grade==="검색량 확인 필요"));
});
test("글 키워드 40선은 검색광고 API가 반환한 값만 검색량과 경쟁 비율에 반영",async()=>{
 const names=["NAVER_SEARCHAD_API_KEY","NAVER_SEARCHAD_SECRET_KEY","NAVER_SEARCHAD_CUSTOMER_ID"] as const;
 const previous=names.map(name=>process.env[name]);
 process.env.NAVER_CLIENT_ID="hub-id";process.env.NAVER_CLIENT_SECRET="hub-secret";
 process.env.NAVER_SEARCHAD_API_KEY="ad-license";process.env.NAVER_SEARCHAD_SECRET_KEY="ad-secret";process.env.NAVER_SEARCHAD_CUSTOMER_ID="123";
 try{
  globalThis.fetch=async(input,init)=>{
   const url=new URL(String(input));
   if(url.hostname==="api.searchad.naver.com")return Response.json({keywordList:[{relKeyword:"카드단말기",monthlyPcQcCnt:100,monthlyMobileQcCnt:200}]});
   if(url.pathname==="/search/v1/blog")return Response.json({total:600});
   const body=JSON.parse(String(init?.body));
   return Response.json({results:body.keywordGroups.map((group:{groupName:string})=>({title:group.groupName,data:[]}))});
  };
  const result=await recommendArticleKeywords(article);
  const card=result.keywords.find(item=>item.keyword==="카드단말기")!;
  assert.equal(card.monthlySearches,300);
  assert.equal(card.volumeSource,"검색광고 API");
  assert.equal(card.competitionRatio,2);
  assert.equal(result.metrics.volumeMeasured,1);
  assert.ok(result.keywords.filter(item=>item.keyword!=="카드단말기").every(item=>item.monthlySearches===null&&item.competitionRatio===null));
 }finally{names.forEach((name,index)=>{if(previous[index]===undefined)delete process.env[name];else process.env[name]=previous[index];});}
});
