import {test} from "node:test";
import assert from "node:assert/strict";
import {addArticleKeywordHistory,parseArticleKeywordHistory,validKeywordList} from "../lib/articleKeywordHistory";
import {POST} from "../app/api/article-keywords/history/export/route";

const keywords=Array.from({length:40},(_,index)=>`카드단말기키워드${index+1}`);

test("최근 조회 5건에는 원문 없이 키워드 40개만 남음",()=>{
  let history:ReturnType<typeof addArticleKeywordHistory>=[];
  for(let index=0;index<6;index++)history=addArticleKeywordHistory(history,keywords,new Date(2026,9,1+index),String(index));
  assert.equal(history.length,5);
  assert.equal(history[0].id,"5");
  assert.equal(history.at(-1)?.id,"1");
  const stored=JSON.stringify(history);
  assert.ok(!stored.includes("본문"));
  assert.deepEqual(parseArticleKeywordHistory(stored),history);
  assert.deepEqual(parseArticleKeywordHistory("not-json"),[]);
  assert.equal(validKeywordList([...keywords.slice(0,39),keywords[0]]),false);
});

test("저장한 키워드 목록은 키워드 전용 XLSX로 내려받고 잘못된 목록은 거부",async()=>{
  const url="https://localhost/api/article-keywords/history/export";
  const headers={origin:"https://localhost",host:"localhost","Content-Type":"application/json"};
  const response=await POST(new Request(url,{method:"POST",headers,body:JSON.stringify({keywords})}));
  assert.equal(response.status,200);
  assert.match(response.headers.get("content-type")??"",/spreadsheetml/);
  assert.equal(Buffer.from(await response.arrayBuffer()).subarray(0,4).toString("hex"),"504b0304");
  const invalid=await POST(new Request(url,{method:"POST",headers,body:JSON.stringify({keywords:["하나"]})}));
  assert.equal(invalid.status,400);
});
