const express = require('express');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const app = express();

const PORT = process.env.PORT || 8080;
const RD_KEY = process.env.REAL_DEBRID_API;

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
});

// MANIFEST - تأكد من النسخة
app.get('/manifest.json', (req, res) => {
    console.log('📄 Manifest requested - Version 10.0.0');
    
    res.json({
        "id": "org.souhail.torrent.master.v10",
        "version": "10.0.0",
        "name": "Souhail Torrent Master v10",
        "description": "Complete torrent information display with Real-Debrid",
        "logo": "https://cdn-icons-png.flaticon.com/512/3095/3095588.png",
        "background": "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c",
        "resources": ["stream"],
        "types": ["movie", "series"],
        "idPrefixes": ["tt"],
        "behaviorHints": {
            "configurable": true,
            "configurationRequired": false
        },
        "contactEmail": "souhail@torrent-master.com"
    });
});

// STREAM
app.get('/stream/:type/:id.json', async (req, res) => {
    console.log(`🎬 Stream request: ${req.params.type}/${req.params.id}`);
    
    if (!RD_KEY) {
        return res.json({ streams: [] });
    }
    
    try {
        const torrentioUrl = `https://torrentio.strem.fun/realdebrid=${RD_KEY}/stream/${req.params.type}/${req.params.id}.json`;
        console.log(`🔗 Fetching from: ${torrentioUrl}`);
        
        const response = await fetch(torrentioUrl);
        const data = await response.json();
        
        if (!data.streams) {
            return res.json({ streams: [] });
        }
        
        console.log(`✅ Found ${data.streams.length} streams`);
        
        const processedStreams = data.streams.map((stream, index) => {
            const originalTitle = stream.name || stream.title || `Stream ${index + 1}`;
            const isCached = stream.url && stream.url.includes('real-debrid.com');
            
            const info = analyzeTitle(originalTitle);
            const formattedTitle = createTitle(info, isCached);
            
            return {
                title: formattedTitle,
                url: stream.url,
                behaviorHints: stream.behaviorHints || {}
            };
        });
        
        res.json({ streams: processedStreams });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.json({ streams: [] });
    }
});

// دوال المساعدة
function analyzeTitle(title) {
    return {
        cleanName: getCleanName(title),
        size: getSize(title) || 'Unknown',
        quality: getQuality(title),
        seeders: getSeeders(title),
        codec: getCodec(title),
        audio: getAudio(title),
        language: getLanguage(title),
        subs: getSubtitles(title),
        source: getSource(title),
        site: getSite(title),
        year: getYear(title)
    };
}

function getCleanName(title) {
    let clean = title
        .replace(/\[.*?\]/g, '')
        .replace(/\./g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/(\d+(\.\d+)?)\s*(GB|MB)/gi, '')
        .replace(/(\d+)\s*Seeds?/gi, '')
        .replace(/4K|1080p|720p|480p/gi, '')
        .replace(/x265|x264|HEVC|AV1/gi, '')
        .replace(/DDP5\.1|DTS-HD|TrueHD|AC3|AAC/gi, '')
        .replace(/BluRay|WEB-DL|WEBRip|HDTV|DVD/gi, '')
        .trim();
    
    return clean.substring(0, 60) || 'Movie/TV Show';
}

function getSize(title) {
    const match = title.match(/(\d+(\.\d+)?)\s*(GB|MB)/i);
    return match ? match[0] : null;
}

function getQuality(title) {
    if (title.match(/4K/i)) return '4K';
    if (title.match(/1080p/i)) return '1080p';
    if (title.match(/720p/i)) return '720p';
    return '1080p';
}

function getSeeders(title) {
    const match = title.match(/(\d+)\s*Seeds?/i);
    return match ? parseInt(match[1]) : 0;
}

function getCodec(title) {
    return title.match(/x265|HEVC/i) ? 'HEVC' : 'H.264';
}

