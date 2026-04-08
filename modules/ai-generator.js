/**
 * VidIQ Clone - AI Generator Module
 * Generates titles, descriptions, hashtags, hooks, and full scripts
 * Uses Gemini 3 Pro API when available, falls back to templates offline
 */

const AIGeneratorModule = {
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
        document.querySelectorAll('.ai-tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });

        // Generate buttons
        document.getElementById('generateTitlesBtn')?.addEventListener('click', () => this.generateTitles());
        document.getElementById('generateDescBtn')?.addEventListener('click', () => this.generateDescription());
        document.getElementById('generateHashtagsBtn')?.addEventListener('click', () => this.generateHashtags());
        document.getElementById('generateHooksBtn')?.addEventListener('click', () => this.generateHooks());
        document.getElementById('generateScriptBtn')?.addEventListener('click', () => this.generateScript());

        // Analyze video URL button
        document.getElementById('analyzeVideoBtn')?.addEventListener('click', () => this.analyzeVideoAndGenerate());
    },

    // ════════════════════════════════════════════
    // ANALYZE VIDEO & GENERATE NEW CONTENT
    // ════════════════════════════════════════════

    async analyzeVideoAndGenerate() {
        const urlInput = document.getElementById('videoUrlInput');
        const resultDiv = document.getElementById('videoAnalysisResult');
        if (!urlInput || !resultDiv) return;

        const input = urlInput.value.trim();
        if (!input) {
            app.showToast('Vui lòng dán link video YouTube', 'warning');
            return;
        }

        // Check YouTube API
        if (!YouTubeAPI.isConfigured()) {
            app.showToast('Cần YouTube API Key để phân tích video. Vào Settings để nhập.', 'error');
            return;
        }

        // Extract video ID
        const videoId = YouTubeAPI.extractVideoId(input);
        if (!videoId) {
            app.showToast('Link video không hợp lệ. Vui lòng kiểm tra lại.', 'error');
            return;
        }

        // Show loading
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = '<div class="loading-state" style="padding: 1rem;"><div class="spinner"></div><p>🔍 Đang phân tích chuyên sâu video...</p></div>';

        try {
            // Fetch video details from YouTube API
            const videoData = await YouTubeAPI.getVideoDetails(videoId);
            const video = videoData?.items?.[0];

            if (!video) {
                resultDiv.innerHTML = '<p style="color: var(--error); font-size: 0.85rem;">❌ Không tìm thấy video. Kiểm tra lại link hoặc video có thể đã bị xóa.</p>';
                return;
            }

            const title = video.snippet?.title || '';
            const description = (video.snippet?.description || '').substring(0, 500);
            const tags = (video.snippet?.tags || []).slice(0, 15).join(', ');
            const channelTitle = video.snippet?.channelTitle || '';
            const viewCount = parseInt(video.statistics?.viewCount || 0).toLocaleString('vi-VN');
            const likeCount = parseInt(video.statistics?.likeCount || 0).toLocaleString('vi-VN');
            const commentCount = parseInt(video.statistics?.commentCount || 0).toLocaleString('vi-VN');
            const thumbnail = video.snippet?.thumbnails?.medium?.url || video.snippet?.thumbnails?.default?.url || '';
            const categoryId = video.snippet?.categoryId || '';

            this.originalVideoTitle = title;

            // Deep analysis using Gemini
            let analysisData = null;

            if (GeminiAPI.isConfigured()) {
                try {
                    const analyzePrompt = `Phân tích CHUYÊN SÂU video YouTube sau đây và trả về kết quả dưới dạng JSON.

=== THÔNG TIN VIDEO ===
Tiêu đề: "${title}"
Kênh: ${channelTitle}
Mô tả (500 ký tự đầu): "${description}"
Tags: [${tags}]
Views: ${viewCount} | Likes: ${likeCount} | Comments: ${commentCount}

=== YÊU CẦU ===
Trả về JSON với cấu trúc CHÍNH XÁC như sau (không thêm giải thích, chỉ JSON thuần):

{
  "mainTopic": "Chủ đề chính của video (1 câu ngắn, cụ thể, không chung chung)",
  "subTopics": ["Chủ đề phụ 1", "Chủ đề phụ 2", "Chủ đề phụ 3"],
  "mainKeywords": ["từ khóa chính 1", "từ khóa chính 2", "từ khóa chính 3"],
  "subKeywords": ["từ khóa phụ 1", "từ khóa phụ 2", "từ khóa phụ 3", "từ khóa phụ 4"],
  "targetAudience": "Mô tả đối tượng mục tiêu cụ thể",
  "contentAngle": "Góc khai thác nội dung (ví dụ: Listicle, How-to, Storytelling, Phản biện, Review...)",
  "suggestedNiche": "Niche/lĩnh vực phù hợp",
  "emotionalHook": "Cảm xúc chính mà video khơi gợi (tò mò, sợ hãi, hy vọng, giật mình...)",
  "contentSummary": "Tóm tắt nội dung video trong 1-2 câu dựa trên title và description"
}

QUY TẮC QUAN TRỌNG:
1. mainTopic phải CỤ THỂ cho video này, KHÔNG ĐƯỢC trả về chủ đề chung chung hoặc chỉ 1-2 từ
2. mainKeywords là từ khóa mà người xem sẽ search trên YouTube để tìm video này
3. subKeywords là từ khóa liên quan mở rộng
4. Tất cả phải bằng tiếng Việt (trừ niche có thể dùng tiếng Anh)
5. CHỈ trả về JSON, không có text nào khác`;

                    const rawResult = await GeminiAPI.generateContent(analyzePrompt, '', {
                        temperature: 0.2,
                        maxOutputTokens: 4096,
                        useThinking: false,
                        responseMimeType: 'application/json'
                    });

                    console.log('📊 Gemini raw response length:', rawResult.length);

                    // Parse JSON from response (handle markdown code blocks)
                    let jsonStr = rawResult.trim();

                    // Remove markdown code blocks if present
                    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
                    if (jsonMatch) {
                        jsonStr = jsonMatch[1].trim();
                    }

                    // Extract JSON object
                    const jsonObjMatch = jsonStr.match(/\{[\s\S]*\}/);
                    if (jsonObjMatch) {
                        jsonStr = jsonObjMatch[0];
                    }

                    // Try to repair truncated JSON
                    try {
                        analysisData = JSON.parse(jsonStr);
                    } catch (parseErr) {
                        console.warn('⚠️ JSON parse error, attempting repair:', parseErr.message);
                        // Attempt to fix common truncation issues
                        let repaired = jsonStr;
                        // Close unclosed strings
                        const unclosedStr = repaired.match(/:\s*"[^"]*$/);
                        if (unclosedStr) repaired += '"';
                        // Close unclosed arrays
                        const openBrackets = (repaired.match(/\[/g) || []).length;
                        const closeBrackets = (repaired.match(/\]/g) || []).length;
                        for (let i = 0; i < openBrackets - closeBrackets; i++) repaired += ']';
                        // Close unclosed objects
                        const openBraces = (repaired.match(/\{/g) || []).length;
                        const closeBraces = (repaired.match(/\}/g) || []).length;
                        for (let i = 0; i < openBraces - closeBraces; i++) repaired += '}';
                        // Remove trailing comma before closing
                        repaired = repaired.replace(/,\s*([}\]])/g, '$1');

                        try {
                            analysisData = JSON.parse(repaired);
                            console.log('✅ JSON repair successful');
                        } catch (repairErr) {
                            console.warn('❌ JSON repair also failed:', repairErr.message);
                            console.log('Raw response:', rawResult.substring(0, 500));
                        }
                    }

                    // Validate and fill missing fields
                    if (analysisData) {
                        const defaults = {
                            mainTopic: title,
                            subTopics: [],
                            mainKeywords: [],
                            subKeywords: [],
                            targetAudience: 'Chưa xác định',
                            contentAngle: 'Chưa xác định',
                            suggestedNiche: 'Chưa xác định',
                            emotionalHook: 'Chưa xác định',
                            contentSummary: ''
                        };
                        for (const [key, defaultVal] of Object.entries(defaults)) {
                            if (!analysisData[key]) analysisData[key] = defaultVal;
                        }
                        console.log('✅ Deep analysis complete:', analysisData.mainTopic);
                    }
                } catch (e) {
                    console.warn('Deep analysis failed, using fallback:', e);
                    analysisData = null;
                }
            }

            // Fallback if Gemini fails or not configured
            if (!analysisData) {
                const cleanTitle = title.replace(/[^\w\sàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/gi, ' ').trim();
                analysisData = {
                    mainTopic: cleanTitle,
                    subTopics: [],
                    mainKeywords: tags ? tags.split(',').slice(0, 3).map(t => t.trim()) : [cleanTitle],
                    subKeywords: tags ? tags.split(',').slice(3, 7).map(t => t.trim()) : [],
                    targetAudience: 'Chưa xác định (cần Gemini API)',
                    contentAngle: 'Chưa xác định',
                    suggestedNiche: 'Chưa xác định',
                    emotionalHook: 'Chưa xác định',
                    contentSummary: title
                };
            }
            // Store analysis data for use by generators
            this.analysisData = analysisData;

            // Build tag badges HTML helper
            const renderTags = (items, color) => {
                if (!items || items.length === 0) return '<span style="font-size: 0.75rem; color: var(--text-muted);">—</span>';
                return items.map(item =>
                    `<span class="analysis-tag" style="font-size: 0.7rem; padding: 0.15rem 0.5rem; border-radius: 99px; background: ${color}15; color: ${color}; border: 1px solid ${color}30; white-space: nowrap;">${item}</span>`
                ).join(' ');
            };

            // Show rich analysis result
            resultDiv.innerHTML = `
                <div class="video-analysis-card" style="border-radius: 12px; overflow: hidden; border: 1px solid rgba(99, 102, 241, 0.2); background: rgba(99, 102, 241, 0.04);">
                    <!-- Video Info Header -->
                    <div style="display: flex; gap: 1rem; align-items: flex-start; padding: 1rem; background: rgba(99, 102, 241, 0.08); border-bottom: 1px solid rgba(99, 102, 241, 0.15);">
                        ${thumbnail ? `<img src="${thumbnail}" alt="" style="width: 120px; height: 68px; object-fit: cover; border-radius: 6px; flex-shrink: 0;">` : ''}
                        <div style="flex: 1; min-width: 0;">
                            <p style="font-size: 0.85rem; font-weight: 600; margin: 0 0 0.25rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${title}</p>
                            <p style="font-size: 0.75rem; color: var(--text-muted); margin: 0;">${channelTitle} • ${viewCount} views • ${likeCount} likes • ${commentCount} comments</p>
                        </div>
                    </div>

                    <!-- Deep Analysis Results -->
                    <div style="padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem;">
                        <!-- Main Topic -->
                        <div class="analysis-row">
                            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.3rem;">
                                <span style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 600; min-width: 100px;">📌 Chủ đề chính</span>
                            </div>
                            <p style="font-size: 0.9rem; color: #818cf8; font-weight: 600; margin: 0; padding-left: 0.25rem;">${analysisData.mainTopic}</p>
                        </div>

                        <!-- Sub Topics -->
                        ${analysisData.subTopics && analysisData.subTopics.length > 0 ? `
                        <div class="analysis-row">
                            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.3rem;">
                                <span style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 600; min-width: 100px;">📎 Chủ đề phụ</span>
                            </div>
                            <div style="display: flex; flex-wrap: wrap; gap: 0.35rem; padding-left: 0.25rem;">
                                ${renderTags(analysisData.subTopics, '#a78bfa')}
                            </div>
                        </div>` : ''}

                        <!-- Main Keywords -->
                        <div class="analysis-row">
                            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.3rem;">
                                <span style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 600; min-width: 100px;">🔑 Từ khóa chính</span>
                            </div>
                            <div style="display: flex; flex-wrap: wrap; gap: 0.35rem; padding-left: 0.25rem;">
                                ${renderTags(analysisData.mainKeywords, '#34d399')}
                            </div>
                        </div>

                        <!-- Sub Keywords -->
                        ${analysisData.subKeywords && analysisData.subKeywords.length > 0 ? `
                        <div class="analysis-row">
                            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.3rem;">
                                <span style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 600; min-width: 100px;">🏷️ Từ khóa phụ</span>
                            </div>
                            <div style="display: flex; flex-wrap: wrap; gap: 0.35rem; padding-left: 0.25rem;">
                                ${renderTags(analysisData.subKeywords, '#60a5fa')}
                            </div>
                        </div>` : ''}

                        <!-- Bottom row: Audience, Angle, Niche, Emotion -->
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; padding-top: 0.5rem; border-top: 1px solid rgba(255,255,255,0.06);">
                            <div class="analysis-mini">
                                <span style="font-size: 0.7rem; color: var(--text-muted);">🎯 Đối tượng</span>
                                <p style="font-size: 0.78rem; color: var(--text-primary); margin: 0.15rem 0 0;">${analysisData.targetAudience}</p>
                            </div>
                            <div class="analysis-mini">
                                <span style="font-size: 0.7rem; color: var(--text-muted);">📐 Góc khai thác</span>
                                <p style="font-size: 0.78rem; color: var(--text-primary); margin: 0.15rem 0 0;">${analysisData.contentAngle}</p>
                            </div>
                            <div class="analysis-mini">
                                <span style="font-size: 0.7rem; color: var(--text-muted);">📂 Niche</span>
                                <p style="font-size: 0.78rem; color: #fbbf24; margin: 0.15rem 0 0; font-weight: 500;">${analysisData.suggestedNiche}</p>
                            </div>
                            <div class="analysis-mini">
                                <span style="font-size: 0.7rem; color: var(--text-muted);">💡 Cảm xúc chính</span>
                                <p style="font-size: 0.78rem; color: var(--text-primary); margin: 0.15rem 0 0;">${analysisData.emotionalHook}</p>
                            </div>
                        </div>

                        <!-- Content Summary -->
                        ${analysisData.contentSummary ? `
                        <div style="padding: 0.6rem 0.75rem; background: rgba(255,255,255,0.03); border-radius: 6px; border: 1px solid rgba(255,255,255,0.06); margin-top: 0.25rem;">
                            <span style="font-size: 0.7rem; color: var(--text-muted);">📝 Tóm tắt nội dung</span>
                            <p style="font-size: 0.78rem; color: var(--text-secondary); margin: 0.2rem 0 0; line-height: 1.4;">${analysisData.contentSummary}</p>
                        </div>` : ''}
                    </div>

                    <!-- Success footer -->
                    <div style="padding: 0.6rem 1rem; background: rgba(34, 197, 94, 0.06); border-top: 1px solid rgba(34, 197, 94, 0.15);">
                        <p style="font-size: 0.78rem; color: var(--success); margin: 0;">✅ Phân tích xong! Dữ liệu đã được điền vào tất cả các tab. Bấm "Generate" để tạo nội dung.</p>
                    </div>
                </div>
            `;

            // Smart populate tabs with richer context
            const mainTopic = analysisData.mainTopic;
            const allKeywords = [...(analysisData.mainKeywords || []), ...(analysisData.subKeywords || [])];
            const keywordStr = allKeywords.join(', ');

            const tabValues = {
                titleTopic: mainTopic,
                descTopic: mainTopic,
                hashtagTopic: `${mainTopic} | Từ khóa: ${keywordStr}`,
                hookTopic: mainTopic,
                scriptTopic: mainTopic
            };

            for (const [id, value] of Object.entries(tabValues)) {
                const el = document.getElementById(id);
                if (el) el.value = value;
            }

            // Auto-generate titles
            this.generateTitles();

            app.showToast(`✅ Phân tích chuyên sâu: "${mainTopic.substring(0, 40)}..."`, 'success');

        } catch (error) {
            resultDiv.innerHTML = `<p style="color: var(--error); font-size: 0.85rem;">❌ Lỗi: ${error.message}</p>`;
            app.showToast(error.message, 'error');
        }
    },

    /**
     * Switch tab
     * @param {string} tabId - Tab ID
     */
    switchTab(tabId) {
        // Update tabs
        document.querySelectorAll('.ai-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabId);
        });

        // Update panels
        document.querySelectorAll('.ai-panel').forEach(panel => {
            panel.classList.toggle('active', panel.id === `ai-${tabId}`);
        });
    },

    /**
     * Pre-fill data and generate content (Called from other modules)
     * @param {string} topic - Topic or video title to generate from
     */
    prefillAndGenerate(topic) {
        if (!topic) return;

        // Switch to AI Generator page
        app.navigateTo('ai-generator');

        // Clean up topic
        let cleanTopic = topic;
        cleanTopic = cleanTopic.replace(/[\"\'\[\]]/g, '').trim();

        // Wait for page transition then populate and generate
        setTimeout(() => {
            // 1. Generate Titles first
            const titleInput = document.getElementById('titleTopic');
            if (titleInput) {
                titleInput.value = cleanTopic;
                this.generateTitles();
            }

            // 2. Pre-fill other tabs
            const descInput = document.getElementById('descTopic');
            if (descInput) descInput.value = cleanTopic;

            const hashtagInput = document.getElementById('hashtagTopic');
            if (hashtagInput) hashtagInput.value = cleanTopic;

            const hookInput = document.getElementById('hookTopic');
            if (hookInput) hookInput.value = cleanTopic;

            const scriptInput = document.getElementById('scriptTopic');
            if (scriptInput) scriptInput.value = cleanTopic;

            app.showToast(`Đang tạo ý tưởng từ: "${cleanTopic.substring(0, 30)}..."`, 'success');
        }, 500);
    },

    // ════════════════════════════════════════════
    // TITLE GENERATOR
    // ════════════════════════════════════════════

    async generateTitles() {
        const input = document.getElementById('titleTopic');
        const resultsContainer = document.getElementById('titleResults');
        if (!input || !resultsContainer) return;

        const topic = input.value.trim();
        if (!topic) {
            app.showToast('Vui lòng nhập chủ đề video', 'warning');
            return;
        }

        // Check if Gemini is available
        if (GeminiAPI.isConfigured()) {
            resultsContainer.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>🤖 AI đang tạo tiêu đề...</p></div>';
            try {
                // Build richer context from analysis data
                let contextStr = '';
                if (this.analysisData) {
                    const a = this.analysisData;
                    contextStr = `\n\n=== PHÂN TÍCH VIDEO GỐC ===
Video gốc tham khảo: "${this.originalVideoTitle || ''}"
Chủ đề phụ: ${(a.subTopics || []).join(', ')}
Từ khóa chính: ${(a.mainKeywords || []).join(', ')}
Từ khóa phụ: ${(a.subKeywords || []).join(', ')}
Đối tượng: ${a.targetAudience || ''}
Góc khai thác: ${a.contentAngle || ''}
Niche: ${a.suggestedNiche || ''}

Tạo tiêu đề MỚI về CÙNG CHỦ ĐỀ nhưng khác cách diễn đạt. Mỗi tiêu đề phải liên quan trực tiếp đến "${topic}" và phù hợp với niche "${a.suggestedNiche || ''}".`;
                } else if (this.originalVideoTitle) {
                    contextStr = `\n\nVideo gốc tham khảo: "${this.originalVideoTitle}"\nTạo tiêu đề MỚI về CÙNG CHỦ ĐỀ nhưng khác cách diễn đạt. Mỗi tiêu đề phải liên quan trực tiếp đến "${topic}".`;
                }

                const prompt = `Tạo CHÍNH XÁC 5 tiêu đề video YouTube viral cho chủ đề: "${topic}"${contextStr}\n\nYêu cầu:\n- Mỗi tiêu đề phải HOÀN CHỈNH (không bị cắt ngang)\n- Mỗi tiêu đề trên 1 dòng, đánh số 1-5\n- Tất cả phải xoay quanh chủ đề "${topic}"\n- Viết bằng tiếng Việt, gây tò mò, clickbait nhẹ`;
                const systemPrompt = GeminiAPI.getSystemPrompt('titles');
                const result = await GeminiAPI.generateContent(prompt, systemPrompt, {
                    temperature: 0.9,
                    maxOutputTokens: 2048,
                    useThinking: false
                });

                // Parse numbered lines
                const titles = result.split('\n')
                    .map(line => line.replace(/^\d+[\.)\]]\s*/, '').trim())
                    .filter(line => line.length > 5);

                this.renderResults(titles.length > 0 ? titles : [result], resultsContainer, 'title');
                app.showToast('✨ Tiêu đề đã được tạo bởi Gemini AI!', 'success');
            } catch (error) {
                app.showToast(error.message, 'error');
                // Fallback to templates
                const titles = this.generateTitleVariations(topic);
                this.renderResults(titles, resultsContainer, 'title');
            }
        } else {
            const titles = this.generateTitleVariations(topic);
            this.renderResults(titles, resultsContainer, 'title');
        }
    },

    // ════════════════════════════════════════════
    // DESCRIPTION GENERATOR
    // ════════════════════════════════════════════

    async generateDescription() {
        const input = document.getElementById('descTopic');
        const resultsContainer = document.getElementById('descResults');
        if (!input || !resultsContainer) return;

        const topic = input.value.trim();
        if (!topic) {
            app.showToast('Vui lòng nhập chủ đề video', 'warning');
            return;
        }

        if (GeminiAPI.isConfigured()) {
            resultsContainer.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>🤖 AI đang viết mô tả...</p></div>';
            try {
                const prompt = `Viết mô tả video YouTube tối ưu SEO cho chủ đề: "${topic}"`;
                const systemPrompt = GeminiAPI.getSystemPrompt('description');
                const result = await GeminiAPI.generateContent(prompt, systemPrompt, {
                    temperature: 0.8,
                    maxOutputTokens: 2048,
                    useThinking: false
                });
                this.renderResults([result], resultsContainer, 'description');
                app.showToast('✨ Mô tả đã được tạo bởi Gemini AI!', 'success');
            } catch (error) {
                app.showToast(error.message, 'error');
                const description = this.generateDescriptionTemplate(topic);
                this.renderResults([description], resultsContainer, 'description');
            }
        } else {
            const description = this.generateDescriptionTemplate(topic);
            this.renderResults([description], resultsContainer, 'description');
        }
    },

    // ════════════════════════════════════════════
    // HASHTAG GENERATOR
    // ════════════════════════════════════════════

    async generateHashtags() {
        const input = document.getElementById('hashtagTopic');
        const resultsContainer = document.getElementById('hashtagResults');
        if (!input || !resultsContainer) return;

        const topic = input.value.trim();
        if (!topic) {
            app.showToast('Vui lòng nhập chủ đề video', 'warning');
            return;
        }

        if (GeminiAPI.isConfigured()) {
            resultsContainer.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>🤖 AI đang tạo hashtags...</p></div>';
            try {
                const prompt = `Tạo hashtag YouTube tối ưu cho video về chủ đề: "${topic}"`;
                const systemPrompt = GeminiAPI.getSystemPrompt('hashtags');
                const result = await GeminiAPI.generateContent(prompt, systemPrompt, {
                    temperature: 0.7,
                    maxOutputTokens: 1024,
                    useThinking: false
                });
                this.renderResults([result], resultsContainer, 'hashtags');
                app.showToast('✨ Hashtags đã được tạo bởi Gemini AI!', 'success');
            } catch (error) {
                app.showToast(error.message, 'error');
                const hashtags = this.generateHashtagVariations(topic);
                this.renderResults([hashtags.join(' ')], resultsContainer, 'hashtags');
            }
        } else {
            const hashtags = this.generateHashtagVariations(topic);
            this.renderResults([hashtags.join(' ')], resultsContainer, 'hashtags');
        }
    },

    // ════════════════════════════════════════════
    // HOOK GENERATOR
    // ════════════════════════════════════════════

    async generateHooks() {
        const input = document.getElementById('hookTopic');
        const resultsContainer = document.getElementById('hookResults');
        if (!input || !resultsContainer) return;

        const topic = input.value.trim();
        if (!topic) {
            app.showToast('Vui lòng nhập chủ đề video', 'warning');
            return;
        }

        if (GeminiAPI.isConfigured()) {
            resultsContainer.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>🤖 AI đang tạo hooks...</p></div>';
            try {
                const prompt = `Viết 10 câu hook mở đầu video YouTube viral cho chủ đề: "${topic}"`;
                const systemPrompt = GeminiAPI.getSystemPrompt('hooks');
                const result = await GeminiAPI.generateContent(prompt, systemPrompt, {
                    temperature: 1.0,
                    maxOutputTokens: 2048,
                    useThinking: false
                });

                // Parse numbered hooks
                const hooks = result.split(/\n\d+[\.\)]/)
                    .map(h => h.trim())
                    .filter(h => h.length > 10);

                // If parsing failed, try line-by-line
                const finalHooks = hooks.length >= 5 ? hooks :
                    result.split('\n')
                        .map(line => line.replace(/^\d+[\.\)]\s*/, '').trim())
                        .filter(line => line.length > 15);

                this.renderResults(finalHooks.length > 0 ? finalHooks : [result], resultsContainer, 'hook');
                app.showToast('✨ Hooks đã được tạo bởi Gemini AI!', 'success');
            } catch (error) {
                app.showToast(error.message, 'error');
                const hooks = this.generateHookVariations(topic);
                this.renderResults(hooks, resultsContainer, 'hook');
            }
        } else {
            const hooks = this.generateHookVariations(topic);
            this.renderResults(hooks, resultsContainer, 'hook');
        }
    },

    // ════════════════════════════════════════════
    // FULL SCRIPT GENERATOR (with streaming)
    // ════════════════════════════════════════════

    async generateScript() {
        const input = document.getElementById('scriptTopic');
        const resultsContainer = document.getElementById('scriptResults');
        const styleSelect = document.getElementById('scriptStyle');
        if (!input || !resultsContainer) return;

        const topic = input.value.trim();
        if (!topic) {
            app.showToast('Vui lòng nhập chủ đề video', 'warning');
            return;
        }

        const style = styleSelect?.value || 'storytelling';
        const styleLabels = {
            'storytelling': '🗣️ Kể chuyện (Storytelling)',
            'step-by-step': '📝 Hướng dẫn (Step-by-step)',
            'myth-buster': '🛑 Phá vỡ lầm tưởng (Myth Buster)'
        };

        if (GeminiAPI.isConfigured()) {
            // Show streaming container
            resultsContainer.innerHTML = `
                <div class="glass-card" style="margin-bottom: 2rem; padding: 1.5rem; position: relative;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid rgba(255,255,255,0.1);">
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            <span class="script-style-badge" style="font-size: 0.8rem; padding: 0.25rem 0.75rem; border-radius: 99px; background: rgba(99, 102, 241, 0.2); color: #818cf8; font-weight: 600;">
                                ${styleLabels[style] || style}
                            </span>
                            <span class="gemini-badge" style="font-size: 0.75rem; padding: 0.2rem 0.6rem; border-radius: 99px; background: linear-gradient(135deg, rgba(66,133,244,0.2), rgba(219,68,55,0.2)); color: #8ab4f8; font-weight: 500;">
                                ✨ Gemini 3 Pro
                            </span>
                        </div>
                        <button class="copy-btn-manual" id="copyScriptBtn" style="background: none; border: none; color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; opacity: 0.5;" disabled>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                            Sao chép
                        </button>
                    </div>
                    <div id="scriptStreamContent" class="script-content streaming-text" style="font-family: var(--font-family); line-height: 1.8; color: var(--text-primary); min-height: 200px; max-height: 600px; overflow-y: auto;">
                        <div class="loading-state"><div class="spinner"></div><p>🤖 Gemini đang suy nghĩ và viết kịch bản...</p></div>
                    </div>
                </div>
            `;

            try {
                const streamTarget = document.getElementById('scriptStreamContent');
                const stylePromptMap = {
                    'storytelling': 'kể chuyện (storytelling)',
                    'step-by-step': 'hướng dẫn từng bước (step-by-step)',
                    'myth-buster': 'phá vỡ lầm tưởng (myth buster)'
                };

                const prompt = `Viết kịch bản video YouTube hoàn chỉnh theo phong cách ${stylePromptMap[style]} cho chủ đề: "${topic}"

Yêu cầu:
- Kịch bản phải CỤ THỂ cho chủ đề "${topic}", KHÔNG viết chung chung
- Nội dung sâu sắc, có giá trị thực sự cho người xem
- Sẵn sàng đọc ngay, KHÔNG CÓ placeholder
- Khoảng 1000-1500 từ (5-8 phút video)`;

                const systemPrompt = GeminiAPI.getSystemPrompt('script', style);

                const fullText = await GeminiAPI.streamContent(prompt, systemPrompt, streamTarget, {
                    temperature: 1.0,
                    maxOutputTokens: 8192,
                    useThinking: true,
                    thinkingBudget: 8192
                });

                // Enable copy button after streaming completes
                const copyBtn = document.getElementById('copyScriptBtn');
                if (copyBtn) {
                    copyBtn.disabled = false;
                    copyBtn.style.opacity = '1';
                    copyBtn.onclick = () => {
                        navigator.clipboard.writeText(fullText).then(() => {
                            app.showToast('Đã copy kịch bản vào clipboard!', 'success');
                        });
                    };
                }

                app.showToast('✨ Kịch bản đã được viết xong bởi Gemini AI!', 'success');
            } catch (error) {
                app.showToast(error.message, 'error');
                // Fallback to template
                this._renderTemplateScript(topic, style, resultsContainer);
            }
        } else {
            // Offline mode - use templates
            this._renderTemplateScript(topic, style, resultsContainer);
        }
    },

    /**
     * Render template-based scripts (fallback when no Gemini API)
     */
    _renderTemplateScript(topic, style, resultsContainer) {
        resultsContainer.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Đang viết kịch bản...</p></div>';

        setTimeout(() => {
            const scripts = [
                this.generateViralScriptTemplate(topic, 'storytelling'),
                this.generateViralScriptTemplate(topic, 'step-by-step'),
                this.generateViralScriptTemplate(topic, 'myth-buster')
            ];

            resultsContainer.innerHTML = `
                <div style="padding: 0.75rem; margin-bottom: 1rem; border-radius: 8px; background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.2); font-size: 0.85rem; color: #fbbf24;">
                    ⚠️ Đang dùng template offline. Vào <strong>Settings</strong> để nhập Gemini API Key cho kịch bản AI chất lượng cao.
                </div>
            ` + scripts.map((script, index) => `
                <div class="glass-card" style="margin-bottom: 2rem; padding: 1.5rem; position: relative;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid rgba(255,255,255,0.1);">
                        <span style="font-size: 0.8rem; padding: 0.25rem 0.75rem; border-radius: 99px; background: ${index === 0 ? 'rgba(99, 102, 241, 0.2)' : index === 1 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}; color: ${index === 0 ? '#818cf8' : index === 1 ? '#4ade80' : '#f87171'}; font-weight: 600;">
                            ${index === 0 ? '🗣️ Kể chuyện (Storytelling)' : index === 1 ? '📝 Hướng dẫn (Step-by-step)' : '🛑 Phá vỡ lầm tưởng (Myth Buster)'}
                        </span>
                        <button class="copy-btn-manual" style="background: none; border: none; color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem;" onclick="AIGeneratorModule.copyToClipboard(this.nextElementSibling, decodeURIComponent('${encodeURIComponent(script)}'))">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                            Sao chép
                        </button>
                        <div style="display: none;"></div> 
                    </div>
                    <div class="script-content" style="font-family: var(--font-family); line-height: 1.8; color: var(--text-primary); white-space: pre-wrap;">
                        ${script}
                    </div>
                </div>
            `).join('');
        }, 1500);
    },

    // ════════════════════════════════════════════
    // TEMPLATE FALLBACKS (for offline mode)
    // ════════════════════════════════════════════

    generateTitleVariations(topic) {
        const templates = [
            `Top 10 ${topic} Bạn Cần Biết [2026]`,
            `5 ${topic} Tốt Nhất Cho Người Mới Bắt Đầu`,
            `7 Sai Lầm Khi ${topic} - Hầu Hết Người Mới Đều Mắc Phải`,
            `Cách ${topic} Từ A đến Z (Hướng Dẫn Chi Tiết)`,
            `${topic} - Hướng Dẫn Đầy Đủ Cho Người Mới`,
            `Làm Sao Để ${topic}? (Bí Quyết Thành Công)`,
            `${topic} Như Thế Nào? Giải Đáp Từ Chuyên Gia`,
            `Tại Sao Bạn Nên ${topic}? (Sự Thật Ít Ai Biết)`,
            `🔥 ${topic} - Video Này Sẽ Thay Đổi Cách Bạn Nghĩ!`,
            `${topic}: Bí Mật Mà Không Ai Muốn Bạn Biết`,
            `NGỪNG ${topic} SAI CÁCH! Đây Mới Là Cách Đúng`,
            `${topic} Review - Có Đáng Tiền Không?`,
            `So Sánh ${topic}: Đâu Là Lựa Chọn Tốt Nhất?`,
            `${topic} Tutorial - Từ Zero Đến Hero`,
            `[Miễn Phí] Học ${topic} Trong 10 Phút`,
            `Tôi Đã ${topic} Như Thế Nào (Câu Chuyện Thật)`,
            `${topic}: Hành Trình 30 Ngày Của Tôi`
        ];
        return templates.sort(() => Math.random() - 0.5).slice(0, 12);
    },

    generateDescriptionTemplate(topic) {
        const currentYear = new Date().getFullYear();
        return `📺 ${topic.toUpperCase()} - Hướng Dẫn Chi Tiết ${currentYear}

Trong video này, mình sẽ chia sẻ về ${topic}. Đây là nội dung mà mình đã nghiên cứu kỹ lưỡng và muốn chia sẻ với các bạn.

⏰ TIMESTAMPS:
0:00 - Giới thiệu
1:00 - [Phần 1 - Thêm nội dung]
3:00 - [Phần 2 - Thêm nội dung]
5:00 - [Phần 3 - Thêm nội dung]
8:00 - Tổng kết

📌 TRONG VIDEO NÀY BẠN SẼ HỌC:
✅ [Điểm chính 1]
✅ [Điểm chính 2]
✅ [Điểm chính 3]
✅ [Điểm chính 4]

🔗 LINKS HỮU ÍCH:
📎 Website: [Link website]
📎 Tài liệu: [Link download]
📎 Công cụ: [Link công cụ]

📱 KẾT NỐI VỚI MÌNH:
▶️ Subscribe kênh: [Link channel]
📷 Instagram: [Link IG]
📘 Facebook: [Link FB]

💬 Bạn có câu hỏi gì về ${topic}? Comment bên dưới nhé!
👍 Nếu video hữu ích, đừng quên LIKE, SHARE và SUBSCRIBE nhé!

#${topic.replace(/\s+/g, '')} #${topic.split(' ')[0]} #huongdan #tutorial`;
    },

    generateHashtagVariations(topic) {
        const words = topic.toLowerCase().split(/\s+/);
        const mainWord = words[0];
        const hashtags = [
            `#${topic.replace(/\s+/g, '')}`, `#${mainWord}`, `#${topic.replace(/\s+/g, '')}vietnam`,
            `#${mainWord}2026`, '#vietnam', '#vlog', '#youtuber', '#youtubevietnam',
            '#huongdan', '#tutorial', '#kienthuc', '#howto', '#tips', '#trending',
            `#${mainWord}tips`, `#${mainWord}review`, `#best${mainWord}`, `#learn${mainWord}`
        ];
        return [...new Set(hashtags)].slice(0, 30);
    },

    generateHookVariations(topic) {
        return [
            `Bạn có biết tại sao hầu hết mọi người thất bại khi ${topic}? Đến cuối video này, bạn sẽ hiểu tại sao.`,
            `Bạn đang ${topic} sai cách? Để tôi chỉ cho bạn phương pháp đúng...`,
            `Đây là video quan trọng nhất về ${topic} mà bạn sẽ xem năm nay.`,
            `Trong 30 giây tới, tôi sẽ chia sẻ bí quyết ${topic} mà ít ai biết.`,
            `Tôi đã mất 3 năm để học điều này về ${topic}. Bạn chỉ cần 10 phút.`,
            `Tuần trước, một người hỏi tôi về ${topic}. Câu trả lời của tôi khiến họ ngạc nhiên...`,
            `Có một điều về ${topic} mà không ai muốn bạn biết...`,
            `Bí mật lớn nhất về ${topic} đang được tiết lộ ngay bây giờ...`,
            `Xem đến cuối video để nhận tài liệu miễn phí về ${topic}.`,
            `Đừng ${topic} trước khi xem video này. Tin tôi đi.`
        ].sort(() => Math.random() - 0.5).slice(0, 10);
    },

    generateViralScriptTemplate(topic, style) {
        const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
        const topicLower = topic.toLowerCase();

        if (style === 'storytelling') {
            return `**TIÊU ĐỀ: ${topic.toUpperCase()} - CÂU CHUYỆN SẼ THAY ĐỔI SUY NGHĨ CỦA BẠN**

─────────────────────────────────
**(0:00-0:05) HOOK - Mở đầu gây tò mò**
─────────────────────────────────

${rand([
                `"Trước đây mình cũng nghĩ ${topicLower} chẳng có gì đáng quan tâm. Cho đến khi mọi thứ thay đổi hoàn toàn..."`,
                `"Nếu bạn đang xem video này, có lẽ bạn cũng đang gặp vấn đề với ${topicLower} giống mình ngày trước..."`,
                `"1 năm trước, mình hoàn toàn mù mờ về ${topicLower}. Hôm nay mình muốn chia sẻ hành trình đó..."`,
                `"Đừng cuộn đi vội! Câu chuyện về ${topicLower} này có thể giúp bạn tránh được sai lầm đắt giá nhất..."`
            ])}

─────────────────────────────────
**(0:05-0:30) INTRO - Câu chuyện cá nhân & Đồng cảm**
─────────────────────────────────

"Thú thật đi, bạn có từng cảm thấy như thế này không? Cứ tìm hiểu về ${topicLower} mãi mà chẳng biết bắt đầu từ đâu..."

─────────────────────────────────
**(0:30-1:30) BODY - Bước ngoặt & Bài học**
─────────────────────────────────

"Mọi thứ thay đổi khi mình nhận ra một điều cực kỳ quan trọng..."

─────────────────────────────────
**(1:30-2:00) CTA - Kết luận & Kêu gọi hành động**
─────────────────────────────────

"Nếu bạn thấy câu chuyện này hữu ích, hãy để lại một like nhé. Subscribe kênh để không bỏ lỡ các video tiếp theo!"

─────────────────────────────────
**[END SCRIPT - ~2 phút] (Template offline)**`;
        } else if (style === 'step-by-step') {
            return `**TIÊU ĐỀ: HƯỚNG DẪN ${topic.toUpperCase()} TỪ A ĐẾN Z**

─────────────────────────────────
**(0:00-0:05) HOOK**
─────────────────────────────────

"Chỉ 5 bước để ${topicLower} hiệu quả. Xem đến cuối nhé!"

─────────────────────────────────
**(0:05-0:20) INTRO**
─────────────────────────────────

"Hôm nay mình sẽ hướng dẫn từ A đến Z luôn..."

─────────────────────────────────
**BƯỚC 1-5**
─────────────────────────────────

[Nội dung template - Vào Settings nhập Gemini API Key để có kịch bản AI chi tiết]

─────────────────────────────────
**[END SCRIPT - ~3 phút] (Template offline)**`;
        } else {
            return `**TIÊU ĐỀ: 5 SAI LẦM TAI HẠI VỀ ${topic.toUpperCase()}**

─────────────────────────────────
**(0:00-0:05) HOOK**
─────────────────────────────────

"90% người làm ${topicLower} đều mắc những sai lầm này. Bạn có nằm trong số đó?"

─────────────────────────────────
**SAI LẦM 1-5**
─────────────────────────────────

[Nội dung template - Vào Settings nhập Gemini API Key để có kịch bản AI chi tiết]

─────────────────────────────────
**[END SCRIPT - ~3 phút] (Template offline)**`;
        }
    },

    // ════════════════════════════════════════════
    // UI HELPERS
    // ════════════════════════════════════════════

    renderResults(items, container, type) {
        container.innerHTML = `
            <div style="margin-bottom: 1rem;">
                <p style="color: var(--text-secondary); font-size: 0.875rem;">
                    💡 Click vào bất kỳ mục nào để copy
                </p>
            </div>
            ${items.map((item, index) => `
                <div class="ai-result-item" onclick="AIGeneratorModule.copyToClipboard(this, \`${item.replace(/`/g, '\\`').replace(/\n/g, '\\n')}\`)">
                    ${type === 'description' || type === 'hashtags' ?
                `<pre style="white-space: pre-wrap; font-family: var(--font-family); margin: 0;">${item}</pre>` :
                `<p style="margin: 0;"><strong>${index + 1}.</strong> ${item}</p>`
            }
                    <p class="copy-hint">Click để copy</p>
                </div>
            `).join('')}
        `;
    },

    copyToClipboard(element, text) {
        const finalText = text.replace(/\\n/g, '\n');

        navigator.clipboard.writeText(finalText).then(() => {
            element.classList.add('copied');
            const hint = element.querySelector('.copy-hint');
            if (hint) hint.textContent = 'Đã copy!';

            setTimeout(() => {
                element.classList.remove('copied');
                if (hint) hint.textContent = 'Click để copy';
            }, 2000);

            app.showToast('Đã copy vào clipboard!', 'success');
        }).catch(err => {
            console.error('Copy failed:', err);
            app.showToast('Không thể copy', 'error');
        });
    }
};
