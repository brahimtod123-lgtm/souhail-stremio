const express = require('express');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const app = express();

// PORT ديال Railway هوا 8080
const PORT = process.env.PORT || 8080;

// مفتاح Real-Debrid خاصك
const RD_KEY = process.env.REAL_DEBRID_API;

// 1. MANIFEST ديال Stremio
app.get('/manifest.json', (req, res) => {
    res.json({
        "id": "com.souhail.stremio",
        "version": "1.0.0",
        "name": "Souhail Streamer",
        "description": "Real-Debrid Torrent Streaming",
        "logo": "https://cdn-icons-png.flaticon.com/512/3095/3095588.png",
        "background": "https://images.unsplash.com/photo-1536440136628-849c177e76a1",
        "resources": ["stream"],
        "types": ["movie", "series"],
        "idPrefixes": ["tt"]
    });
});

// 2. STREAM مع ترتيب حسب الحجم وتفاصيل
app.get('/stream/:type/:id.json', async (req, res) => {
    const { type, id } = req.params;
    
    if (!RD_KEY || RD_KEY === 'your_api_key_here') {
        return res.json({ 
            streams: [],
            error: "Real-Debrid API key not configured. Add REAL_DEBRID_API in Railway variables."
        });
    }
    
    try {
        // 1. جلب النتائج من Torrentio
        const torrentioUrl = `https://torrentio.strem.fun/realdebrid=${RD_KEY}/stream/${type}/${id}.json`;
        const response = await fetch(torrentioUrl);
        const data = await response.json();
        
        if (!data.streams || data.streams.length === 0) {
            return res.json({ streams: [] });
        }
        
        // 2. معالجة وتنسيق النتائج
        const processedStreams = data.streams.map(stream => {
            // استخراج معلومات من الـtitle
            const info = extractInfoFromTitle(stream.name || stream.title);
            
            return {
                title: formatStreamTitle(info, stream),
                name: stream.name || stream.title,
                url: stream.url,
                behaviorHints: stream.behaviorHints || {},
                // معلومات إضافية للترتيب
                _size: info.sizeInBytes || 0,
                _quality: info.quality || 'Unknown',
                _seeders: info.seeders || 0,
                _isCached: stream.url && stream.url.includes('real-debrid.com')
            };
        });
        
        // 3. ترتيب النتائج: من الأكبر إلى الأصغر حجماً
        const sortedStreams = processedStreams.sort((a, b) => {
            // أولاً: حسب Real-Debrid Cached
            if (b._isCached !== a._isCached) {
                return b._isCached ? 1 : -1;
            }
            
            // ثانياً: حسب الحجم (من الأكبر للأصغر)
            if (b._size !== a._size) {
                return b._size - a._size;
            }
            
            // ثالثاً: حسب الجودة
            const qualityOrder = { 
                '4K': 5, 
                '2160p': 4, 
                '1080p': 3, 
                '720p': 2, 
                '480p': 1,
                'Unknown': 0 
            };
            const aQuality = qualityOrder[a._quality] || 0;
            const bQuality = qualityOrder[b._quality] || 0;
            if (bQuality !== aQuality) {
                return bQuality - aQuality;
            }
            
            // رابعاً: حسب الـseeders
            return b._seeders - a._seeders;
        });
        
        // 4. إزالة الحقول الداخلية وإرجاع النتائج
        const finalStreams = sortedStreams.map(stream => ({
            title: stream.title,
            url: stream.url,
            behaviorHints: stream.behaviorHints
        }));
        
        res.json({ streams: finalStreams });
        
    } catch (error) {
        console.error('Error fetching streams:', error);
        res.json({ streams: [] });
    }
});

// 3. دالة استخراج المعلومات من الـtitle
function extractInfoFromTitle(title) {
    const info = {
        quality: '1080p',
        codec: 'H.264',
        audio: 'AC3',
        language: 'English',
        subs: 'EN',
        size: 'Unknown',
        sizeInBytes: 0,
        seeders: 0
    };
    
    if (!title) return info;
    
    // استخراج الجودة
    const qualityMatch = title.match(/(4K|2160p|1080p|720p|480p)/i);
    if (qualityMatch) info.quality = qualityMatch[1];
    
    // استخراج الكودك
    if (title.match(/x265|HEVC/i)) info.codec = 'HEVC';
    else if (title.match(/x264/i)) info.codec = 'H.264';
    else if (title.match(/AV1/i)) info.codec = 'AV1';
    
    // استخراج الصوت
    if (title.match(/DDP5\.1|Dolby Digital Plus/i)) info.audio = 'DDP5.1';
    else if (title.match(/DTS-HD|DTS-HD MA/i)) info.audio = 'DTS-HD';
    else if (title.match(/AC3|Dolby Digital/i)) info.audio = 'AC3';
    else if (title.match(/AAC/i)) info.audio = 'AAC';
    
    // استخراج اللغة
    if (title.match(/Arabic|AR/i)) info.language = 'Arabic';
    else if (title.match(/French|FR/i)) info.language = 'French';
    else if (title.match(/Multi/i)) info.language = 'Multi';
    
    // استخراج الترجمة
    if (title.match(/Arabic Subs|AR-Subs/i)) info.subs = 'AR';
    else if (title.match(/French Subs|FR-Subs/i)) info.subs = 'FR';
    else if (title.match(/Multi Subs/i)) info.subs = 'Multi';
    
    // استخراج الحجم
    const sizeMatch = title.match(/(\d+(\.\d+)?)\s*(GB|MB)/i);
    if (sizeMatch) {
        info.size = sizeMatch[0];
        const num = parseFloat(sizeMatch[1]);
        const unit = sizeMatch[3].toUpperCase();
        info.sizeInBytes = unit === 'GB' ? num * 1024 * 1024 * 1024 : num * 1024 * 1024;
    }
    
    // استخراج الـseeders
    const seedersMatch = title.match(/(\d+)\s*Seeds?/i) || 
                        title.match(/Seeds?:?\s*(\d+)/i);
    if (seedersMatch) info.seeders = parseInt(seedersMatch[1]);
    
    return info;
}

