const express = require('express');
const fetch = require('node-fetch');
const app = express();

// PORT ديال Railway هوا 8080 مش 3000
const PORT = process.env.PORT || 8080;
const RD_KEY = process.env.REAL_DEBRID_API;

// Debug log
console.log(`Starting with PORT: ${PORT}, RD_KEY: ${RD_KEY ? 'yes' : 'no'}`);

// MANIFEST
app.get('/manifest.json', (req, res) => {
    console.log('📄 Manifest requested');
    res.json({
        "id": "com.souhail.stremio",
        "version": "1.0.0",
        "name": "Souhail Premium",
        "description": "Real-Debrid Torrent Streaming",
        "resources": ["stream"],
        "types": ["movie", "series"]
    });
});

// STREAM
app.get('/stream/:type/:id.json', async (req, res) => {
    console.log(`🎬 Stream: ${req.params.type}/${req.params.id}`);
    
    if (!RD_KEY) {
        console.log('❌ No RD key');
        return res.json({ streams: [] });
    }
    
    try {
        const torrentioUrl = `https://torrentio.strem.fun/realdebrid=${RD_KEY}/stream/${req.params.type}/${req.params.id}.json`;
        console.log(`🔗 Fetching: ${torrentioUrl}`);
        
        const response = await fetch(torrentioUrl);
        const data = await response.json();
        
        console.log(`✅ Found ${data.streams?.length || 0} streams`);
        res.json(data);
        
    } catch (error) {
        console.log('❌ Error:', error.message);
        res.json({ streams: [] });
    }
});

// INSTALL
app.get('/install', (req, res) => {
    const baseUrl = `https://${req.hostname}`;
    res.send(`
        <h2>Install Souhail Addon</h2>
        <a href="stremio://stremio.xyz/app/${req.hostname}/manifest.json">
            Install Now
        </a>
        <p>Or: <code>${baseUrl}/manifest.json</code></p>
        <p><a href="${baseUrl}/stream/movie/tt1375666.json">Test</a></p>
    `);
});

// HEALTH CHECK
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        port: PORT,
        realdebrid: RD_KEY ? 'configured' : 'not_configured'
    });
});

app.get('/', (req, res) => {
    res.redirect('/install');
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🔗 URL: http://localhost:${PORT}`);
    console.log(`📲 Install: http://localhost:${PORT}/install`);
    console.log(`📊 Health: http://localhost:${PORT}/health`);
});
