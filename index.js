const express = require('express');
const scraper = require('./scraper');
const provider = require('./provider');
const RealDebrid = require('./resolver');
const StreamInfo = require('./streaminfo');

const app = express();
const port = 3000;

// المتغيرات
const REAL_DEBRID_TOKEN = process.env.REAL_DEBRID_API;

// Routes
app.get('/', (req, res) => {
    res.send(`
        <h1>Souhail Torrent Streamer</h1>
        <p>الروابط المتاحة:</p>
        <ul>
            <li><a href="/search/avengers">/search/avengers</a> - بحث</li>
            <li><a href="/catalog/movies">/catalog/movies</a> - أفلام</li>
            <li><a href="/health">/health</a> - حالة السيرفر</li>
        </ul>
    `);
});

app.get('/search/:query', async (req, res) => {
    const query = req.params.query;
    const type = req.query.type || 'movie';
    
    const results = await scraper.search(query, type);
    res.json({
        query: query,
        count: results.length,
        results: results
    });
});

app.get('/catalog/:type', async (req, res) => {
    const type = req.params.type;
    const catalog = await provider.getCatalog(type);
    res.json(catalog);
});

app.get('/stream/:magnet', async (req, res) => {
    const magnet = Buffer.from(req.params.magnet, 'base64').toString();
    const debrid = new RealDebrid(REAL_DEBRID_TOKEN);
    const stream = await debrid.getStream(magnet);
    res.json(stream);
});

app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        realdebrid: REAL_DEBRID_TOKEN ? 'connected' : 'missing'
    });
});

app.listen(port, () => {
    console.log(`
    ==================================
      Souhail Torrent Streamer
      Running on: http://localhost:${port}
    ==================================
    `);
});
