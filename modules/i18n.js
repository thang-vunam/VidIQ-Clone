/**
 * VidIQ Clone - Internationalization Module
 * Supports Vietnamese (default) and English
 */

const i18n = {
    currentLang: 'vi',

    translations: {
        vi: {
            // Navigation
            dashboard: 'Dashboard',
            keywordResearch: 'Keyword Research',
            trending: 'Trending Videos',
            analytics: 'Channel Analytics',
            competitor: 'Competitor Analysis',
            seoScore: 'SEO Score',
            aiGenerator: 'AI Generator',
            calendar: 'Content Calendar',
            settings: 'Settings',

            // Sections
            analysis: 'Phân tích',
            tools: 'Công cụ',

            // Dashboard
            welcomeTitle: 'Chào mừng đến với VidIQ Clone! 🎬',
            welcomeDesc: 'Công cụ phân tích và tối ưu hóa YouTube toàn diện cho creators Việt Nam và quốc tế.',
            findKeyword: 'Tìm Keyword',
            trendingVideos: 'Trending Videos',
            getStarted: 'Hướng dẫn bắt đầu',
            step1Title: 'Kết nối YouTube API',
            step1Desc: 'Vào Settings để nhập YouTube API Key của bạn',
            step2Title: 'Tìm Keyword',
            step2Desc: 'Khám phá từ khóa tiềm năng cho video',
            step3Title: 'Phân tích đối thủ',
            step3Desc: 'Học hỏi chiến lược từ các kênh thành công',
            step4Title: 'Tối ưu SEO',
            step4Desc: 'Cải thiện hiệu suất video với SEO Score',

            // Keyword Research
            enterKeyword: 'Nhập từ khóa để nghiên cứu...',
            search: 'Tìm kiếm',
            searchVolume: 'Lượt tìm kiếm',
            competition: 'Cạnh tranh',
            relatedKeywords: 'Từ khóa liên quan',

            // Trending
            country: 'Quốc gia',
            category: 'Thể loại',
            all: 'Tất cả',
            loadTrending: 'Tải Trending',
            views: 'lượt xem',
            likes: 'lượt thích',

            // Analytics
            enterChannelId: 'Nhập Channel ID hoặc URL kênh YouTube...',
            analyze: 'Phân tích',
            subscribers: 'Subscribers',
            totalViews: 'Tổng lượt xem',
            videoCount: 'Số video',
            recentVideos: 'Video gần đây',

            // Competitor
            yourChannel: 'Channel ID của bạn',
            competitorChannel: 'Channel ID đối thủ',
            compare: 'So sánh',

            // SEO Score
            checkSeo: 'Kiểm tra SEO Video',
            videoTitle: 'Tiêu đề video:',
            description: 'Mô tả:',
            tags: 'Tags (phân cách bằng dấu phẩy):',
            checkSeoBtn: 'Kiểm tra SEO',
            overallScore: 'Điểm tổng',
            titleScore: 'Tiêu đề',
            descriptionScore: 'Mô tả',
            tagsScore: 'Tags',

            // AI Generator
            titleGenerator: 'Title Generator',
            descriptionGen: 'Description',
            hashtags: 'Hashtags',
            hooks: 'Hooks',
            enterTopic: 'Nhập chủ đề video...',
            generateTitles: 'Tạo Tiêu đề',
            generateDesc: 'Tạo Mô tả',
            generateHashtags: 'Tạo Hashtags',
            generateHooks: 'Tạo Hooks',
            clickToCopy: 'Click để copy',
            copied: 'Đã copy!',

            // Calendar
            addVideo: 'Thêm Video',
            january: 'Tháng 1',
            february: 'Tháng 2',
            march: 'Tháng 3',
            april: 'Tháng 4',
            may: 'Tháng 5',
            june: 'Tháng 6',
            july: 'Tháng 7',
            august: 'Tháng 8',
            september: 'Tháng 9',
            october: 'Tháng 10',
            november: 'Tháng 11',
            december: 'Tháng 12',
            sun: 'CN',
            mon: 'T2',
            tue: 'T3',
            wed: 'T4',
            thu: 'T5',
            fri: 'T6',
            sat: 'T7',

            // Settings
            apiConfig: 'YouTube API Configuration',
            enterApiKey: 'Nhập API Key của bạn...',
            getApiKeyAt: 'Lấy API Key tại:',
            saveApiKey: 'Lưu API Key',
            apiGuide: 'Hướng dẫn lấy YouTube API Key',
            otherSettings: 'Cài đặt khác',
            defaultLanguage: 'Ngôn ngữ mặc định:',
            defaultCountry: 'Quốc gia mặc định cho Trending:',

            // Status
            apiNotConnected: 'API chưa kết nối',
            apiConnected: 'API đã kết nối',
            loading: 'Đang tải...',
            error: 'Lỗi',
            success: 'Thành công',
            noResults: 'Không có kết quả',

            // Empty states
            enterKeywordToStart: 'Nhập từ khóa để bắt đầu',
            discoverKeywords: 'Khám phá các từ khóa tiềm năng cho video YouTube của bạn',
            clickLoadTrending: 'Nhấn "Tải Trending" để xem',
            discoverTrending: 'Khám phá các video đang hot trên YouTube',
            enterChannelToAnalyze: 'Nhập Channel ID để phân tích',
            viewChannelStats: 'Xem thống kê chi tiết về một kênh YouTube',
            compareWithCompetitor: 'So sánh với đối thủ',
            enterChannelToCompare: 'Nhập Channel ID để so sánh hiệu suất giữa các kênh'
        },
        en: {
            // Navigation
            dashboard: 'Dashboard',
            keywordResearch: 'Keyword Research',
            trending: 'Trending Videos',
            analytics: 'Channel Analytics',
            competitor: 'Competitor Analysis',
            seoScore: 'SEO Score',
            aiGenerator: 'AI Generator',
            calendar: 'Content Calendar',
            settings: 'Settings',

            // Sections
            analysis: 'Analysis',
            tools: 'Tools',

            // Dashboard
            welcomeTitle: 'Welcome to VidIQ Clone! 🎬',
            welcomeDesc: 'Comprehensive YouTube analytics and optimization tool for creators worldwide.',
            findKeyword: 'Find Keywords',
            trendingVideos: 'Trending Videos',
            getStarted: 'Get Started',
            step1Title: 'Connect YouTube API',
            step1Desc: 'Go to Settings to enter your YouTube API Key',
            step2Title: 'Find Keywords',
            step2Desc: 'Discover potential keywords for your videos',
            step3Title: 'Analyze Competitors',
            step3Desc: 'Learn strategies from successful channels',
            step4Title: 'Optimize SEO',
            step4Desc: 'Improve video performance with SEO Score',

            // Keyword Research
            enterKeyword: 'Enter keyword to research...',
            search: 'Search',
            searchVolume: 'Search Volume',
            competition: 'Competition',
            relatedKeywords: 'Related Keywords',

            // Trending
            country: 'Country',
            category: 'Category',
            all: 'All',
            loadTrending: 'Load Trending',
            views: 'views',
            likes: 'likes',

            // Analytics
            enterChannelId: 'Enter Channel ID or YouTube channel URL...',
            analyze: 'Analyze',
            subscribers: 'Subscribers',
            totalViews: 'Total Views',
            videoCount: 'Video Count',
            recentVideos: 'Recent Videos',

            // Competitor
            yourChannel: 'Your Channel ID',
            competitorChannel: 'Competitor Channel ID',
            compare: 'Compare',

            // SEO Score
            checkSeo: 'Check Video SEO',
            videoTitle: 'Video Title:',
            description: 'Description:',
            tags: 'Tags (comma separated):',
            checkSeoBtn: 'Check SEO',
            overallScore: 'Overall Score',
            titleScore: 'Title',
            descriptionScore: 'Description',
            tagsScore: 'Tags',

            // AI Generator
            titleGenerator: 'Title Generator',
            descriptionGen: 'Description',
            hashtags: 'Hashtags',
            hooks: 'Hooks',
            enterTopic: 'Enter video topic...',
            generateTitles: 'Generate Titles',
            generateDesc: 'Generate Description',
            generateHashtags: 'Generate Hashtags',
            generateHooks: 'Generate Hooks',
            clickToCopy: 'Click to copy',
            copied: 'Copied!',

            // Calendar
            addVideo: 'Add Video',
            january: 'January',
            february: 'February',
            march: 'March',
            april: 'April',
            may: 'May',
            june: 'June',
            july: 'July',
            august: 'August',
            september: 'September',
            october: 'October',
            november: 'November',
            december: 'December',
            sun: 'Sun',
            mon: 'Mon',
            tue: 'Tue',
            wed: 'Wed',
            thu: 'Thu',
            fri: 'Fri',
            sat: 'Sat',

            // Settings
            apiConfig: 'YouTube API Configuration',
            enterApiKey: 'Enter your API Key...',
            getApiKeyAt: 'Get API Key at:',
            saveApiKey: 'Save API Key',
            apiGuide: 'How to get YouTube API Key',
            otherSettings: 'Other Settings',
            defaultLanguage: 'Default Language:',
            defaultCountry: 'Default Country for Trending:',

            // Status
            apiNotConnected: 'API not connected',
            apiConnected: 'API connected',
            loading: 'Loading...',
            error: 'Error',
            success: 'Success',
            noResults: 'No results',

            // Empty states
            enterKeywordToStart: 'Enter a keyword to start',
            discoverKeywords: 'Discover potential keywords for your YouTube videos',
            clickLoadTrending: 'Click "Load Trending" to view',
            discoverTrending: 'Discover trending videos on YouTube',
            enterChannelToAnalyze: 'Enter Channel ID to analyze',
            viewChannelStats: 'View detailed statistics about a YouTube channel',
            compareWithCompetitor: 'Compare with competitors',
            enterChannelToCompare: 'Enter Channel IDs to compare channel performance'
        }
    },

    /**
     * Get translation for a key
     * @param {string} key - Translation key
     * @returns {string} Translated text
     */
    t(key) {
        return this.translations[this.currentLang][key] || this.translations['en'][key] || key;
    },

    /**
     * Set current language
     * @param {string} lang - Language code ('vi' or 'en')
     */
    setLanguage(lang) {
        if (this.translations[lang]) {
            this.currentLang = lang;
            localStorage.setItem('vidiq_language', lang);
            this.updateUI();
        }
    },

    /**
     * Initialize language from localStorage
     */
    init() {
        const savedLang = localStorage.getItem('vidiq_language');
        if (savedLang && this.translations[savedLang]) {
            this.currentLang = savedLang;
        }
    },

    /**
     * Update all UI elements with translations
     */
    updateUI() {
        // Update nav section titles
        const navSections = document.querySelectorAll('.nav-section-title');
        if (navSections[0]) navSections[0].textContent = this.t('analysis');
        if (navSections[1]) navSections[1].textContent = this.t('tools');

        // Update placeholders
        const keywordInput = document.getElementById('keywordInput');
        if (keywordInput) keywordInput.placeholder = this.t('enterKeyword');

        const channelInput = document.getElementById('channelInput');
        if (channelInput) channelInput.placeholder = this.t('enterChannelId');

        // Update buttons with language toggle
        const langBtns = document.querySelectorAll('.lang-btn');
        langBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === this.currentLang);
        });
    },

    /**
     * Get month name
     * @param {number} month - Month index (0-11)
     * @returns {string} Month name
     */
    getMonthName(month) {
        const months = ['january', 'february', 'march', 'april', 'may', 'june',
            'july', 'august', 'september', 'october', 'november', 'december'];
        return this.t(months[month]);
    },

    /**
     * Get day names
     * @returns {string[]} Array of day names
     */
    getDayNames() {
        return ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map(d => this.t(d));
    }
};

// Initialize i18n
i18n.init();
