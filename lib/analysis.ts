import type { BlogPost, Competitor, Filters, OwnPost } from "./types";
import { keywordFrequency, extractKeywords } from "./keywordAnalyzer";
import { classifyTopics } from "./topicClassifier";
import { shiftDate } from "./dates";
export function filterPosts(posts: BlogPost[], filters: Filters, competitors: Competitor[]): BlogPost[] {
  const urls = new Set(competitors.map(c => c.blog_url));
  return posts.filter(p => p.post_date >= filters.from && p.post_date <= filters.to
    && (!filters.title || p.title.toLowerCase().includes(filters.title.toLowerCase()))
    && (!filters.query || p.matched_queries.includes(filters.query))
    && (!filters.topic || p.detected_topics.includes(filters.topic))
    && (!filters.blog || p.blog_url === filters.blog)
    && (!filters.competitorOnly || urls.has(p.blog_url)));
}
export function topicFrequency(posts: BlogPost[]) {
  const counts = new Map<string, number>();
  posts.forEach(p => new Set(p.detected_topics).forEach(t => counts.set(t,(counts.get(t) ?? 0)+1)));
  return [...counts].map(([name,count]) => ({name,count})).sort((a,b)=>b.count-a.count);
}
export function blogRanking(posts: BlogPost[]) {
  const counts = new Map<string,{name:string;url:string;count:number}>();
  posts.forEach(p=>{const entry=counts.get(p.blog_url) ?? {name:p.blog_name,url:p.blog_url,count:0}; entry.count++;counts.set(p.blog_url,entry);});
  return [...counts.values()].sort((a,b)=>b.count-a.count).slice(0,10);
}
export function dailyCounts(posts: BlogPost[], from: string, to: string) {
  const counts = new Map<string,number>(); posts.forEach(p=>counts.set(p.post_date,(counts.get(p.post_date)??0)+1));
  const result: {date:string;count:number}[]=[];
  for(let date=from;date<=to && result.length<366;date=shiftDate(date,1)) result.push({date,count:counts.get(date)??0});
  return result;
}
export function contentIdeas(posts: BlogPost[], own: OwnPost[], competitors: Competitor[]) {
  const designated = new Set(competitors.map(c=>c.blog_url));
  const source = designated.size ? posts.filter(p=>designated.has(p.blog_url)) : posts;
  const ownTopics = new Set(own.flatMap(p=>[...p.topics,...classifyTopics(p.title)]).filter(t=>t!=="기타"));
  const ownWords = new Set(own.flatMap(p=>extractKeywords(p.title+" "+p.main_keyword)));
  const candidates: {title:string;topic:string;count:number;blogs:number;reason:string}[]=[];
  const ownText=own.map(p=>p.title+" "+p.main_keyword).join(" ");
  const specific: {topic:string;title:string;match:RegExp;category?:string}[]=[
    {topic:"사업자 변경",title:"네이버 커넥트 사업자 변경, 매장 양도 전 체크리스트",match:/사업자\s*변경|명의\s*변경|매장\s*양도/u},
    {topic:"직원 사용법",title:"네이버 커넥트 설치 후 직원 교육과 사용법",match:/직원\s*(교육|사용)|직원.*사용법/u},
    {topic:"페이스사인",title:"네이버 커넥트 페이스사인, 얼굴결제 사용 가이드",match:/페이스\s*사인|얼굴\s*결제/u,category:"페이스사인"},
    {topic:"병원",title:"병원 네이버 커넥트 도입과 결제 운영 가이드",match:/병원|의원|치과/u,category:"병원"},
  ];
  const handled=new Set<string>();
  for(const candidate of specific){
    if(candidate.match.test(ownText) || (candidate.category&&ownTopics.has(candidate.category)))continue;
    const matching=source.filter(p=>candidate.match.test(p.title+" "+p.description));
    if(!matching.length)continue;
    const blogs=new Set(matching.map(p=>p.blog_url)).size;
    handled.add(candidate.topic);if(candidate.topic==="페이스사인")handled.add("얼굴결제");
    candidates.push({title:candidate.title,topic:candidate.topic,count:matching.length,blogs,reason:blogs+"곳의 "+(designated.size?"등록 경쟁":"수집")+" 블로그에서 "+matching.length+"개 글이 발견됐고, 자사 콘텐츠에서 이 주제의 글을 찾지 못했습니다."});
  }
  for(const topic of topicFrequency(source).filter(t=>t.name!=="기타"&&!ownTopics.has(t.name)&&!handled.has(t.name))) {
    const matching=source.filter(p=>p.detected_topics.includes(topic.name));
    const keywords=keywordFrequency(matching.map(p=>p.title)).filter(k=>!ownWords.has(k.name));
    const title="네이버 커넥트 "+topic.name.replace(" / "," · ")+" 실무 가이드";
    if (own.some(p => p.title === title || (keywords.length && p.main_keyword === keywords[0].name))) continue;
    const blogs=new Set(matching.map(p=>p.blog_url)).size;
    candidates.push({title,topic:topic.name,count:topic.count,blogs,reason:blogs+"곳의 "+(designated.size?"등록 경쟁":"수집")+" 블로그에서 "+topic.count+"개 글이 발견됐고, 자사 콘텐츠에 이 주제가 없습니다."});
  }
  return candidates.sort((a,b)=>b.blogs-a.blogs || b.count-a.count).slice(0,8);
}
