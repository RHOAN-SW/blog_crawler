import seeds from "@/data/keyword-seeds.json";

export type KeywordOrigin = "기존 후보" | "본문" | "연관 발굴";
export interface KeywordCandidate {
  keyword:string;
  origin:KeywordOrigin;
  monthlySearches:number|null;
  volumeSource:"검색광고 API"|"미확인";
  relevance:number;
  evidence:string;
}
export interface RankedKeyword extends KeywordCandidate {
  blogDocuments:number|null;
  competitionRatio:number|null;
  grade:"황금 키워드"|"중간 키워드"|"경쟁 키워드"|"검색 의도 확인"|"문서 수 확인 필요"|"검색량 확인 필요";
  trendGrowth:number|null;
  rank:number;
}

const norm=(value:string)=>value.toLowerCase().replace(/[^가-힣a-z0-9]/gu,"");
const terminal=/카드\s*단말기|네이버\s*커넥트|네이버페이|n\s*pay|payconnect|포스|\bpos\b|가맹점|결제\s*단말기|van|페이스\s*사인/iu;
const sales=/설치|구매|임대|렌탈|견적|비용|가격|교체|신청|가맹|수수료|정산|연동|계약|환급|오류|고장|해지|무선|유선|as|a\/s/iu;
const stop=new Set(["그리고","그러나","입니다","있습니다","때문에","어떻게","이렇게","대한","대해서","합니다","사용하는","수있는","오늘은","알아보겠습니다","통해서","글에서","이것은"]);
const expansions:[RegExp,string[]][]=[
  [/설치|도입|개업|창업/iu,["카드단말기 설치 서류","가맹점 단말기 설치 비용","단말기 설치 기간","신규 사업자 카드단말기"]],
  [/비용|가격|견적|무료/iu,["카드단말기 임대료","카드단말기 약정 기간","카드단말기 설치비","단말기 교체 위약금"]],
  [/수수료|환급|정산/iu,["영세 가맹점 우대수수료","가맹점 정산 주기","카드수수료 환급 대상","카드단말기 수수료 비교"]],
  [/포스|\bpos\b|연동/iu,["기존 POS 카드단말기 연동","네이버 커넥트 POS 호환","단말기 포스 연동 오류","포스 교체 없이 카드단말기"]],
  [/무선|유선|lte|와이파이/iu,["무선 카드단말기 통신비","유선 무선 단말기 비교","와이파이 카드단말기 오류"]],
  [/교체|고장|오류|a\/s|as/iu,["카드단말기 교체 비용","단말기 A/S 접수","단말기 교체 시 가맹점 정보","카드단말기 결제 오류"]],
  [/네이버\s*커넥트|n\s*pay|페이스\s*사인/iu,["네이버 커넥트 단말기 설치비","네이버 커넥트 가맹점 신청","페이스사인 단말기 호환","네이버 커넥트 카드단말기 교체"]],
];
const fallback=["카드단말기 설치 비용","카드단말기 렌탈","무선 카드단말기","카드단말기 교체","가맹점 단말기 신청","단말기 POS 연동","카드단말기 수수료","단말기 설치 서류","네이버 커넥트 단말기 설치","카드단말기 약정 기간","단말기 정산 주기","카드단말기 A/S"];

