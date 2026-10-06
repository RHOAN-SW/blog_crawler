import seeds from "@/data/keyword-seeds.json";

export const MAX_KEYWORD_TAG_LENGTH=10;
export const savedKeywordSnapshot=seeds;

export interface SavedKeywordSuggestion {
  keyword:string;
  monthlySearches:number|null;
  blogDocuments:number|null;
  competitionRatio:number|null;
  grade:"황금"|"중간"|"경쟁"|"문서 0건 확인"|"문서 조회 실패"|"검색량 확인 필요"|"검색 수요 없음";
  source:"조회 대기"|"네이버 API";
  reason:string;
}
export interface SavedKeywordMetrics { monthlySearches:number|null;blogDocuments:number|null; }

const normalize=(value:string)=>value.toLowerCase().replace(/[^가-힣a-z0-9]/gu,"");
const merchant=/단말기|커넥트|payconnect|가맹점|수수료|현장결제/iu;
const consumer=/^네이버페이$|^간편결제$|^모바일결제$|^qr결제$|^스마트결제$|^결제수단$|^매장결제$|혜택|프로모션|머니결제/iu;
const groups:[RegExp,RegExp][]=[
  [/단말기|설치|구매|임대|렌탈|교체|pos|포스|도입|커넥트|connect/iu,/단말기|커넥트|payconnect/iu],
  [/수수료|환급|정산|가맹점/iu,/수수료|환급|가맹점/iu],
  [/현장|결제|얼굴|페이스/iu,/현장결제|커넥트|단말기/iu],
];

export function keywordTagLength(keyword:string){return Array.from(keyword).length;}

export function savedKeywordSuggestions(topic="",liveMetrics:ReadonlyMap<string,SavedKeywordMetrics>=new Map()):SavedKeywordSuggestion[]{
  const query=normalize(topic.trim()),related=groups.find(([pattern])=>pattern.test(topic))?.[1];
  const items=seeds.rows.flatMap(row=>{
    if(keywordTagLength(row.keyword)>MAX_KEYWORD_TAG_LENGTH||!merchant.test(row.keyword)||consumer.test(row.keyword))return [];
    const direct=query.length>0&&normalize(row.keyword).includes(query);
    if(query&&!direct&&(!related||!related.test(row.keyword)))return [];
    const live=liveMetrics.get(row.keyword),monthlySearches=live?.monthlySearches??null,blogDocuments=live?.blogDocuments??null;
    const competitionRatio=blogDocuments===null||blogDocuments===0||monthlySearches===null||monthlySearches===0?null:blogDocuments/monthlySearches;
    const grade=monthlySearches===null?"검색량 확인 필요":monthlySearches===0?"검색 수요 없음":blogDocuments===null?"문서 조회 실패":blogDocuments===0?"문서 0건 확인":competitionRatio!<10?"황금":competitionRatio!<50?"중간":"경쟁";
    const reason=direct?"입력한 주제와 직접 일치":/단말기|커넥트|payconnect/iu.test(row.keyword)?"단말기 도입·구매와 연결":"가맹점 비용·수수료와 연결";
    return [{keyword:row.keyword,monthlySearches,blogDocuments,competitionRatio,grade,source:live?"네이버 API":"조회 대기",reason} as SavedKeywordSuggestion];
  });
  const fit=(item:SavedKeywordSuggestion)=>{
    const direct=query&&normalize(item.keyword).includes(query)?2:0;
    return direct+(/단말기/iu.test(item.keyword)?2:0)+(/커넥트|payconnect/iu.test(item.keyword)?1:0);
  };
  return items.sort((a,b)=>Number(b.competitionRatio!==null)-Number(a.competitionRatio!==null)
    ||fit(b)-fit(a)||(a.competitionRatio??Infinity)-(b.competitionRatio??Infinity)
    ||(b.monthlySearches??0)-(a.monthlySearches??0));
}
