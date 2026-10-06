import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { DEFAULT_QUERIES, LEGACY_DEFAULT_QUERIES } from "../lib/constants";
test("PostgreSQL: URL 중복 제거·검색어 누적·시간 보존·잠금·익명 접근 차단",async()=>{
  const db=new PGlite();
  try {
    await db.exec("create role anon; create role authenticated; create role service_role bypassrls;");
    // PGlite의 PostgreSQL에는 gen_random_uuid가 내장되어 있으며 확장 설치만 생략합니다.
    const schema=readFileSync(new URL("../supabase/schema.sql",import.meta.url),"utf8").replace("create extension if not exists pgcrypto;","");
    await db.exec(schema);
    await db.exec(schema); // 마이그레이션 재실행 가능
    const seeded=(await db.query<{query:string}>("select query from search_queries where active")).rows;
    assert.equal(seeded.length,36);
    assert.deepEqual(seeded.map(row=>row.query).sort(),[...DEFAULT_QUERIES].sort());
    // 기존 설치를 모사하고 세분화 전환 시 사용자 설정과 기존 글을 유지하는지 검증합니다.
    for(const query of LEGACY_DEFAULT_QUERIES) await db.query("insert into search_queries(query) values($1) on conflict do nothing",[query]);
    await db.query("insert into search_queries(query) values($1)",["사용자 추가 검색어"]);
    await db.query("update search_queries set active=false where query=$1",[DEFAULT_QUERIES[0]]);
    const migration=readFileSync(new URL("../supabase/migrations/20260929_segmented_search_queries.sql",import.meta.url),"utf8");
    await db.exec(migration);await db.exec(migration);
    const configured=(await db.query<{query:string;active:boolean}>("select query,active from search_queries")).rows;
    assert.equal(configured.length,44);
    assert.ok(configured.filter(row=>LEGACY_DEFAULT_QUERIES.includes(row.query)&&!DEFAULT_QUERIES.includes(row.query)).every(row=>!row.active));
    assert.equal(configured.find(row=>row.query==="네이버 커넥트 카드단말기")?.active,true);
    assert.equal(configured.find(row=>row.query==="사용자 추가 검색어")?.active,true);
    assert.equal(configured.find(row=>row.query===DEFAULT_QUERIES[0])?.active,false);
    const post={title:"수수료",description:"요약",post_date:"2026-09-29",blog_name:"테스트",blog_url:"https://blog.naver.com/test",post_url:"https://blog.naver.com/test/223123",matched_queries:["네이버 커넥트"],detected_topics:["수수료 / 환급"],detected_keywords:["수수료"]};
    await db.query("select merge_blog_posts($1::jsonb)",[JSON.stringify([post])]);
    const before=(await db.query<{first_seen_at:string;created_at:string}>("select * from blog_posts")).rows[0];
    await db.query("select merge_blog_posts($1::jsonb)",[JSON.stringify([{...post,matched_queries:["네이버 커넥트","Npay 커넥트"]}])]);
    await db.query("select merge_blog_posts($1::jsonb)",[JSON.stringify([{...post,matched_queries:["Npay 커넥트"]}])]);
    await db.query("select merge_blog_posts($1::jsonb)",[JSON.stringify([{...post,matched_queries:["Npay 커넥트","Npay 커넥트"]},post])]);
    const rows=(await db.query<{query_hit_count:number;matched_queries:string[];first_seen_at:string;created_at:string}>("select * from blog_posts")).rows;
    assert.equal(rows.length,1);assert.equal(rows[0].query_hit_count,2);assert.deepEqual(rows[0].matched_queries.sort(),["Npay 커넥트","네이버 커넥트"].sort());
    assert.equal(String(rows[0].first_seen_at),String(before.first_seen_at));assert.equal(String(rows[0].created_at),String(before.created_at));
    const first=(await db.query<{token:string}>("select acquire_collection_lock() as token")).rows[0].token;assert.ok(first);
    assert.equal((await db.query<{token:string|null}>("select acquire_collection_lock() as token")).rows[0].token,null);
    await db.query("select release_collection_lock($1::uuid)",["00000000-0000-0000-0000-000000000000"]);
    assert.equal((await db.query<{token:string|null}>("select acquire_collection_lock() as token")).rows[0].token,null);
    await db.query("select release_collection_lock($1::uuid)",[first]);
    assert.ok((await db.query<{token:string}>("select acquire_collection_lock() as token")).rows[0].token);
    await db.exec("set role anon;");
    await assert.rejects(db.query("select * from blog_posts"),/permission denied/);
    await assert.rejects(db.query("select acquire_collection_lock()"),/permission denied/);
  } finally {await db.close();}
});
