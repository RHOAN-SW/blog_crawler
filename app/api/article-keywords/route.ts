import { assertSameOrigin } from "@/lib/auth";
import { AppError,errorResponse } from "@/lib/errors";
import { isDemoMode } from "@/lib/config";
import { recommendArticleKeywords } from "@/lib/articleKeywordMetrics";
export const maxDuration=120;
export async function POST(request:Request){
  try{
    assertSameOrigin(request);
    const body=await request.json();
    const article=typeof body.article==="string"?body.article.trim():"";
    if(article.length<80||article.length>20000)throw new AppError("분석할 글을 80~20,000자로 붙여넣어 주세요.",400);
    if(isDemoMode())throw new AppError("이 기능은 네이버 API가 연결된 운영 모드에서 사용할 수 있습니다.",503);
    return Response.json(await recommendArticleKeywords(article));
  }catch(error){return errorResponse(error);}
}
