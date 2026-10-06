import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { assertSameOrigin, matchesPassword, createSession, SESSION_COOKIE, authConfigured } from "@/lib/auth";
import { errorResponse, AppError } from "@/lib/errors";
export async function POST(request:Request) {
  try {
    assertSameOrigin(request);
    if(!authConfigured()) throw new AppError("서버에 DASHBOARD_PASSWORD와 32자 이상의 AUTH_SECRET을 설정해 주세요.",503);
    const body=await request.json();
    if(typeof body.password!=="string" || body.password.length>512 || !matchesPassword(body.password)) throw new AppError("비밀번호가 올바르지 않습니다.",401);
    const response=NextResponse.json({success:true});
    response.cookies.set(SESSION_COOKIE,createSession(),{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",path:"/",maxAge:43200});
    return response;
  } catch(error) {return errorResponse(error);}
}
export async function DELETE(request:Request) {
  try {assertSameOrigin(request);(await cookies()).delete(SESSION_COOKIE);return Response.json({success:true});} catch(error){return errorResponse(error);}
}
