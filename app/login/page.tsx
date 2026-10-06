"use client";
import {useState} from "react";
import {ArrowRight,ChartNoAxesCombined,LockKeyhole} from "lucide-react";
import {LoadingModal} from "@/components/ui/LoadingModal";

export default function Login(){
  const [error,setError]=useState(""),[busy,setBusy]=useState(false);
  async function login(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(busy)return;
    const password=new FormData(event.currentTarget).get("password");
    setBusy(true);setError("");
    try{
      const response=await fetch("/api/auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password})});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error);
      const next=new URLSearchParams(window.location.search).get("next");
      const target=next?new URL(next,window.location.origin):new URL("/",window.location.origin);
      window.location.replace(target.origin===window.location.origin?target.pathname+target.search+target.hash:"/");
    }catch(cause){
      setError(cause instanceof Error?cause.message:"로그인에 실패했습니다.");
      setBusy(false);
    }
  }
  return <main className="login-screen"><div className="login-card"><div className="brand-mark"><ChartNoAxesCombined size={25}/></div><h1>Connect Monitor</h1><p>우리 팀의 다음 콘텐츠를 위한 인사이트</p><form onSubmit={login}><label><LockKeyhole size={16}/> 워크스페이스 비밀번호</label><input name="password" type="password" autoComplete="current-password" required autoFocus placeholder="비밀번호를 입력하세요"/>{error&&<p className="error-message" role="alert">{error}</p>}<button className="button primary" disabled={busy}>{busy?"로그인 중…":"워크스페이스 시작하기"}<ArrowRight size={16}/></button></form><small>이카드밴 콘텐츠 워크스페이스</small></div><LoadingModal active={busy} title="워크스페이스에 접속하고 있습니다" description="로그인을 확인하고 작업 화면을 불러오고 있습니다."/></main>;
}
