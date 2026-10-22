export default async function handler(req,res){
 if(req.method!=='POST')return res.status(405).json({error:'POST only'});
 try{
  const url=String(req.body?.url||'').trim();
  if(!/^https:\/\/(www\.)?instagram\.com\/(p|reel)\/[a-zA-Z0-9_-]+\/?(?:\?.*)?$/.test(url))return res.status(400).json({error:'공개 인스타그램 게시물 링크를 입력하세요.'});
  const token=process.env.APIFY_API_TOKEN;if(!token)return res.status(500).json({error:'APIFY_API_TOKEN 환경 변수가 없습니다. Preview 재배포가 필요할 수 있습니다.'});
  const clean=url.split('?')[0];
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),115000);
  let response;
  try{response=await fetch('https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items?timeout=110&format=json',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({directUrls:[clean],resultsType:'posts',resultsLimit:1,addParentData:false}),signal:controller.signal});}finally{clearTimeout(timer)}
  const data=await response.json().catch(()=>null);
  if(!response.ok)throw Error(data?.error?.message||'Apify 요청 실패 ('+response.status+')');
  const item=Array.isArray(data)?data[0]:null;
  if(!item)throw Error('게시물 데이터를 가져오지 못했습니다. 공개 게시물인지 확인하세요.');
  const posts=Array.isArray(item.childPosts)&&item.childPosts.length?[...item.childPosts]:[item];
  const images=posts.flatMap(p=>{let u=p.displayUrl||p.display_url||p.imageUrl||p.thumbnailUrl;return typeof u==='string'&&u.startsWith('https://')?[u]:[]}).slice(0,10);
  if(!images.length)throw Error('이미지 URL을 찾지 못했습니다.');
  return res.status(200).json({images,caption:item.caption||'',count:images.length});
 }catch(e){return res.status(500).json({error:e.name==='AbortError'?'수집 시간이 초과됐습니다. 다시 시도하세요.':e.message})}
}