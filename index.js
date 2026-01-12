const express = require('express');
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

// 2. STREAM REDIRECT لـTorrentio
app.get('/stream/:type/:id.json', (req, res) => {
    const { type, id } = req.params;
    
    // شيك إذا Real-Debrid API موجود
    if (!RD_KEY || RD_KEY === 'your_api_key_here') {
        return res.json({ 
            streams: [],
            error: "Real-Debrid API key not configured. Add REAL_DEBRID_API in Railway variables."
        });
    }
    
    // الرابط لـTorrentio مع Real-Debrid
    const torrentioUrl = `https://torrentio.strem.fun/realdebrid=${RD_KEY}/stream/${type}/${id}.json`;
    
    // Redirect مباشر
    res.redirect(torrentioUrl);
});

// 3. صفحة البداية
app.get('/', (req, res) => {
    const baseUrl = `https://${req.hostname}`;
    
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>souhail-stremio</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                code { background: #f4f4f4; padding: 5px; border-radius: 3px; }
                .success { color: green; }
                .error { color: red; }
            </style>
        </head>
        <body>
            <h1>🎬 souhail-stremio</h1>
            <p>Stremio Addon with Real-Debrid integration</p>
            
            <h2>📌 Installation</h2>
            <p>Copy this URL to install in Stremio:</p>
            <code>${baseUrl}/manifest.json</code>
            
            <h2>🔧 Status</h2>
            <p>Real-Debrid: <span class="${RD_KEY ? 'success' : 'error'}">
                ${RD_KEY ? '✅ Configured' : '❌ Not Configured'}
            </span></p>
            
            <h2>🧪 Test</h2>
            <p>Test links:</p>
            <ul>
                <li><a href="/manifest.json">manifest.json</a></li>
                <li><a href="/stream/movie/tt1375666.json">Inception (tt1375666)</a></li>
                <li><a href="/stream/movie/tt0816692.json">Interstellar (tt0816692)</a></li>
            </ul>
            
            <h2>⚙️ Configuration</h2>
            <p>If Real-Debrid is not configured:</p>
            <ol>
                <li>Go to <a href="https://real-debrid.com/apitoken" target="_blank">Real-Debrid API Token</a></li>
                <li>Copy your API token</li>
                <li>Add it in Railway → Variables → REAL_DEBRID_API</li>
                <li>Redeploy the project</li>
            </ol>
        </body>
        </html>
    `);
});

// 4. Health check لـRailway
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok',
        service: 'souhail-stremio',
        port: PORT,
        realdebrid: RD_KEY ? 'configured' : 'not_configured',
        timestamp: new Date().toISOString()
    });
});

// 5. Error handling
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// 6. بدء السيرفر
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
