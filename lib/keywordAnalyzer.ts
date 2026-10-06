const stopwords = new Set(["하는","이유","방법","알아보기","정리","추천","대해","그리고","입니다","네이버","네이버페이","npay","커넥트","위한","함께","완벽","가이드","총정리","대한","이번","있는","있습니다","알아보세요","이렇게","어떻게","블로그"]);
const important = ["수수료","환급","설치","무료","리뷰","음식점","포스","페이스사인","결제","카드단말기","카페","병원","학원","플레이스","창업","연동","사업자","직원","오류","프로모션","뷰티"];
export function extractKeywords(title: string): string[] {
  const clean = title.toLowerCase();
  const keywords = new Set(important.filter(word => clean.includes(word)));
  for (const raw of clean.match(/[가-힣a-z]{2,}/g) ?? []) {
    const word = raw.replace(/(에서는|에서|으로|에게|까지|부터|이란|하는|하기|입니다|은|는|을|를|와|과)$/u, "");
    if (word.length >= 2 && !stopwords.has(word) && !important.some(key => word.includes(key))) keywords.add(word === "pos" ? "포스" : word);
  }
  return [...keywords];
}
export function keywordFrequency(titles: string[]): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const title of titles) for (const word of extractKeywords(title)) counts.set(word, (counts.get(word) ?? 0) + 1);
  return [...counts].map(([name,count]) => ({name,count})).sort((a,b) => b.count-a.count || a.name.localeCompare(b.name,"ko"));
}
