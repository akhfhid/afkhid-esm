const axios = require('axios');

class PixelArt {
    img2pixel = async function (buffer, ratio = '1:1') {
        try {
            if (!buffer || !Buffer.isBuffer(buffer)) throw new Error('Image buffer is required');
            if (!['1:1', '3:2', '2:3'].includes(ratio)) throw new Error('Available ratios: 1:1, 3:2, 2:3');

            const { data: a } = await axios.post('https://pixelartgenerator.app/api/upload/presigned-url', {
                filename: `${Date.now()}_rynn.jpg`,
                contentType: 'image/jpeg',
                type: 'pixel-art-source'
            }, {
                headers: {
                    'content-type': 'application/json',
                    referer: 'https://pixelartgenerator.app/',
                    'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36'
                }
            });

            await axios.put(a.data.uploadUrl, buffer, {
                headers: {
                    'content-type': 'image/jpeg',
                    'content-length': buffer.length
                }
            });

            const { data: b } = await axios.post('https://pixelartgenerator.app/api/pixel/generate', {
                imageKey: a.data.key,
                prompt: '',
                size: ratio,
                type: 'image'
            }, {
                headers: {
                    'content-type': 'application/json',
                    referer: 'https://pixelartgenerator.app/',
                    'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36'
                }
            });

            while (true) {
                const { data } = await axios.get(`https://pixelartgenerator.app/api/pixel/status?taskId=${b.data.taskId}`, {
                    headers: {
                        'content-type': 'application/json',
                        referer: 'https://pixelartgenerator.app/',
                        'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36'
                    }
                });

                if (data.data.status === 'SUCCESS') return data.data.images[0];
                await new Promise(res => setTimeout(res, 1000));
            }
        } catch (error) {
            throw new Error(error.message);
        }
    }

    txt2pixel = async function (prompt, ratio = '1:1') {
        try {
            if (!prompt) throw new Error('Prompt is required');
            if (!['1:1', '3:2', '2:3'].includes(ratio)) throw new Error('Available ratios: 1:1, 3:2, 2:3');

            const { data: a } = await axios.post('https://pixelartgenerator.app/api/pixel/generate', {
                prompt: prompt,
                size: ratio,
                type: 'text'
            }, {
                headers: {
                    'content-type': 'application/json',
                    referer: 'https://pixelartgenerator.app/',
                    'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36'
                }
            });

            while (true) {
                const { data } = await axios.get(`https://pixelartgenerator.app/api/pixel/status?taskId=${a.data.taskId}`, {
                    headers: {
                        'content-type': 'application/json',
                        referer: 'https://pixelartgenerator.app/',
                        'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36'
                    }
                });

                if (data.data.status === 'SUCCESS') return data.data.images[0];
                await new Promise(res => setTimeout(res, 1000));
            }
        } catch (error) {
            throw new Error(error.message);
        }
    }
}

// Usage:
const fs = require('fs');
const p = new PixelArt();
const resp = await p.img2pixel(fs.readFileSync('./image.jpg'));
console.log(resp);