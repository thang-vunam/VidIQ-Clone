/**
 * VidIQ Clone - Main Application
 * Central controller for all modules
 */

const app = {
    currentPage: 'dashboard',

    /**
     * Initialize application
     */
    init() {
        // Initialize i18n
        i18n.init();

        // Initialize API
        YouTubeAPI.init();

        // Update API status
        this.updateApiStatus();

        // Initialize all modules
        KeywordResearch.init();
        TrendingModule.init();
        AnalyticsModule.init();
        CompetitorModule.init();
        SEOScoreModule.init();
        AIGeneratorModule.init();
        CalendarModule.init();
        StoryboardModule.init();
        PromptLibraryModule.init();
        CommentAnalysisModule.init();

        // Bind navigation
        this.bindNavigation();

        // Bind settings
        this.bindSettings();

        // Bind language toggle
        this.bindLanguageToggle();

        // Bind mobile menu
        this.bindMobileMenu();

        console.log('VidIQ Clone initialized successfully!');
    },

    /**
     * Bind navigation events
     */
    bindNavigation() {
        document.querySelectorAll('.nav-item[data-page]').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                this.navigateTo(page);
            });
        });
    },

    /**
     * Navigate to a page
     * @param {string} page - Page ID
     */
    navigateTo(page) {
        // Update active nav
        document.querySelectorAll('.nav-item[data-page]').forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });

        // Update active page
        document.querySelectorAll('.page').forEach(p => {
            p.classList.toggle('active', p.id === `page-${page}`);
        });

        // Update page title
        const titles = {
            dashboard: 'Dashboard',
            'keyword-research': 'Keyword Research',
            trending: 'Trending Videos',
            analytics: 'Channel Analytics',
            competitor: 'Competitor Analysis',
            'seo-score': 'SEO Score',
            'ai-generator': 'AI Generator',
            calendar: 'Content Calendar',
            storyboard: 'Storyboard',
            'prompt-library': 'Prompt Library',
            comments: 'Comment Analysis',
            settings: 'Settings'
        };

        const pageTitle = document.getElementById('pageTitle');
        if (pageTitle) {
            pageTitle.textContent = titles[page] || page;
        }

        this.currentPage = page;

        // Close mobile menu
        document.querySelector('.sidebar')?.classList.remove('open');

        // Special init for calendar
        if (page === 'calendar') {
            CalendarModule.render();
        }
    },

    /**
     * Update API status indicator
     */
    updateApiStatus() {
        const statusEl = document.getElementById('apiStatus');
        if (!statusEl) return;

        const ytConnected = YouTubeAPI.isConfigured();
        const geminiConnected = typeof GeminiAPI !== 'undefined' && GeminiAPI.isConfigured();

        if (ytConnected || geminiConnected) {
            statusEl.classList.add('connected');
            const parts = [];
            if (ytConnected) parts.push('API');
            if (geminiConnected) parts.push('Gemini');
            statusEl.querySelector('.status-text').textContent = parts.join(' + ') + ' đã kết nối';
        } else {
            statusEl.classList.remove('connected');
            statusEl.querySelector('.status-text').textContent = i18n.t('apiNotConnected');
        }

        // Update AI Generator badge
        const aiBadge = document.getElementById('aiGeneratorBadge');
        if (aiBadge) {
            if (geminiConnected) {
                aiBadge.textContent = 'AI ✨';
                aiBadge.style.background = 'linear-gradient(135deg, rgba(66,133,244,0.3), rgba(219,68,55,0.3))';
                aiBadge.style.color = '#8ab4f8';
            } else {
                aiBadge.textContent = 'Offline';
                aiBadge.style.background = '';
                aiBadge.style.color = '';
            }
        }
    },

    /**
     * Bind settings page events
     */
    bindSettings() {
        // ─── YouTube API Key ───
        const toggleBtn = document.getElementById('toggleApiKey');
        const apiKeyInput = document.getElementById('apiKeyInput');

        if (toggleBtn && apiKeyInput) {
            const savedKey = YouTubeAPI.getApiKey();
            if (savedKey) apiKeyInput.value = savedKey;

            toggleBtn.addEventListener('click', () => {
                apiKeyInput.type = apiKeyInput.type === 'password' ? 'text' : 'password';
            });
        }

        const saveBtn = document.getElementById('saveApiKeyBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                const key = apiKeyInput?.value.trim();
                if (!key) {
                    this.showToast('Vui lòng nhập API Key', 'warning');
                    return;
                }

                this.showToast('Đang kiểm tra API Key...', 'info');

                const isValid = await YouTubeAPI.validateApiKey(key);
                if (isValid) {
                    YouTubeAPI.setApiKey(key);
                    this.updateApiStatus();
                    this.showToast('API Key đã được lưu và xác thực!', 'success');
                } else {
                    this.showToast('API Key không hợp lệ. Vui lòng kiểm tra lại.', 'error');
                }
            });
        }

        // ─── Gemini API Key ───
        const geminiToggleBtn = document.getElementById('toggleGeminiKey');
        const geminiKeyInput = document.getElementById('geminiApiKeyInput');
        const geminiStatusEl = document.getElementById('geminiKeyStatus');

        if (geminiToggleBtn && geminiKeyInput) {
            const savedGeminiKey = GeminiAPI.getApiKey();
            if (savedGeminiKey) {
                geminiKeyInput.value = savedGeminiKey;
                if (geminiStatusEl) geminiStatusEl.textContent = '✅ Đã kết nối';
            }

            geminiToggleBtn.addEventListener('click', () => {
                geminiKeyInput.type = geminiKeyInput.type === 'password' ? 'text' : 'password';
            });
        }

        const saveGeminiBtn = document.getElementById('saveGeminiKeyBtn');
        if (saveGeminiBtn) {
            saveGeminiBtn.addEventListener('click', async () => {
                const key = geminiKeyInput?.value.trim();
                if (!key) {
                    this.showToast('Vui lòng nhập Gemini API Key', 'warning');
                    return;
                }

                // Lưu key TRƯỚC, sau đó mới validate
                // Để key không bị mất khi refresh dù validation tạm thất bại
                GeminiAPI.setApiKey(key);
                this.showToast('Đang kiểm tra Gemini API Key...', 'info');
                if (geminiStatusEl) geminiStatusEl.textContent = '⏳ Đang kiểm tra...';

                const isValid = await GeminiAPI.validateKey(key);
                if (isValid) {
                    this.updateApiStatus();
                    if (geminiStatusEl) geminiStatusEl.textContent = '✅ Đã kết nối';
                    this.showToast('Gemini API Key đã được lưu và xác thực!', 'success');
                } else {
                    // Key vẫn được lưu, chỉ cảnh báo
                    this.updateApiStatus();
                    if (geminiStatusEl) geminiStatusEl.textContent = '⚠️ Key đã lưu nhưng chưa xác thực được';
                    this.showToast('Key đã lưu. Xác thực thất bại (có thể do rate limit), nhưng key vẫn được giữ lại.', 'warning');
                }
            });
        }

        // ─── Other Settings ───
        const defaultLang = document.getElementById('defaultLang');
        const defaultCountry = document.getElementById('defaultCountry');

        if (defaultLang) {
            defaultLang.value = localStorage.getItem('vidiq_language') || 'vi';
            defaultLang.addEventListener('change', () => {
                i18n.setLanguage(defaultLang.value);
                this.showToast('Ngôn ngữ đã được cập nhật', 'success');
            });
        }

        if (defaultCountry) {
            defaultCountry.value = localStorage.getItem('vidiq_country') || 'VN';
            defaultCountry.addEventListener('change', () => {
                localStorage.setItem('vidiq_country', defaultCountry.value);
                const trendingCountry = document.getElementById('trendingCountry');
                if (trendingCountry) trendingCountry.value = defaultCountry.value;
            });
        }
    },

    /**
     * Bind language toggle
     */
    bindLanguageToggle() {
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                i18n.setLanguage(btn.dataset.lang);
                this.updateApiStatus(); // Refresh status text
            });
        });
    },

    /**
     * Bind mobile menu
     */
    bindMobileMenu() {
        const menuBtn = document.getElementById('mobileMenuBtn');
        const sidebar = document.querySelector('.sidebar');

        if (menuBtn && sidebar) {
            menuBtn.addEventListener('click', () => {
                sidebar.classList.toggle('open');
            });

            // Close on outside click
            document.addEventListener('click', (e) => {
                if (!sidebar.contains(e.target) && !menuBtn.contains(e.target)) {
                    sidebar.classList.remove('open');
                }
            });
        }
    },

    /**
     * Show toast notification
     * @param {string} message - Toast message
     * @param {string} type - Toast type (success, error, warning, info)
     */
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px;">
                ${type === 'success' ? '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>' : ''}
                ${type === 'error' ? '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>' : ''}
                ${type === 'warning' ? '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>' : ''}
                ${type === 'info' ? '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>' : ''}
            </svg>
            <span>${message}</span>
        `;

        container.appendChild(toast);

        // Remove after 3 seconds
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
