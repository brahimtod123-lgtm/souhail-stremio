const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// إضافة routes للاختبار
app.get('/', (req, res) => {
    res.json({
        message: '🚀 Souhail Stremio Streamer Active!',
        version: '1.0.0',
        endpoints: {
            search: 'GET /search/:query',
            catalog: 'GET /catalog/:type',
            health: 'GET /health',
            test: 'GET /test'
        }
    });
});

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

app.get('/test', (req, res) => {
    res.send('<h1>✅ Test Successful!</h1><p>Souhail Stremio is working.</p>');
});

app.get('/search/:query', (req, res) => {
    res.json({
        query: req.params.query,
        results: [
            { title: 'Test Movie 1', quality: '1080p', size: '1.5GB' },
            { title: 'Test Movie 2', quality: '720p', size: '800MB' }
        ]
    });
});

app.listen(PORT, () => {
    console.clear();
    console.log(`
    ==================================
    🎬 Souhail Stremio Streamer
    ==================================
    ✅ Server running on: http://localhost:${PORT}
    📍 Health check: http://localhost:${PORT}/health
    🔍 Test search: http://localhost:${PORT}/search/inception
    ==================================
    `);
});
