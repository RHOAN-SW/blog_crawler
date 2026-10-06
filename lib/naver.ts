import "server-only";
import { validDate } from "./dates";
import { AppError } from "./errors";
import { normalizeNaverUrl } from "./urls";
import { classifyTopics } from "./topicClassifier";
import { extractKeywords } from "./keywordAnalyzer";
import { isExcludedContent } from "./contentPolicy";
import type { BlogPost } from "./types";
interface NaverItem { title:string;link:string;description:string;bloggername:string;bloggerlink:string;postdate:string }
interface NaverResult { total:number;items:NaverItem[] }
export function stripHtml(text: string) {
  return text.replace(/<[^>]*>/g,"").replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,(_,entity:string)=>{
    const named:Record<string,string>={amp:"&",lt:"<",gt:">",quot:'"',apos:"'",nbsp:" "};
    if(named[entity]) return named[entity];
    const code=entity.startsWith("#x")?parseInt(entity.slice(2),16):parseInt(entity.slice(1),10);
    return code>0&&code<=0x10ffff ? String.fromCodePoint(code) : "";
  }).trim();
}
export async function searchNaver(query: string, from: string, to: string, deadline=Date.now()+240000): Promise<{posts:BlogPost[];truncated:boolean}> {
  if(!process.env.NAVER_CLIENT_ID || !process.env.NAVER_CLIENT_SECRET) throw new AppError("NAVER API 인증 정보를 설정해 주세요.",503);
  const posts=new Map<string,BlogPost>(); const now=new Date().toISOString();
  let truncated=false;
  for(let start=1;start<=901;start+=100) {
    if(Date.now()>=deadline) throw new AppError("검색 실행 시간 제한에 도달했습니다. 기간을 줄이거나 다시 시도해 주세요.",503);
    const endpoint=new URL("https://naverapihub.apigw.ntruss.com/search/v1/blog");
    endpoint.search=new URLSearchParams({query,display:"100",start:String(start),sort:"date",format:"json"}).toString();
    let response:Response;
    try { response=await fetch(endpoint,{headers:{"X-NCP-APIGW-API-KEY-ID":process.env.NAVER_CLIENT_ID,"X-NCP-APIGW-API-KEY":process.env.NAVER_CLIENT_SECRET},cache:"no-store",signal:AbortSignal.timeout(Math.max(1,Math.min(12000,deadline-Date.now())))}); }
    catch { throw new AppError("NAVER 검색 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.",502); }
    if(!response.ok) {
      if([401,403].includes(response.status)) throw new AppError("NAVER API HUB 인증에 실패했습니다. 해당 앱의 인증 정보와 블로그 API 사용 설정을 확인해 주세요.",502);
      if(response.status===429) throw new AppError("NAVER API 호출 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.",429);
      throw new AppError("NAVER 검색 요청에 실패했습니다.",502);
    }
    const result=await response.json() as NaverResult;
    if(!Array.isArray(result.items)) throw new AppError("NAVER 검색 응답 형식을 확인할 수 없습니다.",502);
    let older=false;
    for(const item of result.items) {
      if(!/^\d{8}$/.test(item.postdate)) continue;
      const date=item.postdate.slice(0,4)+"-"+item.postdate.slice(4,6)+"-"+item.postdate.slice(6,8);
      if(!validDate(date)) continue;
      if(date<from) { older=true; continue; }
      if(date>to) continue;
      const postUrl=normalizeNaverUrl(item.link); if(!postUrl) continue;
      const title=stripHtml(item.title),description=stripHtml(item.description);
      if(isExcludedContent(title,description)) continue;
      posts.set(postUrl,{id:postUrl,title,description,post_date:date,blog_name:stripHtml(item.bloggername),blog_url:normalizeNaverUrl(item.bloggerlink,"blog") ?? postUrl.substring(0,postUrl.lastIndexOf("/")),post_url:postUrl,matched_queries:[query],query_hit_count:1,detected_topics:classifyTopics(title,description),detected_keywords:extractKeywords(title),first_seen_at:now,last_seen_at:now,created_at:now});
    }
    if(older || result.items.length<100 || start+100>result.total) break;
    if(start===901 && result.total>=1000) truncated=true;
  }
  return {posts:[...posts.values()],truncated};
}
