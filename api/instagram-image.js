export default async function handler(req,res){
 try{
  if(req.method!=='GET')return res.status(405).end();
  const raw=String(req.query.url||'');let u=new URL(raw);
  if(u.protocol!=='https:'||!/(^|\.)(cdninstagram\.com|fbcdn\.net)$/.test(u.hostname))return res.status(400).json({error:'허용되지 않는 이미지 주소'});
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),18000);
  let r;try{r=await fetch(u.toString(),{headers:{'User-Agent':'Mozilla/5.0'},signal:controller.signal})}finally{clearTimeout(timer)}
  if(!r.ok)return res.status(502).json({error:'원본 이미지 서버 접근 실패'});
  const type=r.headers.get('content-type')||'';if(!type.startsWith('image/'))return res.status(502).json({error:'이미지 응답이 아닙니다'});
  const bytes=Buffer.from(await r.arrayBuffer());if(bytes.length>4000000)return res.status(413).json({error:'이미지가 너무 큽니다'});
  res.setHeader('Content-Type',type);res.setHeader('Cache-Control','private, max-age=300');return res.status(200).send(bytes)
 }catch(e){return res.status(500).json({error:e.message})}
}