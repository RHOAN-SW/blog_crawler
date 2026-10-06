"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUpRight, RefreshCw, Star } from "lucide-react";
import { savedKeywordSuggestions, savedKeywordSnapshot,MAX_KEYWORD_TAG_LENGTH,type SavedKeywordMetrics } from "@/lib/savedKeywordDiscovery";
import { LoadingModal } from "@/components/ui/LoadingModal";

const storageKey="connect-monitor-saved-keywords";

export function SavedKeywordFinder({onDraft}:{onDraft:(keyword:string)=>void}){
  const [topic,setTopic]=useState("단말기"),[expanded,setExpanded]=useState(false),[onlySaved,setOnlySaved]=useState(false);
  const [saved,setSaved]=useState<string[]>([]),[metrics,setMetrics]=useState<Record<string,SavedKeywordMetrics>>({});
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[measuredAt,setMeasuredAt]=useState("");
  useEffect(()=>{
    const timer=window.setTimeout(()=>{
      try{const value=JSON.parse(localStorage.getItem(storageKey)??"[]");if(Array.isArray(value))setSaved(value.filter(item=>typeof item==="string"));}catch{/* 브라우저 저장소를 사용할 수 없으면 현재 화면에서만 선택합니다. */}
    },0);
    return()=>window.clearTimeout(timer);
  },[]);
  const live=useMemo(()=>new Map(Object.entries(metrics)),[metrics]);
  const candidates=useMemo(()=>savedKeywordSuggestions(onlySaved?"":topic).filter(item=>!onlySaved||saved.includes(item.keyword)),[topic,onlySaved,saved]);
  const candidateNames=candidates.map(item=>item.keyword).join("\u0001");
  const all=useMemo(()=>savedKeywordSuggestions(onlySaved?"":topic,live).filter(item=>!onlySaved||saved.includes(item.keyword)),[topic,live,onlySaved,saved]);
  const visible=expanded||onlySaved?all.slice(0,12):all.slice(0,4);
  function toggleSaved(keyword:string){
    const next=saved.includes(keyword)?saved.filter(item=>item!==keyword):[...saved,keyword];
    setSaved(next);
    try{localStorage.setItem(storageKey,JSON.stringify(next));}catch{/* 저장소가 차단되면 현재 화면에서만 유지합니다. */}
  }
  const refresh=useCallback(async(keywords:string[],signal?:AbortSignal)=>{
    if(!keywords.length)return;
    setBusy(true);setError("");
    try{
      const response=await fetch("/api/keyword-discovery/metrics",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({keywords}),signal});
      const data=await response.json();if(!response.ok)throw new Error(data.error??"네이버 검색 지표를 확인하지 못했습니다.");
      if(signal?.aborted)return;
      const results=data.results as ({keyword:string}&SavedKeywordMetrics)[];
      setMetrics(previous=>({...previous,...Object.fromEntries(results.map(item=>[item.keyword,{monthlySearches:item.monthlySearches,blogDocuments:item.blogDocuments}]))}));
      setMeasuredAt(new Date(data.measuredAt).toLocaleString("ko-KR",{timeZone:"Asia/Seoul"}));
      const missing=results.filter(item=>item.monthlySearches===null).length;
      if(data.volumeStatus==="not_configured")setError("네이버 검색광고 API 연결이 필요합니다. 월간검색량은 표시하지 않습니다.");
      else if(missing)setError(`${missing}개는 검색광고 API가 정확한 월간검색량을 반환하지 않아 비워 두었습니다.`);
    }catch(e){if(!signal?.aborted)setError(e instanceof Error?e.message:"네이버 검색 지표를 확인하지 못했습니다.");}
    finally{setBusy(false);}
  },[]);
  useEffect(()=>{
    if(!candidateNames)return;
    const controller=new AbortController();
    const timer=window.setTimeout(()=>void refresh(candidateNames.split("\u0001"),controller.signal),350);
    return()=>{window.clearTimeout(timer);controller.abort();};
  },[candidateNames,refresh]);
  return <div className="saved-finder" aria-label="연관 키워드와 경쟁 비율 찾기">
    <div className="saved-finder-head"><div><span className="eyebrow">1 · 주제 입력 → 2 · 연관어 비교 → 3 · 별표 → 4 · 글감 목차</span><h3>검색량 근거가 있는 짧은 키워드 찾기</h3><p>넓은 주제어에서 시작해 단말기 판매와 관련된 {MAX_KEYWORD_TAG_LENGTH}자 이하 태그를 고릅니다.</p></div><span className="count-badge">제공된 보관함 {savedKeywordSnapshot.rows.length}개</span></div>
    <div className="saved-finder-toolbar"><input aria-label="넓은 주제어" value={topic} onChange={event=>{setTopic(event.target.value);setExpanded(false);setOnlySaved(false);}} placeholder="예: 단말기" maxLength={20}/><div className="saved-finder-topics">{["단말기","수수료","현장결제","커넥트"].map(word=><button key={word} className={"button small "+(topic===word&&!onlySaved?"selected":"")} onClick={()=>{setTopic(word);setExpanded(false);setOnlySaved(false);}}>{word}</button>)}</div><button className={"button small "+(onlySaved?"selected":"")} onClick={()=>{setOnlySaved(!onlySaved);setExpanded(true);}}><Star size={13}/>별표한 키워드 {saved.length}</button></div>
    <div className="saved-finder-list">{visible.map(item=><div className="saved-finder-row" key={item.keyword}><button className={"saved-star "+(saved.includes(item.keyword)?"active":"")} aria-label={item.keyword+(saved.includes(item.keyword)?" 별표 해제":" 별표 담기")} aria-pressed={saved.includes(item.keyword)} onClick={()=>toggleSaved(item.keyword)}><Star size={17} fill={saved.includes(item.keyword)?"currentColor":"none"}/></button><div className="saved-finder-keyword"><strong>{item.keyword}</strong><span>{item.reason} · {item.source}</span></div><div className="saved-finder-stat"><small>월간검색량</small><strong>{item.monthlySearches?.toLocaleString("ko-KR")??"확인 필요"}</strong></div><div className="saved-finder-stat"><small>블로그 문서</small><strong>{item.blogDocuments?.toLocaleString("ko-KR")??"조회 실패"}</strong></div><div className="saved-finder-stat"><small>경쟁 비율</small><strong>{item.competitionRatio?.toLocaleString("ko-KR",{maximumFractionDigits:2})??"판단 보류"}</strong></div><span className={"saved-finder-grade "+(item.grade==="황금"?"gold":item.grade==="중간"?"middle":"")}>{item.grade}</span><button className="text-button" onClick={()=>onDraft(item.keyword)}>글감 목차<ArrowUpRight size={13}/></button></div>)}</div>
    {!visible.length&&<div className="empty"><strong>{onlySaved?"별표한 키워드가 없습니다":"이 주제와 연결된 보관함 키워드가 없습니다"}</strong><span>다른 넓은 주제어를 입력해 보세요.</span></div>}
    <div className="saved-finder-footer"><span>경쟁 비율 = 블로그 문서 수 ÷ 월간검색량(낮을수록 유리). 월간검색량은 네이버 검색광고 API에서 조회합니다. API가 정확한 값을 주지 않으면 비워 둡니다. 문서 0건은 저경쟁으로 단정하지 않습니다.{measuredAt?` · 네이버 검색 지표 확인 ${measuredAt}`:""}</span><div>{!onlySaved&&all.length>4&&<button className="button small" onClick={()=>setExpanded(!expanded)}>{expanded?"접기":"연관 키워드 펼치기"}<ArrowDown size={13} className={expanded?"saved-up":""}/></button>}<button className="button small" disabled={busy||!visible.length} onClick={()=>refresh(candidateNames.split("\u0001"))}><RefreshCw size={13}/>{busy?"조회 중…":"현재 지표 다시 조회"}</button></div></div>
    {error&&<p className="saved-finder-error error-message" role="alert">{error}</p>}
    <LoadingModal active={busy} title="검색 지표를 확인하고 있습니다" description="네이버 검색광고 월간검색량과 블로그 문서 수를 조회합니다."/>
  </div>;
}
