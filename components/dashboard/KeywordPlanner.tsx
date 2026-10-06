"use client";
import { useMemo, useState } from "react";
import { ArrowUpRight, Copy, Search, TrendingUp, Lightbulb } from "lucide-react";
import { keywordOpportunities, type KeywordOpportunity } from "@/lib/keywordOpportunities";
import { kstToday } from "@/lib/dates";
import type { DashboardData } from "@/lib/types";
import type { SearchTrend } from "@/lib/searchTrends";
import { Modal } from "@/components/ui/Modal";
import { LoadingModal } from "@/components/ui/LoadingModal";
import { SavedKeywordFinder } from "@/components/dashboard/SavedKeywordFinder";
import { salesBrief } from "@/lib/terminalSales";

export function KeywordPlanner({data,compact=false,onExpand,notify}:{data:DashboardData;compact?:boolean;onExpand?:()=>void;notify:(message:string,error?:boolean)=>void}){
  const today=kstToday();
  const report=useMemo(()=>keywordOpportunities(data.posts,data.ownPosts,today),[data.posts,data.ownPosts,today]);
  const [filter,setFilter]=useState("all"),[detail,setDetail]=useState<KeywordOpportunity|null>(null);
  const [trends,setTrends]=useState<Record<string,SearchTrend>>({}),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const candidates=report.candidates.filter(item=>filter==="rising"?item.trend==="rising"||item.trend==="new":filter==="sparse"?item.sparse:filter==="unwritten"?!item.covered:filter==="purchase"?item.stage!=="운영·사후관리":true);
  const visible=compact?candidates.slice(0,3):candidates;
  async function checkTrends(){
    setBusy(true);setError("");
    try{
      const response=await fetch("/api/keyword-trends",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({keywords:visible.slice(0,5).map(item=>item.keyword)})});
      const result=await response.json();if(!response.ok)throw new Error(result.error);
      setTrends(previous=>({...previous,...Object.fromEntries((result.results as SearchTrend[]).map(item=>[item.keyword,item]))}));
      notify("상단 "+result.results.length+"개 키워드의 실제 검색 추이를 확인했습니다.");
    }catch(e){setError(e instanceof Error?e.message:"검색 추이를 확인하지 못했습니다.");}finally{setBusy(false);}
  }
  async function copy(item:KeywordOpportunity){
    try{await navigator.clipboard.writeText([item.title,"",`메인키워드: ${item.keyword}`,`고객 단계: ${item.stage}`,`고객 질문: ${item.question}`,"",...item.outline.map((line,index)=>`${index+1}. ${line}`),"",`상담 연결: ${item.cta}`].join("\n"));notify("추천 제목과 목차를 복사했습니다.");}
    catch{notify("복사하지 못했습니다. 글감 상세에서 제목과 목차를 선택해 주세요.",true);}
  }
  function openSavedDraft(keyword:string){
    const topic=/수수료|환급/.test(keyword)?"수수료 환급":/현장결제/.test(keyword)?"얼굴결제":"설치 비용";
    const related=report.candidates.find(item=>item.topic===topic);
    if(related){setDetail({...related,keyword,title:`${keyword}: ${related.title.replace(/^네이버 커넥트 /,"")}`});return;}
    setDetail({keyword,topic,title:`${keyword}: 매장 도입 전에 확인할 내용`,current:0,previous:0,blogs:0,growth:null,trend:"insufficient",sparse:false,covered:false,evidence:[],...salesBrief(topic)});
  }
  return <section className="card keyword-planner" aria-label="키워드와 글감 추천">
    <div className="card-heading"><div><div className="eyebrow">KEYWORD DISCOVERY</div><h2>단말기 상담으로 이어질 정보글</h2><p>VAN사 관점 · 단말기 도입을 검토하는 사장님의 질문에서 글감을 찾습니다</p></div>{compact&&<button className="text-button" onClick={onExpand}>전체 키워드<ArrowUpRight size={15}/></button>}</div>
    <div className="planner-summary"><span>{report.from} ~ {report.to} · 관련 글 {report.relevantPosts}개</span><span>직전 7일({report.previousFrom} ~ {report.previousTo})과 비교 · 오늘 제외</span></div>
    {!compact&&<SavedKeywordFinder onDraft={openSavedDraft}/>}
    <div className="planner-toolbar"><div className="planner-filters" aria-label="키워드 후보 필터">{[["all","판매 연관 추천순"],["purchase","도입·교체 검토"],["rising","블로그 언급 상승"],["sparse","발행 블로그 적음"],["unwritten","아직 안 쓴 주제"]].map(([value,label])=><button key={value} className={"button small "+(filter===value?"selected":"")} aria-pressed={filter===value} onClick={()=>setFilter(value)}>{label}</button>)}</div><button className="button" disabled={busy||!visible.length} onClick={checkTrends}><Search size={14}/>{busy?"검색 추이 확인 중…":"실제 검색 추이 확인"}</button></div>
    <p className="planner-explanation">블로그 언급은 검색량이 아닙니다. ‘발행 블로그 적음’은 수집 표본에서 작성 블로그가 2~3곳인 후보이며, 네이버 전체 경쟁률이나 상위 노출을 보장하지 않습니다. 검색 추이는 상단 최대 5개를 별도로 확인합니다.</p>
    {!report.baselineReady&&<p className="planner-notice">이전 기간의 관련 글이 부족해 블로그 상승 여부를 판단하지 않습니다.</p>}
    {data.lastRun?.status==="partial"&&<p className="planner-notice">최근 수집에 누락이 있습니다. 작성 블로그 수가 실제보다 적게 잡힐 수 있습니다.</p>}
    {error&&<p className="planner-notice error-message" role="alert">{error} <a href="https://console.ncloud.com/" target="_blank" rel="noopener noreferrer">네이버 클라우드 열기 ↗</a></p>}
    <div className="planner-grid">{visible.map(item=>{
      const trend=trends[item.keyword];
      return <article className="planner-item" key={item.keyword}>
        <div className="tags"><span className="tag tag-blue">{item.trend==="rising"?"블로그 언급 상승":item.trend==="new"?"이번 기간 처음 발견":item.trend==="insufficient"?"자료 부족":"상승 신호 없음"}</span>{item.sparse&&<span className="tag tag-green">발행 블로그 적음</span>}{item.covered&&<span className="tag tag-gray">자사 글 있음</span>}</div>
        <h3>{item.keyword}</h3><span className="tag tag-gray">{item.stage}</span><p className="planner-demand">고객 질문: {item.question}</p><dl className="planner-metrics"><div><dt>최근 / 이전 글</dt><dd>{item.current} / {item.previous}<small>개</small></dd></div><div><dt>작성 블로그</dt><dd>{item.blogs}<small>곳</small></dd></div></dl>
        <p className="planner-trend"><TrendingUp size={13}/>{item.growth===null?"언급 증감률 판단 보류":`블로그 언급 ${item.growth>0?"+":""}${item.growth}%`}</p>
        <p className="planner-demand">검색 추세: {trend?trend.growth===null?"자료 부족":`${trend.growth>0?"+":""}${trend.growth}% · DataLab 상대지수 기준`:"미확인"}</p>
        <div className="planner-title"><Lightbulb size={15}/><p>{item.title}</p></div>
        <div className="planner-actions"><button className="text-button" onClick={()=>setDetail(item)}>목차·근거 글 보기<ArrowUpRight size={13}/></button><button className="icon-button" aria-label={item.keyword+" 제목과 목차 복사"} onClick={()=>copy(item)}><Copy size={14}/></button></div>
      </article>;
    })}</div>
    {!visible.length&&<div className="empty"><Lightbulb size={26}/><strong>이 조건에 맞는 키워드가 아직 없습니다</strong><span>다른 필터를 선택하거나 관련 글을 더 수집해 주세요.</span></div>}
    <p className="planner-explanation">네이버 커넥트 관련성에 더해 매장·단말기 도입·교체·운영 근거가 있는 글만 분석합니다. 소비자 축제·예매·쿠폰 글은 추천에서 제외합니다. 글 3개·블로그 2곳 미만은 자료 부족으로 표시합니다. {data.ownPosts.length?"등록한 자사 블로그는 경쟁 표본에서 제외합니다.":"자사 콘텐츠를 등록하면 이미 작성한 주제도 구분할 수 있습니다."}</p>
    {detail&&<Modal title="키워드로 글감 정하기" onClose={()=>setDetail(null)} wide><div className="planner-detail"><span className="tag tag-blue">{detail.keyword}</span><h3>{detail.title}</h3>{detail.evidence.length?<p>최근 관련 글 {detail.current}개 · 작성 블로그 {detail.blogs}곳 · 이전 기간 {detail.previous}개</p>:<p>보관함에서 고른 키워드입니다. 최근 수집 글 근거는 아직 없습니다.</p>}<h4>고객이 궁금해하는 질문</h4><p>{detail.question}</p><p>고객 단계: {detail.stage}</p><h4>추천 목차</h4><ol>{detail.outline.map(line=><li key={line}>{line}</li>)}</ol><p>조건·비용·지원 여부는 공식 안내를 확인한 뒤 작성하세요.</p><button className="button primary" onClick={()=>copy(detail)}><Copy size={14}/>제목·목차 복사</button><h4>글에서 상담으로 연결할 내용</h4><p>{detail.cta}</p><h4>추천 근거가 된 최근 글</h4>{detail.evidence.length?<ul>{detail.evidence.map(post=><li key={post.post_url}><a href={post.post_url} target="_blank" rel="noopener noreferrer">{post.title} ↗</a><small>{post.blog_name} · {post.post_date}</small></li>)}</ul>:<p>이 키워드에 맞는 최근 수집 글은 아직 없습니다.</p>}<a className="text-button" href={"https://search.naver.com/search.naver?where=blog&query="+encodeURIComponent(detail.keyword)} target="_blank" rel="noopener noreferrer">네이버에서 현재 경쟁 글 직접 확인 ↗</a></div></Modal>}
    <LoadingModal active={busy} title="키워드 검색 추이를 확인하고 있습니다" description="네이버 데이터랩의 최근 검색 흐름을 불러오고 있습니다."/>
  </section>;
}
