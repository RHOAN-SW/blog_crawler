export const LEGACY_DEFAULT_QUERIES = ["네이버 커넥트", "Npay 커넥트", "네이버페이 커넥트", "네이버 커넥트 단말기", "Npay 커넥트 단말기", "네이버 단말기", "네이버페이 단말기", "네이버 커넥트 카드단말기"];
export const QUERY_BRANDS = ["네이버 커넥트", "Npay 커넥트", "네이버페이 커넥트"];
export const QUERY_SUBTOPICS = ["수수료", "환급", "설치", "무료설치", "POS 연동", "카드단말기", "사용방법", "오류", "후기", "프로모션", "페이스사인", "얼굴결제"];
export const DEFAULT_QUERIES = QUERY_SUBTOPICS.flatMap(topic => QUERY_BRANDS.map(brand => `${brand} ${topic}`));
export const TOPICS = ["수수료 / 환급", "무료설치 / 무상지원", "POS 연동", "카드단말기", "리뷰", "네이버 플레이스", "페이스사인", "얼굴결제", "음식점", "카페", "병원", "학원", "미용 / 뷰티", "설치방법", "사용방법", "오류 / 문제해결", "신규창업", "프로모션", "기타"];
