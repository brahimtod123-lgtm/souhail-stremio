const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');
const { searchTorrents } = require('./scraper');
const { resolveTorrents } = require('./resolver');

// ⭐⭐⭐ إضافة متغير بيئة لـ Real-Debrid ⭐⭐⭐
const RD_API_KEY = process.env.RD_API_KEY || '';

const manifest = {
    id: 'com.souhail.archive',
    version: '3.0.0',
    name: '💎 SOUHAIL ARCHIVE',
    description: 'أفلام ومسلسلات مع Real-Debrid | أدخل API key في Railway Variables',
    logo: 'https://img.icons8.com/color/96/000000/movie.png',
    background: 'https://img.icons8.com/color/480/000000/cinema-.png',
    resources: ['stream'],
    types: ['movie', 'series', 'anime'],
    idPrefixes: ['tt'],
    catalogs: []
};

const builder = new addonBuilder(manifest);

builder.defineStreamHandler(async ({ type, id }) => {
    console.log('\n' + '='.repeat(60));
    console.log('🎬 طلب جديد من Stremio:');
    console.log('📌 النوع:', type);
    console.log('📌 المعرف:', id);
    console.log('🔑 RD API:', RD_API_KEY ? 'موجود' : 'مفقود');
    console.log('='.repeat(60));
    
    // ⭐⭐⭐ تحقق من Real-Debrid API key ⭐⭐⭐
    if (!RD_API_KEY || RD_API_KEY.length < 20) {
        console.log('❌ لا يوجد Real-Debrid API key');
        return {
            streams: [{
                name: '⚙️ إعدادات مطلوبة',
                title: `🔑 REAL-DEBRID API KEY مطلوب!\n\nفي Railway Dashboard:\n1. اذهب إلى Settings → Variables\n2. أضف: RD_API_KEY = مفتاحك\n3. احصل على المفتاح من: real-debrid.com/apitoken\n\n🔗 مثال المفتاح: XF5G8H9J2K3L4M5N6P7Q8R9S0T1U2V3W`,
                url: ''
            }]
        };
    }
    
    try {
        // استخراج اسم المحتوى
        let contentName = id;
        let year = '';
        
        if (id.includes(':')) {
            const parts = id.split(':');
            if (parts.length > 1) {
                const nameWithYear = parts[1];
                const yearMatch = nameWithYear.match(/\((\d{4})\)/);
                if (yearMatch) {
                    year = yearMatch[1];
                    contentName = nameWithYear.replace(/\(\d{4}\)/, '').trim();
                } else {
                    contentName = nameWithYear.trim();
                }
            }
        }
        
        console.log(`🔍 البحث عن: "${contentName}" ${year ? `(${year})` : ''}`);
        
        // ⭐⭐⭐ البحث عن التورنتات ⭐⭐⭐
        console.log('🌐 جاري البحث في مواقع التورنت...');
        const torrents = await searchTorrents(contentName, year, type);
        
        if (torrents.length === 0) {
            console.log('⚠️ لم يتم العثور على تورنتات');
            return {
                streams: [{
                    name: '🔍 لا توجد نتائج',
                    title: `لم يتم العثور على تورنتات لـ "${contentName}"\nجرب فيلم آخر أو تحقق من الإملاء`,
                    url: ''
                }]
            };
        }
        
        console.log(`✅ تم العثور على ${torrents.length} تورنت`);
        
        // ⭐⭐⭐ حل التورنتات مع Real-Debrid ⭐⭐⭐
        console.log('🔗 جاري معالجة مع Real-Debrid...');
        const resolved = await resolveTorrents(torrents.slice(0, 8), RD_API_KEY);
        
        const cachedCount = resolved.filter(t => t.cached).length;
        console.log(`💎 ${cachedCount}/${resolved.length} موجودة في كاش Real-Debrid`);
        
        // ⭐⭐⭐ تحويل للصيغة النهائية ⭐⭐⭐
        const streams = resolved.map(torrent => {
            const stream = {
                name: torrent.cached ? '💎 Real-Debrid' : '🧲 Torrent',
                title: formatTitle(torrent),
                behaviorHints: {
                    notWebReady: !torrent.cached,
                    bingeGroup: `souhail_${torrent.source}`
                }
            };
            
            // إذا كان cached نعطي رابط مباشر، وإلا نعطي magnet
            if (torrent.cached && torrent.streamUrl) {
                stream.url = torrent.streamUrl;
            } else if (torrent.magnet) {
                stream.infoHash = extractInfoHash(torrent.magnet);
                stream.fileIdx = 0;
            }
            
            return stream;
        });
        
        console.log(`🚀 إرسال ${streams.length} ستريم إلى Stremio`);
        return { streams };
        
    } catch (error) {
        console.error('❌ خطأ:', error);
        return {
            streams: [{
                name: '❌ خطأ',
                title: `خطأ: ${error.message}\nالرجاء المحاولة مرة أخرى`,
                url: ''
            }]
        };
    }
});

// دوال مساعدة
function formatTitle(torrent) {
    const parts = [];
    parts.push(`🎬 ${torrent.title.substring(0, 50)}${torrent.title.length > 50 ? '...' : ''}`);
    if (torrent.quality) parts.push(`📊 ${torrent.quality}`);
    if (torrent.size) parts.push(`💾 ${torrent.size}`);
    if (torrent.seeders) parts.push(`👤 ${torrent.seeders} سيدر`);
    if (torrent.language) parts.push(`🌍 ${torrent.language}`);
    parts.push(torrent.cached ? '✅ مخزن في RD' : '⚠️ يحتاج RD');
    parts.push(`🔗 ${torrent.source || 'مصدر مجهول'}`);
    
    return parts.join('\n');
}

function extractInfoHash(magnet) {
    const match = magnet.match(/btih:([a-fA-F0-9]{40})/);
    return match ? match[1].toLowerCase() : null;
}

// تشغيل الخادم
console.log('='.repeat(60));
console.log('🚀 SOUHAIL ARCHIVE - جاهز للتشغيل!');
console.log('💎 Real-Debrid API:', RD_API_KEY ? '✅ تم الإعداد' : '❌ مطلوب');
console.log('📡 لتعيين API Key في Railway:');
console.log('   1. اذهب إلى Railway Dashboard');
console.log('   2. Settings → Variables');
console.log('   3. أضف: RD_API_KEY = مفتاحك');
console.log('='.repeat(60));

serveHTTP(builder.getInterface(), { port: process.env.PORT || 3000 });
