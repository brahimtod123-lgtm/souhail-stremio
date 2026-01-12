const express = require('express');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const parseTorrent = require('parse-torrent');
const app = express();

const PORT = process.env.PORT || 8080;
const RD_KEY = process.env.REAL_DEBRID_API;

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
});

// MANIFEST
app.get('/manifest.json', (req, res) => {
    res.json({
        "id": "com.souhail.torrentinfo",
        "version": "3.0.0",
        "name": "Souhail Torrent Info",
        "description": "Displays full torrent information",
        "logo": "https://cdn-icons-png.flaticon.com/512/3095/3095588.png",
        "resources": ["stream"],
        "types": ["movie", "series"],
        "idPrefixes": ["tt"]
    });
});

// STREAM
app.get('/stream/:type/:id.json', async (req, res) => {
    const { type, id } = req.params;
    
    if (!RD_KEY) {
        return res.json({ streams: [] });
    }
    
    try {
        const torrentioUrl = `https://torrentio.strem.fun/realdebrid=${RD_KEY}/stream/${type}/${id}.json`;
        const response = await fetch(torrentioUrl);
        const data = await response.json();
        
        if (!data.streams) {
            return res.json({ streams: [] });
        }
        
        // جلب معلومات إضافية من مصادر خارجية
        const movieInfo = await getExternalMovieInfo(id);
        
        const processedStreams = await Promise.all(data.streams.map(async (stream) => {
            try {
                const isCached = stream.url && stream.url.includes('real-debrid.com');
                let torrentDetails = {};
                
                // محاولة استخراج المغناطيس من الـURL
                if (stream.url) {
                    torrentDetails = await extractTorrentDetails(stream.url);
                }
                
                // استعمال العنوان الأصلي + المعلومات الإضافية
                const originalTitle = stream.name || stream.title || '';
                const fullInfo = await enrichTitleInfo(originalTitle, torrentDetails, movieInfo);
                
                return {
                    title: createDetailedTitle(fullInfo, isCached),
                    url: stream.url,
                    behaviorHints: stream.behaviorHints || {}
                };
                
            } catch (error) {
                console.error('Error processing stream:', error);
                // رجع معلومات أساسية إذا فشلت العملية
                return {
                    title: `💎🎬 Basic Stream\n💎📡 ${stream.name || 'Torrent'}`,
                    url: stream.url,
                    behaviorHints: stream.behaviorHints || {}
                };
            }
        }));
        
        res.json({ streams: processedStreams });
        
    } catch (error) {
        console.error('Main error:', error);
        res.json({ streams: [] });
    }
});

// جلب معلومات الفيلم من TMDB
async function getExternalMovieInfo(imdbId) {
    try {
        // يمكنك استخدام TMDB API هنا
        // سجل في https://www.themoviedb.org/documentation/api
        // واحصل على API key
        
        const tmdbApiKey = process.env.TMDB_API_KEY; // اختياري
        
        if (tmdbApiKey && imdbId.startsWith('tt')) {
            // البحث عن الفيلم في TMDB
            const searchUrl = `https://api.themoviedb.org/3/find/${imdbId}?api_key=${tmdbApiKey}&external_source=imdb_id`;
            const response = await fetch(searchUrl);
            const data = await response.json();
            
            if (data.movie_results && data.movie_results.length > 0) {
                const movie = data.movie_results[0];
                return {
                    title: movie.title,
                    year: movie.release_date ? movie.release_date.substring(0, 4) : '',
                    rating: movie.vote_average,
                    duration: movie.runtime,
                    overview: movie.overview
                };
            }
        }
        
        // إذا ماكانش TMDB، استعمل معلومات أساسية
        return {
            title: imdbId.startsWith('tt') ? `IMDB: ${imdbId}` : 'Movie',
            year: '',
            rating: '',
            duration: ''
        };
        
    } catch (error) {
        return { title: '', year: '', rating: '', duration: '' };
    }
}

