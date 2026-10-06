import { assertSameOrigin } from "@/lib/auth";
import { AppError,errorResponse } from "@/lib/errors";
import { createArticleKeywordWorkbook, type ArticleKeywordExportResult } from "@/lib/articleKeywordExport";
import type { RankedKeyword } from "@/lib/articleKeywords";

export const runtime="nodejs";
export const maxDuration=30;

const origins=["기존 후보","본문","연관 발굴"];
const grades=["황금 키워드","중간 키워드","경쟁 키워드","검색 의도 확인","문서 수 확인 필요","검색량 확인 필요"];
const volumeSources=["검색광고 API","미확인"];
const volumeStatuses=["connected","not_configured","failed","partial"];
const count=(value:unknown)=>value===null||(typeof value==="number"&&Number.isSafeInteger(value)&&value>=0);
const metric=(value:unknown)=>value===null||(typeof value==="number"&&Number.isFinite(value));

function validKeyword(value:unknown):value is RankedKeyword{
  if(!value||typeof value!=="object")return false;
  const item=value as Record<string,unknown>;
  return Number.isSafeInteger(item.rank)&&Number(item.rank)>=1&&Number(item.rank)<=40
    &&typeof item.keyword==="string"&&item.keyword.length>0&&item.keyword.length<=100
    &&origins.includes(String(item.origin))&&typeof item.evidence==="string"&&item.evidence.length<=200
    &&typeof item.relevance==="number"&&Number.isFinite(item.relevance)&&item.relevance>=0&&item.relevance<=100
    &&count(item.monthlySearches)&&volumeSources.includes(String(item.volumeSource))&&count(item.blogDocuments)&&metric(item.competitionRatio)&&metric(item.trendGrowth)
    &&(item.volumeSource==="검색광고 API"?item.monthlySearches!==null:item.monthlySearches===null)
    &&(item.monthlySearches!==null||item.competitionRatio===null)
    &&grades.includes(String(item.grade));
}

function parseResult(value:unknown):ArticleKeywordExportResult{
  if(!value||typeof value!=="object")throw new AppError("내보낼 키워드 결과가 없습니다.",400);
  const body=value as Record<string,unknown>,keywords=body.keywords,metrics=body.metrics;
  if(!Array.isArray(keywords)||keywords.length!==40||!keywords.every(validKeyword)
    ||new Set(keywords.map(item=>item.rank)).size!==40||new Set(keywords.map(item=>item.keyword)).size!==40
    ||!metrics||typeof metrics!=="object"||typeof body.notice!=="string"||body.notice.length>2000)
    throw new AppError("내보낼 키워드 결과가 올바르지 않습니다.",400);
  const info=metrics as Record<string,unknown>;
  if(!Number.isSafeInteger(info.measured)||Number(info.measured)<0||Number(info.measured)>40
    ||!Number.isSafeInteger(info.searchTrends)||Number(info.searchTrends)<0||Number(info.searchTrends)>40
    ||!Number.isSafeInteger(info.volumeMeasured)||Number(info.volumeMeasured)<0||Number(info.volumeMeasured)>40
    ||!volumeStatuses.includes(String(info.volumeStatus)))
    throw new AppError("내보낼 키워드 결과가 올바르지 않습니다.",400);
  return body as unknown as ArticleKeywordExportResult;
}

export async function POST(request:Request){
  try{
    assertSameOrigin(request);
    if(Number(request.headers.get("content-length"))>100000)throw new AppError("내보낼 키워드 결과가 너무 큽니다.",413);
    const result=parseResult(await request.json());
    const file=await createArticleKeywordWorkbook(result);
    const filename="article_keyword_ranking_"+new Date().toLocaleDateString("sv-SE",{timeZone:"Asia/Seoul"}).replaceAll("-","")+".xlsx";
    return new Response(new Uint8Array(file),{headers:{
      "Content-Type":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":`attachment; filename="${filename}"`,
      "Cache-Control":"no-store",
    }});
  }catch(error){return errorResponse(error);}
}
