import { cookies } from "next/headers";
import { sameOrigin } from "@/lib/operator-session";
async function proxy(request:Request){
  if(request.method!=="GET"&&!sameOrigin(request))return Response.json({message:"Please submit from HeyValla."},{status:403});
  const jar=await cookies();const guest=jar.get("heyvalla_demo_guest")?.value??crypto.randomUUID();
  if(!jar.has("heyvalla_demo_guest"))jar.set("heyvalla_demo_guest",guest,{httpOnly:true,sameSite:"lax",secure:new URL(request.url).protocol==="https:",path:"/",maxAge:30*24*3600});
  try{const response=await fetch(`${process.env.LARAVEL_API_URL??"http://127.0.0.1:8000"}/api/v1/journeys`,{method:request.method==="DELETE"?"POST":request.method,headers:{Accept:"application/json","Content-Type":"application/json","X-Demo-Guest":guest},body:request.method!=="GET"?JSON.stringify(await request.json()):undefined,cache:"no-store",signal:AbortSignal.timeout(15000)});if(response.status>=500)throw new Error();return Response.json(await response.json(),{status:response.status,headers:{"Cache-Control":"no-store"}});}catch{return Response.json({message:"Could not confirm the result. Refresh your requests before retrying with the same details."},{status:503});}
}
export const GET=proxy;export const POST=proxy;
