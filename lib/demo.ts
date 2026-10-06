import { DEFAULT_QUERIES } from "./constants";
import { classifyTopics } from "./topicClassifier";
import { extractKeywords } from "./keywordAnalyzer";
import { kstToday, shiftDate } from "./dates";
import type { DashboardData, BlogPost } from "./types";
export function makeDemoData(): DashboardData {
  const today=kstToday(), now=new Date().toISOString();
  const blogs=[["신신엠엔씨","demo_shinshin"],["위아즈","demo_weaz"],["우리포스","demo_wooripos"],["스마트 결제연구소","demo_smartpay"],["바른시스템","demo_barun"],["카페 사장일기","demo_cafediary"],["이음포스","demo_ieum"],["소상공인 노트","demo_business"]];
  const titles=[
    "네이버 커넥트 수수료 환급, 사장님이 꼭 알아야 할 조건",
    "Npay 커넥트 무료설치부터 무상지원까지 한 번에 알아보기",
    "기존 POS와 네이버 커넥트 연동하는 방법",
    "카페에 네이버페이 커넥트 설치한 솔직한 리뷰",
    "페이스사인 얼굴결제, 매장에서 직접 사용해 봤어요",
    "음식점 네이버 커넥트 카드단말기 설치 가이드",
    "네이버 플레이스 리뷰와 결제를 연결하는 방법",
    "신규창업 사장님을 위한 Npay 커넥트 프로모션",
    "병원 네이버 커넥트 도입 전 체크할 결제 기능",
    "네이버 커넥트 사용방법, 설치 후 직원 교육 가이드",
    "네이버페이 단말기 결제 오류 문제해결 가이드",
    "미용실 네이버 커넥트 무료설치와 수수료 혜택",
    "Npay 커넥트 수수료 환급 신청과 정산 안내",
    "학원 카드단말기, 네이버 커넥트로 결제 관리하기",
    "네이버 커넥트 페이스사인 등록부터 얼굴결제까지",
    "카페 POS 연동과 네이버 커넥트 설치방법 정리",
    "네이버 커넥트 사업자 변경, 매장 양도 시 확인할 사항",
    "음식점 무료설치 지원과 네이버페이 결제 리뷰",
  ];
  const posts: BlogPost[]=[];
  for(let day=0;day<60;day++) {
    const n=day<14?[8,10,6,11,7,9,8,12,6,10,9,7,11,12][day]:4+(day%4);
    for(let j=0;j<n;j++) {
      const idx=(day*5+j)%titles.length,blog=blogs[(day+j)%blogs.length];
      const title=titles[idx]+(day>2?" · "+["매장 운영 팁","실무 체크리스트","도입 사례"][j%3]:"");
      const queries=DEFAULT_QUERIES.slice(0,1+((j+day)%5));
      const seen=shiftDate(today,-day)+"T00:00:00.000Z";
      posts.push({id:"demo-"+day+"-"+j,title,description:"이 글은 화면과 분석 기능을 확인하기 위한 예시 데이터입니다. 네이버 커넥트 관련 매장 운영 사례와 도입 시 확인할 내용을 정리했습니다. 실제 API 검색 결과가 아닙니다.",post_date:shiftDate(today,-day),blog_name:blog[0],blog_url:"https://blog.naver.com/"+blog[1],post_url:"https://blog.naver.com/"+blog[1]+"/"+(223000000000+day*100+j),matched_queries:queries,query_hit_count:queries.length,detected_topics:classifyTopics(title),detected_keywords:extractKeywords(title),first_seen_at:seen,last_seen_at:seen,created_at:seen});
    }
  }
  return {mode:"demo",posts,queries:DEFAULT_QUERIES.map((query,i)=>({id:"query-"+i,query,active:true,created_at:now})),
    competitors:blogs.slice(0,3).map((b,i)=>({id:"competitor-"+i,blog_name:b[0],blog_url:"https://blog.naver.com/"+b[1],memo:"데모 경쟁사",created_at:now})),
    ownPosts:[["네이버 커넥트란? 매장에 필요한 이유","커넥트",["카드단말기"]],["네이버 커넥트 수수료 환급 총정리","수수료",["수수료 / 환급"]],["설치 전 체크리스트","설치",["설치방법"]],["네이버 플레이스 리뷰 구조","리뷰",["리뷰","네이버 플레이스"]]].map((p,i)=>({id:"own-"+i,title:p[0] as string,url:"https://blog.naver.com/demo_ecardvan/"+(223100000000+i),post_date:shiftDate(today,-20-i),main_keyword:p[1] as string,topics:p[2] as string[],created_at:now})),
    lastRun:null,error:null};
}
