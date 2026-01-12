class StreamInfo {
    constructor() {
        this.streams = new Map();
    }
    
    create(magnet, metadata) {
        const streamId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const streamData = {
            id: streamId,
            magnet: magnet,
            title: metadata.title || 'Unknown',
            quality: this.detectQuality(metadata.title || ''),
            size: metadata.size || 'N/A',
            seeders: metadata.seeders || 0,
            cached: false,
            created: new Date().toISOString(),
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
        };
        
        this.streams.set(streamId, streamData);
        return streamData;
    }
    
    detectQuality(title) {
        const qualityPatterns = [
            { pattern: /4k|2160p|uhd/i, quality: '4K' },
            { pattern: /1080p|fhd/i, quality: '1080p' },
            { pattern: /720p|hd/i, quality: '720p' },
            { pattern: /480p|sd/i, quality: '480p' }
        ];
        
        for (const { pattern, quality } of qualityPatterns) {
            if (pattern.test(title)) {
                return quality;
            }
        }
        
        return 'Unknown';
    }
    
    get(streamId) {
        return this.streams.get(streamId);
    }
}

module.exports = new StreamInfo();
