-- Supabase SQL Editor에서 전체 실행. 재실행 가능.
create extension if not exists pgcrypto;
create table if not exists public.search_queries (
  id uuid primary key default gen_random_uuid(), query text not null unique check (length(query) between 1 and 100),
  active boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(), title text not null, description text not null default '',
  post_date date not null, blog_name text not null, blog_url text not null,
  post_url text not null unique check (post_url ~ '^https://blog\.naver\.com/[a-zA-Z0-9_-]+/[0-9]+$'),
  matched_queries jsonb not null default '[]'::jsonb check(jsonb_typeof(matched_queries)='array'),
  query_hit_count integer not null default 0 check(query_hit_count=jsonb_array_length(matched_queries)),
  detected_topics jsonb not null default '[]'::jsonb,
  detected_keywords jsonb not null default '[]'::jsonb,
  first_seen_at timestamptz not null default now(), last_seen_at timestamptz not null default now(), created_at timestamptz not null default now()
);
create table if not exists public.competitors (
  id uuid primary key default gen_random_uuid(), blog_name text not null,
  blog_url text not null unique, memo text not null default '', created_at timestamptz not null default now()
);
create table if not exists public.own_posts (
  id uuid primary key default gen_random_uuid(), title text not null, url text not null unique,
  post_date date not null, main_keyword text not null default '', topics jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create table if not exists public.collection_runs (
  id uuid primary key default gen_random_uuid(), started_at timestamptz not null default now(), finished_at timestamptz,
  status text not null check(status in ('running','success','partial','failed')),
  queries_count integer not null default 0, fetched_count integer not null default 0,
  saved_count integer not null default 0, errors jsonb not null default '[]'::jsonb
);
create table if not exists public.collection_lock (
  id integer primary key check(id=1), locked_until timestamptz not null default '-infinity', token uuid
);
insert into public.collection_lock(id) values(1) on conflict do nothing;
create index if not exists blog_posts_date_idx on public.blog_posts(post_date desc);
create index if not exists blog_posts_blog_date_idx on public.blog_posts(blog_url,post_date desc);
create index if not exists blog_posts_queries_idx on public.blog_posts using gin(matched_queries);
create index if not exists blog_posts_topics_idx on public.blog_posts using gin(detected_topics);
create index if not exists collection_runs_date_idx on public.collection_runs(started_at desc);
alter table public.search_queries enable row level security;
alter table public.blog_posts enable row level security;
alter table public.competitors enable row level security;
alter table public.own_posts enable row level security;
alter table public.collection_runs enable row level security;
alter table public.collection_lock enable row level security;
-- 익명 및 authenticated 역할의 직접 접근은 허용하지 않음. 서버 service_role만 접근.
revoke all on public.search_queries,public.blog_posts,public.competitors,public.own_posts,public.collection_runs,public.collection_lock from anon,authenticated;
grant all on public.search_queries,public.blog_posts,public.competitors,public.own_posts,public.collection_runs,public.collection_lock to service_role;
create or replace function public.jsonb_text_union(a jsonb,b jsonb)
returns jsonb language sql immutable set search_path=public as $$
  select coalesce(jsonb_agg(value order by value),'[]'::jsonb)
  from (select distinct jsonb_array_elements_text(a || b) as value) t;
$$;
create or replace function public.merge_blog_posts(incoming jsonb)
returns void language plpgsql set search_path=public as $$
declare item jsonb; queries jsonb;
begin
  for item in select * from jsonb_array_elements(incoming) loop
    queries:=public.jsonb_text_union('[]'::jsonb,item->'matched_queries');
    insert into public.blog_posts(title,description,post_date,blog_name,blog_url,post_url,matched_queries,query_hit_count,detected_topics,detected_keywords)
    values(item->>'title',item->>'description',(item->>'post_date')::date,item->>'blog_name',item->>'blog_url',item->>'post_url',
      queries,jsonb_array_length(queries),item->'detected_topics',item->'detected_keywords')
    on conflict(post_url) do update set
      title=excluded.title,description=excluded.description,blog_name=excluded.blog_name,blog_url=excluded.blog_url,post_date=excluded.post_date,
      matched_queries=public.jsonb_text_union(blog_posts.matched_queries,excluded.matched_queries),
      query_hit_count=jsonb_array_length(public.jsonb_text_union(blog_posts.matched_queries,excluded.matched_queries)),
      detected_topics=excluded.detected_topics,detected_keywords=excluded.detected_keywords,last_seen_at=now();
  end loop;
end;
$$;
create or replace function public.acquire_collection_lock()
returns uuid language plpgsql set search_path=public as $$
declare result uuid;
begin
  update public.collection_lock set locked_until=now()+interval '6 minutes',token=gen_random_uuid()
  where id=1 and locked_until<now() returning token into result;
  return result;
end;
$$;
create or replace function public.release_collection_lock(lock_token uuid)
returns void language sql set search_path=public as $$
  update public.collection_lock set locked_until='-infinity',token=null where id=1 and token=lock_token;
$$;
revoke execute on function public.jsonb_text_union(jsonb,jsonb),public.merge_blog_posts(jsonb),public.acquire_collection_lock(),public.release_collection_lock(uuid) from public,anon,authenticated;
grant execute on function public.jsonb_text_union(jsonb,jsonb),public.merge_blog_posts(jsonb),public.acquire_collection_lock(),public.release_collection_lock(uuid) to service_role;
-- 기존 설치에서 기본 검색어를 세분화합니다. 사용자 추가 검색어는 유지합니다.
update public.search_queries set active=false where query in (
 '네이버 커넥트','Npay 커넥트','네이버페이 커넥트','네이버 커넥트 단말기',
 'Npay 커넥트 단말기','네이버 단말기','네이버페이 단말기'
);
insert into public.search_queries(query)
select brand || ' ' || topic
from (values ('네이버 커넥트'),('Npay 커넥트'),('네이버페이 커넥트')) as brands(brand)
cross join (values
 ('수수료'),('환급'),('설치'),('무료설치'),('POS 연동'),('카드단말기'),
 ('사용방법'),('오류'),('후기'),('프로모션'),('페이스사인'),('얼굴결제')
) as topics(topic)
on conflict(query) do nothing;