// 4. دالة تنسيق الـtitle كما في الصورة
function formatStreamTitle(info, stream) {
    const isCached = stream.url && stream.url.includes('real-debrid.com');
    
    const parts = [
        `🎬 ${info.quality}`,
        `${info.codec}`,
        `${info.audio}`,
        `🌐 ${info.language}`,
        `📝 ${info.subs}`,
        `💾 ${info.size}`,
        info.seeders > 0 ? `🔺 ${info.seeders} Seeds` : null
    ].filter(Boolean);
    
    const details = parts.join(' | ');
    
    return `${isCached ? '✅ RD Cached' : '🔗 Torrent'} • ${details}`.trim();
}

// 5. دالة تحويل الحجم
function formatSize(bytes) {
    if (bytes >= 1024 * 1024 * 1024) {
        return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    } else if (bytes >= 1024 * 1024) {
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }
    return bytes + ' B';
}

// 6. صفحة البداية
app.get('/', (req, res) => {
    const baseUrl = `https://${req.hostname}`;
    
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>souhail-stremio</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
                code { background: #f4f4f4; padding: 5px 10px; border-radius: 3px; font-family: monospace; }
                .success { color: green; font-weight: bold; }
                .error { color: red; font-weight: bold; }
                .box { border: 1px solid #ddd; padding: 20px; margin: 20px 0; border-radius: 5px; }
            </style>
        </head>
        <body>
            <h1>🎬 souhail-stremio</h1>
            <p>Stremio Addon with Real-Debrid integration</p>
            
            <div class="box">
                <h2>📌 Installation</h2>
                <p>Copy this URL to install in Stremio:</p>
                <code>${baseUrl}/manifest.json</code>
            </div>
            
            <div class="box">
                <h2>🔧 Status</h2>
                <p>Real-Debrid: <span class="${RD_KEY ? 'success' : 'error'}">
                    ${RD_KEY ? '✅ Configured' : '❌ Not Configured'}
                </span></p>
                ${RD_KEY ? `<p>Key length: ${RD_KEY.length} characters</p>` : ''}
            </div>
            
            <div class="box">
                <h2>🧪 Test Links</h2>
                <p>Test the addon functionality:</p>
                <ul>
                    <li><a href="/manifest.json">manifest.json</a></li>
                    <li><a href="/stream/movie/tt1375666.json">Inception (tt1375666)</a></li>
                    <li><a href="/stream/movie/tt0816692.json">Interstellar (tt0816692)</a></li>
                    <li><a href="/stream/movie/tt0468569.json">The Dark Knight (tt0468569)</a></li>
                </ul>
            </div>
            
            <div class="box">
                <h2>⚙️ Features</h2>
                <ul>
                    <li>✅ Real-Debrid integration</li>
                    <li>✅ Stream sorting by size (largest first)</li>
                    <li>✅ Detailed stream information display</li>
                    <li>✅ Cached vs Torrent identification</li>
                    <li>✅ Quality, codec, audio, language, subtitles info</li>
                </ul>
            </div>
            
            ${!RD_KEY ? `
            <div class="box" style="border-color: red;">
                <h2>⚠️ Configuration Required</h2>
                <p>Real-Debrid API key is missing!</p>
                <ol>
                    <li>Go to <a href="https://real-debrid.com/apitoken" target="_blank">Real-Debrid API Token</a></li>
                    <li>Copy your API token</li>
                    <li>Add it in Railway → Variables → REAL_DEBRID_API</li>
                    <li>Redeploy the project</li>
                </ol>
            </div>
            ` : ''}
        </body>
        </html>
    `);
});

// 7. Health check لـRailway
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok',
        service: 'souhail-stremio',
        port: PORT,
        realdebrid: RD_KEY ? 'configured' : 'not_configured',
        timestamp: new Date().toISOString()
    });
});

// 8. Error handling
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// 9. بدء السيرفر
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
    ========================================
    🚀 SOUHAIL-STREMIO
    ========================================
    📍 Port: ${PORT}
    🌐 URL: https://${process.env.RAILWAY_STATIC_URL || `localhost:${PORT}`}
    🔗 Install: /manifest.json
    🔑 Real-Debrid: ${RD_KEY ? '✅ Configured' : '❌ Missing'}
    ========================================
    `);
    
    if (!RD_KEY) {
        console.log(`
    ⚠️  WARNING: Real-Debrid API key not set!
    Add REAL_DEBRID_API in Railway variables.
    Get your key from: https://real-debrid.com/apitoken
        `);
    }
});
