# Connect Monitor
이카드밴 콘텐츠 팀을 위한 네이버 커넥트 / Npay 커넥트 경쟁 블로그 모니터링 서비스입니다.
Next.js App Router, TypeScript, Tailwind CSS, Supabase, NAVER API HUB Blog Search API, Vercel Cron으로 구성했습니다. 별도 Python 서버가 필요하지 않습니다.

## 구현 기능
- **붙여넣은 글 키워드 40선**: 작성한 정보글(80~20,000자)을 분석하고, 기존 목록은 키워드 이름만 후보로 활용합니다. 네이버 검색광고 API에서 각 후보의 월간 PC·모바일 검색량과 연관어를 조회해, 단말기 판매와 글 내용에 맞는 10자 이하 키워드를 발굴합니다. 경쟁 비율(블로그 문서 수 ÷ 월간검색량, 황금 10 미만·중간 10~50·경쟁 50 이상)은 API가 정확한 월간검색량을 반환한 키워드에만 계산합니다. API가 검색량을 반환하지 않으면 숫자와 경쟁 등급을 비워 둡니다. 문서 수는 추천 때 NAVER Blog Search API로 다시 조회하고 최근 7일 검색 추이는 NAVER DataLab API의 상대지수로 확인합니다. '뜻밖의 발굴' 필터로 새 표현을 따로 볼 수 있습니다. 붙여넣은 본문은 저장하지 않고 후보 검색어만 API에 보냅니다.
  대시보드 왼쪽 메뉴 또는 `/article-keywords` 주소에서 바로 열 수 있습니다.
  추천 결과의 **전체 40개 엑셀 다운로드** 버튼으로 `.xlsx` 파일을 받을 수 있습니다. 첫 시트에는 순위와 검색량 출처·각 네이버 지표를 담고, 두 번째 시트에는 API 산정 기준·생성 시각을 기록합니다. 필터를 적용해도 파일에는 전체 40개가 들어갑니다.
  최근 성공한 조회 5건은 키워드 40개 문자열만 브라우저 저장소에 보관합니다. 원문과 조회 지표는 저장하지 않습니다. 각 기록의 목록을 다시 펼치거나 키워드 전용 `.xlsx`를 다운로드할 수 있습니다. 브라우저 저장소를 지우거나 다른 기기에서 접속하면 이 기록은 보이지 않습니다.
- 첫 화면의 키워드·글감 추천: 네이버 커넥트 관련 글에 한해 완료된 최근 7일과 직전 7일 비교, 작성 블로그 수, 자사 주제 중복, 추천 제목·목차·근거 글
- VAN사의 단말기 판매와 연결되는 도입·비용·구매/임대·설치 서류·POS 호환·교체·정산 등의 실무 주제만 추천합니다. 브랜드가 언급되어도 소비자 축제·예매·쿠폰 글은 추천 근거에서 제외합니다. 수집 표본이 적거나 이전 기간 자료가 부족하면 상승 판단을 보류합니다.
- 추천 카드와 복사 가능한 글감에는 고객 단계, 사장님의 질문, 주제별 정보글 목차, 견적·설치 상담 시 전달할 내용을 포함합니다. 실제 가격·지원·혜택을 만들어 내지 않고 확인할 항목을 제시합니다.
- 실제 검색 추이 버튼: NAVER API HUB의 Data Lab → 검색어 트렌드 API로 상단 최대 5개 후보 확인. 상대 검색지수의 전주 대비 변화이며 절대 검색량·검색광고 경쟁지수와 다름
- NAVER 공식 검색 API의 날짜순 결과 수집, 허용 도메인 검증, URL 정규화, 중복 제거
- 결제 단말기와 무관한 쇼핑·여행·브랜드커넥트 및 쿠팡 제휴 글 제외, 제휴 고지의 수수료 문구와 ‘포스팅’의 POS 오탐 방지
- 최근 14일 기본 분석, 오늘 / 7일 / 30일 / 직접 설정(최대 366일)
- 실시간 검색 및 서버 저장, 검색어 추가·활성화·삭제, 수동·매일 자동 수집
- KPI 및 이전 기간 대비 변화, 발행 추이, 주제·키워드 빈도, 블로그 TOP 10
- 주제·검색어·블로그·경쟁사·제목 필터, 현재 결과 CSV, 상세 분석
- 경쟁사 등록·수정·삭제, 경쟁사별 주제·키워드·최근 글 비교
- 자사 콘텐츠 등록·수정·삭제, 미발행 주제 기반 글감 추천
- 비밀번호 로그인, 서명된 HttpOnly 쿠키, 서버 전용 자격 증명, Cron 인증, DB 수집 잠금

