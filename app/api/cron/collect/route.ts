import { collect } from "@/lib/collector";
import { errorResponse } from "@/lib/errors";
export const maxDuration=300;
export async function GET(request:Request) {
  if(!process.env.CRON_SECRET || request.headers.get("authorization")!=="Bearer "+process.env.CRON_SECRET) return Response.json({error:"인증되지 않은 수집 요청입니다."},{status:401});
  try {const run=await collect();return Response.json(run,{status:run.status==="failed"?502:200});} catch(error){return errorResponse(error);}
}
