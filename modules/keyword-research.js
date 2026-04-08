/**
 * VidIQ Clone - Keyword Research Module (Enhanced)
 * Includes: Keyword Search, Topic Explorer, Gap Analysis
 */

const KeywordResearch = {
    currentTab: 'search',

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
        // Tab switching
        document.querySelectorAll('.kr-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.dataset.krTab;
                this.switchTab(tabId);
            });
        });

        // Tab 1: Keyword Search
        const searchBtn = document.getElementById('searchKeywordBtn');
        const keywordInput = document.getElementById('keywordInput');

        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.search());
        }
        if (keywordInput) {
            keywordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.search();
            });
        }

        // Tab 2: Topic Explorer
        const exploreBtn = document.getElementById('exploreTopicBtn');
        const topicInput = document.getElementById('topicInput');

        if (exploreBtn) {
            exploreBtn.addEventListener('click', () => this.exploreTopic());
        }
        if (topicInput) {
            topicInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.exploreTopic();
            });
        }

        // Tab 3: Gap Analysis
        const gapBtn = document.getElementById('analyzeGapBtn');
        if (gapBtn) {
            gapBtn.addEventListener('click', () => this.analyzeGap());
        }
        // Allow Enter on gap channel inputs
        ['gapChannel1', 'gapChannel2', 'gapChannel3'].forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') this.analyzeGap();
                });
            }
        });
    },

    /**
     * Switch between tabs
     * @param {string} tabId - Tab identifier
     */
    switchTab(tabId) {
        this.currentTab = tabId;

        // Update tab buttons
        document.querySelectorAll('.kr-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.krTab === tabId);
        });

        // Update panels
        document.querySelectorAll('.kr-panel').forEach(panel => {
            panel.classList.toggle('active', panel.id === `kr-${tabId}`);
        });
    },

    // ==========================================
    // TAB 1: KEYWORD SEARCH (existing + improved)
    // ==========================================

    /**
     * Perform keyword search
     */
    async search() {
        const input = document.getElementById('keywordInput');
        const resultsContainer = document.getElementById('keywordResults');

        if (!input || !resultsContainer) return;

        const keyword = input.value.trim();
        if (!keyword) {
            app.showToast('Vui lòng nhập từ khóa', 'warning');
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
                <p>Đang phân tích từ khóa "${keyword}"...</p>
            </div>
        `;

        try {
            const data = await YouTubeAPI.getKeywordData(keyword);
            this.renderResults(data, resultsContainer);

            // Generate related keywords using autocomplete API
            const related = await this.getRelatedKeywords(keyword);
            this.renderRelatedKeywords(related, resultsContainer);

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
     * Get related keywords using YouTube autocomplete + fallback
     * @param {string} keyword - Base keyword
     * @returns {Promise<string[]>} Related keywords
     */
    async getRelatedKeywords(keyword) {
        // Try YouTube autocomplete first
        let suggestions = [];
        try {
            suggestions = await YouTubeAPI.getAutocompleteSuggestions(keyword);
        } catch (e) {
            console.warn('Autocomplete failed:', e);
        }

        // If autocomplete returned results, use them
        if (suggestions.length > 0) {
            return suggestions.slice(0, 12);
        }

        // Fallback: generate with prefixes/suffixes
        const prefixes = ['cách', 'hướng dẫn', 'top', 'review', 'so sánh'];
        const suffixes = ['2025', '2026', 'mới nhất', 'tốt nhất', 'cho người mới'];
        const modifiers = ['là gì', 'như thế nào', 'ở đâu', 'bao nhiêu'];

        const related = new Set();

        prefixes.forEach(p => related.add(`${p} ${keyword}`));
        suffixes.forEach(s => related.add(`${keyword} ${s}`));
        modifiers.forEach(m => related.add(`${keyword} ${m}`));

        if (/^[a-zA-Z\s]+$/.test(keyword)) {
            const enPrefixes = ['how to', 'best', 'top 10', 'tutorial'];
            const enSuffixes = ['2025', '2026', 'for beginners', 'tips'];

            enPrefixes.forEach(p => related.add(`${p} ${keyword}`));
            enSuffixes.forEach(s => related.add(`${keyword} ${s}`));
        }

        return Array.from(related).slice(0, 12);
    },

    /**
     * Render keyword results
     */
    renderResults(data, container) {
        const competitionClass = `competition-${data.competitionLevel}`;
        const competitionLabel = {
            low: 'Thấp',
            medium: 'Trung bình',
            high: 'Cao'
        };

        container.innerHTML = `
            <div class="keyword-main-result glass-card" style="padding: 1.5rem; margin-bottom: 1.5rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                    <div>
                        <h2 style="margin-bottom: 0.5rem;">"${data.keyword}"</h2>
                        <p style="color: var(--text-secondary);">Tìm thấy ${data.totalResults.toLocaleString()} kết quả</p>
                    </div>
                    <div class="keyword-stats" style="display: flex; gap: 2rem;">
                        <div class="keyword-stat" style="text-align: center;">
                            <span style="font-size: 0.75rem; color: var(--text-muted);">Lượt tìm kiếm</span>
                            <strong style="display: block; font-size: 1.5rem; color: var(--success);">${data.estimatedSearchVolume}</strong>
                        </div>
                        <div class="keyword-stat" style="text-align: center;">
                            <span style="font-size: 0.75rem; color: var(--text-muted);">Cạnh tranh</span>
                            <strong style="display: block; font-size: 1.5rem;" class="${competitionClass}">${data.competition}/100</strong>
                            <span style="font-size: 0.75rem;" class="${competitionClass}">${competitionLabel[data.competitionLevel]}</span>
                        </div>
                        <div class="keyword-stat" style="text-align: center;">
                            <span style="font-size: 0.75rem; color: var(--text-muted);">View TB</span>
                            <strong style="display: block; font-size: 1.5rem;">${YouTubeAPI.formatCount(data.avgViews)}</strong>
                        </div>
                    </div>
                </div>
            </div>
            
            ${data.topVideos && data.topVideos.length > 0 ? `
                <h3 style="margin-bottom: 1rem;">🎬 Top Videos cho "${data.keyword}"</h3>
                <div class="video-grid">
                    ${data.topVideos.map(video => this.renderVideoCard(video)).join('')}
                </div>
            ` : ''}
            
            <div id="relatedKeywordsSection"></div>
        `;
    },

    /**
     * Render video card
     */
    renderVideoCard(video) {
        const thumbnail = video.snippet?.thumbnails?.medium?.url || video.snippet?.thumbnails?.default?.url;
        const title = video.snippet?.title || 'Untitled';
        const channel = video.snippet?.channelTitle || 'Unknown';
        const views = YouTubeAPI.formatCount(video.statistics?.viewCount);
        const duration = YouTubeAPI.parseDuration(video.contentDetails?.duration);
        const publishedAt = YouTubeAPI.parseRelativeTime(video.snippet?.publishedAt);

        let subscriberText = '';
        if (video.channelStats) {
            if (video.channelStats.hiddenSubscriberCount) {
                subscriberText = '<span class="subscriber-count">Ẩn sub</span>';
            } else {
                const subs = YouTubeAPI.formatCount(video.channelStats.subscriberCount);
                subscriberText = `<span class="subscriber-count">${subs} subscribers</span>`;
            }
        }

        return `
            <div class="video-card" onclick="window.open('https://www.youtube.com/watch?v=${video.id}', '_blank')">
                <div class="video-thumbnail">
                    <img src="${thumbnail}" alt="${title}" loading="lazy">
                    <span class="video-duration">${duration}</span>
                </div>
                <div class="video-info">
                    <h4 class="video-title">${title}</h4>
                    <p class="video-channel">${channel}</p>
                    ${subscriberText}
                    <div class="video-meta">
                        <span>${views} ${i18n.t('views')}</span>
                        <span>•</span>
                        <span>${publishedAt}</span>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Render related keywords
     */
    renderRelatedKeywords(keywords, container) {
        const section = container.querySelector('#relatedKeywordsSection');
        if (!section) return;

        section.innerHTML = `
            <h3 style="margin: 2rem 0 1rem;">🔗 Từ khóa liên quan</h3>
            <div class="keyword-results-grid">
                ${keywords.map(kw => `
                    <div class="keyword-card" onclick="document.getElementById('keywordInput').value='${kw}'; KeywordResearch.search();">
                        <div class="keyword-info">
                            <h4>${kw}</h4>
                        </div>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px; color: var(--text-muted);">
                            <polyline points="9 18 15 12 9 6"/>
                        </svg>
                    </div>
                `).join('')}
            </div>
        `;
    },

    // ==========================================
    // TAB 2: TOPIC EXPLORER
    // ==========================================

    /**
     * Explore a topic for sub-topics and content ideas
     */
    async exploreTopic() {
        const input = document.getElementById('topicInput');
        const resultsContainer = document.getElementById('topicResults');

        if (!input || !resultsContainer) return;

        const topic = input.value.trim();
        if (!topic) {
            app.showToast('Vui lòng nhập chủ đề', 'warning');
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
                <p>Đang khám phá chủ đề "${topic}"...</p>
                <p style="font-size: 0.85rem; color: var(--text-muted);">Đang tìm sub-topics, câu hỏi phổ biến và phân tích cơ hội...</p>
            </div>
        `;

        try {
            const topicTree = await this.buildTopicTree(topic);
            this.renderTopicTree(topic, topicTree, resultsContainer);
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
     * Build topic tree with sub-topics categorized by intent
     * @param {string} topic - Main topic
     * @returns {Promise<Object>} Topic tree structure
     */
    async buildTopicTree(topic) {
        const categories = [
            {
                name: '❓ Câu hỏi phổ biến',
                icon: 'question',
                prefixes: [`${topic} là gì`, `cách ${topic}`, `tại sao ${topic}`, `khi nào ${topic}`, `${topic} như thế nào`]
            },
            {
                name: '📚 Hướng dẫn & Tutorial',
                icon: 'tutorial',
                prefixes: [`hướng dẫn ${topic}`, `cách làm ${topic}`, `học ${topic}`, `${topic} cho người mới`, `${topic} cơ bản`]
            },
            {
                name: '🏆 Top & Review',
                icon: 'review',
                prefixes: [`top ${topic}`, `review ${topic}`, `${topic} tốt nhất`, `so sánh ${topic}`, `đánh giá ${topic}`]
            },
            {
                name: '💡 Ý tưởng & Mẹo',
                icon: 'ideas',
                prefixes: [`mẹo ${topic}`, `${topic} tips`, `bí quyết ${topic}`, `${topic} hay`, `${topic} mới nhất`]
            }
        ];

        // Fetch autocomplete for each category prefix
        const tree = [];

        for (const category of categories) {
            const categoryData = {
                name: category.name,
                icon: category.icon,
                subtopics: []
            };

            // Fetch autocomplete for each prefix
            const allSuggestions = new Set();
            for (const prefix of category.prefixes) {
                try {
                    const suggestions = await YouTubeAPI.getAutocompleteSuggestions(prefix);
                    suggestions.forEach(s => allSuggestions.add(s));
                } catch (e) {
                    // Fallback: just add the prefix itself
                    allSuggestions.add(prefix);
                }
            }

            // If autocomplete fails, add prefixes as fallback
            if (allSuggestions.size === 0) {
                category.prefixes.forEach(p => allSuggestions.add(p));
            }

            // Search YouTube for each suggestion to get rough metrics
            const suggestions = Array.from(allSuggestions).slice(0, 6);

            for (const suggestion of suggestions) {
                try {
                    const searchResult = await YouTubeAPI.searchVideos(suggestion, { maxResults: 5 });
                    const totalResults = searchResult.pageInfo?.totalResults || 0;

                    // Quick competition estimate from total results
                    let opportunity = 'medium';
                    if (totalResults < 50000) opportunity = 'high';
                    else if (totalResults > 500000) opportunity = 'low';

                    categoryData.subtopics.push({
                        keyword: suggestion,
                        totalResults: totalResults,
                        opportunity: opportunity,
                        topVideo: searchResult.items?.[0] || null
                    });
                } catch (e) {
                    categoryData.subtopics.push({
                        keyword: suggestion,
                        totalResults: 0,
                        opportunity: 'unknown',
                        topVideo: null
                    });
                }
            }

            tree.push(categoryData);
        }

        return tree;
    },

    /**
     * Render topic tree UI
     */
    renderTopicTree(topic, tree, container) {
        const opportunityBadge = (opp) => {
            const labels = {
                high: { text: '🔥 Cơ hội cao', class: 'opp-high' },
                medium: { text: '⚡ Cạnh tranh TB', class: 'opp-medium' },
                low: { text: '⚠️ Cạnh tranh cao', class: 'opp-low' },
                unknown: { text: '❓ Chưa rõ', class: 'opp-unknown' }
            };
            const badge = labels[opp] || labels.unknown;
            return `<span class="opportunity-badge ${badge.class}">${badge.text}</span>`;
        };

        let html = `
            <div class="topic-header glass-card" style="padding: 1.5rem; margin-bottom: 1.5rem;">
                <h2 style="margin-bottom: 0.5rem;">🗺️ Bản đồ chủ đề: "${topic}"</h2>
                <p style="color: var(--text-secondary);">Tìm thấy ${tree.reduce((sum, c) => sum + c.subtopics.length, 0)} sub-topics trong ${tree.length} danh mục</p>
            </div>
        `;

        tree.forEach((category, catIdx) => {
            if (category.subtopics.length === 0) return;

            html += `
                <div class="topic-category glass-card" style="padding: 1.5rem; margin-bottom: 1rem;">
                    <div class="topic-category-header" onclick="this.parentElement.classList.toggle('collapsed')" style="cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
                        <h3 style="margin: 0;">${category.name} <span style="font-size: 0.85rem; color: var(--text-muted);">(${category.subtopics.length})</span></h3>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px;transition:transform 0.3s;" class="topic-chevron">
                            <polyline points="6 9 12 15 18 9"/>
                        </svg>
                    </div>
                    <div class="topic-subtopics" style="margin-top: 1rem;">
                        ${category.subtopics.map(st => `
                            <div class="topic-subtopic-card" style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; border-radius: 8px; background: var(--bg-tertiary); margin-bottom: 0.5rem; cursor: pointer; transition: all 0.2s;" 
                                 onclick="document.getElementById('keywordInput').value='${st.keyword.replace(/'/g, "\\'")}'; KeywordResearch.switchTab('search'); KeywordResearch.search();"
                                 onmouseenter="this.style.background='var(--bg-secondary)'; this.style.transform='translateX(4px)'"
                                 onmouseleave="this.style.background='var(--bg-tertiary)'; this.style.transform='none'">
                                <div>
                                    <h4 style="margin: 0 0 0.25rem; font-size: 0.95rem;">${st.keyword}</h4>
                                    <div style="display: flex; gap: 0.75rem; align-items: center; font-size: 0.8rem; color: var(--text-muted);">
                                        <span>📊 ${st.totalResults.toLocaleString()} kết quả</span>
                                        ${opportunityBadge(st.opportunity)}
                                    </div>
                                </div>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;color:var(--text-muted);flex-shrink:0;">
                                    <polyline points="9 18 15 12 9 6"/>
                                </svg>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    },

    // ==========================================
    // TAB 3: GAP ANALYSIS
    // ==========================================

    /**
     * Analyze keyword gaps from competitor channels
     */
    async analyzeGap() {
        const ch1Input = document.getElementById('gapChannel1');
        const ch2Input = document.getElementById('gapChannel2');
        const ch3Input = document.getElementById('gapChannel3');
        const resultsContainer = document.getElementById('gapResults');

        if (!ch1Input || !resultsContainer) return;

        const channel1 = YouTubeAPI.extractChannelId(ch1Input.value.trim());
        const channel2 = ch2Input ? YouTubeAPI.extractChannelId(ch2Input.value.trim()) : '';
        const channel3 = ch3Input ? YouTubeAPI.extractChannelId(ch3Input.value.trim()) : '';

        if (!channel1) {
            app.showToast('Vui lòng nhập ít nhất 1 Channel ID đối thủ', 'warning');
            return;
        }

        if (!YouTubeAPI.isConfigured()) {
            app.showToast('Vui lòng cấu hình API Key trong Settings', 'error');
            app.navigateTo('settings');
            return;
        }

        const channels = [channel1, channel2, channel3].filter(c => c.length > 0);

        // Show loading
        resultsContainer.innerHTML = `
            <div class="loading-state">
                <div class="spinner"></div>
                <p>Đang phân tích ${channels.length} kênh...</p>
                <p style="font-size: 0.85rem; color: var(--text-muted);">Quá trình này có thể mất 10-30 giây</p>
            </div>
        `;

        try {
            const results = await this.performGapAnalysis(channels);
            this.renderGapResults(results, channels, resultsContainer);
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
     * Perform gap analysis
     * @param {string[]} channelIds - Array of channel IDs
     * @returns {Promise<Object>} Gap analysis results
     */
    async performGapAnalysis(channelIds) {
        const allKeywords = [];
        const channelNames = [];

        for (const channelId of channelIds) {
            try {
                // Get channel info
                const channelData = await YouTubeAPI.getChannelDetails(channelId);
                const channelName = channelData.items?.[0]?.snippet?.title || channelId;
                channelNames.push(channelName);

                // Get channel's top keywords
                const keywords = await YouTubeAPI.getChannelTopKeywords(channelId, 20);
                keywords.forEach(kw => {
                    kw.source = channelName;
                    allKeywords.push(kw);
                });
            } catch (error) {
                console.warn(`Failed to analyze channel ${channelId}:`, error);
                channelNames.push(channelId);
            }
        }

        // Merge duplicate keywords across channels
        const mergedMap = {};
        allKeywords.forEach(kw => {
            const key = kw.keyword.toLowerCase();
            if (!mergedMap[key]) {
                mergedMap[key] = {
                    keyword: kw.keyword,
                    totalCount: 0,
                    maxAvgViews: 0,
                    sources: [],
                    videos: []
                };
            }
            mergedMap[key].totalCount += kw.count;
            mergedMap[key].maxAvgViews = Math.max(mergedMap[key].maxAvgViews, kw.avgViews);
            if (!mergedMap[key].sources.includes(kw.source)) {
                mergedMap[key].sources.push(kw.source);
            }
            mergedMap[key].videos.push(...kw.videos.slice(0, 3));
        });

        // Sort by opportunity score (high views + used by multiple channels = hot topic)
        const opportunities = Object.values(mergedMap)
            .map(kw => ({
                ...kw,
                score: kw.totalCount * Math.log10(kw.maxAvgViews + 1) * (kw.sources.length > 1 ? 1.5 : 1)
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 25);

        return {
            channelNames,
            totalKeywords: Object.keys(mergedMap).length,
            opportunities
        };
    },

    /**
     * Render gap analysis results
     */
    renderGapResults(results, channelIds, container) {
        const { channelNames, totalKeywords, opportunities } = results;

        let html = `
            <div class="gap-header glass-card" style="padding: 1.5rem; margin-bottom: 1.5rem;">
                <h2 style="margin-bottom: 0.5rem;">📊 Phân tích khoảng trống từ khóa</h2>
                <div style="display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 1rem;">
                    ${channelNames.map((name, i) => `
                        <span class="gap-channel-badge" style="background: var(--bg-tertiary); padding: 0.4rem 0.8rem; border-radius: 20px; font-size: 0.85rem;">
                            📺 ${name}
                        </span>
                    `).join('')}
                </div>
                <p style="color: var(--text-secondary);">Tìm thấy <strong>${totalKeywords}</strong> từ khóa từ ${channelNames.length} kênh, hiển thị top <strong>${opportunities.length}</strong> cơ hội</p>
            </div>
        `;

        if (opportunities.length === 0) {
            html += `
                <div class="empty-state">
                    <h3>Không tìm thấy từ khóa</h3>
                    <p>Hãy thử với Channel ID khác hoặc kênh có nhiều video hơn</p>
                </div>
            `;
        } else {
            html += `<div class="gap-results-list">`;

            opportunities.forEach((opp, idx) => {
                const viewsFormatted = YouTubeAPI.formatCount(opp.maxAvgViews);
                const isMultiChannel = opp.sources.length > 1;

                html += `
                    <div class="gap-result-card glass-card" style="padding: 1rem; margin-bottom: 0.75rem; cursor: pointer; transition: all 0.2s;"
                         onclick="document.getElementById('keywordInput').value='${opp.keyword.replace(/'/g, "\\'")}'; KeywordResearch.switchTab('search'); KeywordResearch.search();"
                         onmouseenter="this.style.transform='translateX(4px)'"
                         onmouseleave="this.style.transform='none'">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem;">
                            <div style="flex: 1;">
                                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                                    <span style="background: linear-gradient(135deg, #FF6B6B, #FF0000); color: white; padding: 0.15rem 0.5rem; border-radius: 10px; font-size: 0.75rem; font-weight: 600;">#${idx + 1}</span>
                                    <h4 style="margin: 0; font-size: 1rem;">${opp.keyword}</h4>
                                    ${isMultiChannel ? '<span style="background: #F59E0B; color: #000; padding: 0.1rem 0.4rem; border-radius: 8px; font-size: 0.7rem; font-weight: 600;">🔥 Hot Topic</span>' : ''}
                                </div>
                                <div style="display: flex; gap: 1rem; font-size: 0.8rem; color: var(--text-muted); flex-wrap: wrap;">
                                    <span>📈 Views TB: <strong style="color: var(--success);">${viewsFormatted}</strong></span>
                                    <span>🔄 Xuất hiện: <strong>${opp.totalCount}x</strong></span>
                                    <span>📺 Kênh: ${opp.sources.join(', ')}</span>
                                </div>
                            </div>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px;color:var(--text-muted);flex-shrink:0;">
                                <polyline points="9 18 15 12 9 6"/>
                            </svg>
                        </div>
                    </div>
                `;
            });

            html += `</div>`;
        }

        container.innerHTML = html;
    }
};
