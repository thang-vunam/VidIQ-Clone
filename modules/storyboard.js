/**
 * VidIQ Clone - Storyboard Generator Module
 * Converts scripts into structured scene breakdowns
 */

const StoryboardModule = {
    scenes: [],

    init() {
        this.bindEvents();
    },

    bindEvents() {
        document.getElementById('generateStoryboardBtn')?.addEventListener('click', () => this.generateStoryboard());
        document.getElementById('addSceneBtn')?.addEventListener('click', () => this.addScene());
        document.getElementById('exportStoryboardBtn')?.addEventListener('click', () => this.exportToClipboard());
        document.getElementById('clearStoryboardBtn')?.addEventListener('click', () => this.clearAll());
    },

    generateStoryboard() {
        const scriptInput = document.getElementById('storyboardScript');
        const script = scriptInput?.value.trim();

        if (!script) {
            app.showToast('Vui lòng nhập kịch bản', 'warning');
            return;
        }

        // Parse script into scenes (split by double newline or numbered sections)
        const paragraphs = script.split(/\n\n+|\n(?=\d+\.|\*\*|\[)/g).filter(p => p.trim());

        this.scenes = paragraphs.map((text, index) => ({
            id: Date.now() + index,
            sceneNumber: index + 1,
            timestamp: this.estimateTimestamp(index, paragraphs.length),
            dialogue: text.trim(),
            visual: this.suggestVisual(text),
            notes: ''
        }));

        this.render();
        app.showToast(`Đã tạo ${this.scenes.length} phân cảnh`, 'success');
    },

    estimateTimestamp(index, total) {
        // Estimate ~5 seconds per scene for a 1-minute video
        const secondsPerScene = 5;
        const startSec = index * secondsPerScene;
        const min = Math.floor(startSec / 60);
        const sec = startSec % 60;
        return `${min}:${String(sec).padStart(2, '0')}`;
    },

    suggestVisual(text) {
        // Simple keyword-based visual suggestions
        const lowerText = text.toLowerCase();

        if (lowerText.includes('hook') || lowerText.includes('mở đầu')) {
            return 'Close-up mặt người với biểu cảm ngạc nhiên/tò mò';
        }
        if (lowerText.includes('bước 1') || lowerText.includes('step 1')) {
            return 'Hình minh họa bước đầu tiên, icon số 1';
        }
        if (lowerText.includes('bước 2') || lowerText.includes('step 2')) {
            return 'Hình minh họa bước thứ hai, icon số 2';
        }
        if (lowerText.includes('bước 3') || lowerText.includes('step 3')) {
            return 'Hình minh họa bước thứ ba, icon số 3';
        }
        if (lowerText.includes('kết') || lowerText.includes('cta') || lowerText.includes('follow')) {
            return 'Logo kênh, nút Subscribe, animation kêu gọi hành động';
        }
        if (lowerText.includes('sai') || lowerText.includes('lỗi') || lowerText.includes('không nên')) {
            return 'Dấu X đỏ, biểu tượng cảnh báo';
        }
        if (lowerText.includes('đúng') || lowerText.includes('nên') || lowerText.includes('tip')) {
            return 'Dấu check xanh, biểu tượng bóng đèn';
        }

        return 'Hình minh họa phù hợp với nội dung';
    },

    addScene() {
        const newScene = {
            id: Date.now(),
            sceneNumber: this.scenes.length + 1,
            timestamp: this.estimateTimestamp(this.scenes.length, this.scenes.length + 1),
            dialogue: '',
            visual: '',
            notes: ''
        };
        this.scenes.push(newScene);
        this.render();
    },

    deleteScene(id) {
        this.scenes = this.scenes.filter(s => s.id !== id);
        // Renumber scenes
        this.scenes.forEach((s, i) => s.sceneNumber = i + 1);
        this.render();
    },

    updateScene(id, field, value) {
        const scene = this.scenes.find(s => s.id === id);
        if (scene) {
            scene[field] = value;
        }
    },

    render() {
        const container = document.getElementById('storyboardResults');
        if (!container) return;

        if (this.scenes.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
                    <p>Chưa có phân cảnh nào. Nhập kịch bản và bấm "Tạo Storyboard".</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="storyboard-table-wrapper" style="overflow-x: auto;">
                <table class="storyboard-table" style="width: 100%; border-collapse: collapse; font-size: 0.875rem;">
                    <thead>
                        <tr style="background: var(--bg-tertiary);">
                            <th style="padding: 0.75rem; text-align: center; width: 60px;">Cảnh</th>
                            <th style="padding: 0.75rem; text-align: center; width: 80px;">Thời gian</th>
                            <th style="padding: 0.75rem; text-align: left; width: 35%;">Lời thoại / Voiceover</th>
                            <th style="padding: 0.75rem; text-align: left; width: 30%;">Mô tả hình ảnh</th>
                            <th style="padding: 0.75rem; text-align: left;">Ghi chú</th>
                            <th style="padding: 0.75rem; width: 50px;"></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.scenes.map(scene => `
                            <tr style="border-bottom: 1px solid var(--bg-tertiary);" data-id="${scene.id}">
                                <td style="padding: 0.5rem; text-align: center; font-weight: 600; color: var(--primary);">
                                    ${scene.sceneNumber}
                                </td>
                                <td style="padding: 0.5rem;">
                                    <input type="text" value="${scene.timestamp}" 
                                        style="width: 100%; background: var(--bg-secondary); border: 1px solid var(--bg-tertiary); border-radius: 4px; padding: 0.25rem; color: var(--text-primary); text-align: center;"
                                        onchange="StoryboardModule.updateScene(${scene.id}, 'timestamp', this.value)">
                                </td>
                                <td style="padding: 0.5rem;">
                                    <textarea rows="3" style="width: 100%; background: var(--bg-secondary); border: 1px solid var(--bg-tertiary); border-radius: 4px; padding: 0.5rem; color: var(--text-primary); resize: vertical;"
                                        onchange="StoryboardModule.updateScene(${scene.id}, 'dialogue', this.value)">${scene.dialogue}</textarea>
                                </td>
                                <td style="padding: 0.5rem;">
                                    <textarea rows="3" style="width: 100%; background: var(--bg-secondary); border: 1px solid var(--bg-tertiary); border-radius: 4px; padding: 0.5rem; color: var(--text-primary); resize: vertical;"
                                        onchange="StoryboardModule.updateScene(${scene.id}, 'visual', this.value)">${scene.visual}</textarea>
                                </td>
                                <td style="padding: 0.5rem;">
                                    <input type="text" value="${scene.notes}" placeholder="Ghi chú..."
                                        style="width: 100%; background: var(--bg-secondary); border: 1px solid var(--bg-tertiary); border-radius: 4px; padding: 0.25rem; color: var(--text-primary);"
                                        onchange="StoryboardModule.updateScene(${scene.id}, 'notes', this.value)">
                                </td>
                                <td style="padding: 0.5rem; text-align: center;">
                                    <button onclick="StoryboardModule.deleteScene(${scene.id})" 
                                        style="background: none; border: none; color: var(--error); cursor: pointer; padding: 0.25rem;" title="Xóa">
                                        🗑️
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    exportToClipboard() {
        if (this.scenes.length === 0) {
            app.showToast('Chưa có phân cảnh để xuất', 'warning');
            return;
        }

        const header = 'Cảnh\tThời gian\tLời thoại\tMô tả hình ảnh\tGhi chú\n';
        const rows = this.scenes.map(s =>
            `${s.sceneNumber}\t${s.timestamp}\t${s.dialogue.replace(/\n/g, ' ')}\t${s.visual}\t${s.notes}`
        ).join('\n');

        navigator.clipboard.writeText(header + rows).then(() => {
            app.showToast('Đã copy storyboard (định dạng bảng)', 'success');
        });
    },

    clearAll() {
        if (this.scenes.length === 0) return;
        if (confirm('Xóa tất cả phân cảnh?')) {
            this.scenes = [];
            this.render();
            app.showToast('Đã xóa storyboard', 'success');
        }
    }
};
