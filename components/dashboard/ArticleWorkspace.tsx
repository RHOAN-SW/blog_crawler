"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Menu } from "lucide-react";
import type { Section } from "@/lib/types";
import { ArticleKeywordAdvisor } from "./ArticleKeywordAdvisor";
import { WorkspaceSidebar } from "./WorkspaceSidebar";
import { Modal } from "@/components/ui/Modal";

export function ArticleWorkspace({mode}:{mode:"demo"|"live"}){
  const router=useRouter();
  const [mobile,setMobile]=useState(false);
  const [help,setHelp]=useState(false);
  const [logoutError,setLogoutError]=useState(false);
  function navigate(section:Section){
    setMobile(false);
    if(section!=="article")router.push(section==="overview"?"/":"/?section="+encodeURIComponent(section));
  }
  return <div className="app-shell">
    <WorkspaceSidebar active="article" mobile={mobile} onClose={()=>setMobile(false)} onNavigate={navigate} mode={mode} onHelp={()=>{setMobile(false);setHelp(true);}} onLogoutError={()=>setLogoutError(true)}/>
    <div className="main-shell"><header className="topbar"><div className="breadcrumb"><button className="icon-button mobile-menu" onClick={()=>setMobile(true)} aria-label="메뉴 열기"><Menu size={20}/></button><span>워크스페이스</span><span className="breadcrumb-slash">/</span><strong>붙여넣은 글 키워드 40선</strong></div><div className="topbar-right"><span className="naver-label"><span className="naver-n">N</span>NAVER 블로그</span><span className={"status-pill "+mode}>{mode==="demo"?"데모 데이터":"실제 데이터"}</span><button className="icon-button notification" aria-label="수집 기록" onClick={()=>router.push("/?activity=1")}><Bell size={18}/></button></div></header>
      <main className="main-content"><div className="page-heading"><div><div className="eyebrow">CONNECT MONITOR</div><h1>붙여넣은 글 키워드 40선<span className="heading-dot">.</span></h1><p>작성한 정보글을 붙여넣으면 엑셀 기준과 네이버 API로 키워드 40개를 추천합니다.</p></div></div><ArticleKeywordAdvisor/><footer className="page-footer"><span>Connect Monitor <span>·</span> 콘텐츠를 읽고, 기회를 발견하세요.</span><span>NAVER Blog Search API 기반</span></footer></main>
    </div>
    {help&&<Modal title="Connect Monitor 이용 안내" onClose={()=>setHelp(false)}><div className="help-content"><h3>글에 맞는 키워드를 고르세요</h3><p>본문을 붙여넣으면 네이버 블로그 문서 수와 검색 추이를 확인해 40개 키워드를 추천합니다. 월간검색량이 없는 새 표현은 경쟁 등급을 보류합니다.</p></div></Modal>}
    {logoutError&&<div className="toast toast-error" role="alert"><span>로그아웃하지 못했습니다.</span><button onClick={()=>setLogoutError(false)} aria-label="알림 닫기">닫기</button></div>}
  </div>;
}
