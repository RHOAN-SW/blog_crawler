import { analysisText, isExcludedContent } from "./contentPolicy";

const product=/(?:네이버(?:페이)?|n\s*pay)\s*커넥트|pay\s*connect|페이스\s*사인|face\s*sign/iu;
const merchant=/단말기|카드\s*리더|\bpos\b|포스\s*(기|연동|시스템)|매장|가맹점|사업자|사장님|설치|도입|교체|개업|창업|정산|카드\s*수수료/iu;
const consumerEvent=/넾페스타|페스티벌|축제|콘서트|라인업|티켓|예매|팝업|쿠폰|여행|쇼핑/iu;
const strongSales=/단말기|카드\s*리더|\bpos\b|포스\s*(기|연동|시스템)|가맹점|사업자|설치|도입|교체|정산|카드\s*수수료/iu;

export function isTerminalSalesContent(title:string,description:string){
  if(isExcludedContent(title,description))return false;
  const cleanTitle=analysisText(title),text=cleanTitle+" "+analysisText(description);
  if(!product.test(text)||!merchant.test(text))return false;
  // 소비자 행사 글의 결제수단 안내만으로 판매용 정보글의 근거로 삼지 않습니다.
  return !consumerEvent.test(cleanTitle)||strongSales.test(cleanTitle);
}

export function salesBrief(topic:string){
  const support=["직원 사용법","결제 오류","정산","얼굴결제"];
  const transfer=["사업자 변경","단말기 교체","해지 및 반납"];
  const stage=transfer.includes(topic)?"교체·이전 상담":support.includes(topic)?"운영·사후관리":"도입·구매 검토";
  const questions:Record<string,string>={
    "설치 비용":"단말기 구매·임대·설치 비용을 합치면 얼마인가요?",
    "구매와 임대":"구매와 임대 중 우리 매장에 어떤 방식이 맞나요?",
    "단말기 교체":"기존 단말기를 바꿀 때 계약과 결제 중단을 어떻게 확인하나요?",
    "POS 연동":"지금 쓰는 POS를 유지하면서 네이버 커넥트를 설치할 수 있나요?",
    "수수료 환급":"우리 가맹점의 수수료와 환급 적용 조건은 무엇인가요?",
    "무료 설치":"무료 설치라고 해도 임대료·약정·추가 비용이 있나요?",
    "설치 서류":"신규 가맹점 신청과 단말기 설치에 어떤 서류가 필요한가요?",
    "유선 무선 비교":"매장 동선에 맞는 유선·무선 단말기는 어떻게 고르나요?",
    "사업자 변경":"사업자나 명의가 바뀌면 단말기와 가맹점 계약은 어떻게 처리하나요?",
    "결제 오류":"결제가 끊기면 어떤 점검과 A/S를 받을 수 있나요?",
    "정산":"결제 대금은 언제 들어오고 어디서 확인하나요?",
    "해지 및 반납":"교체 전에 기존 약정·위약금·반납 조건은 무엇을 확인하나요?",
  };
  const question=questions[topic]??`${topic}을 고려할 때 우리 매장의 설치 조건과 운영 환경에서 무엇을 확인해야 하나요?`;
  const cta=stage==="운영·사후관리"
    ?"현재 단말기 모델·POS·증상을 알려주시면 점검 및 지원 가능 범위를 안내받을 수 있도록 문의 방법을 적어 주세요."
    :"업종·지역·기존 POS 모델·희망 설치일을 알려주시면 호환 여부와 설치 견적을 확인할 수 있도록 상담 방법을 적어 주세요.";
  const specifics:Record<string,string[]>={
    "설치 비용":["단말기 본체·설치·통신·임대 비용 구분","약정 기간·해지 비용을 포함한 견적 비교"],
    "구매와 임대":["구매·임대의 초기 비용과 유지 비용 비교","A/S·소유권·약정 종료 조건 확인"],
    "POS 연동":["기존 POS 제조사·모델·버전 확인","연동 지원 여부와 테스트·설치 절차"],
    "수수료 환급":["가맹점 유형별 적용 기준과 공식 확인 경로","환급 대상·기간·신청 여부 확인 방법"],
    "무료 설치":["무상 제공 범위와 유상 항목 구분","임대·통신·약정·해지 조건 확인"],
    "결제 오류":["통신·전원·결제 상태를 구분한 초기 점검","A/S 접수에 필요한 모델·오류 화면·발생 시각"],
  };
  return {stage,question,cta,outline:[question,...(specifics[topic]??[`${topic} 관련 설치·계약·운영 조건 확인`,"현재 단말기·POS 환경별 준비 사항과 공식 확인 경로"]),"매장별 확인 체크리스트와 상담 시 전달할 정보"]};
}
