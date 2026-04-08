/**
 * VidIQ Clone - SEO Score Module (Upgraded)
 * Full video Meta SEO audit from URL + manual input
 */

const SEOScoreModule = {
    /**
     * Initialize module
     */
    init() {
        this.bindEvents();
        this.bindTabEvents();
    },

    // ============================================================
    //  TAB SWITCHING
    // ============================================================
    bindTabEvents() {
        document.querySelectorAll('.seo-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.dataset.seoTab;
                document.querySelectorAll('.seo-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.seo-panel').forEach(p => p.classList.remove('active'));
                tab.classList.add('active');
                const panel = document.getElementById(`seo-${tabId}`);
                if (panel) panel.classList.add('active');
            });
        });
    },

    // ============================================================
    //  EVENTS
    // ============================================================
    bindEvents() {
        // Manual check button
        const checkBtn = document.getElementById('checkSeoBtn');
        if (checkBtn) {
            checkBtn.addEventListener('click', () => this.checkSEO());
        }
        // URL audit button
        const auditBtn = document.getElementById('auditVideoBtn');
        if (auditBtn) {
            auditBtn.addEventListener('click', () => this.auditFromURL());
        }
        // Enter key on URL input
        const urlInput = document.getElementById('seoVideoUrl');
        if (urlInput) {
            urlInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.auditFromURL();
            });
        }
    },

    // ============================================================
    //  EXTRACT VIDEO ID
    // ============================================================
    extractVideoId(input) {
        if (!input) return null;
        input = input.trim();

        // Standard: youtube.com/watch?v=xxx
        let match = input.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
        if (match) return match[1];

        // Short: youtu.be/xxx
        match = input.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
        if (match) return match[1];

        // Embed: youtube.com/embed/xxx
        match = input.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
        if (match) return match[1];

        // Shorts: youtube.com/shorts/xxx
        match = input.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
        if (match) return match[1];

        // Live: youtube.com/live/xxx
        match = input.match(/youtube\.com\/live\/([a-zA-Z0-9_-]{11})/);
        if (match) return match[1];

        // Raw ID (11 chars)
        if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;

        return null;
    },

    // ============================================================
    //  AUDIT FROM URL
    // ============================================================
    async auditFromURL() {
        const urlInput = document.getElementById('seoVideoUrl');
        const resultsContainer = document.getElementById('seoAuditResults');
        if (!urlInput || !resultsContainer) return;

        const videoId = this.extractVideoId(urlInput.value);
        if (!videoId) {
            app.showToast('URL hoặc Video ID không hợp lệ', 'error');
            return;
        }

        if (!YouTubeAPI.isConfigured()) {
            app.showToast('Vui lòng cấu hình API Key trong Settings', 'warning');
            return;
        }

        // Loading state
        resultsContainer.innerHTML = `
            <div class="empty-state">
                <div class="loading-spinner"></div>
                <h3>Đang phân tích video...</h3>
                <p>Lấy dữ liệu từ YouTube API</p>
            </div>
        `;

        try {
            // Fetch video details
            const videoData = await YouTubeAPI.getVideoDetails(videoId);
            if (!videoData.items || videoData.items.length === 0) {
                resultsContainer.innerHTML = `
                    <div class="empty-state">
                        <h3>❌ Không tìm thấy video</h3>
                        <p>Kiểm tra lại URL hoặc Video ID</p>
                    </div>
                `;
                return;
            }

            const video = videoData.items[0];
            const snippet = video.snippet || {};
            const stats = video.statistics || {};
            const contentDetails = video.contentDetails || {};

            // Fetch channel details
            let channel = null;
            if (snippet.channelId) {
                try {
                    const channelData = await YouTubeAPI.getChannelDetails(snippet.channelId);
                    if (channelData.items && channelData.items.length > 0) {
                        channel = channelData.items[0];
                    }
                } catch (e) {
                    console.warn('Could not fetch channel details:', e);
                }
            }

            // Run all analyses
            const title = snippet.title || '';
            const description = snippet.description || '';
            const tags = (snippet.tags || []).join(', ');

            const titleScore = this.calculateTitleScore(title);
            const descScore = this.calculateDescriptionScore(description);
            const tagsScore = this.calculateTagsScore(tags);
            const thumbScore = this.calculateThumbnailScore(snippet);
            const engScore = this.calculateEngagementScore(stats);
            const channelScore = this.calculateChannelScore(channel);
            const perfScore = this.calculateVideoPerformanceScore(video, channel);

            // Weighted overall
            const overall = Math.round(
                titleScore.score * 0.20 +
                descScore.score * 0.20 +
                tagsScore.score * 0.15 +
                thumbScore.score * 0.10 +
                engScore.score * 0.20 +
                channelScore.score * 0.05 +
                perfScore.score * 0.10
            );

            const auditData = {
                video, channel, overall,
                categories: [
                    { icon: '📝', name: 'Tiêu đề (Title)', weight: '20%', ...titleScore },
                    { icon: '📄', name: 'Mô tả (Description)', weight: '20%', ...descScore },
                    { icon: '🏷️', name: 'Tags', weight: '15%', ...tagsScore },
                    { icon: '🖼️', name: 'Thumbnail', weight: '10%', ...thumbScore },
                    { icon: '📊', name: 'Engagement', weight: '20%', ...engScore },
                    { icon: '📡', name: 'Channel Authority', weight: '5%', ...channelScore },
                    { icon: '🎬', name: 'Video Performance', weight: '10%', ...perfScore }
                ]
            };

            this.renderAuditResults(auditData, resultsContainer);
            app.showToast('Phân tích hoàn tất!', 'success');
        } catch (error) {
            console.error('Audit error:', error);
            resultsContainer.innerHTML = `
                <div class="empty-state">
                    <h3>❌ Lỗi khi phân tích</h3>
                    <p>${error.message || 'Đã xảy ra lỗi. Vui lòng thử lại.'}</p>
                </div>
            `;
            app.showToast('Lỗi: ' + (error.message || 'Không thể phân tích'), 'error');
        }
    },

    // ============================================================
    //  SCORING: THUMBNAIL
    // ============================================================
    calculateThumbnailScore(snippet) {
        let score = 0;
        const feedback = [];

        // Custom thumbnail
        const thumbs = snippet.thumbnails || {};
        if (thumbs.maxres) {
            score += 50;
            feedback.push('✅ Có thumbnail chất lượng cao (maxres)');
        } else if (thumbs.standard) {
            score += 35;
            feedback.push('⚠️ Thumbnail chỉ ở chất lượng standard — nên upload ảnh 1280×720');
        } else if (thumbs.high) {
            score += 25;
            feedback.push('⚠️ Thumbnail chất lượng thấp — nên upload ảnh 1280×720');
        } else {
            score += 10;
            feedback.push('❌ Không có custom thumbnail rõ ràng');
        }

        // Check for default thumbnail (hqdefault pattern)
        const defaultUrl = thumbs.default?.url || '';
        if (defaultUrl.includes('/default.jpg') || defaultUrl.includes('/0.jpg')) {
            feedback.push('❌ Có thể đang dùng thumbnail tự động — nên thiết kế thumbnail riêng');
        } else {
            score += 20;
            feedback.push('✅ Thumbnail được tùy chỉnh');
        }

        // Resolution
        if (thumbs.maxres) {
            score += 30;
            feedback.push('✅ Độ phân giải cao (1280×720+)');
        } else {
            feedback.push('💡 Upload thumbnail tối thiểu 1280×720 pixels');
        }

        return { score: Math.min(100, Math.max(0, score)), feedback };
    },

    // ============================================================
    //  SCORING: ENGAGEMENT
    // ============================================================
    calculateEngagementScore(stats) {
        let score = 0;
        const feedback = [];

        const views = parseInt(stats.viewCount) || 0;
        const likes = parseInt(stats.likeCount) || 0;
        const comments = parseInt(stats.commentCount) || 0;

        if (views === 0) {
            return { score: 0, feedback: ['❌ Video chưa có lượt xem'] };
        }

        // Like ratio (likes / views)
        const likeRatio = likes / views;
        if (likeRatio >= 0.05) {
            score += 35;
            feedback.push(`✅ Tỷ lệ like xuất sắc: ${(likeRatio * 100).toFixed(2)}% (>5%)`);
        } else if (likeRatio >= 0.03) {
            score += 25;
            feedback.push(`✅ Tỷ lệ like tốt: ${(likeRatio * 100).toFixed(2)}% (3-5%)`);
        } else if (likeRatio >= 0.01) {
            score += 15;
            feedback.push(`⚠️ Tỷ lệ like trung bình: ${(likeRatio * 100).toFixed(2)}% (1-3%)`);
        } else {
            score += 5;
            feedback.push(`❌ Tỷ lệ like thấp: ${(likeRatio * 100).toFixed(2)}% (<1%)`);
        }

        // Comment rate (comments / views)
        const commentRate = comments / views;
        if (commentRate >= 0.005) {
            score += 35;
            feedback.push(`✅ Tỷ lệ comment cao: ${(commentRate * 100).toFixed(3)}%`);
        } else if (commentRate >= 0.002) {
            score += 25;
            feedback.push(`✅ Tỷ lệ comment tốt: ${(commentRate * 100).toFixed(3)}%`);
        } else if (commentRate >= 0.0005) {
            score += 15;
            feedback.push(`⚠️ Tỷ lệ comment trung bình: ${(commentRate * 100).toFixed(3)}%`);
        } else {
            score += 5;
            feedback.push(`❌ Tỷ lệ comment thấp: ${(commentRate * 100).toFixed(3)}%`);
        }

        // Overall engagement ((likes + comments) / views)
        const engagement = (likes + comments) / views;
        if (engagement >= 0.06) {
            score += 30;
            feedback.push(`✅ Engagement tổng xuất sắc: ${(engagement * 100).toFixed(2)}%`);
        } else if (engagement >= 0.03) {
            score += 20;
            feedback.push(`✅ Engagement tổng tốt: ${(engagement * 100).toFixed(2)}%`);
        } else if (engagement >= 0.01) {
            score += 10;
            feedback.push(`⚠️ Engagement tổng trung bình: ${(engagement * 100).toFixed(2)}%`);
        } else {
            score += 5;
            feedback.push(`❌ Engagement tổng thấp: ${(engagement * 100).toFixed(2)}%`);
        }

        return { score: Math.min(100, Math.max(0, score)), feedback };
    },

    // ============================================================
    //  SCORING: CHANNEL AUTHORITY
    // ============================================================
    calculateChannelScore(channel) {
        let score = 0;
        const feedback = [];

        if (!channel) {
            return { score: 50, feedback: ['⚠️ Không thể lấy thông tin kênh'] };
        }

        const stats = channel.statistics || {};
        const subs = parseInt(stats.subscriberCount) || 0;
        const totalVideos = parseInt(stats.videoCount) || 0;
        const totalViews = parseInt(stats.viewCount) || 0;

        // Subscriber count
        if (subs >= 1000000) {
            score += 40;
            feedback.push(`✅ Kênh lớn: ${YouTubeAPI.formatCount(subs)} subscribers`);
        } else if (subs >= 100000) {
            score += 30;
            feedback.push(`✅ Kênh uy tín: ${YouTubeAPI.formatCount(subs)} subscribers`);
        } else if (subs >= 10000) {
            score += 20;
            feedback.push(`⚠️ Kênh đang phát triển: ${YouTubeAPI.formatCount(subs)} subscribers`);
        } else if (subs >= 1000) {
            score += 10;
            feedback.push(`⚠️ Kênh nhỏ: ${YouTubeAPI.formatCount(subs)} subscribers`);
        } else {
            score += 5;
            feedback.push(`❌ Kênh mới: ${YouTubeAPI.formatCount(subs)} subscribers`);
        }

        // Video count
        if (totalVideos >= 100) {
            score += 30;
            feedback.push(`✅ Kênh có nhiều nội dung: ${totalVideos} videos`);
        } else if (totalVideos >= 30) {
            score += 20;
            feedback.push(`⚠️ Số lượng video trung bình: ${totalVideos} videos`);
        } else {
            score += 10;
            feedback.push(`❌ Kênh ít nội dung: ${totalVideos} videos`);
        }

        // Average views per video
        if (totalVideos > 0) {
            const avgViews = totalViews / totalVideos;
            if (avgViews >= 100000) {
                score += 30;
                feedback.push(`✅ Trung bình ${YouTubeAPI.formatCount(Math.round(avgViews))} views/video`);
            } else if (avgViews >= 10000) {
                score += 20;
                feedback.push(`⚠️ Trung bình ${YouTubeAPI.formatCount(Math.round(avgViews))} views/video`);
            } else {
                score += 10;
                feedback.push(`❌ Trung bình ${YouTubeAPI.formatCount(Math.round(avgViews))} views/video`);
            }
        }

        return { score: Math.min(100, Math.max(0, score)), feedback };
    },

    // ============================================================
    //  SCORING: VIDEO PERFORMANCE
    // ============================================================
    calculateVideoPerformanceScore(video, channel) {
        let score = 0;
        const feedback = [];

        const stats = video.statistics || {};
        const contentDetails = video.contentDetails || {};
        const snippet = video.snippet || {};

        const views = parseInt(stats.viewCount) || 0;

        // Duration analysis
        const duration = contentDetails.duration || '';
        const durationSeconds = this.parseDurationToSeconds(duration);

        if (durationSeconds >= 480 && durationSeconds <= 1200) {
            score += 30;
            feedback.push(`✅ Thời lượng tối ưu: ${YouTubeAPI.parseDuration(duration)} (8-20 phút)`);
        } else if (durationSeconds >= 180 && durationSeconds <= 1800) {
            score += 20;
            feedback.push(`⚠️ Thời lượng chấp nhận: ${YouTubeAPI.parseDuration(duration)}`);
        } else if (durationSeconds < 60) {
            score += 10;
            feedback.push(`❌ Video quá ngắn: ${YouTubeAPI.parseDuration(duration)} — Shorts?`);
        } else if (durationSeconds > 3600) {
            score += 10;
            feedback.push(`⚠️ Video rất dài: ${YouTubeAPI.parseDuration(duration)} — cân nhắc chia nhỏ`);
        } else {
            score += 15;
            feedback.push(`⚠️ Thời lượng: ${YouTubeAPI.parseDuration(duration)}`);
        }

        // Views vs channel average
        if (channel) {
            const channelStats = channel.statistics || {};
            const totalViews = parseInt(channelStats.viewCount) || 0;
            const totalVideos = parseInt(channelStats.videoCount) || 1;
            const avgViews = totalViews / totalVideos;

            if (avgViews > 0) {
                const ratio = views / avgViews;
                if (ratio >= 2) {
                    score += 35;
                    feedback.push(`✅ Views gấp ${ratio.toFixed(1)}x trung bình kênh — video nổi bật!`);
                } else if (ratio >= 1) {
                    score += 25;
                    feedback.push(`✅ Views cao hơn trung bình kênh (${ratio.toFixed(1)}x)`);
                } else if (ratio >= 0.5) {
                    score += 15;
                    feedback.push(`⚠️ Views thấp hơn trung bình kênh (${ratio.toFixed(1)}x)`);
                } else {
                    score += 5;
                    feedback.push(`❌ Views thấp hơn đáng kể so với trung bình kênh (${ratio.toFixed(1)}x)`);
                }
            }
        } else {
            score += 15;
        }

        // Category analysis
        const categoryId = snippet.categoryId;
        if (categoryId) {
            score += 15;
            const categoryNames = {
                '1': 'Film & Animation', '2': 'Autos & Vehicles', '10': 'Music',
                '15': 'Pets & Animals', '17': 'Sports', '19': 'Travel & Events',
                '20': 'Gaming', '22': 'People & Blogs', '23': 'Comedy',
                '24': 'Entertainment', '25': 'News & Politics', '26': 'Howto & Style',
                '27': 'Education', '28': 'Science & Technology', '29': 'Nonprofits & Activism'
            };
            feedback.push(`✅ Category: ${categoryNames[categoryId] || 'ID ' + categoryId}`);
        }

        // Publish timing
        const publishDate = snippet.publishedAt;
        if (publishDate) {
            const pubDate = new Date(publishDate);
            const dayOfWeek = pubDate.getDay();
            const hour = pubDate.getHours();

            // Best days: Tue-Thu, best hours: 14-18
            if (dayOfWeek >= 2 && dayOfWeek <= 4) {
                score += 10;
                feedback.push('✅ Đăng vào ngày tối ưu (Thứ 3-5)');
            } else if (dayOfWeek === 1 || dayOfWeek === 5) {
                score += 7;
                feedback.push('⚠️ Đăng vào Thứ 2/6 — chấp nhận được');
            } else {
                score += 3;
                feedback.push('💡 Cuối tuần thường ít traffic — thử đăng Thứ 3-5');
            }

            if (hour >= 14 && hour <= 18) {
                score += 10;
                feedback.push('✅ Đăng vào khung giờ vàng (14h-18h)');
            } else if (hour >= 10 && hour <= 20) {
                score += 7;
                feedback.push('⚠️ Khung giờ đăng chấp nhận được');
            } else {
                score += 3;
                feedback.push('💡 Thử đăng vào 14h-18h để tối ưu reach');
            }
        }

        return { score: Math.min(100, Math.max(0, score)), feedback };
    },

    parseDurationToSeconds(duration) {
        if (!duration) return 0;
        const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (!match) return 0;
        return (parseInt(match[1] || 0) * 3600) +
            (parseInt(match[2] || 0) * 60) +
            parseInt(match[3] || 0);
    },

    // ============================================================
    //  RENDER AUDIT RESULTS
    // ============================================================
    renderAuditResults(data, container) {
        const { video, channel, overall, categories } = data;
        const snippet = video.snippet || {};
        const stats = video.statistics || {};
        const contentDetails = video.contentDetails || {};

        const getScoreColor = (s) => {
            if (s >= 80) return 'var(--success)';
            if (s >= 50) return 'var(--warning)';
            return 'var(--error)';
        };

        const getScoreLabel = (s) => {
            if (s >= 80) return 'Xuất sắc 🏆';
            if (s >= 60) return 'Tốt 👍';
            if (s >= 40) return 'Trung bình ⚡';
            return 'Cần cải thiện 🔧';
        };

        const getBadgeClass = (s) => s >= 70 ? 'good' : s >= 40 ? 'warning' : 'bad';

        // Thumbnails — get best available
        const thumbs = snippet.thumbnails || {};
        const thumbUrl = (thumbs.maxres || thumbs.standard || thumbs.high || thumbs.medium || thumbs.default || {}).url || '';

        const overallDeg = (overall / 100) * 360;

        // Channel info
        const channelName = snippet.channelTitle || 'Unknown';
        const channelSubs = channel ? YouTubeAPI.formatCount(parseInt(channel.statistics?.subscriberCount || 0)) : '?';

        container.innerHTML = `
            <!-- Video Info Card -->
            <div class="audit-video-card">
                <div class="audit-video-thumb">
                    <img src="${thumbUrl}" alt="Thumbnail" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 9%22><rect fill=%22%231a1a2e%22 width=%2216%22 height=%229%22/></svg>'">
                    <span class="thumb-badge">${YouTubeAPI.parseDuration(contentDetails.duration || 'PT0S')}</span>
                </div>
                <div class="audit-video-details">
                    <h3>${snippet.title || 'Untitled'}</h3>
                    <div class="audit-channel-name">${channelName} • ${channelSubs} subs</div>
                    <div class="audit-publish-date">📅 ${snippet.publishedAt ? new Date(snippet.publishedAt).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</div>
                    <div class="audit-stats-row">
                        <div class="audit-stat">
                            <span class="audit-stat-value">${YouTubeAPI.formatCount(parseInt(stats.viewCount || 0))}</span>
                            <span class="audit-stat-label">Views</span>
                        </div>
                        <div class="audit-stat">
                            <span class="audit-stat-value">${YouTubeAPI.formatCount(parseInt(stats.likeCount || 0))}</span>
                            <span class="audit-stat-label">Likes</span>
                        </div>
                        <div class="audit-stat">
                            <span class="audit-stat-value">${YouTubeAPI.formatCount(parseInt(stats.commentCount || 0))}</span>
                            <span class="audit-stat-label">Comments</span>
                        </div>
                        <div class="audit-stat">
                            <span class="audit-stat-value">${(snippet.tags || []).length}</span>
                            <span class="audit-stat-label">Tags</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Overall Score -->
            <div class="audit-score-header">
                <div class="audit-score-circle" style="background: conic-gradient(${getScoreColor(overall)} ${overallDeg}deg, var(--bg-tertiary) ${overallDeg}deg);">
                    <div class="score-inner">
                        <span class="score-number" style="color: ${getScoreColor(overall)}">${overall}</span>
                        <span class="score-of">/100</span>
                    </div>
                </div>
                <div class="audit-score-info">
                    <h3 style="color: ${getScoreColor(overall)}">Điểm SEO tổng: ${getScoreLabel(overall)}</h3>
                    <p>Đánh giá dựa trên 7 tiêu chí: Title, Description, Tags, Thumbnail, Engagement, Channel Authority và Video Performance.</p>
                    <div class="audit-score-badges">
                        ${categories.map(c => `
                            <span class="audit-badge ${getBadgeClass(c.score)}">${c.icon} ${c.name.split(' (')[0]} ${c.score}/100</span>
                        `).join('')}
                    </div>
                </div>
            </div>

            <!-- Category Details -->
            <div class="audit-categories">
                ${categories.map(c => `
                    <div class="audit-category">
                        <div class="audit-cat-header">
                            <div class="audit-cat-header-left">
                                <span class="audit-cat-icon">${c.icon}</span>
                                <span class="audit-cat-name">${c.name}</span>
                            </div>
                            <span class="audit-cat-score" style="color: ${getScoreColor(c.score)}">${c.score}/100 <small style="color:var(--text-muted);font-weight:400">(${c.weight})</small></span>
                        </div>
                        <div class="audit-cat-bar">
                            <div class="audit-cat-bar-fill" style="width: ${c.score}%; background: ${getScoreColor(c.score)};"></div>
                        </div>
                        <div class="audit-cat-feedback">
                            ${c.feedback.map(f => `<p>${f}</p>`).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>

            <!-- Actions -->
            <div class="audit-actions">
                <button class="btn btn-primary" onclick="SEOScoreModule.exportReport()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    Xuất báo cáo (Copy)
                </button>
                <button class="btn btn-secondary" onclick="window.open('https://youtube.com/watch?v=${video.id}', '_blank')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                        <polyline points="15 3 21 3 21 9"/>
                        <line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                    Xem trên YouTube
                </button>
            </div>
        `;

        // Store for export
        this._lastAuditData = data;
    },

    // ============================================================
    //  EXPORT REPORT
    // ============================================================
    exportReport() {
        const data = this._lastAuditData;
        if (!data) {
            app.showToast('Chưa có dữ liệu để xuất', 'warning');
            return;
        }

        const snippet = data.video.snippet || {};
        const stats = data.video.statistics || {};

        let report = `📊 BÁO CÁO SEO VIDEO YOUTUBE\n`;
        report += `${'═'.repeat(40)}\n\n`;
        report += `🎬 ${snippet.title || 'Untitled'}\n`;
        report += `📡 ${snippet.channelTitle || 'Unknown'}\n`;
        report += `🔗 https://youtube.com/watch?v=${data.video.id}\n`;
        report += `📅 ${snippet.publishedAt ? new Date(snippet.publishedAt).toLocaleDateString('vi-VN') : 'N/A'}\n\n`;

        report += `📈 THỐNG KÊ\n`;
        report += `   Views: ${parseInt(stats.viewCount || 0).toLocaleString()}\n`;
        report += `   Likes: ${parseInt(stats.likeCount || 0).toLocaleString()}\n`;
        report += `   Comments: ${parseInt(stats.commentCount || 0).toLocaleString()}\n`;
        report += `   Tags: ${(snippet.tags || []).length}\n\n`;

        report += `🏆 ĐIỂM SEO TỔNG: ${data.overall}/100\n`;
        report += `${'─'.repeat(40)}\n\n`;

        data.categories.forEach(c => {
            report += `${c.icon} ${c.name} — ${c.score}/100 (${c.weight})\n`;
            c.feedback.forEach(f => {
                report += `   ${f}\n`;
            });
            report += `\n`;
        });

        report += `${'═'.repeat(40)}\n`;
        report += `Phân tích bởi VidIQ Clone Tool\n`;

        navigator.clipboard.writeText(report).then(() => {
            app.showToast('Đã copy báo cáo vào clipboard! 📋', 'success');
        }).catch(() => {
            // Fallback
            const textarea = document.createElement('textarea');
            textarea.value = report;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            app.showToast('Đã copy báo cáo! 📋', 'success');
        });
    },

    // ============================================================
    //  MANUAL CHECK (existing logic preserved)
    // ============================================================
    checkSEO() {
        const titleInput = document.getElementById('seoTitle');
        const descInput = document.getElementById('seoDescription');
        const tagsInput = document.getElementById('seoTags');
        const resultsContainer = document.getElementById('seoResults');

        if (!resultsContainer) return;

        const title = titleInput?.value.trim() || '';
        const description = descInput?.value.trim() || '';
        const tags = tagsInput?.value.trim() || '';

        if (!title && !description && !tags) {
            app.showToast('Vui lòng nhập ít nhất 1 trường', 'warning');
            return;
        }

        const titleScore = this.calculateTitleScore(title);
        const descScore = this.calculateDescriptionScore(description);
        const tagsScore = this.calculateTagsScore(tags);
        const overallScore = Math.round((titleScore.score + descScore.score + tagsScore.score) / 3);

        this.renderResults({
            overall: overallScore,
            title: titleScore,
            description: descScore,
            tags: tagsScore
        }, resultsContainer);
    },

    // ============================================================
    //  SCORING: TITLE (existing)
    // ============================================================
    calculateTitleScore(title) {
        let score = 0;
        const feedback = [];

        if (!title) {
            return { score: 0, feedback: ['❌ Không có tiêu đề'] };
        }

        const length = title.length;
        if (length >= 50 && length <= 70) {
            score += 30;
            feedback.push('✅ Độ dài tiêu đề tối ưu (50-70 ký tự)');
        } else if (length >= 30 && length <= 80) {
            score += 20;
            feedback.push('⚠️ Độ dài tiêu đề chấp nhận được (' + length + ' ký tự)');
        } else if (length < 30) {
            score += 10;
            feedback.push('❌ Tiêu đề quá ngắn (' + length + ' ký tự). Nên từ 50-70 ký tự');
        } else {
            score += 10;
            feedback.push('❌ Tiêu đề quá dài (' + length + ' ký tự). YouTube có thể cắt bớt');
        }

        if (length > 0) {
            score += 10;
            feedback.push('✅ Có tiêu đề');
        }

        if (/\d{4}/.test(title)) {
            score += 15;
            feedback.push('✅ Có năm trong tiêu đề (tăng tính cập nhật)');
        } else if (/\d+/.test(title)) {
            score += 10;
            feedback.push('✅ Có số trong tiêu đề (tăng click-through rate)');
        }

        const powerWords = ['cách', 'hướng dẫn', 'bí quyết', 'top', 'best', 'review', 'so sánh',
            'mới nhất', 'miễn phí', 'tutorial', 'tips', 'tricks', 'secret', 'ultimate'];
        const hasPowerWord = powerWords.some(word => title.toLowerCase().includes(word));
        if (hasPowerWord) {
            score += 15;
            feedback.push('✅ Có từ khóa mạnh (power word)');
        } else {
            feedback.push('💡 Thêm từ khóa mạnh như: Cách, Hướng dẫn, Top, Review...');
        }

        if (/[\[\]()]/.test(title)) {
            score += 10;
            feedback.push('✅ Có dấu ngoặc (tăng CTR)');
        }

        if (/[\u{1F600}-\u{1F6FF}]|[\u{2600}-\u{26FF}]/u.test(title)) {
            score += 10;
            feedback.push('✅ Có emoji (tăng sự chú ý)');
        }

        if (title === title.toUpperCase() && title.length > 10) {
            score -= 10;
            feedback.push('❌ Không nên viết hoa toàn bộ tiêu đề');
        }

        return { score: Math.min(100, Math.max(0, score)), feedback };
    },

    // ============================================================
    //  SCORING: DESCRIPTION (existing)
    // ============================================================
    calculateDescriptionScore(description) {
        let score = 0;
        const feedback = [];

        if (!description) {
            return { score: 0, feedback: ['❌ Không có mô tả'] };
        }

        const length = description.length;

        if (length >= 1000) {
            score += 30;
            feedback.push('✅ Mô tả chi tiết (' + length + ' ký tự)');
        } else if (length >= 500) {
            score += 20;
            feedback.push('⚠️ Mô tả đủ dài (' + length + ' ký tự). Nên thêm chi tiết');
        } else if (length >= 150) {
            score += 10;
            feedback.push('❌ Mô tả hơi ngắn (' + length + ' ký tự). Nên từ 500+ ký tự');
        } else {
            score += 5;
            feedback.push('❌ Mô tả quá ngắn. Google không thể hiểu nội dung video');
        }

        const linkCount = (description.match(/https?:\/\//g) || []).length;
        if (linkCount >= 3) {
            score += 15;
            feedback.push('✅ Có nhiều links (' + linkCount + ')');
        } else if (linkCount >= 1) {
            score += 10;
            feedback.push('⚠️ Có ' + linkCount + ' link. Nên thêm links đến social media, website...');
        } else {
            feedback.push('💡 Thêm links đến social media, website của bạn');
        }

        const hasTimestamps = /\d{1,2}:\d{2}/.test(description);
        if (hasTimestamps) {
            score += 20;
            feedback.push('✅ Có timestamps (tăng user experience)');
        } else if (length > 200) {
            feedback.push('💡 Thêm timestamps để người xem dễ navigate');
        }

        const hashtagCount = (description.match(/#\w+/g) || []).length;
        if (hashtagCount >= 3 && hashtagCount <= 15) {
            score += 15;
            feedback.push('✅ Có ' + hashtagCount + ' hashtags');
        } else if (hashtagCount > 0) {
            score += 10;
            feedback.push('⚠️ Có ' + hashtagCount + ' hashtag. Nên có 3-15 hashtags');
        } else {
            feedback.push('💡 Thêm 3-15 hashtags ở cuối mô tả');
        }

        const ctaWords = ['subscribe', 'đăng ký', 'like', 'thích', 'share', 'chia sẻ', 'comment', 'bình luận'];
        const hasCTA = ctaWords.some(word => description.toLowerCase().includes(word));
        if (hasCTA) {
            score += 10;
            feedback.push('✅ Có call-to-action');
        } else {
            feedback.push('💡 Thêm call-to-action: "Like, Subscribe, Bình luận..."');
        }

        const first150 = description.substring(0, 150);
        if (first150.length >= 100 && !first150.includes('http')) {
            score += 10;
            feedback.push('✅ 150 ký tự đầu có nội dung thực (không phải link)');
        }

        return { score: Math.min(100, Math.max(0, score)), feedback };
    },

    // ============================================================
    //  SCORING: TAGS (existing)
    // ============================================================
    calculateTagsScore(tags) {
        let score = 0;
        const feedback = [];

        if (!tags) {
            return { score: 0, feedback: ['❌ Không có tags'] };
        }

        const tagList = tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
        const tagCount = tagList.length;

        if (tagCount >= 10 && tagCount <= 15) {
            score += 40;
            feedback.push('✅ Số lượng tags tối ưu (' + tagCount + ' tags)');
        } else if (tagCount >= 5 && tagCount <= 20) {
            score += 25;
            feedback.push('⚠️ Số lượng tags chấp nhận được (' + tagCount + ' tags). Tối ưu: 10-15');
        } else if (tagCount < 5) {
            score += 10;
            feedback.push('❌ Quá ít tags (' + tagCount + '). Nên có 10-15 tags');
        } else {
            score += 20;
            feedback.push('⚠️ Có thể quá nhiều tags (' + tagCount + '). YouTube khuyến nghị dưới 15');
        }

        const shortTags = tagList.filter(t => t.length <= 10).length;
        const mediumTags = tagList.filter(t => t.length > 10 && t.length <= 25).length;

        if (shortTags > 0 && mediumTags > 0) {
            score += 20;
            feedback.push('✅ Có sự đa dạng về độ dài tags');
        } else {
            feedback.push('💡 Kết hợp tags ngắn (1-2 từ) và tags dài (long-tail keywords)');
        }

        const totalChars = tags.length;
        if (totalChars <= 500) {
            score += 15;
            feedback.push('✅ Tổng số ký tự tags trong giới hạn (' + totalChars + '/500)');
        } else {
            score += 5;
            feedback.push('❌ Vượt quá giới hạn ký tự (' + totalChars + '/500)');
        }

        const uniqueTags = new Set(tagList.map(t => t.toLowerCase()));
        if (uniqueTags.size === tagList.length) {
            score += 15;
            feedback.push('✅ Không có tags trùng lặp');
        } else {
            score += 5;
            feedback.push('❌ Có tags trùng lặp');
        }

        const hasBrand = tagList.some(t => t.length > 3 && /^[A-Z]/.test(t));
        if (hasBrand) {
            score += 10;
            feedback.push('✅ Có thể có tên brand/kênh trong tags');
        }

        return { score: Math.min(100, Math.max(0, score)), feedback };
    },

    // ============================================================
    //  RENDER MANUAL RESULTS (existing)
    // ============================================================
    renderResults(data, container) {
        const getScoreColor = (score) => {
            if (score >= 80) return 'var(--success)';
            if (score >= 50) return 'var(--warning)';
            return 'var(--error)';
        };

        const getScoreLabel = (score) => {
            if (score >= 80) return 'Xuất sắc';
            if (score >= 60) return 'Tốt';
            if (score >= 40) return 'Trung bình';
            return 'Cần cải thiện';
        };

        const overallDeg = (data.overall / 100) * 360;

        container.innerHTML = `
            <!-- Overall Score -->
            <div class="seo-score-card">
                <div class="score-circle" style="background: conic-gradient(${getScoreColor(data.overall)} ${overallDeg}deg, var(--bg-tertiary) ${overallDeg}deg);">
                    <span class="score-value" style="color: ${getScoreColor(data.overall)}">${data.overall}</span>
                </div>
                <h3 style="margin-bottom: 0.5rem;">Điểm SEO tổng: ${getScoreLabel(data.overall)}</h3>
                <p style="color: var(--text-secondary);">Điểm trung bình từ tiêu đề, mô tả và tags</p>
            </div>
            
            <!-- Score Breakdown -->
            <div class="glass-card" style="padding: 1.5rem; margin-bottom: 1.5rem;">
                <h3 style="margin-bottom: 1.5rem;">📊 Chi tiết điểm</h3>
                <div class="score-breakdown">
                    ${this.renderScoreItem('📝 Tiêu đề', data.title.score)}
                    ${this.renderScoreItem('📄 Mô tả', data.description.score)}
                    ${this.renderScoreItem('🏷️ Tags', data.tags.score)}
                </div>
            </div>
            
            <!-- Detailed Feedback -->
            <div class="glass-card" style="padding: 1.5rem;">
                <h3 style="margin-bottom: 1.5rem;">💡 Phân tích chi tiết</h3>
                
                <div style="margin-bottom: 1.5rem;">
                    <h4 style="margin-bottom: 0.75rem; color: ${getScoreColor(data.title.score)};">📝 Tiêu đề (${data.title.score}/100)</h4>
                    ${data.title.feedback.map(f => `<p style="margin-bottom: 0.5rem; padding-left: 1rem;">${f}</p>`).join('')}
                </div>
                
                <div style="margin-bottom: 1.5rem;">
                    <h4 style="margin-bottom: 0.75rem; color: ${getScoreColor(data.description.score)};">📄 Mô tả (${data.description.score}/100)</h4>
                    ${data.description.feedback.map(f => `<p style="margin-bottom: 0.5rem; padding-left: 1rem;">${f}</p>`).join('')}
                </div>
                
                <div>
                    <h4 style="margin-bottom: 0.75rem; color: ${getScoreColor(data.tags.score)};">🏷️ Tags (${data.tags.score}/100)</h4>
                    ${data.tags.feedback.map(f => `<p style="margin-bottom: 0.5rem; padding-left: 1rem;">${f}</p>`).join('')}
                </div>
            </div>
        `;
    },

    renderScoreItem(label, score) {
        const color = score >= 80 ? 'var(--success)' : score >= 50 ? 'var(--warning)' : 'var(--error)';

        return `
            <div class="score-item">
                <span class="score-item-label">${label}</span>
                <div class="score-bar">
                    <div class="score-bar-fill" style="width: ${score}%; background: ${color};"></div>
                </div>
                <span class="score-item-value" style="color: ${color};">${score}</span>
            </div>
        `;
    }
};
