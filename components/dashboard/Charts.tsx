"use client";
import { dailyCounts } from "@/lib/analysis";
import type { BlogPost } from "@/lib/types";
export function TrendChart({posts,from,to}:{posts:BlogPost[];from:string;to:string}) {
  const days=dailyCounts(posts,from,to),maximum=Math.max(4,...days.map(d=>d.count));
  const width=680,height=155,pad=16;
  const x=(i:number)=>pad+i*(width-2*pad)/Math.max(1,days.length-1);
  const y=(count:number)=>height-18-count*(height-35)/maximum;
  const path=days.map((d,i)=>(i?"L":"M")+x(i)+","+y(d.count)).join(" ");
  return <div className="trend-chart"><svg viewBox={"0 0 "+width+" "+height} role="img" aria-label={"일별 게시물 수: "+days.map(d=>d.date+" "+d.count+"개").join(", ")}>
    {[0,.5,1].map(r=><g key={r}><line x1={pad} y1={y(maximum*r)} x2={width-pad} y2={y(maximum*r)} stroke="#edf0f5" strokeDasharray={r?"4 5":undefined}/><text x={width-3} y={y(maximum*r)-5} textAnchor="end" fill="#9aa3b2" fontSize="10">{Math.round(maximum*r)}</text></g>)}
    <path d={path+" L"+x(days.length-1)+","+(height-18)+" L"+pad+","+(height-18)+" Z"} fill="#2f7df6" opacity=".055"/>
    <path d={path} fill="none" stroke="#2f7df6" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
    {days.length<=31 && days.map((d,i)=><circle key={d.date} cx={x(i)} cy={y(d.count)} r="3" fill="white" stroke="#2f7df6" strokeWidth="2"><title>{d.date+" · "+d.count+"개"}</title></circle>)}
  </svg><div className="chart-dates">{days.filter((_,i)=>i===0||i===days.length-1||i%Math.max(1,Math.round(days.length/5))===0).map(d=><span key={d.date}>{d.date.slice(5).replace("-",".")}</span>)}</div></div>;
}
export function TopicBars({items,onSelect}:{items:{name:string;count:number}[];onSelect:(name:string)=>void}) {
  const max=Math.max(1,...items.map(i=>i.count));
  return <div className="topic-bars">{items.slice(0,5).map((item,i)=><button key={item.name} className="topic-bar" onClick={()=>onSelect(item.name)}><span className="topic-bar-line"><span><span className="rank">{i+1}</span>{item.name}</span><strong>{item.count}<small>개</small></strong></span><span className="bar-track"><span style={{width:(item.count/max*100)+"%",background:i===0?"#2f7df6":"#b8d2fc"}}/></span></button>)}{!items.length&&<p className="muted">분석할 콘텐츠가 없습니다.</p>}</div>;
}
