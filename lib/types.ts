export interface BlogPost {
  id: string; title: string; description: string; post_date: string;
  blog_name: string; blog_url: string; post_url: string;
  matched_queries: string[]; query_hit_count: number;
  detected_topics: string[]; detected_keywords: string[];
  first_seen_at: string; last_seen_at: string; created_at: string;
}
export interface SearchQuery { id: string; query: string; active: boolean; created_at: string }
export interface Competitor { id: string; blog_name: string; blog_url: string; memo: string; created_at: string }
export interface OwnPost { id: string; title: string; url: string; post_date: string; main_keyword: string; topics: string[]; created_at: string }
export interface CollectionRun {
  id: string; started_at: string; finished_at: string | null; status: "running" | "success" | "partial" | "failed";
  queries_count: number; fetched_count: number; saved_count: number; errors: string[];
}
export interface DashboardData {
  mode: "demo" | "live"; posts: BlogPost[]; queries: SearchQuery[]; competitors: Competitor[]; ownPosts: OwnPost[];
  lastRun: CollectionRun | null; error: string | null;
}
export type Section = "overview" | "article" | "posts" | "topics" | "competitors" | "own" | "ideas" | "settings";
export interface Filters { from: string; to: string; title: string; query: string; topic: string; blog: string; competitorOnly: boolean }
