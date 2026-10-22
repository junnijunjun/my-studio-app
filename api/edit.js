export const config={api:{bodyParser:{sizeLimit:'12mb'},responseLimit:false}};
export default async function handler(req,res){
 if(req.method!=='POST')return res.status(405).json({error:'POST only'});
 try{
  const {image,prompt,cover}=req.body||{};
  if(typeof image!=='string'||!/^data:image\/(png|jpeg|webp);base64,/.test(image))return res.status(400).json({error:'이미지 형식 오류'});
  if(!process.env.OPENAI_API_KEY)throw Error('API 키가 없습니다.');
  const mime=image.match(/^data:(image\/[^;]+);base64,/)[1],bytes=Buffer.from(image.split(',')[1],'base64');
  if(bytes.length>9*1024*1024)return res.status(413).json({error:'사진 용량을 줄여주세요.'});
  const fd=new FormData();fd.append('model','gpt-image-1');fd.append('image',new Blob([bytes],{type:mime}),'source.png');fd.append('size','1024x1536');fd.append('quality','medium');fd.append('prompt',cover?`Create a new cinematic editorial cover photograph inspired by the subject of this reference image. Similar topic but distinctly different composition. No text, no lettering, no logos, no watermarks. Keep the subject faithful. Visual direction: ${String(prompt||'').slice(0,1200)}`:`Edit this photo faithfully. Remove all existing English and other overlaid typography, captions, banners and text from the photo, realistically reconstructing the covered background. Preserve the actual photographed scene and objects. Do not add any new writing, text, watermark or logo. ${String(prompt||'').slice(0,500)}`);
  const r=await fetch('https://api.openai.com/v1/images/edits',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`},body:fd});const data=await r.json();if(!r.ok)throw Error(data.error?.message||'이미지 편집 실패');
  if(!data.data?.[0]?.b64_json)throw Error('이미지 생성 결과가 없습니다.');
  return res.status(200).json({image:'data:image/png;base64,'+data.data[0].b64_json});
 }catch(e){return res.status(500).json({error:e.message});}
}
