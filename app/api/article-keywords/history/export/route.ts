import {assertSameOrigin} from "@/lib/auth";
import {AppError,errorResponse} from "@/lib/errors";
import {validKeywordList} from "@/lib/articleKeywordHistory";
import {createArticleKeywordHistoryWorkbook} from "@/lib/articleKeywordHistoryExport";

export const runtime="nodejs";
export const maxDuration=30;

export async function POST(request:Request){
  try{
    assertSameOrigin(request);
    if(Number(request.headers.get("content-length"))>10000)throw new AppError("키워드 목록이 너무 큽니다.",413);
    const body=await request.json();
    if(!validKeywordList(body?.keywords))throw new AppError("저장한 키워드 40개를 확인해 주세요.",400);
    const file=await createArticleKeywordHistoryWorkbook(body.keywords);
    const date=new Date().toLocaleDateString("sv-SE",{timeZone:"Asia/Seoul"}).replaceAll("-","");
    return new Response(new Uint8Array(file),{headers:{
      "Content-Type":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":`attachment; filename="saved_keywords_${date}.xlsx"`,
      "Cache-Control":"no-store",
    }});
  }catch(error){return errorResponse(error);}
}