export function articleCandidates(article:string):KeywordCandidate[]{
  const clean=article.replace(/<[^>]*>/gu," ").replace(/https?:\/\/\S+/gu," ").replace(/\s+/gu," ").trim();
  const compact=norm(clean);
  const words=(clean.toLowerCase().match(/[가-힣a-z0-9]{2,}/gu)??[]).filter(word=>!stop.has(word));
  const count=new Map<string,number>();for(const word of words)count.set(word,(count.get(word)??0)+1);
  const candidates=new Map<string,KeywordCandidate>();
  function add(keyword:string,origin:KeywordOrigin,volume:number|null,evidence:string){
    const key=norm(keyword);if(key.length<3||candidates.has(key))return;
    const pieces=(keyword.toLowerCase().match(/[가-힣a-z0-9]{2,}/gu)??[]).filter(p=>!stop.has(p));
    const hits=pieces.reduce((n,p)=>n+(compact.includes(p)?1:0),0);
    const direct=compact.includes(key);
    const frequency=pieces.reduce((n,p)=>n+(count.get(p)??0),0);
    const matchingConnect=/(네이버커넥트|npay커넥트|payconnect)/iu.test(key)&&/(네이버커넥트|npay커넥트|payconnect)/iu.test(compact);
    const relevance=Math.min(100,(direct?54:0)+(matchingConnect?48:0)+Math.min(30,hits*9)+Math.min(12,frequency*2)+(terminal.test(keyword)?8:0)+(sales.test(keyword)?8:0));
    candidates.set(key,{keyword,origin,monthlySearches:volume,volumeSource:"미확인",relevance,evidence:direct?"본문에 직접 언급":hits?"본문의 단어와 연결":evidence});
  }
  for(const row of seeds.rows)add(row.keyword,"기존 후보",null,"기존 키워드 후보");
  for(const [pattern,phrases] of expansions)if(pattern.test(clean))for(const phrase of phrases)add(phrase,"연관 발굴",null,"본문에서 연상한 매장 질문");
  const industries=[...new Set(clean.match(/카페|음식점|식당|병원|학원|미용실|편의점|소매점|숙박업|배달전문점/gu)??[])];
  for(const industry of industries){
    add(`${industry} 카드단말기 설치`,"연관 발굴",null,"본문의 업종별 설치 질문");
    add(`${industry} 카드단말기 구매 비용`,"연관 발굴",null,"본문의 업종별 도입 비용");
    if(/포스|\bpos\b|연동/iu.test(clean))add(`${industry} POS 연동 단말기`,"연관 발굴",null,"본문의 업종별 연동 질문");
    if(/무선|lte|와이파이/iu.test(clean))add(`${industry} 무선 카드단말기`,"연관 발굴",null,"본문의 업종별 통신 방식");
  }
  for(const phrase of fallback)add(phrase,"연관 발굴",null,"단말기 도입 질문");
  return [...candidates.values()].sort((a,b)=>b.relevance-a.relevance||Number(b.origin==="기존 후보")-Number(a.origin==="기존 후보"));
}
const relatedTerminal=/카드단말기|무선단말기|결제단말기|카드결제기|카드리더기|카드기|포스|\bpos\b|네이버커넥트|npay커넥트|가맹점/iu;
const unrelatedRelated=/쿠폰|포인트|적립|대출|보험|주식|마일리지|중고|비사업자|체크카드신청|신용카드신청|키오스크|프린터|영수증|용지|프로그램/iu;
const otherBrands=/토스|이지체크|페이히어|스마트로|나이스정보|KIS|KCP|KOCES|아이포스|PG카드/iu;
const placePrefix=/^(서울|부산|대구|인천|광주|대전|울산|세종|수원|성남|고양|용인|창원|마산|포항|구미|김해|제주|경주|천안|청주|전주|춘천|강릉)/u;
const industryWords=["카페","음식점","식당","병원","학원","미용실","편의점","숙박","배달","마트","약국","미용","의류"];
const relatedFeatures:[RegExp,RegExp][]=[
  [/설치|개업|창업/iu,/설치|개업|창업/iu],
  [/무선|블루투스|lte/iu,/무선|블루투스|lte/iu],
  [/유선/iu,/유선/iu],
  [/대여|렌트|렌탈|임대/iu,/대여|렌트|렌탈|임대/iu],
  [/교체|변경/iu,/교체|변경/iu],
  [/포스|pos|연동/iu,/포스|pos|연동/iu],
  [/수수료/iu,/수수료/iu],
  [/정산/iu,/정산/iu],
  [/네이버|커넥트|npay/iu,/네이버|커넥트|npay/iu],
  [/신청|가맹점/iu,/신청|가맹점/iu],
];