function getAudio(title) {
    return title.match(/DTS-HD/i) ? 'DTS-HD' : 
           title.match(/AC3/i) ? 'AC3' : 'AAC';
}

function getLanguage(title) {
    return title.match(/Arabic/i) ? 'Arabic' : 
           title.match(/French/i) ? 'French' : 'English';
}

function getSubtitles(title) {
    return title.match(/AR-Subs/i) ? 'AR' : 
           title.match(/FR-Subs/i) ? 'FR' : 'EN';
}

function getSource(title) {
    return title.match(/BluRay/i) ? 'BluRay' : 'WEB-DL';
}

function getSite(title) {
    const match = title.match(/\[(.*?)\]/);
    return match ? match[1] : 'Torrent';
}

function getYear(title) {
    const match = title.match(/(19|20)\d{2}/);
    return match ? match[0] : '';
}

function createTitle(info, isCached) {
    const lines = [];
    
    // اسم الفيلم + السنة
    lines.push(`🎬 ${info.cleanName}${info.year ? ` (${info.year})` : ''}`);
    
    // الحجم + الجودة + السيدرز
    lines.push(`💾 ${info.size}  |  📺 ${info.quality}  |  👤 ${info.seeders || '?'}`);
    
    // التقنية
    lines.push(`🎞️ ${info.codec}  |  🔊 ${info.audio}  |  📦 ${info.source}`);
    
    // اللغات + الموقع
    lines.push(`🌍 ${info.language}  |  📝 ${info.subs}  |  🏷️ ${info.site}`);
    
    // النوع
    lines.push(isCached ? '✅ REAL-DEBRID CACHED' : '🔗 TORRENT STREAM');
    
    return lines.join('\n');
}

// INSTALL PAGE
app.get('/install', (req, res) => {
    res.send(`
        <html>
        <body style="font-family: Arial; padding: 20px; text-align: center;">
            <h1>🎬 Souhail Torrent Master v10</h1>
            <p><strong>Version:</strong> 10.0.0</p>
            <p><strong>ID:</strong> org.souhail.torrent.master.v10</p>
            
            <a href="stremio://stremio.xyz/app/${req.hostname}/manifest.json" 
               style="display: inline-block; background: #28a745; color: white; padding: 15px 30px; border-radius: 5px; text-decoration: none; margin: 20px 0; font-size: 18px;">
                📲 Install v10 Now
            </a>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p><strong>Manual Install URL:</strong></p>
                <code style="background: #e9ecef; padding: 10px; display: block;">https://${req.hostname}/manifest.json</code>
            </div>
            
            <p><a href="/test">Test</a> | <a href="/">Home</a></p>
        </body>
        </html>
    `);
});

// TEST PAGE
app.get('/test', (req, res) => {
    res.send(`
        <html>
        <body style="font-family: Arial; padding: 20px;">
            <h1>Test v10</h1>
            <pre style="background: #f8f9fa; padding: 15px;">
🎬 Inception (2010)
💾 1.8 GB  |  📺 1080p  |  👤 1500
🎞️ H.264  |  🔊 DTS-HD  |  📦 BluRay
🌍 English  |  📝 EN  |  🏷️ YTS
✅ REAL-DEBRID CACHED</pre>
            
            <ul>
                <li><a href="/stream/movie/tt1375666.json">Inception</a></li>
                <li><a href="/manifest.json">Manifest</a></li>
            </ul>
        </body>
        </html>
    `);
});

// HOME
app.get('/', (req, res) => {
    res.redirect('/install');
});

// HEALTH
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        version: '10.0.0',
        name: 'Souhail Torrent Master',
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`
    ========================================
    🚀 SOUHAIL TORRENT MASTER v10.0.0
    ========================================
    📍 Port: ${PORT}
    🌐 URL: http://localhost:${PORT}
    🔗 Install: /install
    🆔 ID: org.souhail.torrent.master.v10
    📦 Package: souhail-torrent-master@10.0.0
    ========================================
    `);
});
