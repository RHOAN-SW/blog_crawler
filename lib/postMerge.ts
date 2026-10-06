import { normalizeNaverUrl } from "./urls";
import type { BlogPost } from "./types";

export function mergePostBatch(merged: Map<string, BlogPost>, posts: readonly BlogPost[]) {
  for (const post of posts) {
    const url = normalizeNaverUrl(post.post_url);
    if (!url) continue;
    const previous = merged.get(url);
    const queries = [...new Set([...(previous?.matched_queries ?? []), ...post.matched_queries])].sort();
    merged.set(url, {
      ...post,
      id: previous?.id ?? post.id,
      post_url: url,
      blog_url: normalizeNaverUrl(post.blog_url, "blog") ?? url.slice(0, url.lastIndexOf("/")),
      matched_queries: queries,
      query_hit_count: queries.length,
      first_seen_at: previous?.first_seen_at ?? post.first_seen_at,
      created_at: previous?.created_at ?? post.created_at,
    });
  }
}

export function uniqueBlogPosts(posts: readonly BlogPost[]) {
  const merged = new Map<string, BlogPost>();
  mergePostBatch(merged, posts);
  return [...merged.values()];
}
