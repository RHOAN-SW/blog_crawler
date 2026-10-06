import { NextResponse, type NextRequest } from "next/server";
import { authRequired, validSession, SESSION_COOKIE } from "./lib/auth";
export function proxy(request: NextRequest) {
  const path=request.nextUrl.pathname;
  if(path==="/login" || path==="/api/auth" || path==="/api/cron/collect") return NextResponse.next();
  if(!authRequired() || validSession(request.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();
  if(path.startsWith("/api/")) return NextResponse.json({error:"로그인이 필요합니다."},{status:401});
  const login=new URL("/login",request.url);
  login.searchParams.set("next",path);
  return NextResponse.redirect(login);
}
export const config={matcher:["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"]};
