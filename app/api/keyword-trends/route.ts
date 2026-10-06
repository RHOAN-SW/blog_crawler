import { assertSameOrigin } from "@/lib/auth";
import { AppError, errorResponse } from "@/lib/errors";
import { getSearchTrends } from "@/lib/searchTrends";
import { isDemoMode } from "@/lib/config";
export const maxDuration=30;
export async function POST(request:Request){
  try{
    assertSameOrigin(request);
    const {keywords}=await request.json();
    if(!Array.isArray(keywords)||keywords.length<1||keywords.length>5||!keywords.every(k=>typeof k==="string"&&/^네이버 커넥트 [가-힣a-zA-Z ]{1,50}$/u.test(k))||new Set(keywords).size!==keywords.length)throw new AppError("추천 키워드 1~5개를 선택해 주세요.",400);
    if(isDemoMode())throw new AppError("실제 검색 추이는 운영 API 연결 후 확인할 수 있습니다.",400);
    return Response.json(await getSearchTrends(keywords));
  }catch(error){return errorResponse(error);}
}
