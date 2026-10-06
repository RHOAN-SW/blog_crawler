export class AppError extends Error { constructor(message: string, public status=500) { super(message); } }
export function errorMessage(error: unknown): string {
  return error instanceof AppError ? error.message : "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";
}
export function errorResponse(error: unknown) {
  console.error("[connect-monitor]",error instanceof Error ? error.message : "Unknown error");
  return Response.json({error:errorMessage(error)},{status:error instanceof AppError?error.status:500});
}
