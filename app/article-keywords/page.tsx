import { ArticleWorkspace } from "@/components/dashboard/ArticleWorkspace";
import { isDemoMode } from "@/lib/config";

export default function ArticleKeywordsPage(){
  return <ArticleWorkspace mode={isDemoMode()?"demo":"live"}/>;
}
