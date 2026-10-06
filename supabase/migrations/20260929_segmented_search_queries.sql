-- 기존 넓은 검색어 7개는 비활성화하고 브랜드 3개 × 세부 주제 12개를 등록합니다.
-- 기존 '네이버 커넥트 카드단말기'는 새 세부 검색어에도 포함되어 재사용합니다.
-- 기존 글 및 사용자 추가 검색어를 유지합니다. 재실행해도 중복 등록하지 않습니다.
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
