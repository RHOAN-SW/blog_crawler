import { assertSameOrigin } from "@/lib/auth";
import { isDemoMode } from "@/lib/config";
import { AppError,errorResponse } from "@/lib/errors";
import { savedKeywordSnapshot,MAX_KEYWORD_TAG_LENGTH,keywordTagLength } from "@/lib/savedKeywordDiscovery";
import { monthlySearchVolumes } from "@/lib/naverSearchAd";

export const maxDuration=60;
const allowed=new Set(savedKeywordSnapshot.rows.filter(row=>keywordTagLength(row.keyword)<=MAX_KEYWORD_TAG_LENGTH).map(row=>row.keyword));

export async function POST(request:Request){
  try{
    assertSameOrigin(request);
    if(isDemoMode())throw new AppError("네이버 API가 연결된 운영 모드에서 사용할 수 있습니다.",503);
    const id=process.env.NAVER_CLIENT_ID,key=process.env.NAVER_CLIENT_SECRET;
    if(!id||!key)throw new AppError("네이버 API 연결이 필요합니다.",503);
    const body=await request.json();
    const keywords=body?.keywords;
    if(!Array.isArray(keywords)||keywords.length<1||keywords.length>allowed.size||keywords.some(item=>typeof item!=="string"||!allowed.has(item))||new Set(keywords).size!==keywords.length)
      throw new AppError("보관함의 키워드를 선택해 주세요.",400);
    const volumesPromise=monthlySearchVolumes(keywords);
    const results:{keyword:string;blogDocuments:number|null}[]=[];
    let index=0;
    await Promise.all(Array.from({length:4},async()=>{
      while(index<keywords.length){
        const keyword=keywords[index++];
        try{
          const url=new URL("https://naverapihub.apigw.ntruss.com/search/v1/blog");
          url.search=new URLSearchParams({query:keyword,display:"1",start:"1",sort:"sim",format:"json"}).toString();
          const response=await fetch(url,{headers:{"X-NCP-APIGW-API-KEY-ID":id,"X-NCP-APIGW-API-KEY":key},cache:"no-store",signal:AbortSignal.timeout(10000)});
          if(!response.ok)throw new Error("blog count unavailable");
          const data=await response.json();
          results.push({keyword,blogDocuments:Number.isSafeInteger(data.total)&&data.total>=0?data.total:null});
        }catch{results.push({keyword,blogDocuments:null});}
      }
    }));
    const volumes=await volumesPromise;
    if(results.every(item=>item.blogDocuments===null)&&volumes.volumes.size===0)throw new AppError("네이버 검색 지표를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.",502);
    const blogCounts=new Map(results.map(item=>[item.keyword,item.blogDocuments]));
    return Response.json({results:keywords.map(keyword=>({keyword,blogDocuments:blogCounts.get(keyword)??null,monthlySearches:volumes.volumes.get(keyword)??null})),volumeStatus:volumes.status,measuredAt:new Date().toISOString()},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return errorResponse(error);}
}
