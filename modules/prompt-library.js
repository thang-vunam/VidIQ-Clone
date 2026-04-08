/**
 * VidIQ Clone - Prompt Library Module
 * Store and manage image/video generation prompts
 */

const PromptLibraryModule = {
    prompts: [],
    categories: ['Anime', '3D', 'Realistic', 'Stick Figure', 'Cinematic', 'Cartoon', 'Other'],
    currentFilter: 'all',

    init() {
        this.loadPrompts();
        this.bindEvents();
        this.render();
    },

    loadPrompts() {
        const saved = localStorage.getItem('vidiq_prompt_library');
        if (saved) {
            this.prompts = JSON.parse(saved);
        }
    },

    savePrompts() {
        localStorage.setItem('vidiq_prompt_library', JSON.stringify(this.prompts));
    },

    bindEvents() {
        document.getElementById('addPromptBtn')?.addEventListener('click', () => this.showAddModal());
        document.getElementById('promptSearchInput')?.addEventListener('input', (e) => this.filterBySearch(e.target.value));

        // Category filter buttons
        document.querySelectorAll('.prompt-category-filter').forEach(btn => {
            btn.addEventListener('click', () => this.filterByCategory(btn.dataset.category));
        });
    },

    showAddModal(editPrompt = null) {
        const modal = document.getElementById('videoModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');

        if (!modal || !modalBody) return;

        const isEdit = editPrompt !== null;
        modalTitle.textContent = isEdit ? 'Sửa Prompt' : 'Thêm Prompt Mới';

        modalBody.innerHTML = `
            <form id="promptForm">
                <div class="form-group">
                    <label>Tiêu đề:</label>
                    <input type="text" id="promptTitleInput" class="input-field" 
                        placeholder="VD: Nhân vật anime nữ tóc xanh" 
                        value="${isEdit ? editPrompt.title : ''}" required>
                </div>
                <div class="form-group">
                    <label>Category (Style):</label>
                    <select id="promptCategoryInput" class="select-input" style="width: 100%;">
                        ${this.categories.map(cat =>
            `<option value="${cat}" ${isEdit && editPrompt.category === cat ? 'selected' : ''}>${cat}</option>`
        ).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Nội dung Prompt:</label>
                    <textarea id="promptContentInput" class="textarea-field" rows="5" 
                        placeholder="Nhập prompt đầy đủ ở đây..." required>${isEdit ? editPrompt.content : ''}</textarea>
                </div>
                <div class="form-group">
                    <label>Tags (phân cách bằng dấu phẩy):</label>
                    <input type="text" id="promptTagsInput" class="input-field" 
                        placeholder="VD: character, female, blue hair"
                        value="${isEdit ? (editPrompt.tags || []).join(', ') : ''}">
                </div>
                <button type="submit" class="btn btn-primary" style="width: 100%;">
                    ${isEdit ? '💾 Lưu thay đổi' : '➕ Thêm Prompt'}
                </button>
            </form>
        `;

        modal.classList.add('active');

        document.getElementById('promptForm').addEventListener('submit', (e) => {
            e.preventDefault();
            if (isEdit) {
                this.updatePrompt(editPrompt.id);
            } else {
                this.addPrompt();
            }
        });

        document.getElementById('closeModal')?.addEventListener('click', () => this.closeModal());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeModal();
        });
    },

    addPrompt() {
        const title = document.getElementById('promptTitleInput')?.value.trim();
        const category = document.getElementById('promptCategoryInput')?.value;
        const content = document.getElementById('promptContentInput')?.value.trim();
        const tagsStr = document.getElementById('promptTagsInput')?.value.trim();

        if (!title || !content) {
            app.showToast('Vui lòng nhập tiêu đề và nội dung', 'warning');
            return;
        }

        const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(t => t) : [];

        const prompt = {
            id: Date.now(),
            title,
            category,
            content,
            tags,
            createdAt: new Date().toISOString(),
            usageCount: 0
        };

        this.prompts.unshift(prompt);
        this.savePrompts();
        this.render();
        this.closeModal();
        app.showToast('Đã thêm prompt mới', 'success');
    },

    updatePrompt(id) {
        const prompt = this.prompts.find(p => p.id === id);
        if (!prompt) return;

        prompt.title = document.getElementById('promptTitleInput')?.value.trim();
        prompt.category = document.getElementById('promptCategoryInput')?.value;
        prompt.content = document.getElementById('promptContentInput')?.value.trim();
        const tagsStr = document.getElementById('promptTagsInput')?.value.trim();
        prompt.tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(t => t) : [];

        this.savePrompts();
        this.render();
        this.closeModal();
        app.showToast('Đã cập nhật prompt', 'success');
    },

    deletePrompt(id) {
        if (!confirm('Xóa prompt này?')) return;
        this.prompts = this.prompts.filter(p => p.id !== id);
        this.savePrompts();
        this.render();
        app.showToast('Đã xóa prompt', 'success');
    },

    copyPrompt(id) {
        const prompt = this.prompts.find(p => p.id === id);
        if (!prompt) return;

        navigator.clipboard.writeText(prompt.content).then(() => {
            prompt.usageCount = (prompt.usageCount || 0) + 1;
            this.savePrompts();
            app.showToast('Đã copy prompt', 'success');
        });
    },

    filterByCategory(category) {
        this.currentFilter = category;
        document.querySelectorAll('.prompt-category-filter').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === category);
        });
        this.render();
    },

    filterBySearch(query) {
        this.searchQuery = query.toLowerCase();
        this.render();
    },

    getFilteredPrompts() {
        let filtered = [...this.prompts];

        if (this.currentFilter !== 'all') {
            filtered = filtered.filter(p => p.category === this.currentFilter);
        }

        if (this.searchQuery) {
            filtered = filtered.filter(p =>
                p.title.toLowerCase().includes(this.searchQuery) ||
                p.content.toLowerCase().includes(this.searchQuery) ||
                (p.tags || []).some(t => t.toLowerCase().includes(this.searchQuery))
            );
        }

        return filtered;
    },

    getCategoryColor(category) {
        const colors = {
            'Anime': '#FF6B9D',
            '3D': '#6366F1',
            'Realistic': '#10B981',
            'Stick Figure': '#F59E0B',
            'Cinematic': '#8B5CF6',
            'Cartoon': '#EC4899',
            'Other': '#6B7280'
        };
        return colors[category] || colors['Other'];
    },

    render() {
        const container = document.getElementById('promptLibraryResults');
        if (!container) return;

        const filtered = this.getFilteredPrompts();

        if (filtered.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
                    <p style="font-size: 3rem; margin-bottom: 1rem;">🎨</p>
                    <p>${this.prompts.length === 0 ? 'Chưa có prompt nào. Bấm "Thêm Prompt" để bắt đầu!' : 'Không tìm thấy prompt phù hợp.'}</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="prompt-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem;">
                ${filtered.map(prompt => `
                    <div class="glass-card prompt-card" style="padding: 1rem; position: relative;">
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.75rem;">
                            <h4 style="margin: 0; font-size: 1rem;">${prompt.title}</h4>
                            <span style="font-size: 0.7rem; padding: 0.2rem 0.5rem; border-radius: 99px; background: ${this.getCategoryColor(prompt.category)}33; color: ${this.getCategoryColor(prompt.category)}; font-weight: 600;">
                                ${prompt.category}
                            </span>
                        </div>
                        <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.75rem; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
                            ${prompt.content}
                        </p>
                        ${prompt.tags && prompt.tags.length > 0 ? `
                            <div style="margin-bottom: 0.75rem;">
                                ${prompt.tags.slice(0, 3).map(tag =>
            `<span style="font-size: 0.65rem; padding: 0.1rem 0.4rem; background: var(--bg-tertiary); border-radius: 4px; margin-right: 0.25rem;">#${tag}</span>`
        ).join('')}
                                ${prompt.tags.length > 3 ? `<span style="font-size: 0.65rem; color: var(--text-muted);">+${prompt.tags.length - 3}</span>` : ''}
                            </div>
                        ` : ''}
                        <div style="display: flex; gap: 0.5rem;">
                            <button onclick="PromptLibraryModule.copyPrompt(${prompt.id})" class="btn btn-primary" style="flex: 1; padding: 0.5rem; font-size: 0.8rem;">
                                📋 Copy
                            </button>
                            <button onclick="PromptLibraryModule.showAddModal(PromptLibraryModule.prompts.find(p => p.id === ${prompt.id}))" class="btn btn-secondary" style="padding: 0.5rem; font-size: 0.8rem;">
                                ✏️
                            </button>
                            <button onclick="PromptLibraryModule.deletePrompt(${prompt.id})" class="btn" style="padding: 0.5rem; font-size: 0.8rem; background: var(--bg-tertiary);">
                                🗑️
                            </button>
                        </div>
                        ${prompt.usageCount > 0 ? `
                            <div style="position: absolute; top: 0.5rem; right: 0.5rem; font-size: 0.65rem; color: var(--text-muted);">
                                Đã dùng ${prompt.usageCount} lần
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    },

    closeModal() {
        const modal = document.getElementById('videoModal');
        if (modal) modal.classList.remove('active');
    }
};