// استخراج تفاصيل التورنت من المغناطيس
async function extractTorrentDetails(url) {
    const details = {
        name: '',
        size: 0,
        files: [],
        infoHash: ''
    };
    
    try {
        // إذا كان الرابط يحتوي على معلومات المغناطيس
        if (url.includes('magnet:?')) {
            const magnetUri = url.split('&dn=')[1] || '';
            if (magnetUri) {
                details.name = decodeURIComponent(magnetUri.split('&')[0]);
            }
        }
        
        // يمكن إضافة parsing للمغناطيس هنا
        // باستخدام مكتبة مثل 'parse-torrent'
        
        return details;
    } catch (error) {
        return details;
    }
}

// إثراء المعلومات
async function enrichTitleInfo(originalTitle, torrentDetails, movieInfo) {
    const info = {
        // من الفيلم الخارجي
        movieName: movieInfo.title || '',
        year: movieInfo.year || '',
        rating: movieInfo.rating || '',
        duration: movieInfo.duration || '',
        
        // من العنوان الأصلي
        size: extractSize(originalTitle),
        quality: extractQuality(originalTitle),
        seeders: extractSeeders(originalTitle),
        codec: extractCodec(originalTitle),
        audio: extractAudio(originalTitle),
        language: extractLanguage(originalTitle),
        subs: extractSubs(originalTitle),
        source: extractSource(originalTitle),
        site: extractSite(originalTitle),
        
        // من التورنت
        torrentName: torrentDetails.name || originalTitle,
        fileCount: torrentDetails.files ? torrentDetails.files.length : 1
    };
    
    return info;
}

// دوال الاستخراج
function extractSize(title) {
    const match = title.match(/(\d+(\.\d+)?)\s*(GB|MB|GiB|MiB)/i);
    return match ? match[0] : 'Unknown';
}

function extractQuality(title) {
    if (title.match(/4K|UHD/i)) return '4K';
    if (title.match(/2160p/i)) return '2160p';
    if (title.match(/1080p|FHD/i)) return '1080p';
    if (title.match(/720p|HD/i)) return '720p';
    if (title.match(/480p|SD/i)) return '480p';
    return '1080p';
}

function extractSeeders(title) {
    const match = title.match(/(\d+)\s*Seeds?/i);
    return match ? parseInt(match[1]) : 0;
}

function extractCodec(title) {
    if (title.match(/x265|HEVC/i)) return 'HEVC';
    if (title.match(/AV1/i)) return 'AV1';
    if (title.match(/VP9/i)) return 'VP9';
    return 'H.264';
}

function extractAudio(title) {
    if (title.match(/DDP5\.1|Dolby Digital Plus/i)) return 'DDP5.1';
    if (title.match(/DTS-HD|DTS-HD MA/i)) return 'DTS-HD';
    if (title.match(/TrueHD/i)) return 'TrueHD';
    if (title.match(/AC3|Dolby Digital/i)) return 'AC3';
    if (title.match(/AAC/i)) return 'AAC';
    return 'AC3';
}

function extractLanguage(title) {
    if (title.match(/Arabic|AR|Arabe/i)) return 'Arabic';
    if (title.match(/French|FR|Français/i)) return 'French';
    if (title.match(/Spanish|ES|Español/i)) return 'Spanish';
    if (title.match(/Multi/i)) return 'Multi';
    return 'English';
}

function extractSubs(title) {
    if (title.match(/Arabic Subs|AR-Subs/i)) return 'AR';
    if (title.match(/French Subs|FR-Subs/i)) return 'FR';
    if (title.match(/English Subs|EN-Subs/i)) return 'EN';
    if (title.match(/Spanish Subs|ES-Subs/i)) return 'ES';
    if (title.match(/Multi Subs/i)) return 'Multi';
    return 'EN';
}

