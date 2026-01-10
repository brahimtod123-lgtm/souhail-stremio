const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');

const manifest = {
    id: 'com.souhail.working',
    version: '1.0.0',
    name: 'SOUHAIL WORKING',
    description: 'Working addon for testing',
    logo: 'https://img.icons8.com/color/96/000000/movie.png',
    resources: ['stream'],
    types: ['movie'],
    catalogs: []
};

const builder = new addonBuilder(manifest);

builder.defineStreamHandler(async ({ type, id }) => {
    console.log('\n' + '='.repeat(60));
    console.log('🎬 STREMIO REQUEST:');
    console.log('Type:', type);
    console.log('ID:', id);
    console.log('='.repeat(60));
    
    // ⭐⭐⭐ streams مباشرة ⭐⭐⭐
    const streams = [
        {
            name: 'SOUHAIL WORKING',
            title: `✅ ADDON IS WORKING!\n🎬 Movie: ${id}\n📅 2024 | ⭐ 8.5/10\n📊 1080p | 💾 2.5GB\n👤 150 seeds | 🌍 English`,
            url: 'https://bitdash-a.akamaihd.net/s/content/media/Manifest.mpd',
            behaviorHints: {
                notWebReady: false,
                bingeGroup: 'souhail_test'
            }
        },
        {
            name: 'TEST STREAM',
            title: '🎬 Big Buck Bunny\n📊 1080p | 💾 450MB\n✅ Direct MP4 link',
            url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            behaviorHints: {
                notWebReady: false
            }
        }
    ];
    
    console.log(`✅ Sending ${streams.length} streams to Stremio`);
    console.log('First stream URL:', streams[0].url);
    console.log('='.repeat(60));
    
    return { streams: streams };
});

console.log('='.repeat(60));
console.log('🚀 SOUHAIL WORKING ADDON');
console.log('📡 Waiting for Stremio requests...');
console.log('='.repeat(60));

serveHTTP(builder.getInterface(), { port: process.env.PORT || 3000 });
