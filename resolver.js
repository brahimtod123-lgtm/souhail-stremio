const axios = require('axios');

async function resolveWithRD(torrents, apiKey) {
    if (!apiKey || apiKey.length < 20) {
        console.log('⚠️ No valid RD API key, returning raw torrents');
        return torrents.map(t => ({ ...t, cached: false }));
    }
    
    console.log(`🔗 Resolving ${torrents.length} torrents with Real-Debrid...`);
    const resolved = [];
    
    for (const torrent of torrents.slice(0, 5)) { // فقط أول 5
        try {
            if (!torrent.magnet) continue;
            
            // تحقق من الكاش
            const cached = await checkRDCache(torrent.magnet, apiKey);
            
            if (cached) {
                // احصل على stream link
                const streamUrl = await getRDStream(torrent.magnet, apiKey);
                
                resolved.push({
                    ...torrent,
                    cached: true,
                    streamUrl: streamUrl || null
                });
                
                console.log(`✅ Cached: ${torrent.title.substring(0, 40)}...`);
            } else {
                resolved.push({
                    ...torrent,
                    cached: false
                });
            }
            
        } catch (error) {
            console.log(`⚠️ RD Error: ${error.message}`);
            resolved.push({
                ...torrent,
                cached: false
            });
        }
    }
    
    return resolved;
}

async function checkRDCache(magnet, apiKey) {
    try {
        // هذه دالة مبسطة
        // في الواقع تحتاج للاتصال بـ Real-Debrid API
        return Math.random() > 0.5; // 50% chance للاختبار
    } catch (error) {
        return false;
    }
}

async function getRDStream(magnet, apiKey) {
    try {
        // هنا سيكون كود Real-Debrid الحقيقي
        // حالياً نرجع رابط تجريبي
        return 'https://example.com/stream.mpd';
    } catch (error) {
        return null;
    }
}

module.exports = { resolveWithRD };
