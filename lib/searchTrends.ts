import "server-only";
import { AppError } from "./errors";
import { kstToday, shiftDate } from "./dates";
export interface SearchTrend { keyword:string; growth:number|null; status:"rising"|"falling"|"steady"|"insufficient"; activeDays:number }
export async function getSearchTrends(keywords:string[]) {
  if(!process.env.NAVER_CLIENT_ID||!process.env.NAVER_CLIENT_SECRET)throw new AppError("네이버 API 연결이 필요합니다.",503);
  const today=kstToday(),from=shiftDate(today,-14),to=shiftDate(today,-1),split=shiftDate(today,-7);
  let response:Response;
  try {response=await fetch("https://naverapihub.apigw.ntruss.com/search-trend/v1/search",{
    method:"POST",headers:{"Content-Type":"application/json","X-NCP-APIGW-API-KEY-ID":process.env.NAVER_CLIENT_ID,"X-NCP-APIGW-API-KEY":process.env.NAVER_CLIENT_SECRET},
    body:JSON.stringify({startDate:from,endDate:to,timeUnit:"date",keywordGroups:keywords.map(keyword=>({groupName:keyword,keywords:[keyword,keyword.replace("네이버 커넥트","Npay 커넥트"),keyword.replace("네이버 커넥트","네이버페이 커넥트")]}))}),
    next:{revalidate:3600},signal:AbortSignal.timeout(15000),
  });}catch{throw new AppError("검색 추이를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.",502);}
  if([401,403].includes(response.status))throw new AppError("검색 추이 연결이 필요합니다. NAVER API HUB의 현재 앱에서 Data Lab → 검색어 트렌드 사용 설정과 인증 정보를 확인해 주세요.",503);
  if(response.status===429)throw new AppError("검색 추이 조회 한도에 도달했습니다. 잠시 후 다시 확인해 주세요.",429);
  if(!response.ok)throw new AppError("검색 추이 조회에 실패했습니다.",502);
  const body=await response.json();
  if(!Array.isArray(body.results))throw new AppError("검색 추이 응답 형식을 확인할 수 없습니다.",502);
  const results:SearchTrend[]=keywords.map(keyword=>{
    const group=body.results.find((r:{title:string})=>r.title===keyword);
    const points=(Array.isArray(group?.data)?group.data:[]).filter((p:{period:string;ratio:number})=>typeof p.period==="string"&&p.period>=from&&p.period<=to&&Number.isFinite(p.ratio)&&p.ratio>=0);
    const sum=(recent:boolean)=>points.filter((p:{period:string})=>(p.period>=split)===recent).reduce((s:number,p:{ratio:number})=>s+p.ratio,0);
    const previous=sum(false),current=sum(true),activeDays=points.filter((p:{ratio:number})=>p.ratio>0).length;
    const growth=previous>0&&activeDays>=4?Math.round((current-previous)/previous*100):null;
    return {keyword,growth,activeDays,status:growth===null?"insufficient":growth>=20?"rising":growth<=-20?"falling":"steady"};
  });
  return {from,to,results,source:"NAVER DataLab",checkedAt:new Date().toISOString()};
}
