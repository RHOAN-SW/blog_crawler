import { analysisText } from "./contentPolicy";
import { shiftDate } from "./dates";
import { normalizeNaverUrl } from "./urls";
import { isTerminalSalesContent, salesBrief } from "./terminalSales";
import { MAX_KEYWORD_TAG_LENGTH, keywordTagLength } from "./savedKeywordDiscovery";
import type { BlogPost, OwnPost } from "./types";

const intents: [string, RegExp, string][] = [
  ["설치 비용", /설치\s*(비용|가격)|견적|임대료|구매\s*(비용|가격)|단말기\s*(가격|비용)/iu, "단말기 설치 비용, 견적에서 확인할 항목"],
  ["구매와 임대", /구매|임대|렌탈/iu, "단말기 구매와 임대, 계약 전에 비교할 조건"],
  ["단말기 교체", /교체|기기\s*변경/iu, "단말기 교체 전 POS 호환과 기존 약정 확인하기"],
  ["설치 서류", /서류|가맹점\s*(신청|등록)|신규\s*(개업|창업)/iu, "단말기 설치와 가맹점 신청 준비 서류"],
  ["유선 무선 비교", /유선|무선|와이파이|wifi|lte/iu, "유선·무선 단말기, 매장 환경별 선택 기준"],
  ["수수료 환급", /수수료|환급/iu, "수수료 환급 조건과 신청 전 확인할 사항"],
  ["무료 설치", /무료\s*설치|무상\s*(설치|지원)/iu, "무료 설치 조건, 추가 비용까지 확인하는 체크리스트"],
  ["POS 연동", /\bpos\b|포스\s*(기|연동|시스템)/iu, "기존 POS와 연동하기 전에 확인할 호환 조건"],
  ["사업자 변경", /사업자\s*변경|명의\s*변경|매장\s*양도/iu, "사업자 변경과 매장 양도 시 준비할 서류"],
  ["직원 사용법", /직원\s*(교육|사용)|사용\s*(방법|법)/iu, "직원에게 알려줄 결제·취소 사용법"],
  ["결제 오류", /결제\s*(오류|실패)|오류|문제\s*해결|고장/iu, "결제 오류가 났을 때 먼저 확인할 항목"],
  ["얼굴결제", /얼굴\s*결제|페이스\s*사인|안면\s*결제/iu, "얼굴결제 등록부터 실제 사용까지"],
  ["정산", /정산|입금\s*(일|주기)/iu, "정산 주기와 입금 내역 확인 방법"],
  ["설치 후기", /설치\s*후기|도입\s*후기|단말기.*(?:후기|리뷰)/iu, "설치 사례로 보는 매장별 도입 전 체크리스트"],
  ["카페 설치", /카페|커피/iu, "카페 도입 전 동선과 결제 환경 점검하기"],
  ["음식점 설치", /음식점|식당|레스토랑/iu, "음식점 설치 전 확인할 결제 동선과 연동 조건"],
  ["병원 도입", /병원|의원|치과/iu, "병원 도입 전 확인할 결제·정산 조건"],
  ["학원 도입", /학원|교습/iu, "학원 도입 전 수강료 결제 흐름 점검하기"],
  ["미용실 설치", /미용실|뷰티|네일|헤어/iu, "미용실 설치 전 예약·결제 흐름 점검하기"],
  ["도입 지원", /설치\s*(지원|혜택)|도입\s*(지원|혜택)|가맹점\s*(지원|혜택)|무상\s*지원/iu, "가맹점 도입 지원, 대상과 계약 조건 확인하기"],
  ["해지 및 반납", /해지|반납|위약금/iu, "해지·반납 조건과 위약금 확인할 사항"],
];
const shortTags:Record<string,string>={
  "설치 비용":"네이버커넥트단말기","구매와 임대":"카드단말기","단말기 교체":"단말기교체",
  "설치 서류":"단말기설치서류","유선 무선 비교":"무선카드단말기","수수료 환급":"카드수수료환급",
  "무료 설치":"무료단말기설치","POS 연동":"POS단말기연동","사업자 변경":"단말기명의변경",
  "직원 사용법":"단말기사용법","결제 오류":"단말기결제오류","얼굴결제":"네이버페이현장결제",
  "정산":"가맹점정산주기","설치 후기":"카드단말기후기","카페 설치":"카페카드단말기",
  "음식점 설치":"음식점카드단말기","병원 도입":"병원카드단말기","학원 도입":"학원카드단말기",
  "미용실 설치":"미용실카드단말기","도입 지원":"가맹점단말기지원","해지 및 반납":"단말기해지조건",
};
export function keywordTagForTopic(topic:string){
  const tag=shortTags[topic]??topic.replaceAll(" ","");
  return keywordTagLength(tag)<=MAX_KEYWORD_TAG_LENGTH?tag:Array.from(tag).slice(0,MAX_KEYWORD_TAG_LENGTH).join("");
}
export interface KeywordOpportunity {
  keyword:string; topic:string; title:string; current:number; previous:number;
  blogs:number; growth:number|null; trend:"rising"|"new"|"steady"|"insufficient";
  sparse:boolean; covered:boolean; evidence:BlogPost[]; outline:string[];
  stage:string; question:string; cta:string;
}
export function keywordOpportunities(posts:readonly BlogPost[], own:readonly OwnPost[], today:string) {
  // 오늘의 미완료 수치를 제외한 최근 7일과 직전 7일을 같은 길이로 비교합니다.
  const to=shiftDate(today,-1),from=shiftDate(today,-7),previousFrom=shiftDate(today,-14);
  const ownBlogs=new Set(own.map(p=>normalizeNaverUrl(p.url,"blog")).filter(Boolean));
  const unique=new Map<string,BlogPost>();
  for(const post of posts){
    const url=normalizeNaverUrl(post.post_url);
    if(!url||post.post_date<previousFrom||post.post_date>to||!isTerminalSalesContent(post.title,post.description))continue;
    if(ownBlogs.has(normalizeNaverUrl(post.blog_url,"blog")))continue;
    unique.set(url,post);
  }
  const relevant=[...unique.values()];
  const old=relevant.filter(p=>p.post_date<from),current=relevant.filter(p=>p.post_date>=from);
  const baselineReady=old.length>=5&&new Set(old.map(p=>p.post_date)).size>=3;
  // 검색 증가보다 VAN사의 단말기 도입·교체·운영 상담과의 연관성을 먼저 제한합니다.
  const candidates:KeywordOpportunity[]=intents.flatMap(([topic,match,title])=>{
    const matches=(post:BlogPost)=>match.test(analysisText(post.title)+" "+analysisText(post.description));
    const recent=current.filter(matches),before=old.filter(matches);
    if(!recent.length)return [];
    const blogs=new Set(recent.map(p=>normalizeNaverUrl(p.blog_url,"blog")??p.blog_url)).size;
    const enough=recent.length>=3&&blogs>=2;
    const growth=baselineReady&&before.length>0?Math.round((recent.length-before.length)/before.length*100):null;
    const trend:KeywordOpportunity["trend"]=!baselineReady||!enough?"insufficient":!before.length?"new":growth!==null&&growth>=30&&recent.length-before.length>=2?"rising":"steady";
    return [{keyword:keywordTagForTopic(topic),topic,title:"네이버 커넥트 "+title,current:recent.length,previous:before.length,blogs,growth,trend,
      sparse:enough&&blogs<=3,covered:own.some(p=>match.test(p.title+" "+p.main_keyword)),
      evidence:recent.sort((a,b)=>b.post_date.localeCompare(a.post_date)).slice(0,5),
      ...salesBrief(topic)}];
  });
  const priority=(item:KeywordOpportunity)=>(item.covered?-10:0)+(item.stage==="운영·사후관리"?0:3)+(item.trend==="rising"?4:item.trend==="new"?2:0)+(item.sparse?3:0);
  candidates.sort((a,b)=>priority(b)-priority(a)||b.current-a.current||a.keyword.localeCompare(b.keyword,"ko"));
  return {from,to,previousFrom,previousTo:shiftDate(from,-1),relevantPosts:current.length,baselineReady,candidates};
}
