import { loadDashboard } from "@/lib/repository";
import { errorResponse } from "@/lib/errors";
export const dynamic="force-dynamic";
export async function GET() {try{return Response.json(await loadDashboard());}catch(error){return errorResponse(error);}}
