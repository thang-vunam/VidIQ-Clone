/**
 * VidIQ Clone - YouTube API Module
 * Handles all YouTube Data API v3 interactions
 */

const YouTubeAPI = {
    // ============================================================
    // API Key được nhập qua Settings UI, lưu vào localStorage
    // Không hardcode key để tránh bị Google khóa
    // ============================================================
    DEFAULT_API_KEY: '',  // Không hardcode - nhập qua Settings

    API_KEY: null,
    BASE_URL: 'https://www.googleapis.com/youtube/v3',

    /**
     * Initialize API with key from localStorage
     */
    init() {
        const savedKey = localStorage.getItem('youtube_api_key');
        if (savedKey) {
            this.API_KEY = savedKey;
        }
        return this.API_KEY !== null;
    },

    /**
     * Set API key
     * @param {string} key - YouTube API Key
     */
    setApiKey(key) {
        this.API_KEY = key;
        localStorage.setItem('youtube_api_key', key);
    },

    /**
     * Get API key
     * @returns {string|null} API key or null
     */
    getApiKey() {
        return this.API_KEY;
    },

    /**
     * Check if API is configured
     * @returns {boolean}
     */
    isConfigured() {
        return this.API_KEY !== null && this.API_KEY.length > 0;
    },

    /**
     * Make API request
     * @param {string} endpoint - API endpoint
     * @param {Object} params - Query parameters
     * @returns {Promise<Object>} API response
     */
    async request(endpoint, params = {}) {
        if (!this.isConfigured()) {
            throw new Error('API Key chưa được cấu hình. Vui lòng vào Settings để nhập API Key.');
        }

        const url = new URL(`${this.BASE_URL}/${endpoint}`);
        url.searchParams.append('key', this.API_KEY);

        for (const [key, value] of Object.entries(params)) {
            if (value !== null && value !== undefined) {
                url.searchParams.append(key, value);
            }
        }

        try {
            const response = await fetch(url.toString());
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error?.message || 'API request failed');
            }

            return data;
        } catch (error) {
            console.error('YouTube API Error:', error);
            throw error;
        }
    },

    /**
     * Search for videos
     * @param {string} query - Search query
     * @param {Object} options - Search options
     * @returns {Promise<Object>} Search results
     */
    async searchVideos(query, options = {}) {
        const params = {
            part: 'snippet',
            q: query,
            type: 'video',
            maxResults: options.maxResults || 25,
            order: options.order || 'relevance',
            regionCode: options.regionCode || 'VN',
            relevanceLanguage: options.language || 'vi',
            ...options
        };

        return this.request('search', params);
    },

    /**
     * Get video details
     * @param {string|string[]} videoIds - Video ID(s)
     * @returns {Promise<Object>} Video details
     */
    async getVideoDetails(videoIds) {
        const ids = Array.isArray(videoIds) ? videoIds.join(',') : videoIds;

        return this.request('videos', {
            part: 'snippet,statistics,contentDetails',
            id: ids
        });
    },

    /**
     * Get trending videos
     * @param {string} regionCode - Country code (e.g., 'VN', 'US')
     * @param {string} categoryId - Video category ID
     * @param {number} maxResults - Maximum results
     * @returns {Promise<Object>} Trending videos
     */
    async getTrending(regionCode = 'VN', categoryId = '0', maxResults = 25) {
        const params = {
            part: 'snippet,statistics,contentDetails',
            chart: 'mostPopular',
            regionCode: regionCode,
            maxResults: maxResults
        };

        if (categoryId && categoryId !== '0') {
            params.videoCategoryId = categoryId;
        }

        return this.request('videos', params);
    },

    /**
     * Get channel details
     * @param {string} channelId - Channel ID
     * @returns {Promise<Object>} Channel details
     */
    async getChannelDetails(channelId) {
        // Check if it's a username or handle
        let params = {
            part: 'snippet,statistics,brandingSettings'
        };

        if (channelId.startsWith('@')) {
            params.forHandle = channelId;
        } else if (channelId.startsWith('UC')) {
            params.id = channelId;
        } else {
            // Try as custom URL
            params.forUsername = channelId;
        }

        return this.request('channels', params);
    },

    /**
     * Get multiple channels details at once
     * @param {string[]} channelIds - Array of Channel IDs
     * @returns {Promise<Object>} Channels details
     */
    async getChannelsDetails(channelIds) {
        if (!channelIds || channelIds.length === 0) {
            return { items: [] };
        }

        return this.request('channels', {
            part: 'statistics',
            id: channelIds.join(',')
        });
    },

    /**
     * Get channel videos
     * @param {string} channelId - Channel ID
     * @param {number} maxResults - Maximum results
     * @returns {Promise<Object>} Channel videos
     */
    async getChannelVideos(channelId, maxResults = 10) {
        // First, get the uploads playlist
        const channelData = await this.request('channels', {
            part: 'contentDetails',
            id: channelId
        });

        if (!channelData.items || channelData.items.length === 0) {
            throw new Error('Channel không tồn tại');
        }

        const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;

        // Get videos from uploads playlist
        const playlistData = await this.request('playlistItems', {
            part: 'snippet,contentDetails',
            playlistId: uploadsPlaylistId,
            maxResults: maxResults
        });

        // Get video statistics
        if (playlistData.items && playlistData.items.length > 0) {
            const videoIds = playlistData.items.map(item => item.contentDetails.videoId).join(',');
            const videoStats = await this.request('videos', {
                part: 'statistics,contentDetails',
                id: videoIds
            });

            // Merge statistics with playlist items
            playlistData.items = playlistData.items.map(item => {
                const stats = videoStats.items.find(v => v.id === item.contentDetails.videoId);
                return {
                    ...item,
                    statistics: stats?.statistics,
                    duration: stats?.contentDetails?.duration
                };
            });
        }

        return playlistData;
    },

    /**
     * Search for related keywords (using search suggestions)
     * @param {string} keyword - Base keyword
     * @returns {Promise<Object>} Related keywords with estimated metrics
     */
    async getKeywordData(keyword) {
        // Search for videos with the keyword to estimate competition
        const searchResults = await this.searchVideos(keyword, {
            maxResults: 50,
            order: 'relevance'
        });

        // Get video details for the results
        if (searchResults.items && searchResults.items.length > 0) {
            const videoIds = searchResults.items.map(item => item.id.videoId).join(',');
            const videoDetails = await this.getVideoDetails(videoIds);

            // Get unique channel IDs and fetch their details
            const channelIds = [...new Set(videoDetails.items.map(v => v.snippet?.channelId).filter(Boolean))];
            const channelData = await this.getChannelsDetails(channelIds);

            // Create a map of channelId -> subscriberCount
            const channelMap = {};
            if (channelData.items) {
                channelData.items.forEach(ch => {
                    channelMap[ch.id] = {
                        subscriberCount: ch.statistics?.subscriberCount,
                        hiddenSubscriberCount: ch.statistics?.hiddenSubscriberCount
                    };
                });
            }

            // Merge channel data into videos
            videoDetails.items.forEach(video => {
                const channelId = video.snippet?.channelId;
                if (channelId && channelMap[channelId]) {
                    video.channelStats = channelMap[channelId];
                }
            });

            // Calculate estimated metrics
            const totalViews = videoDetails.items.reduce((sum, video) => {
                return sum + parseInt(video.statistics?.viewCount || 0);
            }, 0);

            const avgViews = Math.round(totalViews / videoDetails.items.length);

            // Estimate competition based on channel sizes and view counts
            const competition = this.calculateCompetition(videoDetails.items);

            return {
                keyword: keyword,
                totalResults: searchResults.pageInfo?.totalResults || 0,
                estimatedSearchVolume: this.estimateSearchVolume(searchResults.pageInfo?.totalResults, avgViews, videoDetails.items),
                competition: competition,
                competitionLevel: this.getCompetitionLevel(competition),
                avgViews: avgViews,
                topVideos: videoDetails.items.slice(0, 10)
            };
        }

        return {
            keyword: keyword,
            totalResults: 0,
            estimatedSearchVolume: 0,
            competition: 0,
            competitionLevel: 'low',
            avgViews: 0,
            topVideos: []
        };
    },

    /**
     * Calculate competition score
     * @param {Array} videos - Video items
     * @returns {number} Competition score (0-100)
     */
    calculateCompetition(videos) {
        if (!videos || videos.length === 0) return 0;

        // Factors: view distribution, like ratio, sub-to-view ratio (The "Small Channel Big Views" Goldmine)
        let competitionScore = 0;

        videos.forEach(video => {
            const views = parseInt(video.statistics?.viewCount || 0);
            const likes = parseInt(video.statistics?.likeCount || 0);
            const subs = parseInt(video.channelStats?.subscriberCount || 0);

            let baseScore = 0;
            // High view videos increase competition
            if (views > 1000000) baseScore += 3;
            else if (views > 100000) baseScore += 2;
            else if (views > 10000) baseScore += 1;

            // The VidIQ Secret Sauce: Sub-to-View Ratio
            if (subs > 0) {
                // If a channel gets views > 3x their sub count, it's a trend riding video!
                if (views > (subs * 3)) baseScore -= 2; // Drastically lower competition block
                else if (views > (subs * 1.5)) baseScore -= 1;
            }
            
            // Ultra-small channel dominating
            if (subs > 0 && subs < 10000 && views > 20000) baseScore -= 1;

            competitionScore += Math.max(0, baseScore);

            // High engagement increases competition (Hard to beat their ranking)
            const engagement = views > 0 ? (likes / views) * 100 : 0;
            if (engagement > 5) competitionScore += 2;
            else if (engagement > 2) competitionScore += 1;
        });

        // Normalize to 0-100
        return Math.min(100, Math.round((competitionScore / (videos.length * 5)) * 100));
    },

    /**
     * Get competition level label
     * @param {number} score - Competition score
     * @returns {string} 'low', 'medium', or 'high'
     */
    getCompetitionLevel(score) {
        if (score < 35) return 'low';
        if (score < 70) return 'medium';
        return 'high';
    },

    /**
     * Estimate search volume based on results, average views, and velocity (Trends Boost)
     * @param {number} totalResults - Total search results
     * @param {number} avgViews - Average views
     * @param {Array} videos - The top search videos to calculate Velocity (VPH logic)
     * @returns {string} Estimated search volume
     */
    estimateSearchVolume(totalResults, avgViews, videos = []) {
        // Base Volume from total results and historical views
        let factor = Math.log10(totalResults + 1) * Math.log10(avgViews + 1);

        // VPH / Velocity Boost: The "Google Trends / VidIQ VPH" simulation
        const now = new Date();
        let recentVelocitySum = 0;
        let recentCount = 0;

        videos.forEach(video => {
            if (video.snippet?.publishedAt) {
                const daysOld = Math.max(1, (now - new Date(video.snippet.publishedAt)) / (1000 * 60 * 60 * 24));
                // Only consider videos from the last 30 days for trend boost
                if (daysOld <= 30) {
                    const views = parseInt(video.statistics?.viewCount || 0);
                    const viewsPerDay = views / daysOld;
                    recentVelocitySum += viewsPerDay;
                    recentCount++;
                }
            }
        });

        const avgVelocity = recentCount > 0 ? recentVelocitySum / recentCount : 0;
        
        let trendMultiplier = 1;
        if (avgVelocity > 50000) trendMultiplier = 2.5; // Massive Viral Trend
        else if (avgVelocity > 10000) trendMultiplier = 1.8; // High Trend
        else if (avgVelocity > 1000) trendMultiplier = 1.3; // Noticeable Trend

        factor = factor * trendMultiplier;

        if (factor > 14) return '500K+ (Siêu Trend 🔥)';
        if (factor > 11) return '100K-500K (Xu hướng 🚀)';
        if (factor > 8) return '50K-100K';
        if (factor > 5) return '10K-50K';
        if (factor > 3) return '1K-10K';
        if (factor > 1.5) return '100-1K';
        return '<100';
    },

    /**
     * Validate API key
     * @param {string} key - API key to validate
     * @returns {Promise<boolean>} Whether key is valid
     */
    async validateApiKey(key) {
        const originalKey = this.API_KEY;
        this.API_KEY = key;

        try {
            await this.request('videos', {
                part: 'snippet',
                chart: 'mostPopular',
                maxResults: 1,
                regionCode: 'VN'
            });
            return true;
        } catch (error) {
            this.API_KEY = originalKey;
            return false;
        }
    },

    /**
     * Format view count
     * @param {number} count - View count
     * @returns {string} Formatted count
     */
    formatCount(count) {
        if (!count) return '0';
        const num = parseInt(count);
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    },

    /**
     * Parse YouTube duration to readable format
     * @param {string} duration - ISO 8601 duration
     * @returns {string} Formatted duration (e.g., "10:30")
     */
    parseDuration(duration) {
        if (!duration) return '0:00';

        const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (!match) return '0:00';

        const hours = parseInt(match[1] || 0);
        const minutes = parseInt(match[2] || 0);
        const seconds = parseInt(match[3] || 0);

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    },

    /**
     * Parse relative time
     * @param {string} dateString - ISO date string
     * @returns {string} Relative time (e.g., "2 ngày trước")
     */
    parseRelativeTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        const weeks = Math.floor(diff / 604800000);
        const months = Math.floor(diff / 2592000000);
        const years = Math.floor(diff / 31536000000);

        const lang = i18n?.currentLang || 'vi';

        if (lang === 'vi') {
            if (years > 0) return `${years} năm trước`;
            if (months > 0) return `${months} tháng trước`;
            if (weeks > 0) return `${weeks} tuần trước`;
            if (days > 0) return `${days} ngày trước`;
            if (hours > 0) return `${hours} giờ trước`;
            if (minutes > 0) return `${minutes} phút trước`;
            return 'Vừa xong';
        } else {
            if (years > 0) return `${years} year${years > 1 ? 's' : ''} ago`;
            if (months > 0) return `${months} month${months > 1 ? 's' : ''} ago`;
            if (weeks > 0) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
            if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
            if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
            if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
            return 'Just now';
        }
    },

    /**
     * Get YouTube autocomplete suggestions
     * @param {string} keyword - Base keyword
     * @returns {Promise<string[]>} Autocomplete suggestions
     */
    async getAutocompleteSuggestions(keyword) {
        try {
            // Use YouTube's suggestion API via CORS proxy
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(
                `https://suggestqueries-clients6.youtube.com/complete/search?client=youtube&q=${encodeURIComponent(keyword)}&hl=vi`
            )}`;

            const response = await fetch(proxyUrl);
            const text = await response.text();

            // Parse JSONP response: window.google.ac.h([...])
            const match = text.match(/\[.*\]/s);
            if (match) {
                const data = JSON.parse(match[0]);
                if (data[1] && Array.isArray(data[1])) {
                    return data[1].map(item => item[0]).filter(s => s !== keyword);
                }
            }
            return [];
        } catch (error) {
            console.warn('Autocomplete API failed, using fallback:', error);
            return [];
        }
    },

    /**
     * Get top keywords from a channel's videos
     * @param {string} channelId - Channel ID or handle
     * @param {number} maxVideos - Maximum videos to analyze
     * @returns {Promise<Object[]>} Array of {keyword, count, avgViews, videos}
     */
    async getChannelTopKeywords(channelId, maxVideos = 30) {
        // Resolve handle to channel ID if needed
        let resolvedId = channelId;
        if (channelId.startsWith('@') || !channelId.startsWith('UC')) {
            const channelData = await this.getChannelDetails(channelId);
            if (channelData.items && channelData.items.length > 0) {
                resolvedId = channelData.items[0].id;
            } else {
                throw new Error('Không tìm thấy kênh');
            }
        }

        // Get channel videos
        const videosData = await this.getChannelVideos(resolvedId, maxVideos);
        if (!videosData.items || videosData.items.length === 0) {
            return [];
        }

        // Extract keywords from video titles
        const keywordMap = {};
        const stopWords = new Set([
            // Vietnamese stop words
            'và', 'của', 'cho', 'với', 'trong', 'từ', 'đến', 'này', 'là', 'có', 'được',
            'không', 'những', 'một', 'các', 'hay', 'hoặc', 'khi', 'thì', 'mà', 'nhưng',
            'về', 'theo', 'như', 'để', 'tại', 'bởi', 'vì', 'nếu', 'sẽ', 'đã', 'đang',
            // English stop words
            'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
            'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
            'should', 'may', 'might', 'shall', 'can', 'to', 'of', 'in', 'for',
            'on', 'with', 'at', 'by', 'from', 'or', 'and', 'not', 'no', 'but',
            'it', 'its', 'my', 'your', 'his', 'her', 'our', 'their', 'this', 'that',
            'i', 'me', 'we', 'you', 'he', 'she', 'they', 'what', 'which', 'who',
            'how', 'when', 'where', 'why', 'if', 'so', 'up', 'out', 'just'
        ]);

        videosData.items.forEach(video => {
            const title = video.snippet?.title || '';
            const views = parseInt(video.statistics?.viewCount || 0);

            // Split title into meaningful phrases (2-3 word n-grams)
            const cleanTitle = title
                .replace(/[|\-–—:!?.,;()\[\]{}#@"']/g, ' ')
                .replace(/\s+/g, ' ')
                .trim()
                .toLowerCase();

            const words = cleanTitle.split(' ').filter(w => w.length > 1 && !stopWords.has(w));

            // Single words
            words.forEach(word => {
                if (word.length > 2) {
                    if (!keywordMap[word]) {
                        keywordMap[word] = { count: 0, totalViews: 0, videos: [] };
                    }
                    keywordMap[word].count++;
                    keywordMap[word].totalViews += views;
                    keywordMap[word].videos.push({ title, views });
                }
            });

            // 2-word phrases
            for (let i = 0; i < words.length - 1; i++) {
                const phrase = `${words[i]} ${words[i + 1]}`;
                if (!keywordMap[phrase]) {
                    keywordMap[phrase] = { count: 0, totalViews: 0, videos: [] };
                }
                keywordMap[phrase].count++;
                keywordMap[phrase].totalViews += views;
                keywordMap[phrase].videos.push({ title, views });
            }
        });

        // Convert to array, filter and sort
        return Object.entries(keywordMap)
            .filter(([_, data]) => data.count >= 2)
            .map(([keyword, data]) => ({
                keyword,
                count: data.count,
                avgViews: Math.round(data.totalViews / data.count),
                videos: data.videos.slice(0, 5)
            }))
            .sort((a, b) => b.count * b.avgViews - a.count * a.avgViews)
            .slice(0, 30);
    },

    /**
     * Extract Channel ID from URL
     * @param {string} input - Channel ID, URL, or handle
     * @returns {string} Extracted Channel ID or original input
     */
    extractChannelId(input) {
        if (!input) return '';

        input = input.trim();

        // Already a channel ID
        if (input.startsWith('UC') && input.length === 24) {
            return input;
        }

        // Handle (@username)
        if (input.startsWith('@')) {
            return input;
        }

        // URL patterns ([\w.\-]+ to support dots in handles like @giaimatamly.official)
        const patterns = [
            /youtube\.com\/channel\/(UC[\w-]{22})/,
            /youtube\.com\/@([\w.\-]+)/,
            /youtube\.com\/c\/([\w.\-]+)/,
            /youtube\.com\/user\/([\w.\-]+)/
        ];

        for (const pattern of patterns) {
            const match = input.match(pattern);
            if (match) {
                return match[1].startsWith('UC') ? match[1] : '@' + match[1];
            }
        }

        return input;
    },

    /**
     * Get video comments (top-level comment threads)
     * @param {string} videoId - Video ID
     * @param {number} maxResults - Maximum results per page (max 100)
     * @param {string} order - Sort order: 'relevance' or 'time'
     * @param {string} pageToken - Page token for pagination
     * @returns {Promise<Object>} Comment threads
     */
    async getVideoComments(videoId, maxResults = 100, order = 'relevance', pageToken = null) {
        const params = {
            part: 'snippet,replies',
            videoId: videoId,
            maxResults: Math.min(maxResults, 100),
            order: order,
            textFormat: 'plainText'
        };
        if (pageToken) {
            params.pageToken = pageToken;
        }
        return this.request('commentThreads', params);
    },

    /**
     * Get all comments with pagination
     * @param {string} videoId - Video ID
     * @param {number} totalComments - Total comments to fetch
     * @param {string} order - Sort order
     * @returns {Promise<Array>} All comment items
     */
    async getAllVideoComments(videoId, totalComments = 200, order = 'relevance') {
        let allComments = [];
        let pageToken = null;
        const perPage = 100;

        while (allComments.length < totalComments) {
            const data = await this.getVideoComments(videoId, perPage, order, pageToken);
            if (data.items) {
                allComments = allComments.concat(data.items);
            }
            pageToken = data.nextPageToken;
            if (!pageToken || !data.items || data.items.length === 0) break;
        }

        return allComments.slice(0, totalComments);
    },

    /**
     * Extract Video ID from URL or direct ID
     * @param {string} input - Video URL or ID
     * @returns {string} Video ID
     */
    extractVideoId(input) {
        if (!input) return '';
        input = input.trim();

        // Already a video ID (11 characters)
        if (/^[a-zA-Z0-9_-]{11}$/.test(input)) {
            return input;
        }

        // URL patterns
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
            /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/
        ];

        for (const pattern of patterns) {
            const match = input.match(pattern);
            if (match) return match[1];
        }

        return input;
    }
};

// Initialize API
YouTubeAPI.init();
