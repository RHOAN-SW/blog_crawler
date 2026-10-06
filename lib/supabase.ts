import "server-only";
import { createClient } from "@supabase/supabase-js";
import { AppError } from "./errors";
import { supabaseSecretKey } from "./config";
export function getSupabase() {
  const url=process.env.SUPABASE_URL,key=supabaseSecretKey();
  if(!url || !key) throw new AppError("Supabase 연결 정보를 설정해 주세요.",503);
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
