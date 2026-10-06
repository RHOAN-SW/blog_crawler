import "server-only";
import { getSupabase } from "./supabase";
import { isDemoMode } from "./config";
import { makeDemoData } from "./demo";
import { AppError } from "./errors";
import type { BlogPost, DashboardData, SearchQuery, CollectionRun } from "./types";
import { kstToday, shiftDate } from "./dates";
import { uniqueBlogPosts } from "./postMerge";
import { isExcludedContent } from "./contentPolicy";
import { classifyTopics } from "./topicClassifier";
const globals=globalThis as typeof globalThis & {monitorDemo?:DashboardData};
export function demoStore() { return globals.monitorDemo ??= makeDemoData(); }
export async function getQueries(): Promise<SearchQuery[]> {
  if(isDemoMode()) return demoStore().queries;
  const {data,error}=await getSupabase().from("search_queries").select("*").order("created_at");
  if(error) throw new AppError("검색어를 불러오지 못했습니다. Supabase 설정과 스키마를 확인해 주세요.",503);
  return data as SearchQuery[];
}
export async function loadDashboard(): Promise<DashboardData> {
  if(isDemoMode()) return demoStore();
  const db=getSupabase(),posts:BlogPost[]=[];
  const [queries,competitors,ownPosts,lastRun]=await Promise.all([
    getQueries(),db.from("competitors").select("*").order("created_at"),
    db.from("own_posts").select("*").order("post_date",{ascending:false}),
    db.from("collection_runs").select("*").order("started_at",{ascending:false}).limit(1),
  ]);
  if(competitors.error || ownPosts.error || lastRun.error) throw new AppError("데이터를 불러오지 못했습니다. Supabase SQL 스키마가 적용됐는지 확인해 주세요.",503);
  // Page through PostgREST's row limit instead of silently dropping rows.
  for(let offset=0;;offset+=1000) {
    const {data,error}=await db.from("blog_posts").select("*").gte("post_date",shiftDate(kstToday(),-729)).order("post_date",{ascending:false}).order("id").range(offset,offset+999);
    if(error) throw new AppError("블로그 글을 불러오지 못했습니다. Supabase 연결을 확인해 주세요.",503);
    posts.push(...(data as BlogPost[]).filter(post=>!isExcludedContent(post.title,post.description)).map(post=>({...post,detected_topics:classifyTopics(post.title,post.description)}))); if(data.length<1000) break;
  }
  return {mode:"live",posts,queries,competitors:competitors.data,ownPosts:ownPosts.data,lastRun:lastRun.data[0]??null,error:null};
}
export async function savePosts(posts:BlogPost[]): Promise<number> {
  if(isDemoMode()) throw new AppError("데모에서는 실제 데이터를 저장하지 않습니다.",400);
  const unique=uniqueBlogPosts(posts.filter(post=>!isExcludedContent(post.title,post.description))).map(post=>({...post,detected_topics:classifyTopics(post.title,post.description)}));
  let saved=0; const db=getSupabase();
  for(let offset=0;offset<unique.length;offset+=100) {
    const {error}=await db.rpc("merge_blog_posts",{incoming:unique.slice(offset,offset+100)});
    if(error) throw new AppError("검색 결과를 저장하지 못했습니다. Supabase 스키마와 연결을 확인해 주세요.",503);
    saved+=Math.min(100,unique.length-offset);
  }
  return saved;
}
export async function latestRun():Promise<CollectionRun|null> { return (await loadDashboard()).lastRun; }
