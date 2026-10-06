import { resourceMutation } from "@/lib/resourceRoutes";
export const POST=(request:Request)=>resourceMutation(request,"own_posts");
export const PATCH=(request:Request)=>resourceMutation(request,"own_posts");
export const DELETE=(request:Request)=>resourceMutation(request,"own_posts");