function extractSource(title) {
    if (title.match(/BluRay|Blu-Ray|BD/i)) return 'BluRay';
    if (title.match(/WEB-DL|WEB/i)) return 'WEB-DL';
    if (title.match(/WEBRip/i)) return 'WEBRip';
    if (title.match(/HDTV/i)) return 'HDTV';
    if (title.match(/DVD/i)) return 'DVD';
    return 'WEB-DL';
}

function extractSite(title) {
    const siteMatch = title.match(/\[(.*?)\]/);
    return siteMatch ? siteMatch[1] : 'Torrent';
}

// إنشاء العنوان المفصل
function createDetailedTitle(info, isCached) {
    const lines = [];
    
    // سطر 1: اسم الفيلم + السنة + التقييم
    let titleLine = `💎🎬 ${info.movieName || info.torrentName.substring(0, 40)}`;
    if (info.year) titleLine += ` (${info.year})`;
    if (info.rating) titleLine += ` ⭐ ${info.rating}/10`;
    lines.push(titleLine);
    
    // سطر 2: الحجم + الجودة + السيدرز
    lines.push(`💎💾 ${info.size}  |  💎📺 ${info.quality}  |  💎🧑‍🔧 ${info.seeders || '?'}`);
    
    // سطر 3: التقنية
    lines.push(`💎🎞️ ${info.codec}  |  💎🎧 ${info.audio}  |  💎📦 ${info.source}`);
    
    // سطر 4: اللغات
    lines.push(`💎🔊 ${info.language}  |  💎🌐 ${info.subs}  |  💎🌍 ${info.site}`);
    
    // سطر 5: المدة + الموقع
    if (info.duration) {
        lines.push(`💎⏱️ ${info.duration} min  |  💎📁 ${info.fileCount} files`);
    }
    
    // سطر 6: النوع
    lines.push(isCached ? '💎🧲 RD Cached' : '💎📡 Torrent');
    
    return lines.join('\n');
}

// صفحات المساعدة
app.get('/install', (req, res) => {
    res.send(`
        <html>
        <body style="font-family: Arial; padding: 20px; text-align: center;">
            <h1>📲 Install</h1>
            <a href="stremio://stremio.xyz/app/${req.hostname}/manifest.json" 
               style="display: inline-block; background: #28a745; color: white; padding: 15px 30px; border-radius: 5px; text-decoration: none;">
                Install Now
            </a>
            <p><code>https://${req.hostname}/manifest.json</code></p>
            <p><a href="/test">Test Page</a></p>
        </body>
        </html>
    `);
});

app.get('/test', (req, res) => {
    res.send(`
        <html>
        <body style="font-family: Arial; padding: 20px;">
            <h1>Test Page</h1>
            <h3>Expected Output:</h3>
            <pre style="background: #f8f9fa; padding: 15px;">
💎🎬 Inception (2010) ⭐ 8.8/10
💎💾 1.8 GB  |  💎📺 1080p  |  💎🧑‍🔧 1500
💎🎞️ H.264  |  💎🎧 DTS-HD  |  💎📦 BluRay
💎🔊 English  |  💎🌐 EN  |  💎🌍 YTS
💎⏱️ 148 min  |  💎📁 1 files
💎🧲 RD Cached</pre>
            
            <h3>Test:</h3>
            <ul>
                <li><a href="/stream/movie/tt1375666.json">Inception</a></li>
                <li><a href="/stream/movie/tt0816692.json">Interstellar</a></li>
            </ul>
        </body>
        </html>
    `);
});

app.get('/', (req, res) => {
    res.send(`
        <html>
        <body style="font-family: Arial; padding: 20px; text-align: center;">
            <h1>🎬 Souhail Torrent Info</h1>
            <p>Displays complete torrent information</p>
            <p><a href="/install">📲 Install Addon</a></p>
            <p>Real-Debrid: ${RD_KEY ? '✅' : '❌'}</p>
        </body>
        </html>
    `);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server: http://localhost:${PORT}`);
});
