import { test } from "node:test";
import assert from "node:assert/strict";
import { collectQueryResults } from "../lib/collectionQueries";
import { uniqueBlogPosts } from "../lib/postMerge";
import { AppError } from "../lib/errors";
import type { BlogPost } from "../lib/types";

function post(query: string, url = "https://blog.naver.com/test/223123"): BlogPost {
  return {
    id: url, title: "네이버 커넥트 수수료 환급", description: "검색 요약",
    post_date: "2026-09-29", blog_name: "테스트", blog_url: "https://blog.naver.com/test",
    post_url: url, matched_queries: [query], query_hit_count: 1,
    detected_topics: ["수수료 / 환급"], detected_keywords: ["수수료"],
    first_seen_at: "2026-09-29T00:00:00Z", last_seen_at: "2026-09-29T00:00:00Z", created_at: "2026-09-29T00:00:00Z",
  };
}

test("모바일·PC·PostView 링크와 반복 검색을 하나의 글로 병합", () => {
  const first = post("네이버 커넥트 수수료");
  const mobile = post("Npay 커넥트 환급", "http://m.blog.naver.com/test/223123?ref=search");
  const alternate = post("네이버 커넥트 수수료", "https://blog.naver.com/PostView.naver?blogId=test&logNo=223123");
  const result = uniqueBlogPosts([first, mobile, alternate, mobile]);
  assert.equal(result.length, 1);
  assert.equal(result[0].post_url, first.post_url);
  assert.equal(result[0].query_hit_count, 2);
  assert.deepEqual(result[0].matched_queries, [first.matched_queries[0], mobile.matched_queries[0]].sort());
  assert.equal(result[0].first_seen_at, first.first_seen_at);
  assert.equal(first.query_hit_count, 1, "입력 결과는 변경하지 않음");
  assert.equal(uniqueBlogPosts([first, post("검색", "https://evil.com/test/223123")]).length, 1);
});

test("세부 검색어를 각각 조회하고 동시에 반환된 중복 글을 한 번만 집계", async () => {
  const queries = ["수수료", "환급", "설치", "POS 연동", "카드단말기", "사용방법"];
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const calls: string[] = [];
  let active = 0, peak = 0;
  const collection = collectQueryResults(queries, async query => {
    calls.push(query); active++; peak = Math.max(peak, active);
    await gate;
    active--;
    return { posts: [post(query, "https://blog.naver.com/test/" + (queries.indexOf(query) % 2 ? "223124" : "223123"))], truncated: false };
  }, Date.now() + 10000);
  assert.equal(calls.length, 3);
  release();
  const result = await collection;
  assert.equal(peak, 3);
  assert.deepEqual(calls.sort(), [...queries].sort());
  assert.equal(result.fetchedCount, 6);
  assert.equal(result.posts.length, 2);
  assert.ok(result.posts.every(item => item.query_hit_count === 3));
  assert.deepEqual(result.errors, []);
});

test("일부 검색어 오류와 조회 한도를 기록하고 나머지 결과는 보존", async () => {
  const result = await collectQueryResults(["수수료", "오류", "환급"], async query => {
    if (query === "오류") throw new AppError("검색 서버 연결 실패", 502);
    return { posts: [post(query)], truncated: query === "수수료" };
  }, Date.now() + 10000);
  assert.equal(result.posts.length, 1);
  assert.equal(result.posts[0].query_hit_count, 2);
  assert.equal(result.fetchedCount, 2);
  assert.equal(result.errors.length, 2);
  assert.match(result.errors[0], /^수수료:.*1,000/);
  assert.match(result.errors[1], /^오류: 검색 서버 연결 실패$/);
});

test("수집 기한이 지나면 새 검색 요청 없이 미처리 건수를 기록", async () => {
  let calls = 0;
  const result = await collectQueryResults(["수수료", "환급"], async () => {
    calls++;
    return { posts: [], truncated: false };
  }, 0);
  assert.equal(calls, 0);
  assert.deepEqual(result.posts, []);
  assert.match(result.errors[0], /검색어 2개/);
});
