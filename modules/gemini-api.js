/**
 * VidIQ Clone - Gemini API Module
 * Auto-detect model mới nhất từ Google API
 * Khi Google mở Gemini 3.x, 4.x... app sẽ TỰ ĐỘNG nâng cấp
 */

const GeminiAPI = {
    API_BASE: 'https://generativelanguage.googleapis.com/v1beta/models',
    // Fallback nếu auto-detect thất bại
    MODEL: 'gemini-2.5-flash',
    FALLBACK_MODEL: 'gemini-2.5-pro',
    STORAGE_KEY: 'vidiq_gemini_api_key',
    _modelsDetected: false,

    /**
     * Save Gemini API key to localStorage
     * @param {string} key - Gemini API Key
     */
    setApiKey(key) {
        localStorage.setItem(this.STORAGE_KEY, key);
        // Re-detect models khi key thay đổi
        this.detectLatestModels();
    },

    /**
     * Get stored Gemini API key
     * @returns {string|null}
     */
    getApiKey() {
        return localStorage.getItem(this.STORAGE_KEY);
    },

    /**
     * Check if Gemini API key is configured
     * @returns {boolean}
     */
    isConfigured() {
        const key = this.getApiKey();
        return key && key.length > 0;
    },

    /**
     * 🔍 Auto-detect model mới nhất từ Google API
     * Khi Google mở Gemini 3.x, 4.x... sẽ tự động dùng model mạnh nhất
     */
    async detectLatestModels() {
        if (this._modelsDetected) return;
        const apiKey = this.getApiKey();
        if (!apiKey) return;

        try {
            const response = await fetch(`${this.API_BASE}?key=${apiKey}`);
            if (!response.ok) return;

            const data = await response.json();
            const models = (data.models || [])
                .filter(m => m.name?.includes('gemini'))
                .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
                .filter(m => !m.name.includes('preview') &&
                    !m.name.includes('tts') &&
                    !m.name.includes('audio') &&
                    !m.name.includes('embedding') &&
                    !m.name.includes('lite'))
                .map(m => m.name.replace('models/', ''));

            if (models.length === 0) return;

            // Tìm model Flash (nhanh) và Pro (mạnh) tốt nhất
            const flashModels = models.filter(m => m.includes('flash')).sort().reverse();
            const proModels = models.filter(m => m.includes('pro')).sort().reverse();

            // Flash cho tasks nhanh (mặc định), Pro cho fallback
            if (flashModels[0]) this.MODEL = flashModels[0];
            if (proModels[0]) this.FALLBACK_MODEL = proModels[0];

            this._modelsDetected = true;
            console.log(`🚀 Auto-detect models: ⚡${this.MODEL} | 💎${this.FALLBACK_MODEL}`);
            console.log(`   📋 Tất cả: ${models.join(', ')}`);
        } catch (e) {
            console.warn('⚠️ Auto-detect lỗi:', e.message, '→ dùng fallback');
        }
    },

    /**
     * Build request body
     */
    _buildRequestBody(prompt, systemInstruction, options) {
        const {
            temperature = 1.0,
            maxOutputTokens = 2048,
            useThinking = false,
            thinkingBudget = 4096
        } = options;

        const body = {
            contents: [{
                role: 'user',
                parts: [{ text: prompt }]
            }],
            generationConfig: {
                temperature,
                maxOutputTokens
            }
        };

        // Support JSON mode
        if (options.responseMimeType) {
            body.generationConfig.responseMimeType = options.responseMimeType;
        }

        if (systemInstruction) {
            body.systemInstruction = {
                parts: [{ text: systemInstruction }]
            };
        }

        if (useThinking) {
            body.generationConfig.thinkingConfig = {
                thinkingBudget: thinkingBudget
            };
        } else {
            // Explicitly disable thinking for models that think by default (gemini-2.5+)
            body.generationConfig.thinkingConfig = {
                thinkingBudget: 0
            };
        }

        return body;
    },

    /**
     * Generate content (non-streaming) with auto-fallback
     */
    async generateContent(prompt, systemInstruction = '', options = {}) {
        const apiKey = this.getApiKey();
        if (!apiKey) throw new Error('Gemini API Key chưa được cấu hình. Vào Settings để nhập key.');

        // Auto-detect model mới nhất (chỉ chạy 1 lần)
        await this.detectLatestModels();

        const body = this._buildRequestBody(prompt, systemInstruction, options);

        // Try primary model first
        let response = await fetch(`${this.API_BASE}/${this.MODEL}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        // Auto-fallback on 429 (rate limit) or 404 (model not available)
        if (response.status === 429 || response.status === 404) {
            console.warn(`⚠️ ${this.MODEL} unavailable (${response.status}), falling back to ${this.FALLBACK_MODEL}`);
            if (typeof app !== 'undefined') app.showToast(`⚡ Chuyển sang ${this.FALLBACK_MODEL}`, 'info');

            response = await fetch(`${this.API_BASE}/${this.FALLBACK_MODEL}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMsg = errorData?.error?.message || `HTTP ${response.status}`;
            if (response.status === 400) throw new Error(`Request sai: ${errorMsg}`);
            if (response.status === 403) throw new Error('API Key không có quyền. Kiểm tra lại key.');
            if (response.status === 429) throw new Error('Cả 2 model đều bị giới hạn. Vui lòng chờ 1-2 phút.');
            throw new Error(`Lỗi Gemini API: ${errorMsg}`);
        }

        const data = await response.json();
        const parts = data?.candidates?.[0]?.content?.parts || [];
        const textParts = parts.filter(p => p.text && !p.thought);
        return textParts.map(p => p.text).join('') || 'Không có kết quả.';
    },

    /**
     * Generate content with streaming (for long content like scripts) — with auto-fallback
     */
    async streamContent(prompt, systemInstruction, targetElement, options = {}) {
        const apiKey = this.getApiKey();
        if (!apiKey) throw new Error('Gemini API Key chưa được cấu hình. Vào Settings để nhập key.');

        // Auto-detect model mới nhất (chỉ chạy 1 lần)
        await this.detectLatestModels();

        const body = this._buildRequestBody(prompt, systemInstruction, options);

        // Try primary model first
        let response = await fetch(`${this.API_BASE}/${this.MODEL}:streamGenerateContent?alt=sse&key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        // Auto-fallback on 429 or 404
        if (response.status === 429 || response.status === 404) {
            console.warn(`⚠️ ${this.MODEL} unavailable (${response.status}), falling back to ${this.FALLBACK_MODEL}`);
            if (typeof app !== 'undefined') app.showToast(`⚡ Chuyển sang ${this.FALLBACK_MODEL}`, 'info');

            response = await fetch(`${this.API_BASE}/${this.FALLBACK_MODEL}:streamGenerateContent?alt=sse&key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMsg = errorData?.error?.message || `HTTP ${response.status}`;
            if (response.status === 429) throw new Error('Cả 2 model đều bị giới hạn. Vui lòng chờ 1-2 phút.');
            throw new Error(`Lỗi Gemini API: ${errorMsg}`);
        }

        // Read SSE stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop(); // Keep incomplete line in buffer

            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                const jsonStr = line.slice(6).trim();
                if (!jsonStr || jsonStr === '[DONE]') continue;

                try {
                    const data = JSON.parse(jsonStr);
                    const parts = data?.candidates?.[0]?.content?.parts || [];

                    for (const part of parts) {
                        // Skip thinking parts, only show actual output
                        if (part.thought) continue;
                        if (part.text) {
                            fullText += part.text;
                            // Update target element with formatted text
                            targetElement.innerHTML = this.formatScriptText(fullText);
                            // Auto-scroll to bottom
                            targetElement.scrollTop = targetElement.scrollHeight;
                        }
                    }
                } catch (e) {
                    // Skip malformed JSON chunks
                }
            }
        }

        return fullText;
    },

    /**
     * Format script text for display (convert markdown-like to HTML)
     * @param {string} text - Raw text
     * @returns {string} HTML formatted text
     */
    formatScriptText(text) {
        return text
            // Bold
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            // Italic
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            // Headers (lines starting with #)
            .replace(/^### (.+)$/gm, '<h4 style="color: var(--accent-primary); margin: 1rem 0 0.5rem;">$1</h4>')
            .replace(/^## (.+)$/gm, '<h3 style="color: var(--accent-primary); margin: 1.2rem 0 0.5rem;">$1</h3>')
            // Horizontal rules
            .replace(/^─+$/gm, '<hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 1rem 0;">')
            // Line breaks
            .replace(/\n/g, '<br>');
    },

    /**
     * Validate API key by making a small test request
     * @param {string} key - API key to test
     * @returns {Promise<boolean>}
     */
    async validateKey(key) {
        // Thử cả 2 model (primary + fallback) để tránh false negative khi 1 model bị rate limit
        const modelsToTry = [this.MODEL, this.FALLBACK_MODEL];
        for (const model of modelsToTry) {
            try {
                const url = `${this.API_BASE}/${model}:generateContent?key=${key}`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ role: 'user', parts: [{ text: 'Hi' }] }],
                        generationConfig: { maxOutputTokens: 5 }
                    })
                });
                if (response.ok) return true;
                // 429 = rate limit, thử model tiếp theo
                if (response.status === 429) continue;
                // 403 = key bị khóa/invalid → false ngay
                if (response.status === 403) return false;
            } catch {
                continue;
            }
        }
        return false;
    },

    // ════════════════════════════════════════════
    // SYSTEM PROMPTS FOR EACH CONTENT TYPE
    // ════════════════════════════════════════════

    systemPrompts: {
        titles: `Bạn là chuyên gia YouTube SEO hàng đầu Việt Nam. Nhiệm vụ: tạo tiêu đề video YouTube viral.

NGUYÊN TẮC:
- Viết bằng tiếng Việt tự nhiên, phù hợp văn hóa Việt Nam
- Tối ưu SEO: đặt keyword chính ở đầu tiêu đề
- Sử dụng power words tạo cảm xúc (Bí mật, Sốc, Đừng, Thật sự, Hướng dẫn...)
- Kết hợp số liệu cụ thể khi phù hợp (Top 5, 3 cách, 7 sai lầm...)
- Giữ tiêu đề dưới 60 ký tự khi có thể
- Đa dạng phong cách: listicle, how-to, question, emotional, review, story
- KHÔNG dùng clickbait quá mức, phải đúng với nội dung

OUTPUT: Trả về CHÍNH XÁC 10 tiêu đề, mỗi tiêu đề trên 1 dòng, đánh số 1-10. Không thêm giải thích.`,

        description: `Bạn là chuyên gia YouTube SEO. Nhiệm vụ: viết mô tả video YouTube tối ưu SEO.

NGUYÊN TẮC:
- 3 dòng đầu QUAN TRỌNG NHẤT (hiển thị trước khi "Show more")
- Bao gồm keyword chính trong 2-3 dòng đầu
- Thêm timestamps mẫu (người dùng sẽ chỉnh lại)
- Thêm CTA (subscribe, like, comment)
- Thêm links mạng xã hội mẫu
- Thêm 3-5 hashtag cuối
- Viết bằng tiếng Việt tự nhiên
- Khoảng 200-300 từ

OUTPUT: Trả về MỘT mô tả hoàn chỉnh, sẵn sàng copy-paste.`,

        hashtags: `Bạn là chuyên gia YouTube SEO. Nhiệm vụ: tạo hashtag tối ưu cho video YouTube.

NGUYÊN TẮC:
- Tạo 25-30 hashtag liên quan đến chủ đề
- Chia thành 3 nhóm: hashtag chủ đề chính, hashtag xu hướng, hashtag chung YouTube
- Kết hợp hashtag tiếng Việt và tiếng Anh
- Hashtag phổ biến + hashtag niche (ít cạnh tranh)
- YouTube chỉ hiển thị 3 hashtag đầu tiên phía trên tiêu đề, nên đặt 3 cái quan trọng nhất lên đầu
- Format: #keyword (không có khoảng trắng trong hashtag)

OUTPUT: Trả về danh sách hashtag cách nhau bởi dấu cách, phân nhóm rõ ràng. Không giải thích.`,

        hooks: `Bạn là scriptwriter chuyên nghiệp cho YouTube Việt Nam. Nhiệm vụ: viết câu hook mở đầu video viral.

NGUYÊN TẮC:
- Hook phải gây TÒ MÒ trong 3-5 giây đầu
- Viết bằng tiếng Việt đời thường, tự nhiên, như đang nói chuyện
- Đa dạng phong cách:
  + Question hook (đặt câu hỏi gây sốc)
  + Statement hook (khẳng định mạnh mẽ)
  + Story hook (mở đầu bằng câu chuyện)
  + Curiosity gap (tạo khoảng trống tò mò)
  + Direct value (hứa hẹn giá trị cụ thể)
- Mỗi hook 1-3 câu, đủ cho 3-5 giây
- Phải liên quan trực tiếp đến chủ đề
- KHÔNG dùng clickbait vô nghĩa

OUTPUT: Trả về CHÍNH XÁC 10 hooks, đánh số 1-10, mỗi hook trên 1 đoạn riêng. Không giải thích.`,

        script: `Bạn là scriptwriter CHUYÊN NGHIỆP cho YouTube Việt Nam, chuyên viết kịch bản viral cho các video dạng faceless hoặc talking head.

NGUYÊN TẮC CỐT LÕI:
1. Viết kịch bản HOÀN CHỈNH, chi tiết, sẵn sàng đọc. KHÔNG dùng placeholder như [thêm nội dung], [ví dụ]
2. Giọng văn: tự nhiên, đời thường, như đang trò chuyện với bạn. Dùng "mình" và "bạn"
3. Phân tích chủ đề để viết nội dung CỤ THỂ, CHUYÊN SÂU — không nói chung chung
4. Dùng ví dụ thực tế, câu chuyện minh họa sinh động
5. Tạo cảm xúc: empathy, surprise, curiosity, inspiration
6. Giữ nhịp video: câu ngắn xen câu dài, có pause tự nhiên
7. Kịch bản dài 5-8 phút đọc (khoảng 1000-1500 từ)

CẤU TRÚC:
- HOOK (0:00-0:05): Câu mở đầu cực kỳ gây tò mò
- INTRO (0:05-0:30): Đặt vấn đề, tạo đồng cảm
- BODY: Nội dung chính, chia theo sections rõ ràng
- CTA (cuối): Kêu gọi like, comment, subscribe — tự nhiên, không ép buộc

FORMAT OUTPUT:
- Dùng **bold** cho heading sections
- Dùng ─── để phân cách sections
- Ghi timestamp ước lượng cho mỗi phần
- Cuối cùng ghi tổng thời gian ước lượng`
    },

    /**
     * Get the appropriate system prompt for a content type and style
     * @param {string} type - Content type (titles, description, hashtags, hooks, script)
     * @param {string} style - Script style (storytelling, step-by-step, myth-buster)
     * @returns {string} System prompt
     */
    getSystemPrompt(type, style = '') {
        let prompt = this.systemPrompts[type] || '';

        if (type === 'script' && style) {
            const styleInstructions = {
                'storytelling': `\n\nPHONG CÁCH: KỂ CHUYỆN (STORYTELLING)
- Mở đầu bằng trải nghiệm cá nhân hoặc câu chuyện có thật
- Xây dựng nhân vật, bối cảnh, xung đột
- Có bước ngoặt và bài học rút ra
- Kết nối cảm xúc mạnh mẽ với người xem
- Dùng đối thoại tự nhiên khi kể chuyện`,

                'step-by-step': `\n\nPHONG CÁCH: HƯỚNG DẪN TỪNG BƯỚC (STEP-BY-STEP)
- Chia nội dung thành 5-7 bước rõ ràng
- Mỗi bước có giải thích CỤ THỂ, không nói chung chung
- Thêm tips/mẹo nhỏ ở mỗi bước
- Đề cập sai lầm phổ biến cần tránh
- Tổng kết lại các bước cuối video`,

                'myth-buster': `\n\nPHONG CÁCH: PHÁ VỠ LẦM TƯỞNG (MYTH BUSTER)
- Đưa ra 5 sai lầm/lầm tưởng phổ biến
- Với mỗi myth: nêu quan niệm sai → giải thích tại sao sai → đưa ra sự thật
- Dùng dữ liệu, ví dụ cụ thể để chứng minh
- Tạo yếu tố gây sốc, bất ngờ
- Kết luận với lời khuyên thực tế`
            };

            prompt += styleInstructions[style] || '';
        }

        return prompt;
    }
};

// API Key được nhập qua Settings UI, lưu vào localStorage
// Không hardcode key để tránh bị Google khóa khi push lên GitHub
