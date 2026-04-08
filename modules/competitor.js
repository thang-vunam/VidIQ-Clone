/**
 * VidIQ Clone - Competitor Analysis Module
 */

const CompetitorModule = {
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
        const compareBtn = document.getElementById('compareBtn');

        if (compareBtn) {
            compareBtn.addEventListener('click', () => this.compare());
        }
    },

    /**
     * Compare two channels
     */
    async compare() {
        const myChannelInput = document.getElementById('myChannelInput');
        const competitorInput = document.getElementById('competitorInput');
        const resultsContainer = document.getElementById('competitorResults');

        if (!myChannelInput || !competitorInput || !resultsContainer) return;

        const myChannelId = YouTubeAPI.extractChannelId(myChannelInput.value.trim());
        const competitorId = YouTubeAPI.extractChannelId(competitorInput.value.trim());

        if (!myChannelId || !competitorId) {
            app.showToast('Vui lòng nhập cả 2 Channel ID', 'warning');
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
                <p>Đang so sánh kênh...</p>
            </div>
        `;

        try {
            // Fetch both channels
            const [myChannelData, competitorData] = await Promise.all([
                YouTubeAPI.getChannelDetails(myChannelId),
                YouTubeAPI.getChannelDetails(competitorId)
            ]);

            if (!myChannelData.items?.[0] || !competitorData.items?.[0]) {
                throw new Error('Không tìm thấy một hoặc cả hai kênh');
            }

            const myChannel = myChannelData.items[0];
            const competitor = competitorData.items[0];

            // Get recent videos for both
            let myVideos = [], competitorVideos = [];
            try {
                const [myVids, compVids] = await Promise.all([
                    YouTubeAPI.getChannelVideos(myChannel.id, 5),
                    YouTubeAPI.getChannelVideos(competitor.id, 5)
                ]);
                myVideos = myVids.items || [];
                competitorVideos = compVids.items || [];
            } catch (e) {
                console.warn('Could not fetch videos:', e);
            }

            this.renderComparison(myChannel, competitor, myVideos, competitorVideos, resultsContainer);

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
     * Render comparison results
     */
    renderComparison(myChannel, competitor, myVideos, competitorVideos, container) {
        const my = {
            name: myChannel.snippet.title,
            thumbnail: myChannel.snippet.thumbnails?.medium?.url,
            subscribers: parseInt(myChannel.statistics.subscriberCount) || 0,
            views: parseInt(myChannel.statistics.viewCount) || 0,
            videos: parseInt(myChannel.statistics.videoCount) || 0
        };

        const comp = {
            name: competitor.snippet.title,
            thumbnail: competitor.snippet.thumbnails?.medium?.url,
            subscribers: parseInt(competitor.statistics.subscriberCount) || 0,
            views: parseInt(competitor.statistics.viewCount) || 0,
            videos: parseInt(competitor.statistics.videoCount) || 0
        };

        // Calculate averages
        my.avgViews = my.videos > 0 ? Math.round(my.views / my.videos) : 0;
        comp.avgViews = comp.videos > 0 ? Math.round(comp.views / comp.videos) : 0;

        // Recent video performance
        my.recentAvgViews = this.calculateRecentAvg(myVideos);
        comp.recentAvgViews = this.calculateRecentAvg(competitorVideos);

        container.innerHTML = `
            <!-- Comparison Header -->
            <div class="glass-card" style="padding: 1.5rem; margin-bottom: 1.5rem;">
                <div style="display: grid; grid-template-columns: 1fr auto 1fr; gap: 2rem; align-items: center; text-align: center;">
                    <div>
                        <img src="${my.thumbnail}" alt="${my.name}" style="width: 80px; height: 80px; border-radius: 50%; margin-bottom: 0.5rem;">
                        <h3 style="font-size: 1rem;">${my.name}</h3>
                        <p style="color: var(--text-muted); font-size: 0.875rem;">Kênh của bạn</p>
                    </div>
                    <div style="font-size: 2rem; font-weight: 700; background: var(--accent-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                        VS
                    </div>
                    <div>
                        <img src="${comp.thumbnail}" alt="${comp.name}" style="width: 80px; height: 80px; border-radius: 50%; margin-bottom: 0.5rem;">
                        <h3 style="font-size: 1rem;">${comp.name}</h3>
                        <p style="color: var(--text-muted); font-size: 0.875rem;">Đối thủ</p>
                    </div>
                </div>
            </div>
            
            <!-- Stats Comparison -->
            <div class="glass-card" style="padding: 1.5rem; margin-bottom: 1.5rem;">
                <h3 style="margin-bottom: 1.5rem;">📊 So sánh thống kê</h3>
                
                ${this.renderComparisonRow('Subscribers', my.subscribers, comp.subscribers)}
                ${this.renderComparisonRow('Tổng Views', my.views, comp.views)}
                ${this.renderComparisonRow('Số Video', my.videos, comp.videos)}
                ${this.renderComparisonRow('View TB/Video', my.avgViews, comp.avgViews)}
                ${this.renderComparisonRow('View TB Video gần đây', my.recentAvgViews, comp.recentAvgViews)}
            </div>
            
            <!-- Analysis -->
            <div class="glass-card" style="padding: 1.5rem; margin-bottom: 1.5rem;">
                <h3 style="margin-bottom: 1rem;">💡 Phân tích & Đề xuất</h3>
                ${this.generateInsights(my, comp)}
            </div>
            
            <!-- Recent Videos Side by Side -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
                <div class="glass-card" style="padding: 1rem;">
                    <h4 style="margin-bottom: 1rem;">📹 Video gần đây của bạn</h4>
                    ${myVideos.slice(0, 3).map(v => this.renderMiniVideoCard(v)).join('')}
                </div>
                <div class="glass-card" style="padding: 1rem;">
                    <h4 style="margin-bottom: 1rem;">📹 Video gần đây của đối thủ</h4>
                    ${competitorVideos.slice(0, 3).map(v => this.renderMiniVideoCard(v)).join('')}
                </div>
            </div>
        `;
    },

    /**
     * Calculate recent videos average views
     */
    calculateRecentAvg(videos) {
        if (!videos || videos.length === 0) return 0;
        const total = videos.reduce((sum, v) => sum + parseInt(v.statistics?.viewCount || 0), 0);
        return Math.round(total / videos.length);
    },

    /**
     * Render comparison row
     */
    renderComparisonRow(label, myValue, compValue) {
        const myFormatted = YouTubeAPI.formatCount(myValue);
        const compFormatted = YouTubeAPI.formatCount(compValue);
        const diff = myValue - compValue;
        const diffPercent = compValue > 0 ? ((myValue / compValue - 1) * 100).toFixed(0) : 100;
        const isWinning = diff >= 0;

        // Calculate bar widths
        const maxValue = Math.max(myValue, compValue);
        const myWidth = maxValue > 0 ? (myValue / maxValue * 100) : 0;
        const compWidth = maxValue > 0 ? (compValue / maxValue * 100) : 0;

        return `
            <div style="margin-bottom: 1.5rem;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <span style="color: var(--text-secondary);">${label}</span>
                    <span style="color: ${isWinning ? 'var(--success)' : 'var(--error)'}; font-size: 0.875rem;">
                        ${isWinning ? '+' : ''}${diffPercent}%
                    </span>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                            <span style="font-weight: 600;">${myFormatted}</span>
                        </div>
                        <div style="height: 8px; background: var(--bg-primary); border-radius: 4px; overflow: hidden;">
                            <div style="height: 100%; width: ${myWidth}%; background: ${isWinning ? 'var(--success)' : 'var(--warning)'}; border-radius: 4px;"></div>
                        </div>
                    </div>
                    <div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                            <span style="font-weight: 600;">${compFormatted}</span>
                        </div>
                        <div style="height: 8px; background: var(--bg-primary); border-radius: 4px; overflow: hidden;">
                            <div style="height: 100%; width: ${compWidth}%; background: ${!isWinning ? 'var(--success)' : 'var(--warning)'}; border-radius: 4px;"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Generate insights
     */
    generateInsights(my, comp) {
        const insights = [];

        // Subscriber comparison
        if (my.subscribers < comp.subscribers) {
            const gap = comp.subscribers - my.subscribers;
            insights.push({
                icon: '📈',
                text: `Bạn cần thêm <strong>${YouTubeAPI.formatCount(gap)}</strong> subscribers để bắt kịp đối thủ.`,
                type: 'warning'
            });
        } else {
            insights.push({
                icon: '🎉',
                text: `Bạn đang dẫn trước đối thủ <strong>${YouTubeAPI.formatCount(my.subscribers - comp.subscribers)}</strong> subscribers!`,
                type: 'success'
            });
        }

        // View efficiency
        const myEfficiency = my.subscribers > 0 ? my.views / my.subscribers : 0;
        const compEfficiency = comp.subscribers > 0 ? comp.views / comp.subscribers : 0;

        if (myEfficiency < compEfficiency) {
            insights.push({
                icon: '🎯',
                text: `Đối thủ có hiệu suất views/subscriber cao hơn (<strong>${compEfficiency.toFixed(1)}x</strong> vs <strong>${myEfficiency.toFixed(1)}x</strong>). Hãy tập trung vào việc tăng engagement.`,
                type: 'info'
            });
        }

        // Recent performance
        if (my.recentAvgViews < comp.recentAvgViews) {
            insights.push({
                icon: '⚡',
                text: `Video gần đây của đối thủ có views trung bình cao hơn. Hãy phân tích nội dung và tiêu đề của họ.`,
                type: 'warning'
            });
        }

        // Video frequency
        if (my.videos < comp.videos * 0.5) {
            insights.push({
                icon: '📹',
                text: `Đối thủ có nhiều video hơn gấp đôi. Hãy cân nhắc tăng tần suất đăng video.`,
                type: 'info'
            });
        }

        return `
            <div style="display: flex; flex-direction: column; gap: 1rem;">
                ${insights.map(i => `
                    <div style="display: flex; gap: 1rem; align-items: flex-start; padding: 1rem; background: var(--bg-tertiary); border-radius: 0.5rem; border-left: 3px solid var(--${i.type === 'success' ? 'success' : i.type === 'warning' ? 'warning' : 'info'});">
                        <span style="font-size: 1.5rem;">${i.icon}</span>
                        <p style="line-height: 1.5;">${i.text}</p>
                    </div>
                `).join('')}
            </div>
        `;
    },

    /**
     * Render mini video card
     */
    renderMiniVideoCard(video) {
        const snippet = video.snippet;
        const videoId = video.contentDetails?.videoId || video.id;
        const thumbnail = snippet.thumbnails?.default?.url;
        // Show full title but truncate in CSS
        const title = snippet.title || 'Untitled';
        const views = YouTubeAPI.formatCount(video.statistics?.viewCount);

        // Escape for safety
        const safeTitle = title.replace(/'/g, "\\'").replace(/"/g, '&quot;');

        return `
            <div style="display: flex; gap: 0.75rem; margin-bottom: 0.75rem; align-items: flex-start; padding-bottom: 0.75rem; border-bottom: 1px solid var(--border-color);">
                <img src="${thumbnail}" alt="${title}" style="width: 80px; height: 45px; object-fit: cover; border-radius: 4px; cursor: pointer;" onclick="window.open('https://www.youtube.com/watch?v=${videoId}', '_blank')">
                <div style="flex: 1; min-width: 0;">
                    <p style="font-size: 0.8rem; font-weight: 500; line-height: 1.3; margin-bottom: 0.25rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; cursor: pointer;" onclick="window.open('https://www.youtube.com/watch?v=${videoId}', '_blank')" title="${title}">${title}</p>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <p style="font-size: 0.7rem; color: var(--text-muted);">${views} views</p>
                        <button onclick="AIGeneratorModule.prefillAndGenerate('${safeTitle}')" title="Smart Clone: Tạo video tương tự" style="background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.2); color: var(--primary); cursor: pointer; padding: 4px 8px; border-radius: 4px; display: flex; align-items: center; gap: 4px; font-size: 0.7rem;">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 12px; height: 12px;"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                            Clone
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
};
