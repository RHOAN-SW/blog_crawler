import { collect } from "@/lib/collector";
import { assertSameOrigin } from "@/lib/auth";
import { errorResponse } from "@/lib/errors";
export const maxDuration=300;
export async function POST(request:Request) {try {assertSameOrigin(request);const run=await collect();return Response.json(run,{status:run.status==="failed"?502:200});}catch(error){return errorResponse(error);}}
