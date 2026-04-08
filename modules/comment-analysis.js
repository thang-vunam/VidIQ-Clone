/**
 * VidIQ Clone - Comment Analysis Module
 * Reads, analyzes and extracts insights from YouTube video comments
 */

const CommentAnalysisModule = {
    // Vietnamese + English sentiment lexicons
    POSITIVE_WORDS: new Set([
        // Vietnamese
        'tuyệt vời', 'hay', 'xuất sắc', 'tốt', 'đẹp', 'giỏi', 'thích', 'yêu', 'cảm ơn',
        'thank', 'cám ơn', 'tuyệt', 'siêu', 'pro', 'chất', 'đỉnh', 'bổ ích', 'hữu ích',
        'xịn', 'ghê', 'quá đã', 'ủng hộ', 'subscribe', 'sub', 'like', 'love', 'amazing',
        'perfect', 'nice', 'cool', 'great', 'wonderful', 'fantastic', 'awesome', 'excellent',
        'helpful', 'useful', 'best', 'beautiful', '❤️', '👍', '🔥', '💯', '🙏', '😍',
        'dễ hiểu', 'dễ thương', 'chúc mừng', 'hay quá', 'quá hay', 'rất hay', 'tuyệt quá',
        'good', 'thanks', 'brilliant', 'impressive', 'recommend', 'informative', 'well done',
        'bravo', 'respect', 'inspiring', 'masterpiece', 'legend', 'goat'
    ]),

    NEGATIVE_WORDS: new Set([
        // Vietnamese
        'tệ', 'dở', 'chán', 'buồn', 'khó chịu', 'ghét', 'xấu', 'kém', 'sai', 'nhảm',
        'nhàm', 'lừa đảo', 'scam', 'clickbait', 'spam', 'fake', 'dislike', 'unsubscribe',
        'thất vọng', 'tồi', 'rác', 'phí thời gian', 'vô nghĩa', 'nhạt', 'cũ', 'copy',
        'đạo', 'ăn cắp', 'bad', 'terrible', 'awful', 'worst', 'hate', 'boring', 'cringe',
        'useless', 'waste', 'disappointing', 'trash', 'garbage', '👎', '😡', '🤮', '💩',
        'ngu', 'dốt', 'lỗi', 'lag', 'bug', 'hư', 'hỏng', 'khó', 'confused'
    ]),

    // Patterns for detecting questions, needs, pain points
    QUESTION_PATTERNS_VI: [
        /làm sao/i, /như thế nào/i, /tại sao/i, /vì sao/i, /bằng cách nào/i,
        /có ai biết/i, /ai biết/i, /ở đâu/i, /bao giờ/i, /khi nào/i,
        /cái gì/i, /là gì/i, /gì vậy/i, /hả\b/i, /vậy\?/i, /không\?/i,
        /cho hỏi/i, /xin hỏi/i, /hỏi\b/i, /giúp mình/i, /giúp em/i,
        /chỉ mình/i, /chỉ em/i, /dạy mình/i, /hướng dẫn/i
    ],
    QUESTION_PATTERNS_EN: [
        /how (to|do|can|does|did|is|are|was|were|should|would|could)/i,
        /what (is|are|was|were|does|do|should|would|could)/i,
        /where (can|do|is|are|to)/i, /when (will|does|do|is|can)/i,
        /why (does|do|is|are|did|can|won't|isn't)/i, /can (you|i|we|someone)/i,
        /does anyone/i, /anyone know/i, /\?$/
    ],

    PAIN_PATTERNS_VI: [
        /không được/i, /không hoạt động/i, /bị lỗi/i, /bị sai/i, /bị hỏng/i,
        /thất bại/i, /thất vọng/i, /chán quá/i, /khó quá/i, /không hiểu/i,
        /mệt quá/i, /áp lực/i, /lo lắng/i, /sợ/i, /buồn quá/i,
        /vấn đề/i, /phiền/i, /rắc rối/i, /khó khăn/i, /trở ngại/i,
        /tốn tiền/i, /đắt quá/i, /không đủ/i, /thiếu/i, /cần thêm/i
    ],
    PAIN_PATTERNS_EN: [
        /doesn't work/i, /not working/i, /broken/i, /failed/i, /can't figure/i,
        /struggling/i, /frustrated/i, /disappointed/i, /problem/i, /issue/i,
        /too expensive/i, /waste of/i, /don't understand/i, /confused/i,
        /need help/i, /stuck/i, /giving up/i, /impossible/i, /hate this/i
    ],

    WISH_PATTERNS_VI: [
        /nên làm/i, /nên thêm/i, /muốn xem/i, /mong (anh|chị|bạn|ad)/i,
        /ước gì/i, /giá mà/i, /làm thêm/i, /ra thêm/i, /quay thêm/i,
        /tiếp đi/i, /phần (2|3|tiếp|sau)/i, /có thêm/i, /cần thêm/i,
        /video về/i, /làm video/i, /review/i, /hướng dẫn thêm/i
    ],
    WISH_PATTERNS_EN: [
        /you should/i, /please make/i, /can you do/i, /would love to see/i,
        /want to see/i, /more (videos|content|of this)/i, /part (2|3|two|three)/i,
        /next video/i, /please cover/i, /request/i, /suggestion/i,
        /tutorial on/i, /review of/i, /talk about/i
    ],

    STOP_WORDS: new Set([
        'và', 'của', 'cho', 'với', 'trong', 'từ', 'đến', 'này', 'là', 'có', 'được',
        'không', 'những', 'một', 'các', 'hay', 'hoặc', 'khi', 'thì', 'mà', 'nhưng',
        'về', 'theo', 'như', 'để', 'tại', 'bởi', 'vì', 'nếu', 'sẽ', 'đã', 'đang',
        'cũng', 'rất', 'quá', 'nên', 'phải', 'ơi', 'ạ', 'nhé', 'nha', 'luôn', 'lắm',
        'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
        'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
        'should', 'may', 'might', 'shall', 'can', 'to', 'of', 'in', 'for',
        'on', 'with', 'at', 'by', 'from', 'or', 'and', 'not', 'no', 'but',
        'it', 'its', 'my', 'your', 'his', 'her', 'our', 'their', 'this', 'that',
        'i', 'me', 'we', 'you', 'he', 'she', 'they', 'so', 'up', 'out', 'just',
        'video', 'channel', 'kênh', 'anh', 'chị', 'em', 'mình', 'bạn'
    ]),

    init() {
        this.bindEvents();
    },

    bindEvents() {
        const analyzeBtn = document.getElementById('analyzeCommentsBtn');
        const videoInput = document.getElementById('commentVideoInput');

        if (analyzeBtn) {
            analyzeBtn.addEventListener('click', () => this.analyze());
        }
        if (videoInput) {
            videoInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.analyze();
            });
        }
    },

    async analyze() {
        const input = document.getElementById('commentVideoInput');
        const resultsContainer = document.getElementById('commentResults');
        const maxCommentsSelect = document.getElementById('commentMaxResults');
        const sortOrder = document.getElementById('commentSortOrder');

        if (!input || !resultsContainer) return;

        const videoId = YouTubeAPI.extractVideoId(input.value.trim());
        if (!videoId) {
            app.showToast('Vui lòng nhập Video URL hoặc ID', 'warning');
            return;
        }

        if (!YouTubeAPI.isConfigured()) {
            app.showToast('Vui lòng cấu hình API Key trong Settings', 'error');
            app.navigateTo('settings');
            return;
        }

        const maxComments = parseInt(maxCommentsSelect?.value || '100');
        const order = sortOrder?.value || 'relevance';

        // Show loading
        resultsContainer.innerHTML = `
            <div class="loading-state">
                <div class="spinner"></div>
                <p>Đang tải và phân tích comments...</p>
                <p style="font-size: 0.8rem; color: var(--text-muted);">Có thể mất 5-15 giây tùy số lượng comments</p>
            </div>
        `;

        try {
            // Fetch video info
            const videoData = await YouTubeAPI.getVideoDetails(videoId);
            if (!videoData.items || videoData.items.length === 0) {
                throw new Error('Không tìm thấy video');
            }
            const video = videoData.items[0];

            // Fetch comments
            const commentThreads = await YouTubeAPI.getAllVideoComments(videoId, maxComments, order);

            if (!commentThreads || commentThreads.length === 0) {
                resultsContainer.innerHTML = `
                    <div class="empty-state">
                        <h3>Không có comments</h3>
                        <p>Video này chưa có comments hoặc đã tắt comments.</p>
                    </div>
                `;
                return;
            }

            // Extract all comment texts
            const comments = commentThreads.map(thread => {
                const topComment = thread.snippet.topLevelComment.snippet;
                return {
                    text: topComment.textDisplay || topComment.textOriginal || '',
                    author: topComment.authorDisplayName,
                    authorAvatar: topComment.authorProfileImageUrl,
                    likes: parseInt(topComment.likeCount || 0),
                    publishedAt: topComment.publishedAt,
                    replyCount: thread.snippet.totalReplyCount || 0,
                    authorChannelId: topComment.authorChannelId?.value
                };
            });

            // Run all analyses
            const sentiment = this.analyzeSentiment(comments);
            const keywords = this.extractKeywords(comments);
            const topCommenters = this.getTopCommenters(comments);
            const engagement = this.analyzeEngagement(comments, video);
            const timeline = this.analyzeTimeline(comments, video);
            const painPoints = this.analyzePainPoints(comments);
            const topicSuggestions = this.generateTopicSuggestions(painPoints, keywords, video);
            const insights = this.generateInsights(sentiment, keywords, painPoints, engagement, video);

            // Render results
            this.renderResults(resultsContainer, {
                video, comments, sentiment, keywords, topCommenters,
                engagement, timeline, painPoints, topicSuggestions, insights
            });

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

    // ======================== ANALYSIS FUNCTIONS ========================

    analyzeSentiment(comments) {
        let positive = 0, negative = 0, neutral = 0;
        const positiveComments = [];
        const negativeComments = [];

        comments.forEach(c => {
            const text = c.text.toLowerCase();
            let score = 0;

            this.POSITIVE_WORDS.forEach(word => {
                if (text.includes(word)) score++;
            });
            this.NEGATIVE_WORDS.forEach(word => {
                if (text.includes(word)) score--;
            });

            if (score > 0) {
                positive++;
                if (positiveComments.length < 5) positiveComments.push(c);
            } else if (score < 0) {
                negative++;
                if (negativeComments.length < 5) negativeComments.push(c);
            } else {
                neutral++;
            }
        });

        return {
            positive, negative, neutral,
            total: comments.length,
            positivePercent: ((positive / comments.length) * 100).toFixed(1),
            negativePercent: ((negative / comments.length) * 100).toFixed(1),
            neutralPercent: ((neutral / comments.length) * 100).toFixed(1),
            positiveComments,
            negativeComments
        };
    },

    extractKeywords(comments) {
        const wordCount = {};

        comments.forEach(c => {
            const text = c.text.toLowerCase()
                .replace(/https?:\/\/\S+/g, '')
                .replace(/[^\w\sàáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();

            const words = text.split(' ').filter(w => w.length > 2 && !this.STOP_WORDS.has(w));

            words.forEach(word => {
                wordCount[word] = (wordCount[word] || 0) + 1;
            });

            // 2-word phrases
            for (let i = 0; i < words.length - 1; i++) {
                const phrase = `${words[i]} ${words[i + 1]}`;
                if (!this.STOP_WORDS.has(words[i]) && !this.STOP_WORDS.has(words[i + 1])) {
                    wordCount[phrase] = (wordCount[phrase] || 0) + 1;
                }
            }
        });

        return Object.entries(wordCount)
            .filter(([_, count]) => count >= 2)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 25)
            .map(([word, count]) => ({ word, count }));
    },

    getTopCommenters(comments) {
        const authors = {};

        comments.forEach(c => {
            if (!authors[c.author]) {
                authors[c.author] = {
                    name: c.author,
                    avatar: c.authorAvatar,
                    channelId: c.authorChannelId,
                    count: 0,
                    totalLikes: 0,
                    totalReplies: 0
                };
            }
            authors[c.author].count++;
            authors[c.author].totalLikes += c.likes;
            authors[c.author].totalReplies += c.replyCount;
        });

        return Object.values(authors)
            .sort((a, b) => (b.count * 10 + b.totalLikes) - (a.count * 10 + a.totalLikes))
            .slice(0, 10);
    },

    analyzeEngagement(comments, video) {
        const totalLikes = comments.reduce((sum, c) => sum + c.likes, 0);
        const totalReplies = comments.reduce((sum, c) => sum + c.replyCount, 0);
        const commentsWithReplies = comments.filter(c => c.replyCount > 0).length;
        const commentsWithLikes = comments.filter(c => c.likes > 0).length;
        const maxLikes = Math.max(...comments.map(c => c.likes));
        const avgLikes = (totalLikes / comments.length).toFixed(1);

        const videoViews = parseInt(video.statistics?.viewCount || 0);
        const videoComments = parseInt(video.statistics?.commentCount || 0);
        const commentRate = videoViews > 0 ? ((videoComments / videoViews) * 100).toFixed(3) : 0;

        return {
            totalLikes,
            totalReplies,
            avgLikes,
            maxLikes,
            commentsWithReplies,
            commentsWithLikes,
            replyRate: ((commentsWithReplies / comments.length) * 100).toFixed(1),
            commentRate,
            totalVideoComments: videoComments,
            analyzed: comments.length
        };
    },

    analyzeTimeline(comments, video) {
        const publishDate = new Date(video.snippet.publishedAt);
        const now = new Date();
        const totalHours = (now - publishDate) / (1000 * 60 * 60);

        // Group into time buckets
        const buckets = {};
        const bucketLabels = [];

        if (totalHours <= 48) {
            // Bucket by hour
            comments.forEach(c => {
                const d = new Date(c.publishedAt);
                const hours = Math.floor((d - publishDate) / (1000 * 60 * 60));
                const key = `${hours}h`;
                buckets[key] = (buckets[key] || 0) + 1;
            });
        } else if (totalHours <= 720) {
            // Bucket by day
            comments.forEach(c => {
                const d = new Date(c.publishedAt);
                const days = Math.floor((d - publishDate) / (1000 * 60 * 60 * 24));
                const key = `Ngày ${days + 1}`;
                buckets[key] = (buckets[key] || 0) + 1;
            });
        } else {
            // Bucket by week
            comments.forEach(c => {
                const d = new Date(c.publishedAt);
                const weeks = Math.floor((d - publishDate) / (1000 * 60 * 60 * 24 * 7));
                const key = `Tuần ${weeks + 1}`;
                buckets[key] = (buckets[key] || 0) + 1;
            });
        }

        // Sort by time and limit to 12 buckets
        const sortedKeys = Object.keys(buckets).sort((a, b) => {
            const numA = parseInt(a.replace(/\D/g, ''));
            const numB = parseInt(b.replace(/\D/g, ''));
            return numA - numB;
        }).slice(0, 12);

        return sortedKeys.map(key => ({
            label: key,
            count: buckets[key]
        }));
    },

    analyzePainPoints(comments) {
        const questions = [];
        const painPoints = [];
        const wishes = [];

        comments.forEach(c => {
            const text = c.text;
            const textLower = text.toLowerCase();

            // Check for questions
            const isQuestion = [...this.QUESTION_PATTERNS_VI, ...this.QUESTION_PATTERNS_EN]
                .some(p => p.test(text));
            if (isQuestion) {
                questions.push({ text: c.text, author: c.author, likes: c.likes });
            }

            // Check for pain points / complaints
            const isPain = [...this.PAIN_PATTERNS_VI, ...this.PAIN_PATTERNS_EN]
                .some(p => p.test(text));
            if (isPain) {
                painPoints.push({ text: c.text, author: c.author, likes: c.likes });
            }

            // Check for wishes / requests
            const isWish = [...this.WISH_PATTERNS_VI, ...this.WISH_PATTERNS_EN]
                .some(p => p.test(text));
            if (isWish) {
                wishes.push({ text: c.text, author: c.author, likes: c.likes });
            }
        });

        // Sort by likes (most liked = most agreed-upon)
        questions.sort((a, b) => b.likes - a.likes);
        painPoints.sort((a, b) => b.likes - a.likes);
        wishes.sort((a, b) => b.likes - a.likes);

        return {
            questions: questions.slice(0, 10),
            painPoints: painPoints.slice(0, 10),
            wishes: wishes.slice(0, 10),
            totalQuestions: questions.length,
            totalPainPoints: painPoints.length,
            totalWishes: wishes.length
        };
    },

    generateInsights(sentiment, keywords, painPoints, engagement, video) {
        const insights = [];

        // Sentiment insights
        const posPercent = parseFloat(sentiment.positivePercent);
        const negPercent = parseFloat(sentiment.negativePercent);

        if (posPercent >= 60) {
            insights.push({
                type: 'success',
                icon: '🎉',
                title: 'Cộng đồng rất tích cực',
                desc: `${posPercent}% comments mang tính tích cực. Đây là dấu hiệu content chất lượng cao.`
            });
        } else if (negPercent >= 30) {
            insights.push({
                type: 'warning',
                icon: '⚠️',
                title: 'Nhiều phản hồi tiêu cực',
                desc: `${negPercent}% comments tiêu cực. Cần xem lại nội dung hoặc giải đáp thắc mắc viewers.`
            });
        }

        // Pain points insights
        if (painPoints.totalQuestions >= 5) {
            insights.push({
                type: 'idea',
                icon: '❓',
                title: `${painPoints.totalQuestions} câu hỏi từ viewers`,
                desc: 'Viewers đang cần thêm thông tin. Đây là cơ hội để làm video giải đáp hoặc phần tiếp theo!'
            });
        }

        if (painPoints.totalPainPoints >= 3) {
            insights.push({
                type: 'warning',
                icon: '😣',
                title: `${painPoints.totalPainPoints} nỗi đau được nhắc đến`,
                desc: 'Viewers đang gặp khó khăn. Hãy làm video giải quyết vấn đề này — sẽ rất được quan tâm!'
            });
        }

        if (painPoints.totalWishes >= 3) {
            insights.push({
                type: 'idea',
                icon: '🌟',
                title: `${painPoints.totalWishes} yêu cầu / mong muốn`,
                desc: 'Viewers muốn xem thêm nội dung liên quan. Đây là ý tưởng video tiếp theo!'
            });
        }

        // Engagement insights
        const avgLikes = parseFloat(engagement.avgLikes);
        if (avgLikes >= 5) {
            insights.push({
                type: 'success',
                icon: '👍',
                title: 'Engagement comments cao',
                desc: `Trung bình ${avgLikes} likes/comment — community rất active.`
            });
        }

        // Keyword-based content ideas
        if (keywords.length >= 5) {
            const topKeywords = keywords.slice(0, 5).map(k => k.word).join(', ');
            insights.push({
                type: 'idea',
                icon: '💡',
                title: 'Gợi ý content từ keywords',
                desc: `Top keywords: ${topKeywords}. Cân nhắc tạo video deep-dive về các chủ đề này.`
            });
        }

        return insights;
    },

    /**
     * Generate video topic suggestions from pain points, wishes, questions & keywords
     */
    generateTopicSuggestions(painPoints, keywords, video) {
        const suggestions = [];
        const videoTitle = video.snippet?.title || '';
        const videoCategory = video.snippet?.categoryId || '';

        // --- 1. From Questions: FAQ / Tutorial topics ---
        const questionThemes = this.clusterTexts(painPoints.questions.map(q => q.text));
        questionThemes.forEach(theme => {
            const avgLikes = theme.items.reduce((s, q) => {
                const match = painPoints.questions.find(pq => pq.text === q);
                return s + (match?.likes || 0);
            }, 0) / theme.items.length;

            suggestions.push({
                title: `Giải đáp: ${theme.label}`,
                description: `${theme.items.length} viewers hỏi về chủ đề này. Comment tiêu biểu: "${theme.items[0].substring(0, 80)}..."`,
                format: 'Q&A / Tutorial',
                formatIcon: '🎓',
                source: 'question',
                priority: Math.round(theme.items.length * 10 + avgLikes * 2),
                sampleComments: theme.items.slice(0, 3)
            });
        });

        // --- 2. From Pain Points: Problem-solving / How-to topics ---
        const painThemes = this.clusterTexts(painPoints.painPoints.map(p => p.text));
        painThemes.forEach(theme => {
            const avgLikes = theme.items.reduce((s, p) => {
                const match = painPoints.painPoints.find(pp => pp.text === p);
                return s + (match?.likes || 0);
            }, 0) / theme.items.length;

            suggestions.push({
                title: `Giải quyết: ${theme.label}`,
                description: `${theme.items.length} viewers gặp vấn đề này. Đây là cơ hội lớn để tạo video hướng dẫn giải quyết!`,
                format: 'Hướng dẫn giải quyết',
                formatIcon: '🔧',
                source: 'pain',
                priority: Math.round(theme.items.length * 12 + avgLikes * 3),
                sampleComments: theme.items.slice(0, 3)
            });
        });

        // --- 3. From Wishes: Direct requests from viewers ---
        const wishThemes = this.clusterTexts(painPoints.wishes.map(w => w.text));
        wishThemes.forEach(theme => {
            const avgLikes = theme.items.reduce((s, w) => {
                const match = painPoints.wishes.find(pw => pw.text === w);
                return s + (match?.likes || 0);
            }, 0) / theme.items.length;

            suggestions.push({
                title: `Theo yêu cầu: ${theme.label}`,
                description: `${theme.items.length} viewers yêu cầu nội dung này. Viewer đã nói rõ họ muốn xem gì!`,
                format: 'Nội dung yêu cầu',
                formatIcon: '🌟',
                source: 'wish',
                priority: Math.round(theme.items.length * 15 + avgLikes * 3),
                sampleComments: theme.items.slice(0, 3)
            });
        });

        // --- 4. From Top Keywords: Deep-dive content ---
        if (keywords.length >= 5) {
            const topKws = keywords.slice(0, 8);
            // Group high-frequency keywords into topic ideas
            const kwGroups = [];
            const used = new Set();
            topKws.forEach(kw => {
                if (used.has(kw.word)) return;
                const related = topKws.filter(k =>
                    !used.has(k.word) && (
                        k.word.includes(kw.word) || kw.word.includes(k.word) ||
                        k.word.split(' ').some(w => kw.word.split(' ').includes(w))
                    )
                );
                if (related.length > 0) {
                    related.forEach(r => used.add(r.word));
                    kwGroups.push({
                        words: related.map(r => r.word),
                        totalCount: related.reduce((s, r) => s + r.count, 0)
                    });
                }
            });

            kwGroups.slice(0, 3).forEach(group => {
                suggestions.push({
                    title: `Deep-dive: ${group.words.slice(0, 3).join(', ')}`,
                    description: `Keywords xuất hiện ${group.totalCount} lần trong comments. Viewers rất quan tâm đến chủ đề này.`,
                    format: 'Deep-dive / Phân tích',
                    formatIcon: '🔍',
                    source: 'keyword',
                    priority: Math.round(group.totalCount * 5),
                    sampleComments: []
                });
            });
        }

        // --- 5. Continuation / Series suggestion ---
        if (painPoints.totalWishes >= 2 || painPoints.totalQuestions >= 5) {
            suggestions.push({
                title: `Phần tiếp theo: ${videoTitle.substring(0, 50)}`,
                description: `Có ${painPoints.totalQuestions} câu hỏi và ${painPoints.totalWishes} yêu cầu — viewers muốn xem phần tiếp theo hoặc nội dung mở rộng!`,
                format: 'Series / Phần tiếp',
                formatIcon: '🎬',
                source: 'series',
                priority: Math.round((painPoints.totalQuestions + painPoints.totalWishes) * 8),
                sampleComments: []
            });
        }

        // Sort by priority & limit
        suggestions.sort((a, b) => b.priority - a.priority);
        return suggestions.slice(0, 8);
    },

    /**
     * Simple text clustering by extracting key phrases and grouping similar texts
     */
    clusterTexts(texts) {
        if (!texts || texts.length === 0) return [];

        const clusters = [];
        const assigned = new Set();

        texts.forEach((text, idx) => {
            if (assigned.has(idx)) return;

            const cluster = [text];
            assigned.add(idx);

            // Extract significant words from this text
            const words = text.toLowerCase()
                .replace(/[^\w\sàáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/g, ' ')
                .split(/\s+/)
                .filter(w => w.length > 2 && !this.STOP_WORDS.has(w));

            // Find similar texts
            texts.forEach((other, otherIdx) => {
                if (assigned.has(otherIdx)) return;
                const otherWords = other.toLowerCase()
                    .replace(/[^\w\sàáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/g, ' ')
                    .split(/\s+/)
                    .filter(w => w.length > 2 && !this.STOP_WORDS.has(w));

                const overlap = words.filter(w => otherWords.includes(w)).length;
                const similarity = Math.min(words.length, otherWords.length) > 0
                    ? overlap / Math.min(words.length, otherWords.length) : 0;

                if (similarity >= 0.3) {
                    cluster.push(other);
                    assigned.add(otherIdx);
                }
            });

            // Generate label from most frequent significant words
            const allWords = cluster.join(' ').toLowerCase()
                .replace(/[^\w\sàáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/g, ' ')
                .split(/\s+/)
                .filter(w => w.length > 2 && !this.STOP_WORDS.has(w));
            const freq = {};
            allWords.forEach(w => freq[w] = (freq[w] || 0) + 1);
            const topWords = Object.entries(freq)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 4)
                .map(([w]) => w);

            const label = topWords.length > 0
                ? topWords.join(' ').replace(/^./, c => c.toUpperCase())
                : text.substring(0, 40);

            clusters.push({ label, items: cluster });
        });

        // Return clusters with at least 1 item, sorted by size
        return clusters.sort((a, b) => b.items.length - a.items.length).slice(0, 4);
    },

    // ======================== RENDER FUNCTIONS ========================

    renderResults(container, data) {
        const { video, comments, sentiment, keywords, topCommenters, engagement, timeline, painPoints, topicSuggestions, insights } = data;

        const thumbnail = video.snippet.thumbnails?.medium?.url;
        const title = video.snippet.title;
        const views = YouTubeAPI.formatCount(video.statistics?.viewCount);
        const likes = YouTubeAPI.formatCount(video.statistics?.likeCount);

        container.innerHTML = `
            <!-- Video Info Header -->
            <div class="ca-video-header glass-card">
                <img src="${thumbnail}" alt="${title}" class="ca-thumbnail">
                <div class="ca-video-info">
                    <h3 class="ca-video-title">${title}</h3>
                    <div class="ca-video-meta">
                        <span>👁️ ${views} views</span>
                        <span>👍 ${likes} likes</span>
                        <span>💬 ${YouTubeAPI.formatCount(video.statistics?.commentCount)} comments</span>
                        <span>📊 Phân tích ${comments.length} comments</span>
                    </div>
                </div>
            </div>

            <!-- Summary Cards -->
            <div class="ca-summary-grid">
                <div class="ca-summary-card ca-positive">
                    <div class="ca-summary-value">${sentiment.positivePercent}%</div>
                    <div class="ca-summary-label">😊 Tích cực</div>
                    <div class="ca-summary-count">${sentiment.positive} comments</div>
                </div>
                <div class="ca-summary-card ca-neutral">
                    <div class="ca-summary-value">${sentiment.neutralPercent}%</div>
                    <div class="ca-summary-label">😐 Trung tính</div>
                    <div class="ca-summary-count">${sentiment.neutral} comments</div>
                </div>
                <div class="ca-summary-card ca-negative">
                    <div class="ca-summary-value">${sentiment.negativePercent}%</div>
                    <div class="ca-summary-label">😞 Tiêu cực</div>
                    <div class="ca-summary-count">${sentiment.negative} comments</div>
                </div>
                <div class="ca-summary-card ca-engagement">
                    <div class="ca-summary-value">${engagement.avgLikes}</div>
                    <div class="ca-summary-label">👍 Likes/Comment</div>
                    <div class="ca-summary-count">${engagement.replyRate}% có reply</div>
                </div>
            </div>

            <!-- Sentiment Bar -->
            <div class="glass-card ca-section">
                <h3>📊 Phân bổ Sentiment</h3>
                <div class="ca-sentiment-bar">
                    <div class="ca-bar-positive" style="width: ${sentiment.positivePercent}%" title="Tích cực: ${sentiment.positivePercent}%"></div>
                    <div class="ca-bar-neutral" style="width: ${sentiment.neutralPercent}%" title="Trung tính: ${sentiment.neutralPercent}%"></div>
                    <div class="ca-bar-negative" style="width: ${sentiment.negativePercent}%" title="Tiêu cực: ${sentiment.negativePercent}%"></div>
                </div>
                <div class="ca-sentiment-legend">
                    <span><span class="ca-dot ca-dot-positive"></span> Tích cực (${sentiment.positivePercent}%)</span>
                    <span><span class="ca-dot ca-dot-neutral"></span> Trung tính (${sentiment.neutralPercent}%)</span>
                    <span><span class="ca-dot ca-dot-negative"></span> Tiêu cực (${sentiment.negativePercent}%)</span>
                </div>
            </div>

            <!-- 🔥 PAIN POINTS & NEEDS -->
            <div class="glass-card ca-section ca-pain-section">
                <h3>🔥 Nhu cầu & Nỗi đau của Viewers</h3>
                <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 1rem;">
                    Phân tích tự động những gì viewers muốn biết, khó khăn gặp phải, và yêu cầu cho content tiếp theo.
                </p>

                <div class="ca-pain-tabs">
                    <button class="ca-pain-tab active" data-pain-tab="questions">
                        ❓ Câu hỏi <span class="ca-pain-badge">${painPoints.totalQuestions}</span>
                    </button>
                    <button class="ca-pain-tab" data-pain-tab="pains">
                        😣 Nỗi đau <span class="ca-pain-badge">${painPoints.totalPainPoints}</span>
                    </button>
                    <button class="ca-pain-tab" data-pain-tab="wishes">
                        🌟 Mong muốn <span class="ca-pain-badge">${painPoints.totalWishes}</span>
                    </button>
                </div>

                <div class="ca-pain-panel active" id="ca-pain-questions">
                    ${painPoints.questions.length > 0 ? painPoints.questions.map(q => `
                        <div class="ca-pain-item">
                            <div class="ca-pain-text">${this.escapeHtml(q.text.substring(0, 200))}${q.text.length > 200 ? '...' : ''}</div>
                            <div class="ca-pain-meta">
                                <span>👤 ${this.escapeHtml(q.author)}</span>
                                ${q.likes > 0 ? `<span>👍 ${q.likes}</span>` : ''}
                            </div>
                        </div>
                    `).join('') : '<p style="color: var(--text-muted); text-align: center; padding: 1rem;">Không phát hiện câu hỏi nào</p>'}
                </div>

                <div class="ca-pain-panel" id="ca-pain-pains">
                    ${painPoints.painPoints.length > 0 ? painPoints.painPoints.map(p => `
                        <div class="ca-pain-item ca-pain-negative">
                            <div class="ca-pain-text">${this.escapeHtml(p.text.substring(0, 200))}${p.text.length > 200 ? '...' : ''}</div>
                            <div class="ca-pain-meta">
                                <span>👤 ${this.escapeHtml(p.author)}</span>
                                ${p.likes > 0 ? `<span>👍 ${p.likes}</span>` : ''}
                            </div>
                        </div>
                    `).join('') : '<p style="color: var(--text-muted); text-align: center; padding: 1rem;">Không phát hiện nỗi đau nào</p>'}
                </div>

                <div class="ca-pain-panel" id="ca-pain-wishes">
                    ${painPoints.wishes.length > 0 ? painPoints.wishes.map(w => `
                        <div class="ca-pain-item ca-pain-wish">
                            <div class="ca-pain-text">${this.escapeHtml(w.text.substring(0, 200))}${w.text.length > 200 ? '...' : ''}</div>
                            <div class="ca-pain-meta">
                                <span>👤 ${this.escapeHtml(w.author)}</span>
                                ${w.likes > 0 ? `<span>👍 ${w.likes}</span>` : ''}
                            </div>
                        </div>
                    `).join('') : '<p style="color: var(--text-muted); text-align: center; padding: 1rem;">Không phát hiện mong muốn nào</p>'}
                </div>
            </div>

            <!-- 🎯 VIDEO TOPIC SUGGESTIONS -->
            ${topicSuggestions && topicSuggestions.length > 0 ? `
                <div class="glass-card ca-section ca-topics-section">
                    <h3>🎯 Đề xuất Chủ đề Video tiếp theo</h3>
                    <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 1rem;">
                        Dựa trên nhu cầu, nỗi đau và mong muốn của viewers — đây là những chủ đề có tiềm năng cao nhất.
                    </p>
                    <div class="ca-topics-grid">
                        ${topicSuggestions.map((topic, i) => `
                            <div class="ca-topic-card ca-topic-${topic.source}">
                                <div class="ca-topic-header">
                                    <span class="ca-topic-rank">#${i + 1}</span>
                                    <span class="ca-topic-format">${topic.formatIcon} ${topic.format}</span>
                                    <span class="ca-topic-priority" title="Điểm ưu tiên">
                                        🔥 ${topic.priority}
                                    </span>
                                </div>
                                <h4 class="ca-topic-title">${this.escapeHtml(topic.title)}</h4>
                                <p class="ca-topic-desc">${this.escapeHtml(topic.description)}</p>
                                ${topic.sampleComments && topic.sampleComments.length > 0 ? `
                                    <div class="ca-topic-samples">
                                        <div class="ca-topic-samples-label">💬 Comments liên quan:</div>
                                        ${topic.sampleComments.map(c => `
                                            <div class="ca-topic-sample">"${this.escapeHtml(c.substring(0, 100))}${c.length > 100 ? '...' : ''}"</div>
                                        `).join('')}
                                    </div>
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            <!-- Actionable Insights -->
            ${insights.length > 0 ? `
                <div class="glass-card ca-section ca-insights-section">
                    <h3>💎 Actionable Insights</h3>
                    <div class="ca-insights-grid">
                        ${insights.map(insight => `
                            <div class="ca-insight-card ca-insight-${insight.type}">
                                <div class="ca-insight-icon">${insight.icon}</div>
                                <div class="ca-insight-content">
                                    <strong>${insight.title}</strong>
                                    <p>${insight.desc}</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            <!-- Keyword Cloud -->
            <div class="glass-card ca-section">
                <h3>🏷️ Top Keywords trong Comments</h3>
                <div class="ca-keyword-cloud">
                    ${keywords.map((k, i) => {
            const size = Math.max(0.75, Math.min(1.8, 0.75 + (k.count / (keywords[0]?.count || 1)) * 1.05));
            const opacity = Math.max(0.5, 1 - i * 0.03);
            return `<span class="ca-keyword" style="font-size: ${size}rem; opacity: ${opacity};">${k.word} <sup>${k.count}</sup></span>`;
        }).join('')}
                </div>
            </div>

            <!-- Timeline Chart -->
            ${timeline.length > 0 ? `
                <div class="glass-card ca-section">
                    <h3>📅 Comment Timeline</h3>
                    <div class="ca-timeline-chart">
                        ${timeline.map(t => {
            const maxCount = Math.max(...timeline.map(x => x.count));
            const height = maxCount > 0 ? (t.count / maxCount * 100) : 0;
            return `
                                <div class="ca-timeline-bar-wrapper">
                                    <div class="ca-timeline-count">${t.count}</div>
                                    <div class="ca-timeline-bar" style="height: ${Math.max(4, height)}%"></div>
                                    <div class="ca-timeline-label">${t.label}</div>
                                </div>
                            `;
        }).join('')}
                    </div>
                </div>
            ` : ''}

            <!-- Top Commenters -->
            <div class="glass-card ca-section">
                <h3>🏆 Top Commenters</h3>
                <div class="ca-commenters-list">
                    ${topCommenters.map((tc, i) => `
                        <div class="ca-commenter-item">
                            <div class="ca-commenter-rank">${i + 1}</div>
                            <img src="${tc.avatar}" alt="${this.escapeHtml(tc.name)}" class="ca-commenter-avatar">
                            <div class="ca-commenter-info">
                                <div class="ca-commenter-name">${this.escapeHtml(tc.name)}</div>
                                <div class="ca-commenter-stats">
                                    💬 ${tc.count} comments · 👍 ${tc.totalLikes} likes · ↩️ ${tc.totalReplies} replies
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Engagement Details -->
            <div class="glass-card ca-section">
                <h3>📈 Chi tiết Engagement</h3>
                <div class="ca-engagement-grid">
                    <div class="ca-eng-item">
                        <div class="ca-eng-value">${engagement.totalVideoComments.toLocaleString()}</div>
                        <div class="ca-eng-label">Tổng comments video</div>
                    </div>
                    <div class="ca-eng-item">
                        <div class="ca-eng-value">${engagement.analyzed}</div>
                        <div class="ca-eng-label">Comments phân tích</div>
                    </div>
                    <div class="ca-eng-item">
                        <div class="ca-eng-value">${engagement.totalLikes.toLocaleString()}</div>
                        <div class="ca-eng-label">Tổng likes comments</div>
                    </div>
                    <div class="ca-eng-item">
                        <div class="ca-eng-value">${engagement.maxLikes.toLocaleString()}</div>
                        <div class="ca-eng-label">Max likes 1 comment</div>
                    </div>
                    <div class="ca-eng-item">
                        <div class="ca-eng-value">${engagement.totalReplies.toLocaleString()}</div>
                        <div class="ca-eng-label">Tổng replies</div>
                    </div>
                    <div class="ca-eng-item">
                        <div class="ca-eng-value">${engagement.commentRate}%</div>
                        <div class="ca-eng-label">Tỷ lệ comment/view</div>
                    </div>
                </div>
            </div>
        `;

        // Bind pain point tab events
        this.bindPainTabs();
    },

    bindPainTabs() {
        document.querySelectorAll('.ca-pain-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.ca-pain-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.ca-pain-panel').forEach(p => p.classList.remove('active'));
                tab.classList.add('active');
                const targetId = `ca-pain-${tab.dataset.painTab}`;
                document.getElementById(targetId)?.classList.add('active');
            });
        });
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};
