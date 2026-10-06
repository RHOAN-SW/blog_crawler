import { searchNaver } from "@/lib/naver";
import { savePosts, demoStore } from "@/lib/repository";
import { isDemoMode, requireLiveConfig } from "@/lib/config";
import { assertSameOrigin } from "@/lib/auth";
import { AppError, errorResponse } from "@/lib/errors";
import { dateRange, validDate } from "@/lib/dates";
export const maxDuration=300;
export async function POST(request:Request) {
  try {
    assertSameOrigin(request); const body=await request.json();
    const query=typeof body.query==="string"?body.query.trim():"";
    if(!query || query.length>100) throw new AppError("검색어를 1~100자로 입력해 주세요.",400);
    const range=dateRange(14),from=body.from??range.from,to=body.to??range.to;
    if(!validDate(from)||!validDate(to)||from>to || (Date.parse(to)-Date.parse(from))/86400000>365) throw new AppError("검색 기간을 1년 이내로 올바르게 선택해 주세요.",400);
    if(isDemoMode()) {
      return Response.json({posts:demoStore().posts.filter(p=>p.post_date>=from&&p.post_date<=to&&p.title.toLowerCase().includes(query.toLowerCase())),mode:"demo",truncated:false,saved:0});
    }
    requireLiveConfig(); const result=await searchNaver(query,from,to);
    const saved=await savePosts(result.posts);
    return Response.json({...result,mode:"live",saved});
  } catch(error) {return errorResponse(error);}
}
