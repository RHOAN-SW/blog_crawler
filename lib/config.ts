import "server-only";
import { AppError } from "./errors";
export function isDemoMode() {
  if(process.env.DEMO_MODE==="true") return true;
  if(process.env.DEMO_MODE==="false") return false;
  return process.env.NODE_ENV!=="production" && !process.env.NAVER_CLIENT_ID && !process.env.SUPABASE_URL;
}
export function requireLiveConfig() {
  if(!process.env.NAVER_CLIENT_ID || !process.env.NAVER_CLIENT_SECRET) throw new AppError("NAVER API 인증 정보를 설정해 주세요.",503);
  if(!process.env.SUPABASE_URL || !supabaseSecretKey()) throw new AppError("Supabase 연결 정보를 설정해 주세요.",503);
}
export function supabaseSecretKey() {
  return process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
}
