export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST 요청만 가능합니다.' });
  try {
    const url = String(req.body?.url || '').trim();
    if (!/^https:\/\/(www\.)?instagram\.com\/(p|reel)\/[a-zA-Z0-9_-]+\/?(?:\?.*)?$/.test(url)) {
      return res.status(400).json({ error: '공개 인스타그램 게시물 주소를 입력하세요.' });
    }
    const token = String(process.env.APIFY_API_TOKEN || '').trim();
    if (!token) return res.status(500).json({ error: 'APIFY_API_TOKEN이 설정되지 않았습니다. Preview 환경을 확인하세요.' });
    // Validate the token before it reaches fetch's Headers implementation.
    // Do not log or return the token itself.
    if (!/^[\x21-\x7E]+$/.test(token)) {
      return res.status(500).json({ error: 'Apify 토큰에 공백·줄바꿈 또는 한글이 포함되어 있습니다. Apify에서 토큰을 다시 복사해 Vercel Preview에 저장하세요.' });
    }
    const clean = url.split('?')[0];
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 55000);
    let response;
    try {
      response = await fetch('https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items?timeout=50&format=json', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ directUrls: [clean], resultsType: 'posts', resultsLimit: 1, addParentData: false }),
        signal: controller.signal
      });
    } finally { clearTimeout(timer); }
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const reason = data?.error?.message || `Apify 응답 오류 (${response.status})`;
      return res.status(502).json({ error: reason });
    }
    const item = Array.isArray(data) ? data[0] : null;
    if (!item) return res.status(502).json({ error: 'Apify에서 게시물 데이터를 받지 못했습니다.' });
    const posts = Array.isArray(item.childPosts) && item.childPosts.length ? item.childPosts : [item];
    const images = posts.flatMap(p => {
      const u = p.displayUrl || p.display_url || p.imageUrl || p.thumbnailUrl;
      return typeof u === 'string' && u.startsWith('https://') ? [u] : [];
    }).slice(0, 10);
    if (!images.length) return res.status(502).json({ error: '게시물에서 이미지 주소를 찾지 못했습니다.' });
    return res.status(200).json({ images, caption: item.caption || '', count: images.length });
  } catch (e) {
    const message = e?.name === 'AbortError' ? '인스타그램 수집 시간 초과. 다시 시도하세요.' : '인스타그램 수집 중 서버 오류가 발생했습니다.';
    return res.status(500).json({ error: message });
  }
}