## 로컬 실행
Node.js 22 이상이 필요합니다.
```bash
npm ci
cp .env.example .env.local
npm run dev
```
Windows PowerShell에서는 `Copy-Item .env.example .env.local`을 사용합니다.
http://localhost:3000 에서 확인합니다. API 키 없이 로컬 개발하면 데모 모드로 시작합니다.
데모 데이터와 블로그 URL은 예시이며 실제 검색 결과가 아닙니다. 데모 관리 변경은 서버 재시작 시 초기화됩니다.
`DEMO_MODE=true`로 데모를 명시할 수 있고, `DEMO_MODE=false`로 실제 연결을 강제할 수 있습니다.
키를 일부만 입력한 경우에는 실제 연결 오류를 표시합니다.

이 작업 환경에는 시스템 Node.js가 없어 공식 Node.js 22 실행 파일을 `.tools/node-v22.23.3-win-x64`에 준비했습니다.
현재 PowerShell 창에서 실행 경로를 설정하려면:
```powershell
$env:PATH = "$PWD\.tools\node-v22.23.3-win-x64;" + $env:PATH
npm.cmd run dev
```
`.tools`는 Git과 배포에 포함되지 않습니다.

## NAVER API 설정
1. [NAVER Cloud Platform](https://www.ncloud.com/) 콘솔의 Application Services > **NAVER API HUB**에서 서비스를 신청합니다.
2. Application을 등록하고 **NAVER 검색 > 블로그** API를 선택합니다.
   실제 검색 추이까지 보려면 같은 Application에 **Data Lab > 검색어 트렌드**를 추가합니다. 연결 오류는 화면에 표시하며 블로그 언급 증가로 대신 표시하지 않습니다.
3. 해당 Application의 **인증 정보**에서 Client ID와 Client Secret을 복사합니다.
4. 환경 변수 `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`을 서버에 설정합니다.
5. 실제 수집은 `https://naverapihub.apigw.ntruss.com/search/v1/blog`에 `X-NCP-APIGW-API-KEY-ID`, `X-NCP-APIGW-API-KEY` 인증 헤더를 보내 실행합니다.

NAVER API HUB에서 발급받은 키를 사용합니다. 기존 개발자 센터용 키와 호출 주소는 호환되지 않습니다. [공식 이관 가이드](https://guide.ncloud-docs.com/docs/apihub-migration)

[공식 Blog Search API 문서](https://api.ncloud-docs.com/docs/naver-api-hub-search-blog) 기준으로
한 번에 100건을 요청하고 날짜순으로 페이지를 이동합니다.
검색어별 최초 1,000건 범위 안에서만 수집하며 기간 이전 글이 나오면 중단합니다.
범위 내 결과가 검색 한도를 넘으면 결과 누락 가능성을 화면 알림과 수집 기록에 표시합니다.
API 결과는 네이버가 검색에 포함한 글의 범위이며 전체 블로그 발행량을 의미하지 않습니다.

## Supabase 설정 및 SQL
1. Supabase 프로젝트를 생성합니다.
2. SQL Editor에서 [supabase/schema.sql](supabase/schema.sql) 전체를 실행합니다.
3. Project URL을 `SUPABASE_URL`에 입력합니다.
4. Settings > API Keys에서 서버용 Secret key를 `SUPABASE_SECRET_KEY`에 입력합니다. 기존 service_role 키는 `SUPABASE_SERVICE_ROLE_KEY`로도 사용할 수 있습니다. 두 키 모두 서버에서만 사용합니다.
5. 대시보드에서 **새로 수집**을 눌러 확인합니다.

테이블:
| 테이블 | 역할 |
| --- | --- |
| search_queries | 브랜드 3개 × 세부 주제 12개 = 기본 검색어 36개, 수집 활성 상태 |
| blog_posts | 정규화된 URL을 UNIQUE 키로 저장한 글 |
| competitors | 지정 경쟁 블로그 및 메모 |
| own_posts | 자사 기존 콘텐츠 |
| collection_runs | 수집 성공·부분 실패·오류 기록 |
| collection_lock | 중복 수집 방지, 만료 및 소유 토큰 |

SQL에는 날짜·블로그·JSONB 인덱스, RLS, 서비스 역할 권한과 RPC가 포함되어 있습니다.
익명 및 authenticated 역할은 직접 테이블·RPC에 접근할 수 없습니다.
`merge_blog_posts`는 PostgreSQL 트랜잭션 안에서 URL 충돌을 처리하고 검색어 집합을 합칩니다.
반복 수집으로 검색어 노출 수가 늘어나는 것이 아니라 **서로 다른 검색어의 누적 개수**를 저장합니다.
기존 글의 최초 발견일과 생성일을 유지하고 마지막 발견일을 갱신합니다.

기본 검색어는 네이버 커넥트 / Npay 커넥트 / 네이버페이 커넥트에 수수료, 환급, 설치, 무료설치, POS 연동, 카드단말기, 사용방법, 오류, 후기, 프로모션, 페이스사인, 얼굴결제를 붙인 36개입니다. 각 검색어를 별도로 조회하며 최대 3개 요청을 동시에 처리합니다.
모바일·PC·PostView 주소를 같은 URL로 정규화하고, 여러 검색어의 중복 결과를 하나로 합쳐 저장합니다. 기존 DB에 있는 글도 새 행을 만들지 않고 검색어 정보와 마지막 발견일을 갱신합니다. 수집 기록에는 발견 건수, 중복 제외 건수, 저장·갱신 건수를 표시합니다.

기존 설치는 [세부 검색어 전환 SQL](supabase/migrations/20260929_segmented_search_queries.sql)을 한 번 적용합니다. 기존 기본 검색어 8개 중 넓은 검색어 7개는 비활성화하고, 새 세부 검색어와 같은 `네이버 커넥트 카드단말기`는 재사용합니다. 기존 글과 사용자 추가 검색어는 유지합니다. SQL을 재실행해도 같은 검색어를 중복 등록하지 않습니다.
세부 검색어에도 API 조회 한도는 적용되므로 결과가 많은 세부 검색어는 추가로 나눌 수 있습니다.
제휴 글 제외 기준은 `lib/contentPolicy.ts`에 있습니다. 제목·검색 요약에 제휴 서비스가 나타나고, 고지를 제외한 텍스트에서 결제 단말기 관련 근거를 찾지 못하면 신규 저장과 대시보드 분석에서 제외합니다. 실제 단말기 리뷰는 유지합니다. 기존 저장 자료도 조회 시 동일한 기준으로 제외하고 주제를 다시 분류하므로 재수집 없이 집계가 수정됩니다. 원본 DB 자료는 보존하며, 검색 요약만으로 판단하므로 본문 전체의 관련성을 보장하지는 않습니다.
[RLS 참고 문서](https://supabase.com/docs/guides/database/postgres/row-level-security)

## 환경 변수
| 변수 | 설명 |
| --- | --- |
| NAVER_CLIENT_ID | NAVER API HUB Application의 Client ID |
| NAVER_CLIENT_SECRET | 동일 Application의 Client Secret |
| SUPABASE_URL | Supabase 프로젝트 URL |
| SUPABASE_SECRET_KEY | 서버용 Secret key (권장) |
| SUPABASE_SERVICE_ROLE_KEY | 기존 서버용 service_role 키 (대체 가능) |
| CRON_SECRET | Cron Bearer 인증, 16자 이상의 무작위 문자열 권장 |
| DASHBOARD_PASSWORD | 내부 워크스페이스 비밀번호, 프로덕션 필수 |
| AUTH_SECRET | 로그인 쿠키 서명, 32자 이상의 무작위 문자열, 프로덕션 필수 |
| DEMO_MODE | true: 예시 데이터, false: 실제 수집, 생략: 로컬에서만 자동 판단 |

모든 자격 증명은 서버 전용입니다. `NEXT_PUBLIC_` 접두사를 사용하지 마세요.
프로덕션은 키가 없어도 자동으로 데모로 전환하지 않으며, 로그인 구성이 없으면 접근이 허용되지 않습니다.
세션은 12시간 동안 유효합니다.

## Vercel 배포
1. 프로젝트를 Git 저장소에 올리고 Vercel에서 Import합니다.
2. Framework Preset은 Next.js, Node.js는 22.x 이상을 선택합니다.
3. 위 환경 변수를 Production 환경에 모두 입력하고 `DEMO_MODE=false`를 설정합니다.
4. Supabase SQL 적용을 마친 뒤 Deploy합니다.
5. 설정한 비밀번호로 로그인하고 **새로 수집**을 실행합니다.
6. Vercel Settings → Cron Jobs에서 자동 수집을 확인합니다.
7. 팀 공유용 데모 배포는 `DEMO_MODE=true`와 로그인 환경 변수로 만들 수 있습니다.

빌드 명령은 `npm run build`, 설치는 `npm ci`입니다.
실제 Vercel 배포와 NAVER·Supabase 계정 연결은 해당 계정 및 자격 증명이 필요합니다.

## Cron 설정
`vercel.json`:
```json
{
  "crons": [
    { "path": "/api/cron/collect", "schedule": "0 21 * * *" }
  ]
}
```
Vercel Cron은 UTC 기준이므로 UTC 21:00이 다음 날 오전 06:00 KST입니다.
`CRON_SECRET`이 설정되면 Vercel이 `Authorization: Bearer <CRON_SECRET>`을 자동 전송합니다.
누락되거나 잘못된 인증은 항상 401로 거부됩니다.
[공식 Cron 문서](https://vercel.com/docs/cron-jobs), [Cron 보안](https://vercel.com/docs/cron-jobs/manage-cron-jobs)

수집 경로는 `maxDuration=300`이며 실제 실행 시간은 Vercel 요금제의 함수 제한에 영향을 받습니다.
Hobby의 일일 Cron은 지정 시각의 해당 시간대 안에서 실행될 수 있습니다.
정확한 분 단위 실행이 필요하면 해당 기능을 지원하는 요금제를 선택하세요.
[요금제별 Cron 제약](https://vercel.com/docs/cron-jobs/usage-and-pricing)
함수 제한을 넘은 수집은 Vercel 로그에서 확인하며, DB 잠금은 6분 뒤 자동 만료되어 재실행할 수 있습니다.

## 수집 및 분석 구조
```text
Cron / 수동 수집
  → 활성 검색어 조회
  → DB 수집 잠금 획득
  → NAVER 날짜순 검색 (최근 30일)
  → 네이버 URL 검증·정규화 및 HTML 강조 제거
  → 제목·검색 요약의 주제 분류 / 제목 키워드 분석
  → 검색어별 결과를 URL로 합치기
  → Supabase RPC로 기존 검색어와 원자적으로 병합
  → 수집 기록 저장·잠금 해제
  → 대시보드 분석
```
초기 수집은 최근 30일을 포함해 14일 대시보드와 이전 기간 비교를 지원합니다.
대시보드는 저장된 최근 730일 데이터를 페이지 단위로 읽습니다.
실시간 검색은 선택 기간(최대 366일)을 검색하고 결과를 저장하며, 등록 검색어에 자동 추가하지 않습니다.
검색어 삭제·비활성화는 이미 저장된 매칭 기록을 지우지 않습니다.
검색 노출도는 수집 이력 전체에서 누적된 서로 다른 검색어 수이며 실시간 검색 순위를 의미하지 않습니다.
주제·키워드 빈도는 **글당 언급 횟수(최대 1회)**입니다. 여러 주제를 가진 글은 각 주제에 포함됩니다.
이전 기간 데이터가 없으면 증가율을 계산하지 않습니다.

주제 분류는 `lib/topicClassifier.ts`, 키워드 추출은 `lib/keywordAnalyzer.ts`,
글감 추천은 `lib/analysis.ts`에 분리했습니다.
등록 경쟁사가 있으면 해당 경쟁사 글에서, 없으면 전체 수집 블로그에서 후보를 만듭니다.
기존 자사 글의 주제·제목·메인키워드와 비교해 이미 다룬 주제를 제외합니다.
규칙 기반 분류이므로 표현이 비슷한 글이나 매우 구체적인 하위 주제에는 수동 검토가 필요합니다.
경쟁사·자사 글 URL은 네이버 블로그 주소만 허용합니다.

## 조회수를 제공하지 않는 이유
글감 추천은 `data/keyword-seeds.json`의 36개 키워드 이름만 후보로 사용합니다. 넓은 주제어를 입력하면 단말기 판매와 관련된 10자 이하 키워드를 펼쳐 보여 주고, 네이버 검색광고 API 월간검색량과 Blog Search API 문서 수를 자동 조회해 `블로그 문서 수 ÷ 월간 검색량` 비율을 비교합니다. API가 검색량을 주지 않으면 숫자와 비율을 비워 둡니다. 별표 선택은 현재 브라우저에 저장되며, 선택한 키워드로 상담형 글감 목차를 열 수 있습니다. 0건·조회 실패는 저경쟁으로 분류하지 않습니다.

키워드 추천의 ‘발행 블로그 적음’은 최근 관련 글 3개 이상, 서로 다른 작성 블로그 2~3곳인 표본에만 붙입니다. 검색량이 검증되기 전에는 저경쟁이면서 수요가 있다는 결론을 내리지 않습니다. 오늘은 미완료 기간이므로 키워드 비교에서 제외하며, 등록 자사 블로그도 경쟁 표본에서 제외합니다. 최근 수집이 부분 실패한 경우 화면에 누락 가능성을 안내합니다.

공식 NAVER Blog Search API 응답에는 경쟁 블로그의 정확한 조회수가 없습니다.
따라서 조회수·방문자 수를 생성하거나 추정하지 않습니다.
**발행 빈도**와 **검색어 노출 수**를 서로 다른 지표로 표시합니다.
네이버 블로그 본문을 별도로 크롤링하거나 CAPTCHA·로그인·rate limit을 우회하지 않습니다.

## 검증
```bash
npm run lint
npm run typecheck
npm test
npm run build
```
테스트는 URL 정규화와 도메인 거부, KST 경계, 다중 주제, 불용어, 필터,
자사 주제 제외, CSV 수식 주입 방지, NAVER API 모의 응답·페이지 이동·오류,
로그인 쿠키와 요청 Origin 검증을 포함합니다.
실제 NAVER·Supabase 호출은 발급받은 키와 SQL을 연결한 후 별도로 확인해야 합니다.

## 브라우저 검증 및 화면 캡처
`npm run smoke`는 실행 중인 로컬 서버에서 검색·필터·상세·CSV·검색어·경쟁사·자사 콘텐츠·글감·모바일 화면을 확인합니다.
Windows에서는 설치된 Microsoft Edge를 사용합니다. 다른 환경은 `npx playwright install chromium`으로 브라우저를 준비합니다.
`SMOKE_BASE_URL`(기본 http://127.0.0.1:3000), `SMOKE_PASSWORD`, `SMOKE_BROWSER_CHANNEL`로 검증 환경을 선택할 수 있습니다.
이 검증은 데모 데이터를 추가·삭제하므로 데모 서버에서 실행하세요.
스크린샷은 `artifacts/dashboard-desktop.png`, `artifacts/dashboard-mobile.png`에 저장됩니다.
자동 테스트에는 PostgreSQL 엔진(PGlite)에서 SQL 재실행·중복 병합·검색어 누적·수집 잠금·역할 권한 검증과 제휴 글 제외·주제 오탐·필터 후 페이지 이동 검증도 포함합니다.
