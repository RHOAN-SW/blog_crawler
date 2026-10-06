import { resourceMutation } from "@/lib/resourceRoutes";
export const POST=(request:Request)=>resourceMutation(request,"competitors");
export const PATCH=(request:Request)=>resourceMutation(request,"competitors");
export const DELETE=(request:Request)=>resourceMutation(request,"competitors");
