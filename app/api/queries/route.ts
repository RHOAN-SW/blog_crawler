import { getQueries, demoStore } from "@/lib/repository";
import { getSupabase } from "@/lib/supabase";
import { isDemoMode } from "@/lib/config";
import { assertSameOrigin } from "@/lib/auth";
import { AppError, errorResponse } from "@/lib/errors";
export async function GET(){try{return Response.json(await getQueries());}catch(error){return errorResponse(error);}}
export async function POST(request:Request){
  try {
    assertSameOrigin(request);const body=await request.json();
    const query=typeof body.query==="string"?body.query.trim():"";
    if(!query || query.length>100) throw new AppError("검색어를 1~100자로 입력해 주세요.",400);
    if(isDemoMode()){
      const demo=demoStore();if(demo.queries.some(q=>q.query===query))throw new AppError("이미 등록된 검색어입니다.",409);
      if(demo.queries.length>=50) throw new AppError("검색어는 최대 50개까지 등록할 수 있습니다.",400);
      const row={id:crypto.randomUUID(),query,active:true,created_at:new Date().toISOString()};demo.queries.push(row);return Response.json(row);
    }
    const existing=await getQueries();if(existing.length>=50)throw new AppError("검색어는 최대 50개까지 등록할 수 있습니다.",400);
    const {data,error}=await getSupabase().from("search_queries").insert({query}).select().single();
    if(error)throw new AppError(error.code==="23505"?"이미 등록된 검색어입니다.":"검색어를 저장하지 못했습니다.",error.code==="23505"?409:503);
    return Response.json(data);
  }catch(error){return errorResponse(error);}
}
export async function PATCH(request:Request){
  try{
    assertSameOrigin(request);const body=await request.json();
    if(typeof body.id!=="string" || typeof body.active!=="boolean")throw new AppError("검색어 상태를 확인해 주세요.",400);
    if(isDemoMode()){const row=demoStore().queries.find(q=>q.id===body.id);if(!row)throw new AppError("검색어를 찾지 못했습니다.",404);row.active=body.active;return Response.json(row);}
    const {data,error}=await getSupabase().from("search_queries").update({active:body.active}).eq("id",body.id).select().single();
    if(error)throw new AppError("검색어 상태를 변경하지 못했습니다.",503);return Response.json(data);
  }catch(error){return errorResponse(error);}
}
export async function DELETE(request:Request){
  try{
    assertSameOrigin(request);const id=new URL(request.url).searchParams.get("id");if(!id)throw new AppError("삭제할 검색어를 확인해 주세요.",400);
    if(isDemoMode()){const demo=demoStore();demo.queries=demo.queries.filter(q=>q.id!==id);return Response.json({success:true});}
    const {error}=await getSupabase().from("search_queries").delete().eq("id",id);if(error)throw new AppError("검색어를 삭제하지 못했습니다.",503);return Response.json({success:true});
  }catch(error){return errorResponse(error);}
}