export function searchAdRelatedCandidates(article:string,related:{keyword:string;monthlySearches:number}[],existing:KeywordCandidate[]):KeywordCandidate[]{
  const clean=article.replace(/<[^>]*>/gu," ").replace(/https?:\/\/\S+/gu," ");
  const compact=norm(clean),seen=new Set(existing.map(item=>norm(item.keyword)));
  const output:KeywordCandidate[]=[];
  for(const row of related){
    const keyword=row.keyword.trim(),key=norm(keyword);
    if(!key||[...keyword].length>10||seen.has(key)||!relatedTerminal.test(keyword)||unrelatedRelated.test(keyword)
      ||!Number.isSafeInteger(row.monthlySearches)||row.monthlySearches<=0)continue;
    const place=keyword.match(placePrefix)?.[0];
    if(place&&!clean.includes(place))continue;
    if(otherBrands.test(keyword)&&!otherBrands.test(clean))continue;
    if(/포스|\bpos\b/iu.test(keyword)&&!/(카드|단말기|설치|구매|임대|렌탈|연동|교체|수수료)/iu.test(keyword))continue;
    if(industryWords.some(word=>keyword.includes(word)&&!clean.includes(word)))continue;
    const matched=relatedFeatures.filter(([keywordPattern,articlePattern])=>keywordPattern.test(keyword)&&articlePattern.test(clean)).length;
    const direct=compact.includes(key);
    const relevance=Math.min(100,25+(direct?45:0)+matched*13+(keyword.includes("카드단말기")&&compact.includes("카드단말기")?8:0));
    seen.add(key);
    output.push({keyword,origin:"연관 발굴",monthlySearches:row.monthlySearches,volumeSource:"검색광고 API",relevance,evidence:direct?"본문에 직접 언급":"검색광고 연관어 · 단말기 판매 관련"});
  }
  return output.sort((a,b)=>b.relevance-a.relevance||b.monthlySearches!-a.monthlySearches!).slice(0,60);
}
export function gradeRatio(ratio:number|null):RankedKeyword["grade"]{
  return ratio===null?"검색량 확인 필요":ratio<10?"황금 키워드":ratio<50?"중간 키워드":"경쟁 키워드";
}
export function rankArticleKeywords(candidates:KeywordCandidate[],metrics:Map<string,{blogDocuments:number|null;trendGrowth:number|null}>):RankedKeyword[]{
  const scored=candidates.map(candidate=>{
    const metric=metrics.get(candidate.keyword),blogDocuments=metric?.blogDocuments??null;
    const competitionRatio=candidate.monthlySearches!==null&&candidate.monthlySearches>0&&blogDocuments!==null?blogDocuments/candidate.monthlySearches:null;
    const grade=blogDocuments===0&&candidate.monthlySearches!==null?"검색 의도 확인" as const:blogDocuments===null&&candidate.monthlySearches!==null?"문서 수 확인 필요" as const:gradeRatio(competitionRatio);
    return {...candidate,blogDocuments,competitionRatio,grade,trendGrowth:metric?.trendGrowth??null,rank:0};
  });
  // 검색광고 API가 반환한 월간검색량을 가장 먼저 반영합니다. 문서 수 조회 실패는 검색량을 숨기지 않습니다.
  const gradeOrder=(value:RankedKeyword)=>value.grade==="황금 키워드"?0:value.grade==="중간 키워드"?1:value.grade==="경쟁 키워드"?2:value.grade==="검색 의도 확인"?3:4;
  const volumePriority=(value:RankedKeyword)=>value.volumeSource==="검색광고 API"&&value.monthlySearches!==null?(value.monthlySearches>0?2:1):0;
  scored.sort((a,b)=>volumePriority(b)-volumePriority(a)||Math.floor(b.relevance/25)-Math.floor(a.relevance/25)||gradeOrder(a)-gradeOrder(b)||(a.competitionRatio??Infinity)-(b.competitionRatio??Infinity)||(b.monthlySearches??0)-(a.monthlySearches??0)||b.relevance-a.relevance);
  return scored.slice(0,40).map((candidate,index)=>({...candidate,rank:index+1}));
}
