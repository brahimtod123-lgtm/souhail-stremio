const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');

// 1. تعريف الإضافة
const manifest = {
    id: 'com.souhail.stremio',
    version: '1.0.0',
    name: 'SOUHAIL / RD',
    description: 'تورنتات مع Real-Debrid - Souhail Archive',
    logo: 'https://i.imgur.com/7VTVVc1.png',
    resources: ['stream'],
    types: ['movie'],
    catalogs: [],
    idPrefixes: ['tt']
};

const builder = new addonBuilder(manifest);

// 2. تعريف كيفية البحث
builder.defineStreamHandler(async ({ type, id }) => {
    console.log(`🎬 طلب فيلم: ${id}`);
    
    // استخراج اسم الفيلم
    let movieName = id;
    if (id.includes(':')) {
        const parts = id.split(':');
        if (parts.length > 1) {
            movieName = parts[1].replace(/\(\d{4}\)/, '').trim();
        }
    }
    
    // نتائج تجريبية
    const streams = [
        {
            name: '💎 SOUHAIL / RD',
            title: `🎬 ${movieName}\n✅ الإضافة تعمل بنجاح!\n✨ جودة: 1080p | سيدرز: 150\n🔧 Real-Debrid: قيد التطوير`,
            url: ''
        },
        {
            name: '📺 مثال تشغيل',
            title: '🎬 Big Buck Bunny (تجريبي)\n📊 1080p | 💾 450 ميجا\n✅ يعمل في المتصفح',
            url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
        }
    ];
    
    return { streams };
});

// 3. تشغيل الخادم
const port = process.env.PORT || 7000;
console.log(`🚀 تشغيل إضافة SOUHAIL على البورت ${port}...`);
console.log(`📡 رابط المانيفست: http://localhost:${port}/manifest.json`);

serveHTTP(builder.getInterface(), { port: port });
