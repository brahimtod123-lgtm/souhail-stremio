const axios = require('axios');
const cheerio = require('cheerio');

async function searchTorrents(query, year, type = 'movie') {
    const searchQuery = year ? `${query} ${year}` : query;
    console.log(`🔍 بحث عن تورنتات: "${searchQuery}" (${type})`);
    
    const sites = [
        {
            name: '1337x',
            url: `https://1337x.to/search/${encodeURIComponent(searchQuery)}/1/`,
            parser: parse1337x
        },
        {
            name: 'YTS',
            url: `https://yts.mx/browse-movies/${encodeURIComponent(query)}/all/all/0/latest`,
            parser: parseYTS
        },
        {
            name: 'TorrentGalaxy',
            url: `https://torrentgalaxy.to/torrents.php?search=${encodeURIComponent(searchQuery)}&sort=seeders&order=desc`,
            parser: parseTorrentGalaxy
        }
    ];
    
    const allResults = [];
    
    for (const site of sites) {
        try {
            console.log(`🌐 جرب ${site.name}...`);
            const response = await axios.get(site.url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                },
                timeout: 10000
            });
            
            const results = site.parser(response.data, site.name);
            console.log(`✅ ${site.name}: ${results.length} نتيجة`);
            
            allResults.push(...results);
            
        } catch (error) {
            console.log(`❌ ${site.name} فشل: ${error.message}`);
        }
        
        // تأخير بين الطلبات
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // ترتيب النتائج
    return sortTorrents(allResults);
}

function parse1337x(html, source) {
    const $ = cheerio.load(html);
    const results = [];
    
    $('tbody tr').each((i, elem) => {
        const title = $(elem).find('.name a:nth-child(2)').text().trim();
        const seeds = parseInt($(elem).find('.seeds').text().trim()) || 0;
        const size = $(elem).find('.size').text().trim();
        
        if (title && seeds > 5) {
            results.push({
                title: cleanTitle(title),
                size: size,
                seeders: seeds,
                quality: detectQuality(title),
                language: detectLanguage(title),
                source: source,
                type: detectType(title)
            });
        }
    });
    
    return results;
}

function parseYTS(html, source) {
    const $ = cheerio.load(html);
    const results = [];
    
    $('.browse-movie-wrap').each((i, elem) => {
        const title = $(elem).find('.browse-movie-title').text().trim();
        const year = $(elem).find('.browse-movie-year').text().trim();
        
        if (title) {
            results.push({
                title: `${title} (${year})`,
                size: '1.8 GB',
                seeders: 100,
                quality: '1080p',
                language: 'English',
                source: source,
                type: 'movie'
            });
        }
    });
    
    return results;
}

function parseTorrentGalaxy(html, source) {
    const $ = cheerio.load(html);
    const results = [];
    
    $('#tg-tbdata tr').each((i, elem) => {
        const title = $(elem).find('.tg-tbdata a.tx-light').text().trim();
        const seeds = parseInt($(elem).find('.font-green').text().trim()) || 0;
        
        if (title && seeds > 2) {
            results.push({
                title: cleanTitle(title),
                size: 'Unknown',
                seeders: seeds,
                quality: detectQuality(title),
                language: detectLanguage(title),
                source: source,
                type: detectType(title)
            });
        }
    });
    
    return results;
}

// دوال مساعدة
function cleanTitle(title) {
    return title
        .replace(/\[.*?\]/g, '')
        .replace(/\(.*?\)/g, '')
        .replace(/\b(1080p|720p|480p|4K|HDR|BluRay|WEB-DL)\b/gi, '')
        .replace(/\./g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function detectQuality(title) {
    if (/2160p|4k|uhd/i.test(title)) return '4K';
    if (/1080p|fhd/i.test(title)) return '1080p';
    if (/720p|hd/i.test(title)) return '720p';
    return 'Unknown';
}

function detectLanguage(title) {
    if (/arabic|عربي|arab/i.test(title)) return 'Arabic';
    if (/french|فرنسي|fren/i.test(title)) return 'French';
    return 'English';
}

function detectType(title) {
    if (/season|s[0-9]|episode|ep|series/i.test(title)) return 'series';
    if (/anime/i.test(title)) return 'anime';
    return 'movie';
}

function sortTorrents(torrents) {
    return torrents.sort((a, b) => {
        // أولوية الجودة
        const qualityOrder = { '4K': 4, '1080p': 3, '720p': 2, 'Unknown': 1 };
        const aScore = qualityOrder[a.quality] || 0;
        const bScore = qualityOrder[b.quality] || 0;
        
        if (bScore !== aScore) return bScore - aScore;
        return (b.seeders || 0) - (a.seeders || 0);
    });
}

module.exports = { searchTorrents };
