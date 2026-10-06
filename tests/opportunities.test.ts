import { test } from "node:test";
import assert from "node:assert/strict";
import { keywordOpportunities } from "../lib/keywordOpportunities";
import { makeDemoData } from "../lib/demo";
import { shiftDate } from "../lib/dates";
import { isTerminalSalesContent } from "../lib/terminalSales";
const today="2026-10-01";
const fixture=makeDemoData().posts[0];
const post=(i:number,days:number,title="네이버 커넥트 사업자 변경",blog="writer"+i)=>({...fixture,id:String(i),post_url:`https://blog.naver.com/${blog}/${1000+i}`,blog_url:`https://blog.naver.com/${blog}`,title,description:"도입 전 안내",post_date:shiftDate(today,-days)});
const baseline=Array.from({length:6},(_,i)=>post(100+i,8+i,"네이버 커넥트 POS 연동"));
test("관련 글만 동일 길이의 완료된 7일 기간으로 비교하며 중복과 오늘 글 제외",()=>{
 const recent=[post(1,1),post(2,2),post(3,3,"네이버 커넥트 사업자 변경","writer1")];
 const report=keywordOpportunities([...baseline,...recent,recent[0],post(4,0),post(5,1,"카드단말기 일반 설치"),{...post(6,1,"네이버 쇼핑커넥트 추천"),description:"이 포스팅은 제휴 활동으로 수수료를 제공받습니다."}],[],today);
 assert.equal(report.relevantPosts,3);assert.equal(report.baselineReady,true);
 const item=report.candidates.find(item=>item.topic==="사업자 변경")!;
 assert.equal(item.current,3);assert.equal(item.previous,0);assert.equal(item.trend,"new");assert.equal(item.growth,null);assert.equal(item.blogs,2);assert.equal(item.sparse,true);
});
test("자료 부족과 단일 블로그 반복 글은 저경쟁이나 급상승으로 추천하지 않음",()=>{
 const posts=Array.from({length:10},(_,i)=>post(i,1,"네이버 커넥트 사업자 변경","one"));
 const item=keywordOpportunities([...baseline,...posts],[],today).candidates[0];
 assert.equal(item.trend,"insufficient");assert.equal(item.sparse,false);
 const noBaseline=keywordOpportunities([post(1,1),post(2,2),post(3,3)],[],today);
 assert.equal(noBaseline.baselineReady,false);assert.equal(noBaseline.candidates[0].growth,null);assert.equal(noBaseline.candidates[0].trend,"insufficient");
});
test("성장률은 직전 기간과 비교하며 자사 글·자사 블로그를 구분",()=>{
 const posts=[...baseline,post(90,8),post(91,9),post(1,1),post(2,2),post(3,3),post(4,4),post(5,2,"네이버 커넥트 사업자 변경","ours")];
 const own=[{id:"own",title:"네이버 커넥트 사업자 변경 안내",url:"https://blog.naver.com/ours/999",post_date:"2026-09-01",main_keyword:"사업자 변경",topics:[],created_at:"2026-09-01T00:00:00Z"}];
 const item=keywordOpportunities(posts,own,today).candidates.find(item=>item.topic==="사업자 변경")!;
 assert.equal(item.current,4);assert.equal(item.previous,2);assert.equal(item.growth,100);assert.equal(item.trend,"rising");assert.equal(item.covered,true);assert.equal(item.blogs,4);
});
test("브랜드가 나와도 소비자 축제·예매·쿠폰을 단말기 판매 글감으로 추천하지 않음",()=>{
 const consumer=Array.from({length:10},(_,i)=>({...post(i,1,"넾페스타 예매 일정과 쿠폰"),description:"네이버 커넥트 매장에서 페이스사인으로 결제하면 혜택"}));
 const report=keywordOpportunities([...baseline,...consumer],[],today);
 assert.equal(report.relevantPosts,0);assert.equal(report.candidates.length,0);
 assert.equal(isTerminalSalesContent("페이스사인 얼굴결제 사용 후기","소비자가 할인받는 방법"),false);
 assert.equal(isTerminalSalesContent("네이버 커넥트 포스팅","넾페스타 티켓"),false);
});
test("도입 견적·구매·임대 정보글에는 고객 질문과 검증 가능한 상담 목차 포함",()=>{
 const report=keywordOpportunities([...baseline,post(1,1,"네이버 커넥트 단말기 설치 비용과 임대 견적")],[],today);
 const item=report.candidates.find(item=>item.topic==="설치 비용")!;
 assert.equal(item.stage,"도입·구매 검토");assert.match(item.question,/비용/);
 assert.match(item.cta,/POS 모델/);assert.equal(item.outline.length,4);
 assert.ok(report.candidates.some(item=>item.topic==="구매와 임대"));
 assert.equal(isTerminalSalesContent("네이버 커넥트 단말기 설치, 매장 쿠폰 운영 준비","가맹점 POS 호환 점검"),true);
 assert.equal(isTerminalSalesContent("네이버 커넥트 매장 도입","얼굴결제 직원 교육"),true);
});
