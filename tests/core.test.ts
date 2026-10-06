import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeNaverUrl } from "../lib/urls";
import { kstToday,dateRange,validDate } from "../lib/dates";
import { classifyTopics } from "../lib/topicClassifier";
import { keywordFrequency } from "../lib/keywordAnalyzer";
import { filterPosts,contentIdeas } from "../lib/analysis";
import { toCsv } from "../lib/csv";
import { makeDemoData } from "../lib/demo";
test("모바일·PostView URL을 같은 URL로 통일",()=>{
  assert.equal(normalizeNaverUrl("http://m.blog.naver.com/test_blog/223123456?ref=search"),"https://blog.naver.com/test_blog/223123456");
  assert.equal(normalizeNaverUrl("https://blog.naver.com/PostView.naver?blogId=test_blog&logNo=223123456"),"https://blog.naver.com/test_blog/223123456");
  assert.equal(normalizeNaverUrl("https://m.blog.naver.com/PostList.naver?blogId=test_blog","blog"),"https://blog.naver.com/test_blog");
});
test("외부 URL·유사 도메인·자격증명·프로토콜을 거부",()=>{
  for(const url of ["https://blog.naver.com.evil.com/test/223","https://evil.com/test/223","javascript:alert(1)","https://user:pass@blog.naver.com/test/223","https://blog.naver.com:444/test/223","https://blog.naver.com/test/abc","not-url"]) assert.equal(normalizeNaverUrl(url),null);
});
test("KST 날짜 경계와 14일 기간 계산",()=>{
  assert.equal(kstToday(new Date("2026-09-28T15:00:00Z")),"2026-09-29");
  assert.deepEqual(dateRange(14,"2026-09-29"),{from:"2026-09-16",to:"2026-09-29"});
  assert.equal(validDate("2026-02-30"),false);assert.equal(validDate("2024-02-29"),true);
});
test("하나의 글에 여러 주제를 부여하고 요약도 분석",()=>{
  const topics=classifyTopics("Npay 커넥트 수수료 환급과 음식점 설치 방법","POS 연동 지원");
  assert.deepEqual(topics,["수수료 / 환급","POS 연동","음식점","설치방법"]);
  assert.deepEqual(classifyTopics("해당 없음"),["기타"]);
});
test("키워드는 글당 한 번 계산하고 불용어를 제거",()=>{
  const words=keywordFrequency(["네이버 커넥트 수수료 수수료 알아보기","수수료 환급 방법"]);
  assert.equal(words.find(w=>w.name==="수수료")?.count,2);
  assert.equal(words.some(w=>["방법","알아보기","네이버","커넥트"].includes(w.name)),false);
});
test("기간·검색어·주제·블로그·경쟁사·제목 필터를 동시에 적용",()=>{
  const d=makeDemoData(),p=d.posts[0];
  const result=filterPosts(d.posts,{from:p.post_date,to:p.post_date,title:"수수료",query:p.matched_queries[0],topic:"수수료 / 환급",blog:p.blog_url,competitorOnly:true},d.competitors);
  assert.equal(result.length,1);assert.equal(result[0].id,p.id);
  assert.equal(filterPosts(d.posts,{from:p.post_date,to:p.post_date,title:"없는 제목",query:"",topic:"",blog:"",competitorOnly:false},d.competitors).length,0);
});
test("자사 콘텐츠에서 이미 다룬 주제는 추천하지 않음",()=>{
  const d=makeDemoData();
  const ideas=contentIdeas(d.posts,d.ownPosts,d.competitors);
  assert.ok(ideas.length>0);assert.equal(ideas.some(i=>i.topic==="수수료 / 환급"),false);
  assert.ok(ideas.every(i=>i.blogs>0 && i.count>0));
});
test("CSV는 한글 BOM, 따옴표 이스케이프와 수식 주입 방지",()=>{
  const post={...makeDemoData().posts[0],title:'=HYPERLINK("evil")'};
  const csv=toCsv([post]);
  assert.ok(csv.startsWith("\uFEFF"));assert.ok(csv.includes('"\'=HYPERLINK(""evil"")"'));
  assert.ok(csv.includes("검색어 노출 수"));assert.ok(!csv.includes("조회수"));
});

test("세부 글감은 기존의 넓은 주제와 구분하고 동일 글감은 제외",()=>{
 const d=makeDemoData();
 assert.ok(contentIdeas(d.posts,d.ownPosts,d.competitors).some(i=>i.topic==="사업자 변경"));
 const own=[...d.ownPosts,{...d.ownPosts[0],id:"business-change",title:"네이버 커넥트 사업자 변경 안내",main_keyword:"사업자 변경",topics:["기타"]}];
 assert.equal(contentIdeas(d.posts,own,d.competitors).some(i=>i.topic==="사업자 변경"),false);
});
