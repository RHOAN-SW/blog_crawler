import "server-only";
import { assertSameOrigin } from "./auth";
import { isDemoMode } from "./config";
import { demoStore } from "./repository";
import { getSupabase } from "./supabase";
import { normalizeNaverUrl } from "./urls";
import { validDate } from "./dates";
import { classifyTopics } from "./topicClassifier";
import { TOPICS } from "./constants";
import { AppError,errorResponse } from "./errors";
import type { OwnPost,Competitor } from "./types";
type Table="competitors"|"own_posts";
function text(value:unknown,max:number,required=true) {
  const valueText=typeof value==="string"?value.trim():"";
  if((required&&!valueText)||valueText.length>max)throw new AppError("필수 입력 항목과 글자 수를 확인해 주세요.",400);
  return valueText;
}
function validate(table:Table,body:Record<string,unknown>): Record<string, string | string[]> {
  if(table==="competitors"){
    const url=normalizeNaverUrl(text(body.blog_url,2048),"blog");if(!url)throw new AppError("올바른 네이버 블로그 주소를 입력해 주세요.",400);
    return {blog_name:text(body.blog_name,100),blog_url:url,memo:text(body.memo,1000,false)};
  }
  const title=text(body.title,300),url=normalizeNaverUrl(text(body.url,2048));if(!url)throw new AppError("올바른 네이버 블로그 글 주소를 입력해 주세요.",400);
  if(!validDate(body.post_date))throw new AppError("올바른 작성일을 입력해 주세요.",400);
  if(body.topics!==undefined && (!Array.isArray(body.topics)||body.topics.some(t=>typeof t!=="string"||!TOPICS.includes(t))))throw new AppError("주제를 올바르게 선택해 주세요.",400);
  return {title,url,post_date:body.post_date,main_keyword:text(body.main_keyword,100),topics:[...new Set((body.topics as string[]|undefined)?.length?body.topics as string[]:classifyTopics(title))]};
}
export async function resourceMutation(request:Request,table:Table) {
  try {
    assertSameOrigin(request);
    if(request.method==="DELETE"){
      const id=new URL(request.url).searchParams.get("id");if(!id)throw new AppError("삭제할 항목을 확인해 주세요.",400);
      if(isDemoMode()){const d=demoStore();if(table==="competitors")d.competitors=d.competitors.filter(x=>x.id!==id);else d.ownPosts=d.ownPosts.filter(x=>x.id!==id);}
      else {const {error}=await getSupabase().from(table).delete().eq("id",id);if(error)throw new AppError("삭제하지 못했습니다. 다시 시도해 주세요.",503);}
      return Response.json({success:true});
    }
    const body=await request.json() as Record<string,unknown>;const payload=validate(table,body);
    const id=request.method==="PATCH"?text(body.id,100):undefined;
    if(isDemoMode()){
      const d=demoStore(),list=table==="competitors"?d.competitors:d.ownPosts;
      const uniqueKey=table==="competitors"?"blog_url":"url";
      if(list.some(row=>row.id!==id&&(row as unknown as Record<string,unknown>)[uniqueKey]===(payload as unknown as Record<string,unknown>)[uniqueKey]))throw new AppError("이미 등록된 주소입니다.",409);
      const index=id?list.findIndex(x=>x.id===id):-1;if(id&&index<0)throw new AppError("항목을 찾지 못했습니다.",404);
      const record={...payload,id:id??crypto.randomUUID(),created_at:index>=0?list[index].created_at:new Date().toISOString()};
      if(table==="competitors"){if(index>=0)d.competitors[index]=record as Competitor;else d.competitors.push(record as Competitor);}
      else {if(index>=0)d.ownPosts[index]=record as OwnPost;else d.ownPosts.push(record as OwnPost);}
      return Response.json(record);
    }
    const db=getSupabase();const operation=id?db.from(table).update(payload).eq("id",id):db.from(table).insert(payload);
    const {data,error}=await operation.select().single();
    if(error)throw new AppError(error.code==="23505"?"이미 등록된 주소입니다.":"저장하지 못했습니다. 연결 상태를 확인해 주세요.",error.code==="23505"?409:503);
    return Response.json(data);
  }catch(error){return errorResponse(error);}
}
