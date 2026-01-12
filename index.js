require('dotenv').config();
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const logger = require('./utils/logger');

// استيراد المكونات
const MediaServer = require('./server');
const scraper = require('./scraper');
const provider = require('./provider');
const RealDebridResolver = require('./resolver');
const StreamInfo = require('./utils/streaminfo');

// تهيئة التطبيق
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// المتغيرات
const REAL_DEBRID_API = process.env.REAL_DEBRID_API_KEY;
const TORRENTIO_USER_ID = process.env.TORRENTIO_USER_ID;
const CACHE_TIME = parseInt(process.env.CACHE_TIME) || 3600;

// تهيئة المكونات
const mediaServer = new MediaServer();
const realDebrid = new RealDebridResolver(REAL_DEBRID_API);
const streamInfo = new StreamInfo();

// Routes الرئيسية
app.get('/', (req, res) => {
    res.json({
        name: 'Souhail Stremio',
        version: '1.0.0',
        status: 'active',
        endpoints: {
            search: '/search/:query',
            stream: '/stream/:id',
            catalog: '/catalog/:type',
            health: '/health'
        }
    });
});

// Route للبحث
app.get('/search/:query', async (req, res) => {
    try {
        const { query } = req.params;
        const type = req.query.type || 'movie';
        
        logger.info(`Search request: ${query}, type: ${type}`);
        
        const results = await scraper.search(query, type);
        res.json({
            success: true,
            query,
            type,
            results: results.slice(0, 20) // إرجاع أول 20 نتيجة
        });
    } catch (error) {
        logger.error(`Search error: ${error.message}`);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Route للستريم
app.get('/stream/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const magnet = Buffer.from(id, 'base64').toString('ascii');
        
        logger.info(`Stream request for magnet: ${magnet.substring(0, 50)}...`);
        
        const streamData = await realDebrid.resolveMagnetToStream(magnet);
        
        if (streamData) {
            res.json({
                success: true,
                stream: streamData,
                playerUrl: `/play/${streamData.id}`
            });
        } else {
            res.status(404).json({ success: false, error: 'Stream not found' });
        }
    } catch (error) {
        logger.error(`Stream error: ${error.message}`);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Route للتشغيل المباشر
app.get('/play/:streamId', async (req, res) => {
    try {
        const { streamId } = req.params;
        const stream = await streamInfo.getPlaybackInfo(streamId);
        
        if (stream) {
            res.redirect(stream.directUrl);
        } else {
            res.status(404).send('Stream not found');
        }
    } catch (error) {
        res.status(500).send('Internal server error');
    }
});

// Route للكتالوج
app.get('/catalog/:type', async (req, res) => {
    const { type } = req.params;
    const catalog = await provider.getCatalog(type);
    
    res.json({
        success: true,
        type,
        total: catalog.length,
        catalog: catalog.slice(0, 50)
    });
});

// Route للصحة
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage()
    });
});

// Route لإضافة مغناطيس يدويًا
app.post('/add-magnet', async (req, res) => {
    try {
        const { magnet } = req.body;
        
        if (!magnet) {
            return res.status(400).json({ success: false, error: 'Magnet link required' });
        }
        
        const result = await realDebrid.addMagnet(magnet);
        res.json({ success: true, result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// بدء السيرفر
app.listen(port, async () => {
    logger.info(`Souhail Stremio server running on port ${port}`);
    logger.info(`Real-Debrid API: ${REAL_DEBRID_API ? 'Configured' : 'Not configured'}`);
    
    // بدء خادم الوسائط
    await mediaServer.startServer();
    
    console.log(`
    ========================================
      Souhail Stremio - Torrent Streaming
    ========================================
    URL: http://localhost:${port}
    Health: http://localhost:${port}/health
    ========================================
    `);
});
