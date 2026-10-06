import { mergePostBatch } from "./postMerge";
import { errorMessage } from "./errors";
import type { BlogPost } from "./types";

interface QueryResult { posts: BlogPost[]; truncated: boolean }

export async function collectQueryResults(
  queries: readonly string[],
  search: (query: string) => Promise<QueryResult>,
  deadline: number,
) {
  const merged = new Map<string, BlogPost>();
  const failures: (string | undefined)[] = Array(queries.length);
  let next = 0;
  let fetchedCount = 0;

  async function worker() {
    while (next < queries.length && Date.now() < deadline) {
      const index = next++;
      const query = queries[index];
      try {
        const result = await search(query);
        fetchedCount += result.posts.length;
        mergePostBatch(merged, result.posts);
        if (result.truncated) failures[index] = `${query}: API 검색 한도(1,000건)에 도달해 일부 결과가 제외됐습니다.`;
      } catch (error) {
        failures[index] = `${query}: ${errorMessage(error)}`;
      }
    }
  }

  // 작은 동시 요청 수로 검색어를 빠짐없이 처리하며, URL 병합은 동기적으로 수행합니다.
  await Promise.all(Array.from({ length: Math.min(3, queries.length) }, worker));
  const errors = failures.filter((error): error is string => Boolean(error));
  if (next < queries.length) errors.push(`실행 시간 제한으로 검색어 ${queries.length - next}개를 수집하지 못했습니다. 다시 수집해 주세요.`);
  return { posts: [...merged.values()], fetchedCount, errors };
}
