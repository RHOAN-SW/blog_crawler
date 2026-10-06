"use client";

import Link from "next/link";
import {useState} from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, BookOpen, ChartNoAxesCombined, ChevronDown, CircleHelp, ClipboardPaste, Files, Hash, LayoutDashboard, Lightbulb, LogOut, Settings2, Users } from "lucide-react";
import type { Section } from "@/lib/types";
import {LoadingModal} from "@/components/ui/LoadingModal";

const navigation = [
  {id:"overview",label:"대시보드",icon:LayoutDashboard},
  {id:"article",label:"붙여넣은 글 키워드 40선",icon:ClipboardPaste},
  {id:"posts",label:"수집 콘텐츠",icon:Files},
  {id:"topics",label:"주제 · 키워드 분석",icon:Hash},
  {id:"competitors",label:"경쟁사 모니터링",icon:Users},
  {id:"own",label:"자사 콘텐츠",icon:BookOpen},
  {id:"ideas",label:"키워드 · 글감 찾기",icon:Lightbulb},
  {id:"settings",label:"검색어 · 수집 설정",icon:Settings2},
] as const;

export function WorkspaceSidebar({active,mobile,onClose,onNavigate,postCount,mode,onHelp,onLogoutError}:{
  active:Section;
  mobile:boolean;
  onClose:()=>void;
  onNavigate:(section:Section)=>void;
  postCount?:number;
  mode:"demo"|"live";
  onHelp:()=>void;
  onLogoutError?:()=>void;
}){
  const router=useRouter();
  const [loggingOut,setLoggingOut]=useState(false);
  async function logout(){
    if(loggingOut)return;
    setLoggingOut(true);
    try{
      const response=await fetch("/api/auth",{method:"DELETE"});
      if(!response.ok)throw new Error("logout failed");
      router.replace("/login");
    }catch{onLogoutError?.();setLoggingOut(false);}
  }
  return <>
    {mobile&&<div className="sidebar-overlay" onClick={onClose}/>}
    <aside className={"sidebar "+(mobile?"is-open":"")}>
      <Link className="brand" href="/" aria-label="Connect Monitor 홈"><span className="brand-mark"><ChartNoAxesCombined size={23}/></span><span>connect<span className="brand-light">monitor</span><small>CONTENT INTELLIGENCE</small></span></Link>
      <div className="workspace"><span className="workspace-avatar">E</span><div><strong>이카드밴</strong><small>콘텐츠 워크스페이스</small></div><ChevronDown size={14}/></div>
      <div className="nav-label">WORKSPACE</div>
      <nav aria-label="주 메뉴">{navigation.map(item=><button key={item.id} className={"nav-item "+(active===item.id?"active":"")} onClick={()=>onNavigate(item.id)}><item.icon size={18}/><span>{item.label}</span>{item.id==="posts"&&postCount!==undefined&&<small>{postCount}</small>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="collection-status"><span className="status-dot"/><span>{mode==="demo"?"데모 워크스페이스":"매일 오전 6시 자동 수집"}</span></div><button className="nav-item" onClick={onHelp}><CircleHelp size={18}/><span>서비스 이용 안내</span><ArrowUpRight size={14}/></button><div className="profile"><span className="profile-avatar">EC</span><div><strong>콘텐츠 팀</strong><small>이카드밴 워크스페이스</small></div><button className="icon-button" title="로그아웃" aria-label="로그아웃" disabled={loggingOut} onClick={logout}><LogOut size={15}/></button></div></div>
    </aside>
    <LoadingModal active={loggingOut} title="로그아웃하고 있습니다" description="접속 정보를 정리하고 로그인 화면으로 이동합니다."/>
  </>;
}
