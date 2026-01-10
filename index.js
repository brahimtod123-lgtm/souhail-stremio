const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');

// المانيفست
const manifest = {
    id: 'org.souhail.stremio',
    version: '1.0.0',
    name: 'SOUHAIL',
    description: 'Torrents with Real-Debrid',
    logo: 'https://via.placeholder.com/100x100/2c3e50/ffffff?text=SOUHAIL',
    resources: ['stream'],
    types: ['movie'],
    catalogs: []
};

const builder = new addonBuilder(manifest);

// معالج الستريمات
builder.defineStreamHandler(async (args) => {
    console.log('Request:', args);
    
    // بغينا نرجعو stream واحد بسيط
    return {
        streams: [
            {
                name: 'SOUHAIL',
                title: 'Test Stream - Addon is working!',
                url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
            }
        ]
    };
});

// تشغيل الخادم
const port = process.env.PORT || 3000;
console.log(`Starting SOUHAIL addon on port ${port}`);

serveHTTP(builder.getInterface(), { 
    port: port,
    static: null // مهم!
});
