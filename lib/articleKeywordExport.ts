import "server-only";
import writeExcelFile, { type Cell, type SheetData } from "write-excel-file/node";
import type { RankedKeyword } from "./articleKeywords";

export interface ArticleKeywordExportResult {
  keywords:RankedKeyword[];
  metrics:{measured:number;searchTrends:number;volumeMeasured:number;volumeStatus:string};
  notice:string;
}

const header=(value:string):Cell=>({value,fontWeight:"bold",textColor:"#344B6B",backgroundColor:"#EAF2FF",wrap:true});
const integer=(value:number|null):Cell=>value===null?null:{value,format:"#,##0"};
const decimal=(value:number|null):Cell=>value===null?null:{value,format:"0.00"};

export function articleKeywordSheet(result:ArticleKeywordExportResult):SheetData{
  const headings=["순위","키워드","출처","추천 근거","글 적합도","월간검색량","검색량 출처","블로그 문서 수 (네이버 API)","경쟁 비율","등급","검색 추이 (%) (데이터랩)"];
  const rows:SheetData=[headings.map(header)];
  for(const item of result.keywords){
    rows.push([
      item.rank,item.keyword,item.origin,item.evidence,integer(item.relevance),
      integer(item.monthlySearches),item.volumeSource,integer(item.blogDocuments),decimal(item.competitionRatio),
      item.grade,integer(item.trendGrowth),
    ]);
  }
  return rows;
}

export async function createArticleKeywordWorkbook(result:ArticleKeywordExportResult,generatedAt=new Date()):Promise<Buffer>{
  const created=generatedAt.toLocaleString("ko-KR",{timeZone:"Asia/Seoul"});
  const guide:SheetData=[
    [header("항목"),header("내용")],
    ["생성 시각 (KST)",created],
    ["추천 키워드 수",result.keywords.length],
    ["블로그 문서 수 확인",result.metrics.measured],
    ["검색광고 API 월간검색량 확인",result.metrics.volumeMeasured],
    ["검색광고 API 상태",result.metrics.volumeStatus],
    ["검색 추이 확인",result.metrics.searchTrends],
    ["경쟁 비율","조회 시점 네이버 블로그 문서 수 ÷ 네이버 검색광고 API 월간검색량"],
    ["황금 키워드","경쟁 비율 10 미만"],
    ["중간 키워드","경쟁 비율 10 이상 50 미만"],
    ["경쟁 키워드","경쟁 비율 50 이상"],
    ["검색 의도 확인","블로그 문서 수 0건은 검색 수요가 있어도 황금 키워드로 분류하지 않음"],
    ["검색량 미확인","검색광고 API에서도 정확한 월간검색량이 없으면 경쟁 등급 산정 보류"],
    ["검색 추이","네이버 데이터랩 상대 검색지수의 최근 7일 증감률"],
    ["자료 설명",result.notice],
  ];
  return writeExcelFile([
    {data:articleKeywordSheet(result),sheet:"키워드 랭킹",columns:[{width:8},{width:38},{width:15},{width:28},{width:13},{width:17},{width:17},{width:29},{width:15},{width:21},{width:27}],stickyRowsCount:1,showGridLines:false},
    {data:guide,sheet:"산정 안내",columns:[{width:28},{width:100}],stickyRowsCount:1,showGridLines:false},
  ]).toBuffer();
}
