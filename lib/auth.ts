import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { AppError } from "./errors";
export const SESSION_COOKIE="monitor_session";
export function authRequired() { return process.env.NODE_ENV==="production" || !!process.env.DASHBOARD_PASSWORD; }
export function authConfigured() { return !!process.env.DASHBOARD_PASSWORD && (process.env.AUTH_SECRET?.length??0)>=32; }
export function matchesPassword(input:string) {
  if(!authConfigured()) return false;
  const actual=Buffer.from(input),expected=Buffer.from(process.env.DASHBOARD_PASSWORD!);
  return actual.length===expected.length && timingSafeEqual(actual,expected);
}
export function createSession() {
  if(!authConfigured()) throw new AppError("DASHBOARD_PASSWORD와 32자 이상의 AUTH_SECRET을 설정해 주세요.",503);
  const expiry=String(Date.now()+1000*60*60*12);
  return expiry+"."+createHmac("sha256",process.env.AUTH_SECRET!).update(expiry).digest("hex");
}
export function validSession(token?:string) {
  if(!token || !authConfigured()) return false;
  const [expiry,signature]=token.split(".");
  if(!expiry || !signature || !/^\d+$/.test(expiry) || Number(expiry)<=Date.now()) return false;
  const expected=createHmac("sha256",process.env.AUTH_SECRET!).update(expiry).digest("hex");
  const a=Buffer.from(signature),b=Buffer.from(expected);
  return a.length===b.length && timingSafeEqual(a,b);
}
export function assertSameOrigin(request:Request) {
  const origin=request.headers.get("origin");
  const requestHost=request.headers.get("host") ?? new URL(request.url).host;
  if(!origin || new URL(origin).host!==requestHost) throw new AppError("허용되지 않은 요청입니다.",403);
}
