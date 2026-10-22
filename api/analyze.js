export default async function handler(req,res){
 if(req.method!=='POST')return res.status(405).json({error:'POST only'});
 try{
  const {images}=req.body||{};
  if(!Array.isArray(images)||!images.length||images.length>10||images.some(x=>typeof x!=='string'||!/^data:image\/(png|jpeg|webp);base64,/.test(x)))return res.status(400).json({error:'JPG/PNG/WebP 사진 1~10장을 선택하세요.'});
  if(!process.env.OPENAI_API_KEY)return res.status(500).json({error:'OPENAI_API_KEY가 없습니다.'});
  const content=[{type:'input_text',text:'이 사진들은 순서가 있는 인스타그램 캐러셀입니다. 각 사진의 영어 문구를 모두 읽고 자연스러운 한국어로 번역하세요. 원본에 없는 사실을 만들지 마세요. 첫 장은 원본 주제를 유지하는 새 썸네일을 만들 것이므로 한 줄짜리 강렬하지만 과장 없는 한국어 제목을 작성하세요. 이후 각 장은 이미지에 넣을 한국어 문구를 간결하게 작성하세요. 사진에 글씨가 없으면 text를 빈 문자열로 두세요. 반드시 {"slides":[{"text":"...","visualPrompt":"..."}],"caption":"..."} 형태의 JSON만 출력하세요. slides는 입력 사진 수와 같아야 합니다. visualPrompt는 영어로 사진의 핵심 장면을 구체적으로 설명하고 첫 장은 새로운 썸네일 구도를 제안하세요. 캡션은 사실 확인이 안 된 내용을 단정하지 말고 한국어로 작성하세요.'},...images.map(image_url=>({type:'input_image',image_url,detail:'high'}))];
  const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-4.1-mini',input:[{role:'user',content}],text:{format:{type:'json_object'}},max_output_tokens:3000})});
  const data=await r.json();if(!r.ok)throw Error(data.error?.message||'AI 분석 실패');
  const txt=(data.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('');
  const result=JSON.parse(txt);if(!Array.isArray(result.slides)||result.slides.length!==images.length)throw Error('슬라이드 분석 결과가 올바르지 않습니다. 다시 시도하세요.');
  return res.status(200).json(result);
 }catch(e){return res.status(500).json({error:e.message});}
}
