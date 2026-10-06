"use client";
import { useEffect, useState } from "react";
import { ClipboardPaste, Search, Copy, ArrowUpRight, Lightbulb, Download, ChevronDown } from "lucide-react";
import type { RankedKeyword } from "@/lib/articleKeywords";
import { ARTICLE_KEYWORD_HISTORY_KEY, addArticleKeywordHistory, parseArticleKeywordHistory, type ArticleKeywordHistoryItem } from "@/lib/articleKeywordHistory";
import { LoadingModal } from "@/components/ui/LoadingModal";

type Result={keywords:RankedKeyword[];metrics:{measured:number;searchTrends:number;volumeMeasured:number;volumeStatus:string};notice:string};
export function ArticleKeywordAdvisor(){
  const [article,setArticle]=useState("");
  const [result,setResult]=useState<Result|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState("");
  const [filter,setFilter]=useState("all"),[query,setQuery]=useState(""),[copied,setCopied]=useState("");
  const [exporting,setExporting]=useState(false),[exportError,setExportError]=useState("");
  const [history,setHistory]=useState<ArticleKeywordHistoryItem[]>([]),[expandedHistory,setExpandedHistory]=useState("");
  const [historyExporting,setHistoryExporting]=useState(""),[historyError,setHistoryError]=useState("");
  useEffect(()=>{
    const timer=window.setTimeout(()=>{try{setHistory(parseArticleKeywordHistory(localStorage.getItem(ARTICLE_KEYWORD_HISTORY_KEY)));}catch{setHistory([]);}},0);
    return()=>window.clearTimeout(timer);
  },[]);
  async function analyze(){
    setLoading(true);setError("");setExportError("");setResult(null);setFilter("all");setQuery("");
    try{
      const response=await fetch("/api/article-keywords",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({article})});
      const data=await response.json();if(!response.ok)throw new Error(data.error??"키워드를 분석하지 못했습니다.");
      setResult(data);
      let previous:ArticleKeywordHistoryItem[]=[];
      try{previous=parseArticleKeywordHistory(localStorage.getItem(ARTICLE_KEYWORD_HISTORY_KEY));}catch{/* 조회 결과는 현재 화면에 표시합니다. */}
      const saved=addArticleKeywordHistory(previous,data.keywords.map((item:RankedKeyword)=>item.keyword));
      setHistory(saved);setExpandedHistory(saved[0]?.id??"");setHistoryError("");
      try{localStorage.setItem(ARTICLE_KEYWORD_HISTORY_KEY,JSON.stringify(saved));}
      catch{setHistoryError("브라우저 저장소를 사용할 수 없어 이번 조회 목록은 새로고침 후 사라집니다.");}
    }catch(e){setError(e instanceof Error?e.message:"키워드를 분석하지 못했습니다.");}finally{setLoading(false);}
  }
  async function copy(keyword:string){try{await navigator.clipboard.writeText(keyword);setCopied(keyword);setTimeout(()=>setCopied(""),2500);}catch{setError("키워드를 복사하지 못했습니다.");}}
  async function downloadExcel(){
    if(!result)return;
    setExporting(true);setExportError("");
    try{
      const response=await fetch("/api/article-keywords/export",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(result)});
      if(!response.ok){const data=await response.json();throw new Error(data.error??"엑셀 파일을 만들지 못했습니다.");}
      const blob=await response.blob(),url=URL.createObjectURL(blob),link=document.createElement("a");
      link.href=url;link.download="글_키워드_랭킹_"+new Date().toLocaleDateString("sv-SE",{timeZone:"Asia/Seoul"}).replaceAll("-","")+".xlsx";
      document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
    }catch(e){setExportError(e instanceof Error?e.message:"엑셀 파일을 만들지 못했습니다.");}finally{setExporting(false);}
  }
  async function downloadHistory(item:ArticleKeywordHistoryItem){
    setHistoryExporting(item.id);setHistoryError("");
    try{
      const response=await fetch("/api/article-keywords/history/export",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({keywords:item.keywords})});
      if(!response.ok){const data=await response.json();throw new Error(data.error??"저장한 키워드 엑셀을 만들지 못했습니다.");}
      const blob=await response.blob(),url=URL.createObjectURL(blob),link=document.createElement("a");
      const date=new Date(item.createdAt).toLocaleString("sv-SE",{timeZone:"Asia/Seoul",hour12:false}).replace(/[-: ]/gu,"").slice(0,12);
      link.href=url;link.download=`저장_키워드_${date}.xlsx`;document.body.appendChild(link);link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),30000);
    }catch(e){setHistoryError(e instanceof Error?e.message:"저장한 키워드 엑셀을 만들지 못했습니다.");}finally{setHistoryExporting("");}
  }
  const rows=result?.keywords.filter(item=>(filter==="all"||filter==="discovery"&&item.origin!=="기존 후보"||item.grade===filter)&&item.keyword.toLowerCase().includes(query.trim().toLowerCase()))??[];
  return <div className="article-advisor">
    <section className="card article-paste"><div className="card-heading"><div><h2><ClipboardPaste size={18}/>글 복사·붙여넣기</h2><p>작성한 정보글의 본문을 넣으면 글에 맞는 키워드 40개를 산정합니다.</p></div><span className="count-badge">{article.length.toLocaleString()} / 20,000자</span></div>
      <div className="article-paste-body"><textarea aria-label="분석할 정보글 본문" placeholder="예: 음식점에서 네이버 커넥트 카드단말기를 설치할 때 기존 POS 연동과 구매·임대 비용을 비교하는 글…" value={article} maxLength={20000} onChange={e=>setArticle(e.target.value)} rows={10}/>
        <div className="article-paste-footer"><p>붙여넣은 본문은 저장하지 않습니다. 후보 키워드만 네이버 API로 조회합니다. 최소 80자.</p><button className="button primary" disabled={loading||article.trim().length<80} onClick={analyze}><Search size={15}/>{loading?"네이버 지표 확인 중…":"키워드 40개 산정"}</button></div>
        {error&&<p className="error-message" role="alert">{error}</p>}
      </div>
    </section>
    <section className="card article-history" aria-label="최근 키워드 조회"><div className="card-heading"><div><h2>최근 조회한 키워드</h2><p>최근 5번의 조회에서 추천된 키워드만 이 브라우저에 저장합니다. 붙여넣은 글은 저장하지 않습니다.</p></div><span className="count-badge">{history.length} / 5건</span></div>
      {!history.length?<div className="article-history-empty">아직 저장된 조회가 없습니다. 키워드 40개를 산정하면 여기에 남습니다.</div>:<div className="article-history-list">{history.map((item,index)=><article className="article-history-item" key={item.id}>
        <div className="article-history-top"><div><strong>{new Date(item.createdAt).toLocaleString("ko-KR",{timeZone:"Asia/Seoul"})}</strong><span>최근 조회 {index+1} · 키워드 {item.keywords.length}개</span></div><div className="article-history-actions"><button className="button small" aria-expanded={expandedHistory===item.id} onClick={()=>setExpandedHistory(expandedHistory===item.id?"":item.id)}>{expandedHistory===item.id?"목록 접기":"40개 보기"}<ChevronDown size={13} className={expandedHistory===item.id?"saved-up":""}/></button><button className="button small" disabled={historyExporting===item.id} onClick={()=>downloadHistory(item)}><Download size={13}/>{historyExporting===item.id?"생성 중…":"키워드 엑셀"}</button></div></div>
        {expandedHistory===item.id?<ol className="article-history-keywords">{item.keywords.map((keyword,rank)=><li key={keyword}><span>{String(rank+1).padStart(2,"0")}</span>{keyword}</li>)}</ol>:<p className="article-history-preview">{item.keywords.slice(0,5).join(" · ")} 외 {item.keywords.length-5}개</p>}
      </article>)}</div>}
      {historyError&&<p className="article-history-error error-message" role="alert">{historyError}</p>}
    </section>
    <section className="card article-ranking" aria-label="글 키워드 랭킹"><div className="card-heading"><div><h2>글 키워드 랭킹</h2><p>{result?`40개 추천 · 검색광고 API 확인 ${result.metrics.volumeMeasured}개 · 네이버 문서 수 확인 ${result.metrics.measured}개 · 검색 추이 확인 ${result.metrics.searchTrends}개`:"글을 넣고 분석하면 이곳에 키워드 40개가 표시됩니다."}</p></div>{result&&<div className="article-ranking-actions"><span className="count-badge">{result.keywords.length}개</span><button className="button" onClick={downloadExcel} disabled={exporting}><Download size={15}/>{exporting?"엑셀 생성 중…":"전체 40개 엑셀 다운로드"}</button></div>}</div>
      {!result?<div className="empty"><Lightbulb size={27}/><strong>글의 주제에 맞는 검색어를 찾습니다</strong><span>네이버 검색광고 월간검색량과 블로그·데이터랩 API를 함께 활용합니다.</span></div>:<>
        <div className="article-ranking-guide"><strong>산정 기준</strong><span>검색광고 API 월간검색량이 확인된 후보 우선 → 본문 적합도 구간(25점) → 등급(황금 &lt;10 · 중간 10~50 · 경쟁 ≥50) → 경쟁 비율 낮은 순</span><span>경쟁 비율 = 네이버 블로그 문서 수 ÷ 네이버 검색광고 API 월간검색량</span></div>
        <p className="planner-notice">{result.notice} 검색량이 없는 새 키워드를 황금 키워드로 표시하지 않습니다.</p>
        {exportError&&<p className="article-export-error error-message" role="alert">{exportError}</p>}
        <div className="article-ranking-controls"><div className="planner-filters">{[["all","전체"],["discovery","뜻밖의 발굴"],["황금 키워드","황금"],["중간 키워드","중간"],["검색량 확인 필요","검색량 확인 필요"]].map(([value,label])=><button className={"button small "+(filter===value?"selected":"")} aria-pressed={filter===value} key={value} onClick={()=>setFilter(value)}>{label}</button>)}</div><input aria-label="추천 키워드 검색" value={query} onChange={e=>setQuery(e.target.value)} placeholder="결과 내 검색"/></div>
        <div className="article-table-wrap"><table className="article-keyword-table"><thead><tr><th>순위</th><th>키워드 · 추천 근거</th><th>월간검색량<br/><small>검색광고 API</small></th><th>블로그 문서 수<br/><small>네이버 API</small></th><th>경쟁 비율</th><th>등급</th><th>검색 추이<br/><small>데이터랩</small></th><th>확인</th></tr></thead><tbody>{rows.map(item=><tr key={item.keyword}><td className="rank-cell">{String(item.rank).padStart(2,"0")}</td><td><strong>{item.keyword}</strong><span className="article-keyword-origin">{item.origin!=="기존 후보"?"✨ 생각 못한 키워드 · ":""}{item.evidence} · 글 적합도 {item.relevance}/100</span></td><td>{item.monthlySearches?.toLocaleString("ko-KR")??"—"}<small className="article-zero-note">{item.volumeSource}</small></td><td>{item.blogDocuments?.toLocaleString("ko-KR")??"확인 실패"}</td><td>{item.competitionRatio===null?"산정 보류":item.competitionRatio.toLocaleString("ko-KR",{maximumFractionDigits:2})}</td><td><span className={"article-grade "+(item.grade==="황금 키워드"?"gold":item.grade==="중간 키워드"?"middle":"neutral")}>{item.grade}</span>{item.blogDocuments===0&&<small className="article-zero-note">문서 0건은 검색 의도 확인 필요</small>}</td><td>{item.trendGrowth===null?"자료 부족":(item.trendGrowth>0?"+":"")+item.trendGrowth+"%"}</td><td><div className="article-row-actions"><button aria-label={item.keyword+" 복사"} title="키워드 복사" onClick={()=>copy(item.keyword)}><Copy size={14}/></button><a aria-label={item.keyword+" 네이버 블로그 확인"} title="네이버 블로그 검색" href={"https://search.naver.com/search.naver?where=blog&query="+encodeURIComponent(item.keyword)} target="_blank" rel="noopener noreferrer"><ArrowUpRight size={14}/></a></div>{copied===item.keyword&&<small>복사됨</small>}</td></tr>)}</tbody></table></div>
        {!rows.length&&<div className="empty"><strong>조건에 맞는 키워드가 없습니다</strong><span>필터나 검색어를 바꿔 보세요.</span></div>}
      </>}
    </section>
    <LoadingModal active={loading||exporting||!!historyExporting} title={loading?"키워드 40개를 분석하고 있습니다":"엑셀 파일을 만들고 있습니다"} description={loading?"글에 맞는 후보를 고르고 네이버 검색 지표를 확인하고 있습니다.":"키워드 목록을 엑셀 파일로 준비하고 있습니다."}/>
  </div>;
}
