/**
 * VidIQ Clone - Trending Videos Module
 */

const TrendingModule = {
    /**
     * Initialize module
     */
    init() {
        this.bindEvents();
    },

    /**
     * Bind event listeners
     */
    bindEvents() {
        const loadBtn = document.getElementById('loadTrendingBtn');
        const searchBtn = document.getElementById('searchTopicBtn');
        const topicInput = document.getElementById('trendingTopic');

        if (loadBtn) {
            loadBtn.addEventListener('click', () => this.loadTrending());
        }

        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.searchByTopic());
        }

        if (topicInput) {
            topicInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.searchByTopic();
            });
        }
    },

    /**
     * Search popular videos by topic
     */
    async searchByTopic() {
        const topicInput = document.getElementById('trendingTopic');
        const countrySelect = document.getElementById('trendingCountry');
        const resultsContainer = document.getElementById('trendingResults');

        if (!resultsContainer) return;

        const topic = topicInput?.value.trim();
        const regionCode = countrySelect?.value || 'VN';

        if (!topic) {
            app.showToast('Vui lòng nhập chủ đề để tìm kiếm', 'warning');
            return;
        }

        if (!YouTubeAPI.isConfigured()) {
            app.showToast('Vui lòng cấu hình API Key trong Settings', 'error');
            app.navigateTo('settings');
            return;
        }

        // Show loading
        resultsContainer.innerHTML = `
            <div class="loading-state">
                <div class="spinner"></div>
                <p>Đang tìm video phổ biến về "${topic}"...</p>
            </div>
        `;

        try {
            // Search videos sorted by view count
            const searchResults = await YouTubeAPI.searchVideos(topic, {
                maxResults: 25,
                order: 'viewCount',
                regionCode: regionCode
            });

            if (searchResults.items && searchResults.items.length > 0) {
                // Get video details
                const videoIds = searchResults.items.map(item => item.id.videoId).join(',');
                const videoDetails = await YouTubeAPI.getVideoDetails(videoIds);

                this.renderTopicResults(videoDetails, resultsContainer, topic);
            } else {
                resultsContainer.innerHTML = `
                    <div class="empty-state">
                        <h3>Không tìm thấy kết quả</h3>
                        <p>Thử từ khóa khác</p>
                    </div>
                `;
            }
        } catch (error) {
            resultsContainer.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="15" y1="9" x2="9" y2="15"/>
                        <line x1="9" y1="9" x2="15" y2="15"/>
                    </svg>
                    <h3>Lỗi</h3>
                    <p>${error.message}</p>
                </div>
            `;
        }
    },

    /**
     * Render topic search results
     */
    renderTopicResults(data, container, topic) {
        if (!data.items || data.items.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>Không có kết quả</h3>
                    <p>Không tìm thấy video về "${topic}"</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div style="margin-bottom: 1rem;">
                <h3>🎬 Video phổ biến về "${topic}"</h3>
                <p style="color: var(--text-secondary); font-size: 0.875rem;">
                    ${data.items.length} videos sắp xếp theo lượt xem
                </p>
            </div>
            <div class="video-grid">
                ${data.items.map((video, index) => this.renderVideoCard(video, index + 1)).join('')}
            </div>
        `;
    },

    /**
     * Load trending videos
     */
    async loadTrending() {
        const countrySelect = document.getElementById('trendingCountry');
        const categorySelect = document.getElementById('trendingCategory');
        const resultsContainer = document.getElementById('trendingResults');

        if (!resultsContainer) return;

        const regionCode = countrySelect?.value || 'VN';
        const categoryId = categorySelect?.value || '0';

        if (!YouTubeAPI.isConfigured()) {
            app.showToast('Vui lòng cấu hình API Key trong Settings', 'error');
            app.navigateTo('settings');
            return;
        }

        // Show loading
        resultsContainer.innerHTML = `
            <div class="loading-state">
                <div class="spinner"></div>
                <p>Đang tải trending videos...</p>
            </div>
        `;

        try {
            const data = await YouTubeAPI.getTrending(regionCode, categoryId, 25);
            this.renderResults(data, resultsContainer, regionCode);
        } catch (error) {
            resultsContainer.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="15" y1="9" x2="9" y2="15"/>
                        <line x1="9" y1="9" x2="15" y2="15"/>
                    </svg>
                    <h3>Lỗi</h3>
                    <p>${error.message}</p>
                </div>
            `;
        }
    },

    /**
     * Render trending results
     * @param {Object} data - API response
     * @param {HTMLElement} container - Container element
     * @param {string} regionCode - Country code
     */
    renderResults(data, container, regionCode) {
        if (!data.items || data.items.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>Không có kết quả</h3>
                    <p>Không tìm thấy video trending cho vùng này</p>
                </div>
            `;
            return;
        }

        const countryNames = {
            'VN': '🇻🇳 Việt Nam',
            'US': '🇺🇸 United States',
            'KR': '🇰🇷 South Korea',
            'JP': '🇯🇵 Japan',
            'GB': '🇬🇧 United Kingdom',
            'IN': '🇮🇳 India'
        };

        container.innerHTML = `
            <div style="margin-bottom: 1rem;">
                <h3>🔥 Trending ${countryNames[regionCode] || regionCode}</h3>
                <p style="color: var(--text-secondary); font-size: 0.875rem;">
                    ${data.items.length} videos đang hot
                </p>
            </div>
            <div class="video-grid">
                ${data.items.map((video, index) => this.renderVideoCard(video, index + 1)).join('')}
            </div>
        `;
    },

    /**
     * Render video card
     * @param {Object} video - Video data
     * @param {number} rank - Trending rank
     * @returns {string} HTML string
     */
    renderVideoCard(video, rank) {
        const videoId = video.id?.videoId || video.id;
        const thumbnail = video.snippet?.thumbnails?.medium?.url || video.snippet?.thumbnails?.default?.url;
        const title = video.snippet?.title || 'Untitled';
        const channel = video.snippet?.channelTitle || 'Unknown';
        const views = YouTubeAPI.formatCount(video.statistics?.viewCount);
        const likes = YouTubeAPI.formatCount(video.statistics?.likeCount);
        const duration = YouTubeAPI.parseDuration(video.contentDetails?.duration);
        const publishedAt = YouTubeAPI.parseRelativeTime(video.snippet?.publishedAt);

        return `
            <div class="video-card" onclick="window.open('https://www.youtube.com/watch?v=${videoId}', '_blank')">
                <div class="video-thumbnail">
                    <img src="${thumbnail}" alt="${title}" loading="lazy">
                    ${duration ? `<span class="video-duration">${duration}</span>` : ''}
                    <span style="position: absolute; top: 8px; left: 8px; background: var(--accent-gradient); padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 0.75rem;">#${rank}</span>
                </div>
                <div class="video-info">
                    <h4 class="video-title">${title}</h4>
                    <p class="video-channel">${channel}</p>
                    <div class="video-meta">
                        <span>${views} ${i18n.t('views')}</span>
                        ${likes ? `<span>•</span><span>${likes} ❤️</span>` : ''}
                        <span>•</span>
                        <span>${publishedAt}</span>
                    </div>
                </div>
            </div>
        `;
    }
};

