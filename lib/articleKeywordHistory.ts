export const ARTICLE_KEYWORD_HISTORY_KEY="connect-monitor-article-keyword-history-v1";
export const ARTICLE_KEYWORD_HISTORY_LIMIT=5;

export interface ArticleKeywordHistoryItem{
  id:string;
  createdAt:string;
  keywords:string[];
}

export function validKeywordList(value:unknown):value is string[]{
  return Array.isArray(value)&&value.length===40&&value.every(item=>typeof item==="string"&&item.trim().length>=2&&item.length<=100)
    &&new Set(value).size===40;
}

export function parseArticleKeywordHistory(value:string|null):ArticleKeywordHistoryItem[]{
  if(!value)return [];
  try{
    const parsed:unknown=JSON.parse(value);
    if(!Array.isArray(parsed))return [];
    return parsed.filter((item):item is ArticleKeywordHistoryItem=>{
      if(!item||typeof item!=="object")return false;
      const row=item as Record<string,unknown>;
      return typeof row.id==="string"&&row.id.length>0&&row.id.length<=100
        &&typeof row.createdAt==="string"&&!Number.isNaN(Date.parse(row.createdAt))
        &&validKeywordList(row.keywords);
    }).slice(0,ARTICLE_KEYWORD_HISTORY_LIMIT);
  }catch{return [];}
}

export function addArticleKeywordHistory(existing:ArticleKeywordHistoryItem[],keywords:string[],now=new Date(),id=crypto.randomUUID()):ArticleKeywordHistoryItem[]{
  if(!validKeywordList(keywords))return existing.slice(0,ARTICLE_KEYWORD_HISTORY_LIMIT);
  return [{id,createdAt:now.toISOString(),keywords:[...keywords]},...existing.filter(item=>item.id!==id)].slice(0,ARTICLE_KEYWORD_HISTORY_LIMIT);
}
