const express = require('express');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const app = express();

const PORT = process.env.PORT || 8080;
const RD_KEY = process.env.REAL_DEBRID_API;

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
});

// 1. MANIFEST مع catalogs
app.get('/manifest.json', (req, res) => {
    res.json({
        "id": "com.souhail.streamer.final",
        "version": "1.0.0",
        "name": "Souhail Premium",
        "description": "Real-Debrid Torrent Streaming",
        "logo": "https://cdn-icons-png.flaticon.com/512/3095/3095588.png",
        "background": "https://images.unsplash.com/photo-1536440136628-849c177e76a1",
        "resources": ["stream", "catalog"],
        "types": ["movie", "series"],
        "idPrefixes": ["tt"],
        "catalogs": [
            {
                "type": "movie",
                "id": "movies",
                "name": "Movies"
            },
            {
                "type": "series", 
                "id": "series",
                "name": "Series"
            }
        ]
    });
});

// 2. CATALOG endpoint
app.get('/catalog/:type/:id.json', (req, res) => {
    res.json({ metas: [] }); // فارغ، استعمال search في Stremio
});

// 3. STREAM endpoint (مبسط)
app.get('/stream/:type/:id.json', async (req, res) => {
    const { type, id } = req.params;
    
    if (!RD_KEY) {
        return res.json({ streams: [] });
    }
    
    try {
        const torrentioUrl = `https://torrentio.strem.fun/realdebrid=${RD_KEY}/stream/${type}/${id}.json`;
        const response = await fetch(torrentioUrl);
        const data = await response.json();
        
        if (!data.streams) {
            return res.json({ streams: [] });
        }
        
        // تعديل العناوين فقط، الـURLs تبقى كما هي
        const processedStreams = data.streams.map((stream) => {
            const cleanTitle = formatStreamTitle(stream.name || stream.title);
            return {
                title: cleanTitle,
                url: stream.url, // مهم: الـURL الأصلي
                behaviorHints: stream.behaviorHints || {}
            };
        });
        
        res.json({ streams: processedStreams });
        
    } catch (error) {
        res.json({ streams: [] });
    }
});

// 4. تنسيق العنوان
function formatStreamTitle(title) {
    const info = getBasicInfo(title);
    const isCached = title.toLowerCase().includes('real-debrid');
    
    const lines = [];
    lines.push(`💎🎬 ${getCleanTitle(title)}`);
    lines.push(`💎💾 ${info.size || 'Unknown'}`);
    lines.push(`💎📺 ${info.quality || '1080p'}`);
    lines.push(`💎🧑‍🔧 ${info.seeders || '?'}`);
    lines.push(`💎🎞️ ${info.codec || 'H.264'}`);
    lines.push(`💎🎧 ${info.audio || 'AC3'}`);
    lines.push(`💎🔊 ${info.language || 'English'}`);
    lines.push(`💎🌐 ${info.subs || 'EN'}`);
    lines.push(isCached ? '💎🧲 RD Cached' : '💎📡 Torrent');
    
    return lines.join('\n');
}

function getBasicInfo(title) {
    return {
        size: (title.match(/(\d+(\.\d+)?)\s*(GB|MB)/i) || [])[0] || 'Unknown',
        quality: title.match(/4K/i) ? '4K' : 
                title.match(/1080p/i) ? '1080p' : 
                title.match(/720p/i) ? '720p' : '1080p',
        seeders: (title.match(/(\d+)\s*Seeds?/i) || [])[1] || '?',
        codec: title.match(/x265|HEVC/i) ? 'HEVC' : 'H.264',
        audio: 'AC3',
        language: 'English',
        subs: 'EN'
    };
}

function getCleanTitle(title) {
    return title
        .replace(/\[.*?\]/g, '')
        .replace(/\./g, ' ')
        .replace(/\s+/g, ' ')
        .substring(0, 50)
        .trim();
}

// 5. صفحات المساعدة
app.get('/install', (req, res) => {
    res.send(`
        <html>
        <body style="font-family: Arial; padding: 20px; text-align: center;">
            <h1>📲 Install Souhail Addon</h1>
            <a href="stremio://stremio.xyz/app/${req.hostname}/manifest.json" 
               style="display: inline-block; background: #28a745; color: white; padding: 15px 30px; border-radius: 5px; text-decoration: none; margin: 20px 0;">
                Install Now
            </a>
            <p>Or copy this URL to Stremio:</p>
            <code style="background: #f4f4f4; padding: 10px; display: block;">https://${req.hostname}/manifest.json</code>
            <p><a href="/">← Home</a></p>
        </body>
        </html>
    `);
});

app.get('/', (req, res) => {
    res.send(`
        <html>
        <body style="font-family: Arial; padding: 20px; text-align: center;">
            <h1>🎬 Souhail Stremio Addon</h1>
            <p><a href="/install" style="font-size: 18px; color: #28a745;">📲 Click here to install</a></p>
            <p>Status: ${RD_KEY ? '✅ Ready' : '❌ Needs Real-Debrid API Key'}</p>
            <p><a href="/stream/movie/tt1375666.json">Test Stream</a></p>
        </body>
        </html>
    `);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🔗 Install URL: http://localhost:${PORT}/manifest.json`);
});
