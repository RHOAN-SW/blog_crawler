import "server-only";
import { createHmac } from "node:crypto";

const endpoint = "https://api.searchad.naver.com";
const path = "/keywordstool";
const normalize = (keyword:string) => keyword.normalize("NFKC").replace(/\s+/gu, "").toLocaleLowerCase("ko-KR");
const pause = (ms:number) => new Promise(resolve => setTimeout(resolve, ms));
class SearchAdAuthError extends Error {}

export type SearchAdStatus = "connected" | "not_configured" | "failed" | "partial";
export interface SearchAdVolumes {
  volumes:Map<string,number>;
  related:{keyword:string;monthlySearches:number}[];
  unavailable:Set<string>;
  status:SearchAdStatus;
}

export function searchAdConfigured():boolean {
  return Boolean(process.env.NAVER_SEARCHAD_API_KEY?.trim()
    && process.env.NAVER_SEARCHAD_SECRET_KEY?.trim()
    && process.env.NAVER_SEARCHAD_CUSTOMER_ID?.trim());
}

export function searchAdHeaders(timestamp:string):Record<string,string> {
  const secret=process.env.NAVER_SEARCHAD_SECRET_KEY?.trim();
  if(!secret||!searchAdConfigured())throw new Error("네이버 검색광고 API 인증 정보가 없습니다.");
  const signature=createHmac("sha256",secret).update(`${timestamp}.GET.${path}`, "utf8").digest("base64");
  return {
    "X-Timestamp":timestamp,
    "X-API-KEY":process.env.NAVER_SEARCHAD_API_KEY!.trim(),
    "X-Customer":process.env.NAVER_SEARCHAD_CUSTOMER_ID!.trim(),
    "X-Signature":signature,
  };
}

function exactCount(value:unknown):number|null {
  if(typeof value==="number"&&Number.isSafeInteger(value)&&value>=0)return value;
  if(typeof value==="string"&&/^\d+$/u.test(value.trim())){
    const count=Number(value.trim());
    return Number.isSafeInteger(count)?count:null;
  }
  return null;
}

async function fetchBatch(batch:string[]):Promise<{exact:Map<string,number|null>;related:Map<string,{keyword:string;monthlySearches:number}>}> {
  const url=new URL(endpoint+path);
  url.searchParams.set("hintKeywords",batch.map(normalize).join(","));
  url.searchParams.set("includeHintKeywords","1");
  url.searchParams.set("showDetail","1");
  let response:Response|undefined;
  for(let attempt=0;attempt<3;attempt++){
    if(attempt)await pause(1200*attempt);
    response=await fetch(url,{headers:searchAdHeaders(String(Date.now())),cache:"no-store",signal:AbortSignal.timeout(12000)});
    if(response.status!==429&&response.status<500)break;
  }
  if(response?.status===401||response?.status===403)throw new SearchAdAuthError(`네이버 검색광고 API ${response.status}`);
  if(!response?.ok)throw new Error(`네이버 검색광고 API ${response?.status??"연결 실패"}`);
  const body=await response.json() as {keywordList?:unknown};
  if(!Array.isArray(body.keywordList))throw new Error("네이버 검색광고 API 응답 형식이 올바르지 않습니다.");
  const listed=new Map<string,number|null>(),related=new Map<string,{keyword:string;monthlySearches:number}>();
  for(const raw of body.keywordList){
    if(!raw||typeof raw!=="object")continue;
    const row=raw as Record<string,unknown>;
    if(typeof row.relKeyword!=="string")continue;
    const pc=exactCount(row.monthlyPcQcCnt),mobile=exactCount(row.monthlyMobileQcCnt);
    const key=normalize(row.relKeyword),total=pc!==null&&mobile!==null?pc+mobile:null;
    listed.set(key,total);
    if(total!==null&&total>0)related.set(key,{keyword:row.relKeyword,monthlySearches:total});
  }
  const result=new Map<string,number|null>();
  for(const keyword of batch){
    const key=normalize(keyword);
    if(listed.has(key))result.set(keyword,listed.get(key)!);
  }
  return {exact:result,related};
}

export async function monthlySearchVolumes(keywords:string[]):Promise<SearchAdVolumes> {
  const volumes=new Map<string,number>(),related=new Map<string,{keyword:string;monthlySearches:number}>(),unavailable=new Set<string>();
  if(!searchAdConfigured())return {volumes,related:[],unavailable,status:"not_configured"};
  const unique=[...new Map(keywords.filter(Boolean).map(keyword=>[normalize(keyword),keyword])).values()];
  let successful=0,failed=0;
  for(let offset=0;offset<unique.length;offset+=5){
    if(offset)await pause(350);
    try{
      const batch=unique.slice(offset,offset+5);
      const rows=await fetchBatch(batch);
      successful++;
      for(const [key,item] of rows.related)related.set(key,item);
      for(const keyword of batch){
        const count=rows.exact.get(keyword);
        if(count!==undefined&&count!==null)volumes.set(keyword,count);
        else unavailable.add(keyword);
      }
    }catch(error){
      failed++;
      if(error instanceof SearchAdAuthError)break;
    }
  }
  return {volumes,related:[...related.values()],unavailable,status:failed?(successful?"partial":"failed"):"connected"};
}
