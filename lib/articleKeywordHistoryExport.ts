import "server-only";
import writeExcelFile, {type SheetData} from "write-excel-file/node";

export async function createArticleKeywordHistoryWorkbook(keywords:string[]):Promise<Buffer>{
  const rows:SheetData=[[{value:"순위",fontWeight:"bold",backgroundColor:"#EAF2FF"},{value:"키워드",fontWeight:"bold",backgroundColor:"#EAF2FF"}]];
  for(const [index,keyword] of keywords.entries())rows.push([index+1,keyword]);
  return writeExcelFile([{data:rows,sheet:"저장한 키워드",columns:[{width:10},{width:42}],stickyRowsCount:1,showGridLines:false}]).toBuffer();
}
