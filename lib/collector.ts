import "server-only";
import { getSupabase } from "./supabase";
import { getQueries, savePosts } from "./repository";
import { searchNaver } from "./naver";
import { dateRange } from "./dates";
import { errorMessage, AppError } from "./errors";
import { collectQueryResults } from "./collectionQueries";
import { requireLiveConfig, isDemoMode } from "./config";
import type { CollectionRun } from "./types";
export async function collect():Promise<CollectionRun> {
  if(isDemoMode()) throw new AppError("데모 모드에서는 자동 수집을 실행하지 않습니다. 실제 API 연결을 설정해 주세요.",400);
  requireLiveConfig(); const db=getSupabase();
  const {data:lock,error:lockError}=await db.rpc("acquire_collection_lock");
  if(lockError) throw new AppError("수집 잠금을 확인하지 못했습니다. SQL 스키마를 적용해 주세요.",503);
  if(!lock) throw new AppError("이미 수집을 진행 중입니다. 잠시 후 다시 시도해 주세요.",409);
  const id=crypto.randomUUID(), started=new Date().toISOString();
  const run:CollectionRun={id,started_at:started,finished_at:null,status:"running",queries_count:0,fetched_count:0,saved_count:0,errors:[]};
  try {
    const inserted=await db.from("collection_runs").insert(run);
    if(inserted.error) throw new AppError("수집 기록을 저장하지 못했습니다.",503);
    const queries=(await getQueries()).filter(q=>q.active); run.queries_count=queries.length;
    const range=dateRange(30),deadline=Date.now()+240000;
    const result=await collectQueryResults(queries.map(item=>item.query),query=>searchNaver(query,range.from,range.to,deadline),deadline);
    run.fetched_count=result.fetchedCount;
    run.errors=result.errors;
    run.saved_count=await savePosts(result.posts);
    run.status=run.errors.length?(run.saved_count?"partial":"failed"):"success";
  } catch(error) {run.status="failed";run.errors.push(errorMessage(error));}
  finally {
    run.finished_at=new Date().toISOString();
    const updated=await db.from("collection_runs").upsert(run);
    const released=await db.rpc("release_collection_lock",{lock_token:lock});
    if(updated.error || released.error) throw new AppError("수집 상태를 저장하지 못했습니다. 연결 상태를 확인해 주세요.",503);
  }
  return run;
}
