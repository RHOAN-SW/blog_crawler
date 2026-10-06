import type { BlogPost } from "./types";
export function toCsv(posts: BlogPost[]): string {
  const escape=(value: string | number) => {
    let text=String(value);
    if (/^[\s]*[=+\-@\t\r]/.test(text)) text="'"+text;
    return '"'+text.replaceAll('"','""')+'"';
  };
  const rows: (string|number)[][] = [["작성일","제목","블로그명","URL","검색어 노출 수","매칭 검색어","주제","키워드"],
    ...posts.map(p=>[p.post_date,p.title,p.blog_name,p.post_url,p.query_hit_count,p.matched_queries.join(" | "),p.detected_topics.join(" | "),p.detected_keywords.join(" | ")])];
  return "\uFEFF"+rows.map(row=>row.map(escape).join(",")).join("\r\n");
}
