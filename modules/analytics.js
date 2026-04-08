/**
 * VidIQ Clone - Channel Analytics Module
 */

const AnalyticsModule = {
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
        const analyzeBtn = document.getElementById('analyzeChannelBtn');
        const channelInput = document.getElementById('channelInput');

        if (analyzeBtn) {
            analyzeBtn.addEventListener('click', () => this.analyzeChannel());
        }

        if (channelInput) {
            channelInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.analyzeChannel();
            });
        }
    },

    /**
     * Analyze a YouTube channel
     */
    async analyzeChannel() {
        const input = document.getElementById('channelInput');
        const resultsContainer = document.getElementById('analyticsResults');

        if (!input || !resultsContainer) return;

        const channelId = YouTubeAPI.extractChannelId(input.value.trim());
        if (!channelId) {
            app.showToast('Vui lòng nhập Channel ID hoặc URL', 'warning');
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
                <p>Đang phân tích kênh...</p>
            </div>
        `;

        try {
            const channelData = await YouTubeAPI.getChannelDetails(channelId);

            if (!channelData.items || channelData.items.length === 0) {
                throw new Error('Không tìm thấy kênh');
            }

            const channel = channelData.items[0];

            // Get recent videos
            let videos = [];
            try {
                const videosData = await YouTubeAPI.getChannelVideos(channel.id, 10);
                videos = videosData.items || [];
            } catch (e) {
                console.warn('Could not fetch videos:', e);
            }

            this.renderResults(channel, videos, resultsContainer);

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
     * Render channel analysis results
     * @param {Object} channel - Channel data
     * @param {Array} videos - Recent videos
     * @param {HTMLElement} container - Container element
     */
    renderResults(channel, videos, container) {
        const snippet = channel.snippet;
        const stats = channel.statistics;
        const branding = channel.brandingSettings?.channel;

        const thumbnail = snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url;
        const subscribers = parseInt(stats.subscriberCount) || 0;
        const totalViews = parseInt(stats.viewCount) || 0;
        const videoCount = parseInt(stats.videoCount) || 0;

        // Calculate average views per video
        const avgViews = videoCount > 0 ? Math.round(totalViews / videoCount) : 0;

        // Estimate monthly views from recent videos
        let estimatedMonthlyViews = 0;
        let avgEngagement = 0;
        let uploadFrequency = 0;

        if (videos.length > 0) {
            const recentViews = videos.reduce((sum, v) => sum + parseInt(v.statistics?.viewCount || 0), 0);
            estimatedMonthlyViews = Math.round(recentViews / videos.length * 4);

            // Calculate engagement rate
            const totalLikes = videos.reduce((sum, v) => sum + parseInt(v.statistics?.likeCount || 0), 0);
            const totalComments = videos.reduce((sum, v) => sum + parseInt(v.statistics?.commentCount || 0), 0);
            avgEngagement = recentViews > 0 ? ((totalLikes + totalComments) / recentViews * 100).toFixed(2) : 0;

            // Calculate upload frequency (videos per week)
            if (videos.length >= 2) {
                const newest = new Date(videos[0].snippet.publishedAt);
                const oldest = new Date(videos[videos.length - 1].snippet.publishedAt);
                const daysDiff = Math.max(1, (newest - oldest) / (1000 * 60 * 60 * 24));
                uploadFrequency = (videos.length / daysDiff * 7).toFixed(1);
            }
        }

        // Analyze channel strengths, weaknesses, and generate recommendations
        const analysis = this.analyzeChannelHealth(channel, videos, {
            subscribers,
            totalViews,
            videoCount,
            avgViews,
            avgEngagement,
            uploadFrequency,
            estimatedMonthlyViews
        });

        container.innerHTML = `
            <!-- Channel Header -->
            <div class="glass-card" style="padding: 1.5rem; margin-bottom: 1.5rem;">
                <div style="display: flex; gap: 1.5rem; align-items: center; flex-wrap: wrap;">
                    <img src="${thumbnail}" alt="${snippet.title}" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover;">
                    <div style="flex: 1;">
                        <h2 style="margin-bottom: 0.5rem;">${snippet.title}</h2>
                        <p style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 0.5rem;">
                            ${snippet.customUrl || '@' + snippet.title.toLowerCase().replace(/\s+/g, '')}
                        </p>
                        ${branding?.description ? `
                            <p style="color: var(--text-muted); font-size: 0.875rem; line-height: 1.5; max-width: 600px;">
                                ${branding.description.substring(0, 150)}${branding.description.length > 150 ? '...' : ''}
                            </p>
                        ` : ''}
                    </div>
                    <a href="https://www.youtube.com/channel/${channel.id}" target="_blank" class="btn btn-primary">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px;">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                            <polyline points="15 3 21 3 21 9"/>
                            <line x1="10" y1="14" x2="21" y2="3"/>
                        </svg>
                        Xem kênh
                    </a>
                </div>
            </div>
            
            <!-- Stats Grid -->
            <div class="channel-stats-grid">
                <div class="channel-stat-card">
                    <div class="stat-label">Subscribers</div>
                    <div class="stat-value">${YouTubeAPI.formatCount(subscribers)}</div>
                </div>
                <div class="channel-stat-card">
                    <div class="stat-label">Tổng lượt xem</div>
                    <div class="stat-value">${YouTubeAPI.formatCount(totalViews)}</div>
                </div>
                <div class="channel-stat-card">
                    <div class="stat-label">Số video</div>
                    <div class="stat-value">${videoCount.toLocaleString()}</div>
                </div>
                <div class="channel-stat-card">
                    <div class="stat-label">View TB/Video</div>
                    <div class="stat-value">${YouTubeAPI.formatCount(avgViews)}</div>
                </div>
            </div>
            
            <!-- Performance Metrics -->
            <div class="glass-card" style="padding: 1.5rem; margin-bottom: 1.5rem;">
                <h3 style="margin-bottom: 1rem;">📊 Chỉ số hiệu suất</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                    <div style="padding: 1rem; background: var(--bg-tertiary); border-radius: 0.5rem;">
                        <div style="font-size: 0.875rem; color: var(--text-secondary);">Views/Subscriber</div>
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--success);">
                            ${subscribers > 0 ? (totalViews / subscribers).toFixed(1) : 0}x
                        </div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">
                            ${(totalViews / subscribers) > 100 ? 'Xuất sắc' : (totalViews / subscribers) > 50 ? 'Tốt' : 'Cần cải thiện'}
                        </div>
                    </div>
                    <div style="padding: 1rem; background: var(--bg-tertiary); border-radius: 0.5rem;">
                        <div style="font-size: 0.875rem; color: var(--text-secondary);">Tỷ lệ tương tác</div>
                        <div style="font-size: 1.5rem; font-weight: 700; color: ${avgEngagement >= 5 ? 'var(--success)' : avgEngagement >= 2 ? 'var(--warning)' : 'var(--error)'};">
                            ${avgEngagement}%
                        </div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">
                            ${avgEngagement >= 5 ? 'Xuất sắc' : avgEngagement >= 2 ? 'Trung bình' : 'Cần cải thiện'}
                        </div>
                    </div>
                    <div style="padding: 1rem; background: var(--bg-tertiary); border-radius: 0.5rem;">
                        <div style="font-size: 0.875rem; color: var(--text-secondary);">Tần suất upload</div>
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--info);">
                            ${uploadFrequency} video/tuần
                        </div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">
                            ${uploadFrequency >= 3 ? 'Rất tích cực' : uploadFrequency >= 1 ? 'Ổn định' : 'Cần đăng nhiều hơn'}
                        </div>
                    </div>
                    <div style="padding: 1rem; background: var(--bg-tertiary); border-radius: 0.5rem;">
                        <div style="font-size: 0.875rem; color: var(--text-secondary);">Ước tính views/tháng</div>
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--info);">
                            ${YouTubeAPI.formatCount(estimatedMonthlyViews)}
                        </div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">Dựa trên videos gần đây</div>
                    </div>
                    <div style="padding: 1rem; background: var(--bg-tertiary); border-radius: 0.5rem;">
                        <div style="font-size: 0.875rem; color: var(--text-secondary);">Thành lập</div>
                        <div style="font-size: 1.25rem; font-weight: 600;">
                            ${new Date(snippet.publishedAt).toLocaleDateString('vi-VN')}
                        </div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">
                            ${this.getChannelAge(snippet.publishedAt)}
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Channel Health Analysis -->
            <div class="glass-card" style="padding: 1.5rem; margin-bottom: 1.5rem;">
                <h3 style="margin-bottom: 1rem;">🎯 Phân tích sức khỏe kênh</h3>
                
                <!-- Overall Score -->
                <div style="display: flex; align-items: center; gap: 1.5rem; margin-bottom: 1.5rem; padding: 1rem; background: var(--bg-tertiary); border-radius: 0.75rem;">
                    <div style="position: relative; width: 100px; height: 100px;">
                        <svg viewBox="0 0 100 100" style="transform: rotate(-90deg);">
                            <circle cx="50" cy="50" r="45" fill="none" stroke="var(--bg-secondary)" stroke-width="8"/>
                            <circle cx="50" cy="50" r="45" fill="none" stroke="${analysis.overallScore >= 70 ? 'var(--success)' : analysis.overallScore >= 40 ? 'var(--warning)' : 'var(--error)'}" stroke-width="8" stroke-dasharray="${analysis.overallScore * 2.83} 283" stroke-linecap="round"/>
                        </svg>
                        <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 700;">
                            ${analysis.overallScore}
                        </div>
                    </div>
                    <div>
                        <div style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.25rem;">${analysis.overallLabel}</div>
                        <div style="color: var(--text-secondary); font-size: 0.875rem;">Điểm sức khỏe tổng thể kênh</div>
                    </div>
                </div>
                
                <!-- Strengths & Weaknesses -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem;">
                    <!-- Strengths -->
                    <div style="background: linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.05) 100%); border: 1px solid rgba(34, 197, 94, 0.2); border-radius: 0.75rem; padding: 1rem;">
                        <h4 style="color: var(--success); margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px;">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                                <polyline points="22 4 12 14.01 9 11.01"/>
                            </svg>
                            Điểm mạnh
                        </h4>
                        <ul style="margin: 0; padding-left: 1.25rem; color: var(--text-secondary); font-size: 0.875rem; line-height: 1.8;">
                            ${analysis.strengths.map(s => `<li>${s}</li>`).join('')}
                        </ul>
                    </div>
                    
                    <!-- Weaknesses -->
                    <div style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.05) 100%); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 0.75rem; padding: 1rem;">
                        <h4 style="color: var(--error); margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px;">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="12" y1="8" x2="12" y2="12"/>
                                <line x1="12" y1="16" x2="12.01" y2="16"/>
                            </svg>
                            Điểm yếu
                        </h4>
                        <ul style="margin: 0; padding-left: 1.25rem; color: var(--text-secondary); font-size: 0.875rem; line-height: 1.8;">
                            ${analysis.weaknesses.map(w => `<li>${w}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            </div>
            
            <!-- Expert MMO Recommendations -->
            <div class="glass-card" style="padding: 1.5rem; margin-bottom: 1.5rem; background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%); border: 1px solid rgba(99, 102, 241, 0.2);">
                <h3 style="margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                    <span style="font-size: 1.5rem;">💎</span>
                    Lời khuyên từ chuyên gia MMO
                </h3>
                <p style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 1rem;">
                    Dựa trên phân tích dữ liệu kênh, đây là các đề xuất chiến lược để tối ưu hóa thu nhập và phát triển kênh:
                </p>
                
                <div style="display: flex; flex-direction: column; gap: 1rem;">
                    ${analysis.recommendations.map((rec, index) => `
                        <div style="display: flex; gap: 1rem; padding: 1rem; background: var(--bg-secondary); border-radius: 0.75rem; border-left: 4px solid ${rec.priority === 'high' ? 'var(--error)' : rec.priority === 'medium' ? 'var(--warning)' : 'var(--info)'};">
                            <div style="flex-shrink: 0; width: 32px; height: 32px; background: ${rec.priority === 'high' ? 'var(--error)' : rec.priority === 'medium' ? 'var(--warning)' : 'var(--info)'}; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700;">
                                ${index + 1}
                            </div>
                            <div style="flex: 1;">
                                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                                    <strong style="color: var(--text-primary);">${rec.title}</strong>
                                    <span style="font-size: 0.625rem; padding: 0.125rem 0.5rem; border-radius: 9999px; background: ${rec.priority === 'high' ? 'rgba(239, 68, 68, 0.2)' : rec.priority === 'medium' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(59, 130, 246, 0.2)'}; color: ${rec.priority === 'high' ? 'var(--error)' : rec.priority === 'medium' ? 'var(--warning)' : 'var(--info)'}; text-transform: uppercase; font-weight: 600;">
                                        ${rec.priority === 'high' ? 'Ưu tiên cao' : rec.priority === 'medium' ? 'Trung bình' : 'Gợi ý'}
                                    </span>
                                </div>
                                <p style="margin: 0; color: var(--text-secondary); font-size: 0.875rem; line-height: 1.6;">
                                    ${rec.description}
                                </p>
                                ${rec.action ? `
                                    <div style="margin-top: 0.5rem; padding: 0.5rem; background: var(--bg-tertiary); border-radius: 0.5rem; font-size: 0.8rem;">
                                        <strong style="color: var(--primary);">💡 Hành động:</strong>
                                        <span style="color: var(--text-secondary);"> ${rec.action}</span>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <!-- Monetization Potential -->
                <div style="margin-top: 1.5rem; padding: 1rem; background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%); border: 1px solid rgba(245, 158, 11, 0.2); border-radius: 0.75rem;">
                    <h4 style="color: var(--warning); margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">
                        💰 Tiềm năng kiếm tiền
                    </h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                        <div>
                            <div style="font-size: 0.75rem; color: var(--text-muted);">AdSense ước tính/tháng</div>
                            <div style="font-size: 1.25rem; font-weight: 700; color: var(--success);">
                                ${analysis.estimatedEarnings.adsense}
                            </div>
                        </div>
                        <div>
                            <div style="font-size: 0.75rem; color: var(--text-muted);">Sponsor potential</div>
                            <div style="font-size: 1.25rem; font-weight: 700; color: var(--info);">
                                ${analysis.estimatedEarnings.sponsor}
                            </div>
                        </div>
                        <div>
                            <div style="font-size: 0.75rem; color: var(--text-muted);">Khả năng monetize</div>
                            <div style="font-size: 1.25rem; font-weight: 700; color: ${analysis.monetizationReady ? 'var(--success)' : 'var(--warning)'};">
                                ${analysis.monetizationReady ? '✅ Đủ điều kiện' : '⏳ Chưa đủ điều kiện'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Recent Videos -->
            ${videos.length > 0 ? `
                <h3 style="margin-bottom: 1rem;">🎬 Video gần đây</h3>
                <div class="video-grid">
                    ${videos.map(video => this.renderVideoCard(video)).join('')}
                </div>
            ` : ''}
        `;
    },

    /**
     * Analyze channel health and generate recommendations
     * @param {Object} channel - Channel data
     * @param {Array} videos - Recent videos
     * @param {Object} metrics - Calculated metrics
     * @returns {Object} Analysis results
     */
    analyzeChannelHealth(channel, videos, metrics) {
        const { subscribers, totalViews, videoCount, avgViews, avgEngagement, uploadFrequency, estimatedMonthlyViews } = metrics;

        const strengths = [];
        const weaknesses = [];
        const recommendations = [];

        let overallScore = 50; // Start with base score

        // Analyze subscriber count
        if (subscribers >= 100000) {
            strengths.push('Lượng subscriber lớn, có độ phủ rộng');
            overallScore += 15;
        } else if (subscribers >= 10000) {
            strengths.push('Cộng đồng subscriber vững chắc');
            overallScore += 10;
        } else if (subscribers >= 1000) {
            strengths.push('Đạt ngưỡng monetization về subscribers');
            overallScore += 5;
        } else {
            weaknesses.push('Lượng subscriber còn thấp, cần tăng trưởng');
            overallScore -= 5;
            recommendations.push({
                title: 'Tăng lượng subscriber',
                description: 'Kênh cần tập trung vào việc thu hút subscriber mới. Sử dụng CTA rõ ràng trong video, tạo series content để giữ chân người xem.',
                action: 'Thêm end-screen và cards kêu gọi subscribe, tạo video giới thiệu kênh hấp dẫn.',
                priority: 'high'
            });
        }

        // Analyze views/subscriber ratio
        const viewSubRatio = subscribers > 0 ? totalViews / subscribers : 0;
        if (viewSubRatio > 100) {
            strengths.push('Tỷ lệ views/sub xuất sắc - content viral tốt');
            overallScore += 10;
        } else if (viewSubRatio > 50) {
            strengths.push('Video được recommend tốt bởi YouTube');
        } else if (viewSubRatio < 20) {
            weaknesses.push('Tỷ lệ views/sub thấp - video khó được recommend');
            recommendations.push({
                title: 'Cải thiện SEO và Thumbnail',
                description: 'Video chưa được YouTube recommend nhiều. Cần tối ưu title, description, tags và thumbnail để tăng CTR.',
                action: 'Sử dụng plugin SEO Score để kiểm tra và tối ưu từng video.',
                priority: 'high'
            });
        }

        // Analyze engagement rate
        const engagementNum = parseFloat(avgEngagement);
        if (engagementNum >= 5) {
            strengths.push('Tỷ lệ tương tác rất cao - cộng đồng active');
            overallScore += 10;
        } else if (engagementNum >= 3) {
            strengths.push('Tương tác tốt từ người xem');
            overallScore += 5;
        } else if (engagementNum < 2) {
            weaknesses.push('Tỷ lệ tương tác thấp - người xem ít engage');
            recommendations.push({
                title: 'Tăng tương tác với người xem',
                description: 'Khuyến khích người xem like, comment bằng cách đặt câu hỏi, tổ chức mini-game, reply comment thường xuyên.',
                action: 'Hỏi ý kiến người xem cuối mỗi video, pin comment hay nhất.',
                priority: 'medium'
            });
        }

        // Analyze upload frequency
        const uploadFreqNum = parseFloat(uploadFrequency);
        if (uploadFreqNum >= 3) {
            strengths.push('Tần suất upload cao - kênh rất năng động');
            overallScore += 10;
        } else if (uploadFreqNum >= 1) {
            strengths.push('Lịch đăng video đều đặn');
            overallScore += 5;
        } else {
            weaknesses.push('Tần suất upload thấp - khó giữ chân audience');
            overallScore -= 5;
            recommendations.push({
                title: 'Tăng tần suất đăng video',
                description: 'YouTube ưu tiên kênh hoạt động đều đặn. Nên đăng ít nhất 1-2 video/tuần để duy trì momentum.',
                action: 'Lên lịch content 1 tháng trước, sử dụng Content Calendar để theo dõi.',
                priority: 'high'
            });
        }

        // Analyze video performance consistency
        if (videos.length >= 3) {
            const viewCounts = videos.map(v => parseInt(v.statistics?.viewCount || 0));
            const avgVideoViews = viewCounts.reduce((a, b) => a + b, 0) / viewCounts.length;
            const variance = viewCounts.reduce((sum, v) => sum + Math.pow(v - avgVideoViews, 2), 0) / viewCounts.length;
            const stdDev = Math.sqrt(variance);
            const coeffVar = avgVideoViews > 0 ? (stdDev / avgVideoViews) : 0;

            if (coeffVar < 0.5) {
                strengths.push('Hiệu suất video ổn định, dự đoán được');
            } else if (coeffVar > 1.5) {
                weaknesses.push('Views dao động lớn giữa các video');
                recommendations.push({
                    title: 'Ổn định chất lượng content',
                    description: 'Phân tích video nào có views cao, video nào thấp để tìm pattern. Tập trung vào format/topic đang hoạt động tốt.',
                    action: 'Review lại 5 video views cao nhất, xác định điểm chung về topic, thumbnail, title.',
                    priority: 'medium'
                });
            }
        }

        // Analyze monetization readiness
        const monetizationReady = subscribers >= 1000 && estimatedMonthlyViews >= 4000;

        if (!monetizationReady) {
            if (subscribers < 1000) {
                recommendations.push({
                    title: 'Mục tiêu 1,000 subscribers',
                    description: `Còn ${1000 - subscribers} subs để đủ điều kiện bật kiếm tiền. Tập trung vào content thu hút subscriber mới.`,
                    action: 'Tạo series video, collab với kênh khác, promote trên social media.',
                    priority: 'high'
                });
            }
        }

        // Add niche-specific recommendations
        recommendations.push({
            title: 'Đa dạng hóa nguồn thu',
            description: 'Không chỉ dựa vào AdSense. Explore affiliate marketing, sponsored content, bán sản phẩm số.',
            action: 'Tạo link affiliate cho sản phẩm liên quan niche, liên hệ brand để hợp tác.',
            priority: 'medium'
        });

        recommendations.push({
            title: 'Xây dựng thương hiệu cá nhân',
            description: 'Tạo sự khác biệt với các kênh cùng niche. Phát triển "signature style" riêng.',
            action: 'Thiết kế intro/outro nhất quán, tone giọng đặc trưng, visual style riêng.',
            priority: 'low'
        });

        // Calculate estimated earnings
        const cpm = 1.5; // Average CPM for Vietnamese market (USD)
        const monthlyEarningsUSD = (estimatedMonthlyViews / 1000) * cpm;
        const monthlyEarningsVND = monthlyEarningsUSD * 24500;

        // Limit score to 0-100
        overallScore = Math.max(0, Math.min(100, overallScore));

        // Determine overall label
        let overallLabel = 'Cần cải thiện';
        if (overallScore >= 80) overallLabel = 'Xuất sắc';
        else if (overallScore >= 60) overallLabel = 'Tốt';
        else if (overallScore >= 40) overallLabel = 'Trung bình';

        // If no strengths found, add generic ones
        if (strengths.length === 0) {
            strengths.push('Kênh đang hoạt động và có nội dung');
            strengths.push('Có tiềm năng phát triển');
        }

        // If no weaknesses found, add generic observation
        if (weaknesses.length === 0) {
            weaknesses.push('Chưa có điểm yếu đáng kể');
        }

        return {
            overallScore,
            overallLabel,
            strengths,
            weaknesses,
            recommendations: recommendations.sort((a, b) => {
                const priorityOrder = { high: 0, medium: 1, low: 2 };
                return priorityOrder[a.priority] - priorityOrder[b.priority];
            }).slice(0, 5), // Top 5 recommendations
            monetizationReady,
            estimatedEarnings: {
                adsense: monthlyEarningsVND >= 1000000
                    ? (monthlyEarningsVND / 1000000).toFixed(1) + 'M VND'
                    : monthlyEarningsVND.toLocaleString('vi-VN') + ' VND',
                sponsor: subscribers >= 10000
                    ? '5-20M VND/video'
                    : subscribers >= 1000
                        ? '500K-2M VND/video'
                        : 'Chưa đủ scale'
            }
        };
    },

    /**
     * Calculate channel age
     * @param {string} publishedAt - ISO date string
     * @returns {string} Channel age
     */
    getChannelAge(publishedAt) {
        const created = new Date(publishedAt);
        const now = new Date();
        const years = Math.floor((now - created) / (365.25 * 24 * 60 * 60 * 1000));
        const months = Math.floor((now - created) / (30.44 * 24 * 60 * 60 * 1000)) % 12;

        if (years > 0) {
            return `${years} năm ${months} tháng`;
        }
        return `${months} tháng`;
    },

    /**
     * Render video card
     * @param {Object} video - Video data
     * @returns {string} HTML string
     */
    renderVideoCard(video) {
        const snippet = video.snippet;
        const videoId = video.contentDetails?.videoId || video.id;

        const thumbnail = snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url;
        const title = snippet.title || 'Untitled';
        // Escape quotes for safe usage in onclick
        const safeTitle = title.replace(/'/g, "\\'").replace(/"/g, '&quot;');

        const views = YouTubeAPI.formatCount(video.statistics?.viewCount);
        const duration = YouTubeAPI.parseDuration(video.duration);
        const publishedAt = YouTubeAPI.parseRelativeTime(snippet.publishedAt);

        return `
            <div class="video-card">
                <div class="video-thumbnail" onclick="window.open('https://www.youtube.com/watch?v=${videoId}', '_blank')">
                    <img src="${thumbnail}" alt="${title}" loading="lazy">
                    ${duration ? `<span class="video-duration">${duration}</span>` : ''}
                </div>
                <div class="video-info">
                    <h4 class="video-title" onclick="window.open('https://www.youtube.com/watch?v=${videoId}', '_blank')">${title}</h4>
                    <div class="video-meta">
                        <span>${views} ${i18n.t('views')}</span>
                        <span>•</span>
                        <span>${publishedAt}</span>
                    </div>
                    
                    <button class="btn-smart-clone" 
                            onclick="event.stopPropagation(); AIGeneratorModule.prefillAndGenerate('${safeTitle}')"
                            title="Tạo ý tưởng video mới dựa trên video này">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                        </svg>
                        <span>Tạo video tương tự</span>
                    </button>
                    
                    <style>
                    .btn-smart-clone {
                        margin-top: 0.75rem;
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                        padding: 0.4rem 0.8rem;
                        background: rgba(99, 102, 241, 0.1);
                        color: var(--primary);
                        border: 1px solid rgba(99, 102, 241, 0.2);
                        border-radius: 0.375rem;
                        font-size: 0.75rem;
                        font-weight: 500;
                        cursor: pointer;
                        width: 100%;
                        justify-content: center;
                        transition: all 0.2s;
                    }
                    .btn-smart-clone:hover {
                        background: var(--primary);
                        color: white;
                    }
                    .btn-smart-clone svg {
                        width: 14px;
                        height: 14px;
                    }
                    </style>
                </div>
            </div>
        `;
    }
};
