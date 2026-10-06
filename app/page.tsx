import { Dashboard } from "@/components/dashboard/Dashboard";
import { loadDashboard } from "@/lib/repository";
import { isDemoMode } from "@/lib/config";
import { errorMessage } from "@/lib/errors";
import type { DashboardData,Section } from "@/lib/types";
export const dynamic="force-dynamic";
const sections:Section[]=["overview","article","posts","topics","competitors","own","ideas","settings"];
export default async function Page({searchParams}:{searchParams:Promise<{section?:string;activity?:string}>}) {
  const params=await searchParams;
  const section:Section=params.section&&sections.includes(params.section as Section)?params.section as Section:"overview";
  let data:DashboardData;
  try {data=await loadDashboard();} catch(error) {data={mode:isDemoMode()?"demo":"live",posts:[],queries:[],competitors:[],ownPosts:[],lastRun:null,error:errorMessage(error)};}
  return <Dashboard initialData={data} initialSection={section} showActivity={params.activity==="1"}/>;
}
