const express = require('express');
const fetch = require('node-fetch');
const app = express();

const PORT = process.env.PORT || 3000;
const RD_KEY = process.env.REAL_DEBRID_API;

// MANIFEST
app.get('/manifest.json', (req, res) => {
    res.json({
        "id": "com.souhail.stremio",
        "version": "1.0.0",
        "name": "Souhail Premium",
        "description": "Real-Debrid Torrent Streaming",
        "logo": "https://cdn-icons-png.flaticon.com/512/3095/3095588.png",
        "resources": ["stream"],
        "types": ["movie", "series"]
    });
});

// STREAM - يعطي كلشي
app.get('/stream/:type/:id.json', async (req, res) => {
    if (!RD_KEY) return res.json({ streams: [] });
    
    try {
        // 1. جلب ليانات بزاف + أحجام كبيرة
        const torrentioUrl = `https://torrentio.strem.fun/realdebrid=${RD_KEY}/quality=size:desc/stream/${req.params.type}/${req.params.id}.json`;
        const response = await fetch(torrentioUrl);
        const data = await response.json();
        
        if (!data.streams) return res.json({ streams: [] });
        
        // 2. فلترة للأحجام الكبيرة فقط (1GB+)
        const largeStreams = data.streams.filter(stream => {
            const title = stream.name || stream.title || '';
            return title.match(/\d+(\.\d+)?\s*GB/i) && parseFloat(title.match(/\d+(\.\d+)?/)[0]) >= 1;
        }).slice(0, 15); // 3. ليانات بزاف (15 رابط)
        
        // 3. إضافة معلومات كاملة
        const processedStreams = largeStreams.map(stream => {
            const title = stream.name || stream.title || '';
            const isCached = stream.url.includes('real-debrid.com');
            
            const size = (title.match(/(\d+(\.\d+)?)\s*GB/i) || [''])[0];
            const quality = title.includes('4K') ? '4K' : 
                           title.includes('1080p') ? '1080p' : 'HD';
            const seeders = (title.match(/(\d+)\s*Seeds?/i) || [])[1] || '?';
            
            return {
                title: `🎬 ${size} | 📺 ${quality} | 👤 ${seeders} | ${isCached ? '✅ Cached' : '🔗 Torrent'}`,
                url: stream.url,
                behaviorHints: stream.behaviorHints || {}
            };
        });
        
        res.json({ streams: processedStreams });
        
    } catch (error) {
        res.json({ streams: [] });
    }
});

// INSTALL - تثبيت سهل
app.get('/install', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Install Souhail Addon</title>
            <style>
                body { font-family: Arial; text-align: center; padding: 50px; }
                .btn { 
                    display: inline-block; 
                    background: #28a745; 
                    color: white; 
                    padding: 15px 30px; 
                    text-decoration: none; 
                    border-radius: 5px; 
                    font-size: 18px; 
                    margin: 20px; 
                }
            </style>
        </head>
        <body>
            <h2>📲 Install Souhail Addon</h2>
            <a class="btn" href="stremio://stremio.xyz/app/${req.hostname}/manifest.json">
                Click to Install
            </a>
            <p>Or copy: <code>https://${req.hostname}/manifest.json</code></p>
        </body>
        </html>
    `);
});

app.get('/', (req, res) => {
    res.redirect('/install');
});

app.listen(PORT, () => {
    console.log(`✅ Server ready: http://localhost:${PORT}/install`);
});
