import "server-only";
import { articleCandidates, rankArticleKeywords, searchAdRelatedCandidates, type RankedKeyword } from "./articleKeywords";
import { AppError } from "./errors";
import { kstToday,shiftDate } from "./dates";
import { monthlySearchVolumes, type SearchAdStatus } from "./naverSearchAd";

const endpoint="https://naverapihub.apigw.ntruss.com";
function headers(){
  if(!process.env.NAVER_CLIENT_ID||!process.env.NAVER_CLIENT_SECRET)throw new AppError("네이버 API 연결이 필요합니다.",503);
  return {"X-NCP-APIGW-API-KEY-ID":process.env.NAVER_CLIENT_ID,"X-NCP-APIGW-API-KEY":process.env.NAVER_CLIENT_SECRET};
}
async function blogDocuments(keyword:string):Promise<number|null>{
  const url=new URL(endpoint+"/search/v1/blog");
  url.search=new URLSearchParams({query:keyword,display:"1",start:"1",sort:"sim",format:"json"}).toString();
  const response=await fetch(url,{headers:headers(),cache:"no-store",signal:AbortSignal.timeout(12000)});
  if(!response.ok)return null;
  const data=await response.json();return Number.isSafeInteger(data.total)&&data.total>=0?data.total:null;
}
async function searchTrends(keywords:string[]):Promise<Map<string,number|null>>{
  const trends=new Map<string,number|null>();
  const today=kstToday(),from=shiftDate(today,-14),to=shiftDate(today,-1),split=shiftDate(today,-7);
  for(let offset=0;offset<keywords.length;offset+=5){
    const batch=keywords.slice(offset,offset+5);
    try{
      const response=await fetch(endpoint+"/search-trend/v1/search",{method:"POST",headers:{...headers(),"Content-Type":"application/json"},body:JSON.stringify({startDate:from,endDate:to,timeUnit:"date",keywordGroups:batch.map(keyword=>({groupName:keyword,keywords:[keyword]}))}),cache:"no-store",signal:AbortSignal.timeout(12000)});
      if(!response.ok)continue;
      const data=await response.json();
      for(const keyword of batch){
        const points=(data.results?.find((item:{title:string})=>item.title===keyword)?.data??[]) as {period:string;ratio:number}[];
        const valid=points.filter(point=>point.period>=from&&point.period<=to&&Number.isFinite(point.ratio)&&point.ratio>=0);
        const previous=valid.filter(point=>point.period<split).reduce((sum,point)=>sum+point.ratio,0);
        const current=valid.filter(point=>point.period>=split).reduce((sum,point)=>sum+point.ratio,0);
        trends.set(keyword,previous>0&&valid.filter(point=>point.ratio>0).length>=4?Math.round((current-previous)/previous*100):null);
      }
    }catch{/* 검색 추이 불가: 확인된 검색량과 문서 수로 평가는 계속 제공합니다. */}
  }
  return trends;
}
export async function recommendArticleKeywords(article:string):Promise<{keywords:RankedKeyword[];metrics:{measured:number;searchTrends:number;volumeMeasured:number;volumeStatus:SearchAdStatus};notice:string}>{
  headers();
  const initial=articleCandidates(article).slice(0,85);
  const volumes=await monthlySearchVolumes(initial.map(item=>item.keyword));
  const enrichedInitial=initial.map(item=>{
    const live=volumes.volumes.get(item.keyword);
    return live===undefined?item:{...item,monthlySearches:live,volumeSource:"검색광고 API" as const};
  });
  const pool=[...enrichedInitial,...searchAdRelatedCandidates(article,volumes.related,initial)];
  const priority=(a:typeof pool[number],b:typeof pool[number])=>b.relevance-a.relevance||(b.monthlySearches??0)-(a.monthlySearches??0);
  const measured=pool.filter(item=>item.volumeSource==="검색광고 API"&&item.monthlySearches!==null&&item.monthlySearches>0&&[...item.keyword].length<=10).sort(priority).slice(0,75);
  const remaining=pool.filter(item=>!measured.includes(item));
  const volumePriority=(item:typeof pool[number])=>item.volumeSource==="검색광고 API"&&item.monthlySearches!==null?(item.monthlySearches>0?2:1):0;
  const candidates=volumes.status==="not_configured"||volumes.status==="failed"
    ?enrichedInitial
    :[...measured,...remaining.sort((a,b)=>volumePriority(b)-volumePriority(a)||priority(a,b)).slice(0,85-measured.length)];
  const counts=new Map<string,{blogDocuments:number|null;trendGrowth:number|null}>();
  let next=0;
  await Promise.all(Array.from({length:6},async()=>{
    while(next<candidates.length){
      const candidate=candidates[next++];
      try{counts.set(candidate.keyword,{blogDocuments:await blogDocuments(candidate.keyword),trendGrowth:null});}
      catch{counts.set(candidate.keyword,{blogDocuments:null,trendGrowth:null});}
    }
  }));
  if([...counts.values()].every(item=>item.blogDocuments===null))throw new AppError("네이버 블로그 문서 수를 확인하지 못했습니다. API 연결을 확인해 주세요.",502);
  const ranked=rankArticleKeywords(candidates,counts);
  const trends=await searchTrends(ranked.map(item=>item.keyword));
  const keywords=ranked.map(item=>({...item,trendGrowth:trends.get(item.keyword)??null}));
  const volumeNotice=volumes.status==="not_configured"
    ?"네이버 검색광고 API 인증 정보가 없어 월간검색량을 조회하지 못했습니다. 검색광고 API 키를 연결해 주세요."
    :volumes.status==="failed"
      ?"네이버 검색광고 API 조회가 실패했습니다. 인증 정보와 API 사용 권한을 확인해 주세요."
      :volumes.status==="partial"
        ?"네이버 검색광고 API 일부 요청이 실패해 조회된 값만 반영했습니다."
        :volumes.volumes.size===0
          ?"네이버 검색광고 API는 연결됐지만 후보 키워드의 정확한 월간검색량을 반환하지 않았습니다."
          :"월간검색량은 네이버 검색광고 API에서 조회한 PC·모바일 합계입니다.";
  return {keywords,metrics:{measured:keywords.filter(item=>item.blogDocuments!==null).length,searchTrends:keywords.filter(item=>item.trendGrowth!==null).length,volumeMeasured:keywords.filter(item=>item.volumeSource==="검색광고 API").length,volumeStatus:volumes.status},notice:`${volumeNotice} API가 정확한 검색량을 반환하지 않은 키워드는 검색량과 경쟁 등급을 비워 둡니다. 블로그 문서 수는 조회 시점의 네이버 검색 결과이며, 데이터랩 증감률은 상대지수입니다.`};
}
