"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import { Files, Hash, Users, Search, Download, RefreshCw, ArrowUpRight, ArrowRight, ChevronDown, CalendarDays, SlidersHorizontal, X, Menu, Bell, CircleHelp, TrendingUp, Plus, Check, LoaderCircle } from "lucide-react";
import type { DashboardData, Section, BlogPost, Filters } from "@/lib/types";
import { filterPosts, topicFrequency, blogRanking } from "@/lib/analysis";
import { keywordFrequency } from "@/lib/keywordAnalyzer";
import { dateRange, kstToday, shiftDate } from "@/lib/dates";
import { toCsv } from "@/lib/csv";
import { TOPICS } from "@/lib/constants";
import { TrendChart, TopicBars } from "./Charts";
import { PostTable } from "./PostTable";
import { PostDetail } from "./PostDetail";
import { QuerySettings } from "./QuerySettings";
import { Resources } from "./Resources";
import { KeywordPlanner } from "./KeywordPlanner";
import { ArticleKeywordAdvisor } from "./ArticleKeywordAdvisor";
import { WorkspaceSidebar } from "./WorkspaceSidebar";
import { Modal } from "@/components/ui/Modal";
import { LoadingModal } from "@/components/ui/LoadingModal";
const titles:Record<Section,string>={overview:"단말기 판매로 이어질 정보글",article:"붙여넣은 글 키워드 40선",posts:"수집 콘텐츠",topics:"주제 · 키워드 분석",competitors:"경쟁사 모니터링",own:"우리 콘텐츠 라이브러리",ideas:"키워드로 다음 글 정하기",settings:"검색어 · 수집 설정"};
const descriptions:Record<Section,string>={overview:"도입·설치·교체를 고민하는 사장님의 질문과 경쟁 콘텐츠를 비교해 다음 정보글을 정하세요.",article:"작성한 글을 붙여넣고 엑셀 기준과 네이버 API로 키워드 40개를 추천받으세요.",posts:"검색된 네이버 블로그 글을 조건별로 살펴보세요.",topics:"최근 콘텐츠에서 반복되는 주제와 키워드를 확인하세요.",competitors:"등록한 경쟁 블로그의 콘텐츠 발행 흐름을 확인하세요.",own:"이카드밴의 기존 콘텐츠를 등록하고 주제 중복을 줄이세요.",ideas:"언급 변화와 작성 블로그 수를 비교하고 추천 제목·목차·근거 글을 확인하세요.",settings:"자동으로 모니터링할 검색어와 수집 상태를 관리하세요."};
export function Dashboard({initialData,initialSection="overview",showActivity=false}:{initialData:DashboardData;initialSection?:Section;showActivity?:boolean}) {
  const [data,setData]=useState(initialData),[section,setSection]=useState<Section>(initialSection);
  const [period,setPeriod]=useState("14"),[range,setRange]=useState(()=>dateRange(14));
  const [filters,setFilters]=useState({title:"",query:"",topic:"",blog:"",competitorOnly:false});
  const [search,setSearch]=useState(""),[busy,setBusy]=useState(false),[searchResults,setSearchResults]=useState<BlogPost[]|null>(null);
  const [busyAction,setBusyAction]=useState<"search"|"collect"|null>(null);
  const [detail,setDetail]=useState<BlogPost|null>(null),[mobile,setMobile]=useState(false),[advanced,setAdvanced]=useState(false);
  const [toast,setToast]=useState<{text:string;error:boolean}|null>(null),[help,setHelp]=useState(false),[activity,setActivity]=useState(showActivity);
  const notify=useCallback((text:string,error=false)=>setToast({text,error}),[]);
  useEffect(()=>{if(toast){const timer=setTimeout(()=>setToast(null),6000);return()=>clearTimeout(timer);}},[toast]);
  async function refresh(){const res=await fetch("/api/dashboard",{cache:"no-store"});const result=await res.json();if(!res.ok)throw new Error(result.error);setData(result);}
  const allFilters:Filters={...filters,...range};
  const filtered=useMemo(()=>filterPosts(searchResults??data.posts,{...filters,...range},data.competitors),[searchResults,data,filters,range]);
  const periodPosts=useMemo(()=>filterPosts(data.posts,{...range,title:"",query:"",topic:"",blog:"",competitorOnly:false},data.competitors),[data,range]);
  const topics=topicFrequency(periodPosts),blogs=blogRanking(periodPosts),keywords=keywordFrequency(periodPosts.map(p=>p.title));
  const today=kstToday(),todayPosts=data.posts.filter(p=>p.post_date===today).length;
  const length=Math.round((Date.parse(range.to)-Date.parse(range.from))/86400000)+1;
  const previous=data.posts.filter(p=>p.post_date>=shiftDate(range.from,-length)&&p.post_date<range.from).length;
  const growth=previous?Math.round((periodPosts.length-previous)/previous*100):null;

  const exposure=[...periodPosts].sort((a,b)=>b.query_hit_count-a.query_hit_count||b.post_date.localeCompare(a.post_date)).slice(0,3);
  const periodLabel=period==="1"?"오늘":period==="custom"?"선택 기간":"최근 "+period+"일";
  const go=(s:Section)=>{setSection(s);setMobile(false);};
  const selectTopic=(topic:string)=>{setFilters(f=>({...f,topic}));go("posts");};
  async function runSearch(e:React.FormEvent){
    e.preventDefault();if(!search.trim()||busy)return;setBusy(true);setBusyAction("search");
    try{const res=await fetch("/api/search",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({query:search.trim(),...range})});const result=await res.json();if(!res.ok)throw new Error(result.error);await refresh();setSearchResults(result.posts);setFilters({title:"",query:"",topic:"",blog:"",competitorOnly:false});go("posts");notify(result.posts.length+"개 글을 검색했습니다."+ (result.truncated?" API 검색 한도에 도달해 일부 결과가 제외됐습니다.":"")+(result.mode==="demo"?" (데모 데이터 내 검색)":""));}catch(e){notify(e instanceof Error?e.message:"검색에 실패했습니다.",true);}finally{setBusy(false);setBusyAction(null);}
  }
  async function runCollect(){
    if(data.mode==="demo"){notify("데모 모드에서는 실제 수집을 실행하지 않습니다. 검색어 · 수집 설정에서 연결 안내를 확인하세요.");return;}
    if(busy)return;setBusy(true);setBusyAction("collect");try{const res=await fetch("/api/collect",{method:"POST"});const run=await res.json();if(!res.ok)throw new Error(run.error??run.errors?.join(" ")??"수집에 실패했습니다.");await refresh();notify(run.saved_count+"개 글을 저장·갱신했습니다. 중복 "+Math.max(0,run.fetched_count-run.saved_count)+"개를 제외했습니다."+(run.errors?.length?" 일부 검색어 수집에 실패했습니다. 수집 기록을 확인하세요.":""),run.status==="partial");}catch(e){notify(e instanceof Error?e.message:"수집에 실패했습니다.",true);}finally{setBusy(false);setBusyAction(null);}
  }
  function exportCsv(){const blob=new Blob([toCsv(filtered)],{type:"text/csv;charset=utf-8;"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="connect-content-"+range.from+"-"+range.to+".csv";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify(filtered.length+"개 글을 CSV로 내보냈습니다.");}
  function updatePeriod(value:string){setPeriod(value);if(value!=="custom")setRange(dateRange(Number(value)));}
  const dateFormat=(date:string)=>date.replaceAll("-",".");
  return <div className="app-shell">
    <WorkspaceSidebar active={section} mobile={mobile} onClose={()=>setMobile(false)} onNavigate={go} postCount={periodPosts.length} mode={data.mode} onHelp={()=>setHelp(true)} onLogoutError={()=>notify("로그아웃하지 못했습니다.",true)}/>
    <div className="main-shell"><header className="topbar"><div className="breadcrumb"><button className="icon-button mobile-menu" onClick={()=>setMobile(true)} aria-label="메뉴 열기"><Menu size={20}/></button><span>워크스페이스</span><span className="breadcrumb-slash">/</span><strong>{section==="overview"?"대시보드":titles[section]}</strong></div><div className="topbar-right"><span className="naver-label"><span className="naver-n">N</span>NAVER 블로그</span><span className={"status-pill "+(data.mode==="demo"?"demo":"live")}>{data.mode==="demo"?"데모 데이터":"실제 데이터"}</span><button className="icon-button notification" aria-label="수집 기록" onClick={()=>setActivity(true)}><Bell size={18}/>{data.lastRun?.errors.length? <span/>:null}</button></div></header>
      <main className="main-content">
        {data.error&&<div className="alert error-message" role="alert">{data.error}<button className="text-button" onClick={()=>refresh().catch(e=>notify(e.message,true))}>다시 시도</button></div>}
        <div className="page-heading"><div><div className="eyebrow">{section==="overview"?"CONTENT OVERVIEW":"CONNECT MONITOR"}</div><h1>{titles[section]}<span className="heading-dot">.</span></h1><p>{descriptions[section]}</p></div>{section!=="article"&&<div className="heading-actions"><button className="button" onClick={exportCsv}><Download size={15}/>CSV 내보내기</button><button className="button primary" disabled={busy} onClick={runCollect}>{busy?<LoaderCircle size={15} className="spin"/>:<RefreshCw size={15}/>}새로 수집</button></div>}</div>
        {section!=="article"&&<div className="search-toolbar"><form className="search-form" onSubmit={runSearch}><Search size={18}/><input aria-label="네이버 블로그 실시간 검색" placeholder={data.mode==="demo"?"데모 콘텐츠에서 검색어를 찾아보세요":"네이버 커넥트 관련 검색어를 입력하세요"} value={search} onChange={e=>setSearch(e.target.value)} maxLength={100}/><button className="button primary" disabled={busy||!search.trim()}>{busy?"처리 중…":"검색"}</button></form><div className="period-select"><CalendarDays size={16}/><select aria-label="분석 기간" value={period} onChange={e=>updatePeriod(e.target.value)}><option value="1">오늘</option><option value="7">최근 7일</option><option value="14">최근 14일</option><option value="30">최근 30일</option><option value="custom">직접 설정</option></select><ChevronDown size={14}/></div></div>}
        {period==="custom"&&<div className="custom-dates"><label>시작일<input type="date" value={range.from} max={range.to} min={shiftDate(range.to,-365)} onChange={e=>{if(e.target.value&&e.target.value<=range.to)setRange({...range,from:e.target.value});}}/></label><span>—</span><label>종료일<input type="date" value={range.to} min={range.from} max={shiftDate(range.from,365)<today?shiftDate(range.from,365):today} onChange={e=>{if(e.target.value&&e.target.value>=range.from)setRange({...range,to:e.target.value});}}/></label></div>}
        {section==="article"&&<ArticleKeywordAdvisor/>}
        {(section==="overview"||section==="ideas")&&<KeywordPlanner data={data} compact={section==="overview"} onExpand={()=>go("ideas")} notify={notify}/>}
        {section==="overview"&&<>
          <div className="section-date"><span>{dateFormat(range.from)} — {dateFormat(range.to)}</span><span><span className="status-dot"/> {data.mode==="demo"?"예시 데이터 기준":"수집된 데이터 기준"} · KST</span></div>
          <div className="kpi-grid"><Kpi label={periodLabel+" 수집 글"} value={periodPosts.length.toLocaleString()} unit="개" icon={<Files size={17}/>} footer={growth===null?"이전 기간 데이터 없음":(growth>=0?"+":"")+growth+"% 이전 기간 대비"} positive={growth!==null&&growth>=0}/>
            <Kpi label="오늘 작성된 새 글" value={String(todayPosts)} unit="개" icon={<Plus size={17}/>} footer={today.slice(5).replace("-",".")+" 작성일 기준"} positive={false}/>
            <Kpi label="가장 많이 언급된 주제" value={topics[0]?.name??"—"} icon={<Hash size={17}/>} footer={topics[0]?topics[0].count+"개 글에서 언급":"분석할 글 없음"} text/>
            <Kpi label="가장 활발한 블로그" value={blogs[0]?.name??"—"} icon={<Users size={17}/>} footer={blogs[0]?periodLabel+" "+blogs[0].count+"개 발행":"분석할 글 없음"} text/></div>
          <div className="overview-charts"><section className="card trend-card"><div className="card-heading"><div><h2>콘텐츠 발행 추이</h2><p>최근 어떤 흐름으로 글이 작성되고 있을까요?</p></div><span className="chart-legend"><i/>발행된 글</span></div><TrendChart posts={periodPosts} from={range.from} to={range.to}/></section><section className="card topics-card"><div className="card-heading"><div><h2>{periodLabel} 인기 주제</h2><p>주제별 글 수 · 한 글이 여러 주제에 포함될 수 있습니다</p></div><button className="icon-button" onClick={()=>go("topics")} aria-label="전체 주제 분석"><ArrowUpRight size={17}/></button></div><TopicBars items={topics} onSelect={selectTopic}/></section></div>
        </>}
        {(section==="overview"||section==="posts")&&<section className="card content-card"><div className="card-heading"><div className="inline-heading"><h2>{searchResults?"실시간 검색 결과":"최근 수집 콘텐츠"}</h2><span className="count-badge">{filtered.length}</span></div><div className="table-heading-actions">{searchResults&&<button className="text-button" onClick={()=>setSearchResults(null)}><X size={13}/> 검색 종료</button>}<button className={"button small "+(advanced?"selected":"")} onClick={()=>setAdvanced(!advanced)}><SlidersHorizontal size={14}/>필터</button>{section==="overview"&&<button className="text-button" onClick={()=>go("posts")}>전체 보기<ArrowRight size={14}/></button>}</div></div>
          <div className="table-filters"><div className="local-search"><Search size={15}/><input aria-label="제목 필터" placeholder="제목으로 검색" value={filters.title} onChange={e=>setFilters({...filters,title:e.target.value})}/></div><select aria-label="주제 필터" value={filters.topic} onChange={e=>setFilters({...filters,topic:e.target.value})}><option value="">모든 주제</option>{TOPICS.map(t=><option key={t}>{t}</option>)}</select><select aria-label="검색어 필터" value={filters.query} onChange={e=>setFilters({...filters,query:e.target.value})}><option value="">모든 검색어</option>{[...new Set([...data.queries.map(q=>q.query),...data.posts.flatMap(p=>p.matched_queries)])].map(q=><option key={q}>{q}</option>)}</select>{(filters.title||filters.topic||filters.query||filters.blog||filters.competitorOnly)&&<button className="text-button muted" onClick={()=>setFilters({title:"",topic:"",query:"",blog:"",competitorOnly:false})}><X size={13}/>초기화</button>}</div>
          {advanced&&<div className="advanced-filters"><select aria-label="블로그 필터" value={filters.blog} onChange={e=>setFilters({...filters,blog:e.target.value})}><option value="">모든 블로그</option>{[...new Map(data.posts.map(p=>[p.blog_url,{url:p.blog_url,name:p.blog_name}])).values()].sort((a,b)=>a.name.localeCompare(b.name,"ko")).map(b=><option key={b.url} value={b.url}>{b.name}</option>)}</select><label className="checkbox-label"><input type="checkbox" checked={filters.competitorOnly} onChange={e=>setFilters({...filters,competitorOnly:e.target.checked})}/>등록 경쟁사만 보기</label></div>}
          <PostTable key={JSON.stringify(allFilters)+String(searchResults!==null)} posts={filtered} onDetail={setDetail} compact={section==="overview"}/></section>}
        {(section==="overview"||section==="topics")&&<><div className="insight-grid"><section className="card keywords-card"><div className="card-heading"><div><h2>최근 많이 등장한 키워드</h2><p>제목 내 키워드 등장 글 수 · 불용어 제외</p></div><Hash size={17} className="muted"/></div><div className="keyword-cloud">{keywords.slice(0,16).map((k,i)=><button key={k.name} className={"keyword "+(i<3?"popular":"")} onClick={()=>{setFilters(f=>({...f,title:k.name}));go("posts");}}>{k.name}<span>{k.count}</span></button>)}{!keywords.length&&<p className="muted">분석할 키워드가 없습니다.</p>}</div></section><section className="card ranking-card"><div className="card-heading"><div><h2>콘텐츠 발행 블로그 TOP 10</h2><p>{periodLabel} 수집 글의 게시 빈도 기준</p></div><Users size={17} className="muted"/></div><div className="blog-rankings">{blogs.slice(0,section==="overview"?5:10).map((b,i)=><div key={b.url}><span className={"ranking-number "+(i===0?"first":"")}>{String(i+1).padStart(2,"0")}</span><a href={b.url} target="_blank" rel="noopener noreferrer">{b.name}<ArrowUpRight size={13}/></a>{data.competitors.some(c=>c.blog_url===b.url)&&<span className="competitor-tag">경쟁사</span>}<strong>{b.count}<small>개</small></strong></div>)}</div></section></div>
          {section==="topics"&&<section className="card all-topics"><div className="card-heading"><div><h2>전체 주제 분포</h2><p>한 글에 여러 주제를 부여하므로 주제 수의 합계는 전체 글 수와 다를 수 있습니다.</p></div></div><TopicBars items={topics.slice(0,5)} onSelect={selectTopic}/><div className="keyword-cloud">{topics.slice(5).map(t=><button className="keyword" key={t.name} onClick={()=>selectTopic(t.name)}>{t.name}<span>{t.count}</span></button>)}</div></section>}
          <section className="card top-content"><div className="card-heading"><div><h2>최근 주목 콘텐츠</h2><p>서로 다른 검색어에서 발견된 횟수 기준 · 조회 지표가 아닙니다.</p></div><TrendingUp size={17} className="muted"/></div><div className="top-content-grid">{exposure.map((p,i)=><button key={p.id} className="top-content-item" onClick={()=>setDetail(p)}><span className="top-content-rank">0{i+1}</span><h3>{p.title}</h3><p>{p.blog_name} · {p.post_date.slice(5).replace("-",".")}</p><div><span>검색 노출도</span><strong>{p.query_hit_count}<small>개 검색어</small></strong><ArrowUpRight size={15}/></div></button>)}</div></section></>}
        {(section==="competitors"||section==="own")&&<Resources key={section} section={section} data={data} posts={periodPosts} onRefresh={refresh} notify={notify} onDetail={setDetail} onRegister={()=>go("own")}/>}
        {section==="settings"&&<QuerySettings data={data} onRefresh={refresh} notify={notify}/>}
        <footer className="page-footer"><span>Connect Monitor <span>·</span> 콘텐츠를 읽고, 기회를 발견하세요.</span><span>NAVER Blog Search API 기반</span></footer>
      </main>
    </div>
    {detail&&<PostDetail post={detail} onClose={()=>setDetail(null)}/>}
    {toast&&<div className={"toast "+(toast.error?"toast-error":"")} role={toast.error?"alert":"status"}>{toast.error?<CircleHelp size={18}/>:<Check size={18}/>}<span>{toast.text}</span><button onClick={()=>setToast(null)} aria-label="알림 닫기"><X size={15}/></button></div>}
    {help&&<Modal title="Connect Monitor 이용 안내" onClose={()=>setHelp(false)}><div className="help-content"><h3>발행 흐름을 읽는 콘텐츠 워크스페이스</h3><p>네이버 커넥트 관련 블로그 글을 수집하고 주제·키워드·경쟁 블로그의 발행 빈도를 분석합니다.</p><p>검색 노출도는 해당 글이 발견된 <strong>서로 다른 검색어 수</strong>입니다. 방문이나 조회 지표가 아닙니다.</p><p>날짜는 한국 표준시(KST)를 사용합니다. 주제·키워드는 제목과 검색 요약을 기반으로 규칙에 따라 분석합니다.</p>{data.mode==="demo"&&<div className="demo-note">현재 데이터와 블로그 주소는 기능 체험을 위한 예시입니다. 실제 수집을 사용하려면 README의 NAVER·Supabase 연결 절차를 완료해 주세요.</div>}</div></Modal>}
    {activity&&<Modal title="최근 수집 기록" onClose={()=>setActivity(false)}>{data.lastRun?<div className="help-content"><span className="tag tag-blue">{({running:"수집 중",success:"완료",partial:"일부 실패",failed:"실패"})[data.lastRun.status]}</span><p>시작: {new Date(data.lastRun.started_at).toLocaleString("ko-KR",{timeZone:"Asia/Seoul"})}</p><p>검색어 {data.lastRun.queries_count}개 · 발견 {data.lastRun.fetched_count}개 · 중복 제외 {Math.max(0,data.lastRun.fetched_count-data.lastRun.saved_count)}개 · 저장·갱신 {data.lastRun.saved_count}개</p>{data.lastRun.errors.map((e,i)=><p className="error-message" key={i}>{e}</p>)}</div>:<div className="empty"><RefreshCw size={26}/><strong>아직 수집 기록이 없습니다</strong><span>{data.mode==="demo"?"데모 화면의 데이터는 예시입니다.":"새로 수집 버튼으로 첫 수집을 시작하세요."}</span></div>}</Modal>}
    <LoadingModal active={busy} title={busyAction==="collect"?"새 콘텐츠를 수집하고 있습니다":"네이버 블로그를 검색하고 있습니다"} description={busyAction==="collect"?"등록된 검색어로 글을 찾고 중복을 확인한 뒤 대시보드를 갱신합니다.":"검색 결과를 불러오고 대시보드에 반영하고 있습니다."}/>
  </div>;
}
function Kpi({label,value,unit,icon,footer,positive=false,text=false}:{label:string;value:string;unit?:string;icon:React.ReactNode;footer:string;positive?:boolean;text?:boolean}) {
  return <section className="card kpi"><div className="kpi-label"><span>{label}</span><span className="kpi-icon">{icon}</span></div><div className={"kpi-value "+(text?"text-value":"")}>{value}{unit&&<small>{unit}</small>}</div><div className="kpi-footer"><span className={positive?"positive":""}>{positive&&<TrendingUp size={12}/>} {footer}</span></div></section>;
}
