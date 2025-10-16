const axios = require('axios');

async function sora(prompt, { ratio = 'portrait' } = {}) {
    try {
        if (!prompt) throw new Error('Prompt is required.');
        if (!['portrait', 'landscape'].includes(ratio)) throw new Error('Available ratios: portrait, landscape.');
        
        const api = axios.create({
            baseURL: 'https://api.bylo.ai/aimodels/api/v1/ai',
            headers: {
                accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
                'Accept-Encoding': 'gzip, deflate, br',
                'cache-control': 'max-age=0',
                connection: 'keep-alive',
                'content-type': 'application/json; charset=UTF-8',
                dnt: '1',
                origin: 'https://bylo.ai',
                pragma: 'no-cache',
                referer: 'https://bylo.ai/features/sora-2',
                'sec-ch-prefers-color-scheme': 'dark',
                'sec-ch-ua': '"Chromium";v="137", "Not/A)Brand";v="24"',
                'sec-ch-ua-arch': '""',
                'sec-ch-ua-bitness': '""',
                'sec-ch-ua-full-version': '"137.0.7337.0"',
                'sec-ch-ua-full-version-list': '"Chromium";v="137.0.7337.0", "Not/A)Brand";v="24.0.0.0"',
                'sec-ch-ua-mobile': '?1',
                'sec-ch-ua-model': '"SM-F958"',
                'sec-ch-ua-platform': '"Android"',
                'sec-ch-ua-platform-version': '"15.0.0"',
                'sec-ch-ua-wow64': '?0',
                'sec-fetch-dest': 'document',
                'sec-fetch-mode': 'navigate',
                'sec-fetch-site': 'same-origin',
                'sec-fetch-user': '?1',
                'upgrade-insecure-requests': '1',  
                'user-agent': 'Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36',
                'x-requested-with': 'XMLHttpRequest',
                uniqueId: crypto.randomUUID().replace(/-/g, '')
            }
        });
        
        const { data: task } = await api.post('/video/create', {
            prompt: prompt,
            channel: 'SORA2',
            pageId: 536,
            source: 'bylo.ai',
            watermarkFlag: true,
            privateFlag: true,
            isTemp: true,
            vipFlag: true,
            model: 'sora_video2',
            videoType: 'text-to-video',
            aspectRatio: ratio
        });
        
        while (true) {
            const { data } = await api.get(`/${task.data}?channel=SORA2'`);
            
            if (data.data.state > 0) return JSON.parse(data.data.completeData);
            await new Promise(res => setTimeout(res, 1000));
        }
    } catch (error) {
        throw new Error(error.message);
    }
};

// Usage:
const resp = await sora('a woman relaxing on the beach');
console.log(resp);
