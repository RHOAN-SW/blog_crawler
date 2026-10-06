export function normalizeNaverUrl(raw: string, kind: "post" | "blog" = "post"): string | null {
  try {
    const url = new URL(raw);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.port || !["blog.naver.com","m.blog.naver.com"].includes(url.hostname.toLowerCase())) return null;
    const parts = url.pathname.split("/").filter(Boolean);
    let blogId: string | null = null, postId: string | null = null;
    if (/^(PostView|PostList)\.naver$/i.test(parts[0] ?? "")) {
      blogId = url.searchParams.get("blogId"); postId = url.searchParams.get("logNo");
    } else { blogId = parts[0] ?? null; postId = parts[1] ?? null; }
    if (!blogId || !/^[a-zA-Z0-9_-]+$/.test(blogId)) return null;
    if (kind === "blog") return "https://blog.naver.com/" + blogId;
    if (!postId || !/^\d+$/.test(postId)) return null;
    return "https://blog.naver.com/" + blogId + "/" + postId;
  } catch { return null; }
}
