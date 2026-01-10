const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');
const { searchContent } = require('./scraper');
const { resolveWithRD } = require('./resolver');

// مانيفست مع configuration
const manifest = {
    id: 'com.souhail.archive',
    version: '2.0.0',
    name: 'Souhail Archive',
    description: 'Torrents with Real-Debrid - Enter your API key in configuration',
    logo: 'https://img.icons8.com/color/96/000000/movie.png',
    background: 'https://img.icons8.com/color/480/000000/cinema-.png',
    resources: ['stream', 'configure'],
    types: ['movie', 'series', 'anime'],
    idPrefixes: ['tt'],
    catalogs: [],
    
    // ⭐⭐⭐ Configuration للـ Real-Debrid API ⭐⭐⭐
    behaviorHints: {
        configurable: true,
        configurationRequired: true  // ⭐ يطلب API key قبل الاستخدام
    },
    
    config: [
        {
            key: 'rd_api_key',
            type: 'text',
            title: 'Real-Debrid API Key',
            description: 'Enter your Real-Debrid API key (get it from real-debrid.com/apitoken)',
            required: true,
            placeholder: 'Paste your API key here...'
        },
        {
            key: 'quality',
            type: 'select',
            title: 'Preferred Quality',
            description: 'Choose default quality',
            options: [
                { value: 'all', label: 'All qualities' },
                { value: '4k', label: '4K/UHD' },
                { value: '1080p', label: '1080p Full HD' },
                { value: '720p', label: '720p HD' }
            ],
            default: '1080p'
        },
        {
            key: 'language',
            type: 'select',
            title: 'Language',
            description: 'Preferred language',
            options: [
                { value: 'all', label: 'All languages' },
                { value: 'english', label: 'English' },
                { value: 'arabic', label: 'Arabic' },
                { value: 'multi', label: 'Multi-language' }
            ],
            default: 'all'
        }
    ]
};

const builder = new addonBuilder(manifest);
let userConfig = {}; // تخزين configuration

// ⭐⭐⭐ Configuration Handler ⭐⭐⭐
builder.defineConfigureHandler(({ config }) => {
    console.log('⚙️ Configuration received:', config ? 'Yes' : 'No');
    
    if (config && config.rd_api_key) {
        userConfig = config;
        console.log('✅ API Key saved (first 10 chars):', config.rd_api_key.substring(0, 10) + '...');
        return Promise.resolve({ configured: true });
    }
    
    return Promise.resolve({ configured: false });
});

// ⭐⭐⭐ Stream Handler مع Configuration ⭐⭐⭐
builder.defineStreamHandler(async ({ type, id, config }) => {
    console.log('='.repeat(60));
    console.log('🎬 Request:', type, '-', id);
    
    // دمج الإعدادات
    const currentConfig = { ...userConfig, ...config };
    
    // ⭐⭐⭐ التحقق من API key ⭐⭐⭐
    if (!currentConfig.rd_api_key || currentConfig.rd_api_key.length < 20) {
        console.log('❌ No valid API key provided');
        return {
            streams: [{
                name: '⚙️ Configuration Required',
                title: 'Real-Debrid API Key Required!\n\nPlease configure the addon:\n1. Click on "Souhail Archive" addon\n2. Select "Configure"\n3. Enter your Real-Debrid API key\n4. Get key from: real-debrid.com/apitoken',
                url: '',
                behaviorHints: { configurable: true }
            }]
        };
    }
    
    try {
        // استخراج اسم الفيلم
        let movieName = id;
        let year = '';
        
        if (id.includes(':')) {
            const parts = id.split(':');
            if (parts.length > 1) {
                const nameWithYear = parts[1];
                const yearMatch = nameWithYear.match(/\((\d{4})\)/);
                if (yearMatch) {
                    year = yearMatch[1];
                    movieName = nameWithYear.replace(/\(\d{4}\)/, '').trim();
                } else {
                    movieName = nameWithYear.trim();
                }
            }
        }
        
        console.log(`🔍 Searching: "${movieName}" ${year ? `(${year})` : ''}`);
        
        // ⭐⭐⭐ البحث عن التورنتات ⭐⭐⭐
        const torrents = await searchContent(movieName, year, type);
        console.log(`📥 Found ${torrents.length} torrents`);
        
        // ⭐⭐⭐ تصفية حسب الإعدادات ⭐⭐⭐
        let filtered = torrents;
        if (currentConfig.quality && currentConfig.quality !== 'all') {
            filtered = filtered.filter(t => 
                t.quality && t.quality.toLowerCase().includes(currentConfig.quality)
            );
        }
        if (currentConfig.language && currentConfig.language !== 'all') {
            filtered = filtered.filter(t => 
                t.language && t.language.toLowerCase().includes(currentConfig.language)
            );
        }
        
        console.log(`🎯 After filtering: ${filtered.length} torrents`);
        
        // ⭐⭐⭐ حل مع Real-Debrid ⭐⭐⭐
        const resolved = await resolveWithRD(filtered.slice(0, 8), currentConfig.rd_api_key);
        console.log(`✅ Resolved ${resolved.filter(r => r.cached).length}/${resolved.length} with RD`);
        
        // ⭐⭐⭐ تحويل للصيغة المناسبة ⭐⭐⭐
        const streams = resolved.map(torrent => ({
            name: torrent.cached ? '💎 RD Cached' : '🧲 Torrent',
            title: formatStreamTitle(torrent, currentConfig.rd_api_key),
            url: torrent.streamUrl || '',
            ...(torrent.magnet && !torrent.streamUrl ? {
                infoHash: extractInfoHash(torrent.magnet),
                fileIdx: 0
            } : {}),
            behaviorHints: {
                notWebReady: !torrent.streamUrl,
                bingeGroup: `souhail_${type}`
            }
        }));
        
        if (streams.length === 0) {
            streams.push({
                name: '🔍 No Results',
                title: `No torrents found for "${movieName}"\nTry another movie or check your configuration`,
                url: ''
            });
        }
        
        console.log(`🚀 Sending ${streams.length} streams`);
        return { streams };
        
    } catch (error) {
        console.error('❌ Error:', error);
        return {
            streams: [{
                name: '❌ Error',
                title: `Error: ${error.message}\nCheck your API key and try again`,
                url: ''
            }]
        };
    }
});

// دوال مساعدة
function formatStreamTitle(torrent, apiKey) {
    const parts = [];
    parts.push(`🎬 ${torrent.title || 'Unknown'}`);
    if (torrent.quality) parts.push(`📊 ${torrent.quality}`);
    if (torrent.size) parts.push(`💾 ${torrent.size}`);
    if (torrent.seeders) parts.push(`👤 ${torrent.seeders} seeds`);
    if (torrent.language) parts.push(`🌍 ${torrent.language}`);
    parts.push(torrent.cached ? '✅ RD Cached' : '⚠️ Needs RD');
    parts.push(`🔑 API: ${apiKey.substring(0, 8)}...`);
    
    return parts.join(' | ');
}

function extractInfoHash(magnet) {
    const match = magnet.match(/btih:([a-fA-F0-9]{40})/);
    return match ? match[1].toLowerCase() : null;
}

// تشغيل الخادم
console.log('='.repeat(60));
console.log('🚀 Souhail Archive with Real-Debrid Configuration');
console.log('⚙️ Users must enter Real-Debrid API key');
console.log('🔗 Get API key: https://real-debrid.com/apitoken');
console.log('='.repeat(60));

serveHTTP(builder.getInterface(), { port: process.env.PORT || 3000 });
