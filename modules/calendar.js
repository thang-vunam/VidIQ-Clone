/**
 * VidIQ Clone - Content Calendar Module
 */

const CalendarModule = {
    currentDate: new Date(),
    events: [],

    /**
     * Initialize module
     */
    init() {
        this.loadEvents();
        this.bindEvents();
        this.render();
    },

    /**
     * Load events from localStorage
     */
    loadEvents() {
        const saved = localStorage.getItem('vidiq_calendar_events');
        if (saved) {
            this.events = JSON.parse(saved);
        }
    },

    /**
     * Save events to localStorage
     */
    saveEvents() {
        localStorage.setItem('vidiq_calendar_events', JSON.stringify(this.events));
    },

    /**
     * Bind event listeners
     */
    bindEvents() {
        document.getElementById('prevMonthBtn')?.addEventListener('click', () => this.prevMonth());
        document.getElementById('nextMonthBtn')?.addEventListener('click', () => this.nextMonth());
        document.getElementById('addVideoBtn')?.addEventListener('click', () => this.showAddModal());
    },

    /**
     * Navigate to previous month
     */
    prevMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.render();
    },

    /**
     * Navigate to next month
     */
    nextMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.render();
    },

    /**
     * Render calendar
     */
    render() {
        this.updateTitle();
        this.renderGrid();
    },

    /**
     * Update calendar title
     */
    updateTitle() {
        const title = document.getElementById('calendarTitle');
        if (title) {
            const monthName = i18n.getMonthName(this.currentDate.getMonth());
            const year = this.currentDate.getFullYear();
            title.textContent = `${monthName}, ${year}`;
        }
    },

    /**
     * Render calendar grid
     */
    renderGrid() {
        const grid = document.getElementById('calendarGrid');
        if (!grid) return;

        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        // Get first day of month and number of days
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDay = firstDay.getDay();

        // Get days from previous month
        const prevMonthDays = new Date(year, month, 0).getDate();

        // Day names
        const dayNames = i18n.getDayNames();

        let html = '';

        // Render day headers
        dayNames.forEach(day => {
            html += `<div class="calendar-day-header">${day}</div>`;
        });

        // Previous month days
        for (let i = startingDay - 1; i >= 0; i--) {
            const day = prevMonthDays - i;
            html += `<div class="calendar-day other-month"><span class="day-number">${day}</span></div>`;
        }

        // Current month days
        const today = new Date();
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
            const dayEvents = this.getEventsForDate(dateStr);

            html += `
                <div class="calendar-day ${isToday ? 'today' : ''}" data-date="${dateStr}" onclick="CalendarModule.showDayModal('${dateStr}')">
                    <span class="day-number">${day}</span>
                    <div class="day-events">
                        ${dayEvents.slice(0, 2).map(e => `<div class="day-event" style="background: ${this.getStatusColor(e.status)}">${e.title.substring(0, 15)}${e.title.length > 15 ? '...' : ''}</div>`).join('')}
                        ${dayEvents.length > 2 ? `<div style="font-size: 0.7rem; color: var(--text-muted);">+${dayEvents.length - 2} more</div>` : ''}
                    </div>
                </div>
            `;
        }

        // Next month days
        const totalCells = startingDay + daysInMonth;
        const remainingCells = 7 - (totalCells % 7);
        if (remainingCells < 7) {
            for (let day = 1; day <= remainingCells; day++) {
                html += `<div class="calendar-day other-month"><span class="day-number">${day}</span></div>`;
            }
        }

        grid.innerHTML = html;
    },

    /**
     * Get events for a specific date
     * @param {string} dateStr - Date string (YYYY-MM-DD)
     * @returns {Array} Events for the date
     */
    getEventsForDate(dateStr) {
        return this.events.filter(e => e.date === dateStr);
    },

    /**
     * Get status color
     * @param {string} status - Event status
     * @returns {string} CSS color
     */
    getStatusColor(status) {
        const colors = {
            idea: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
            script: 'linear-gradient(135deg, #F59E0B, #EAB308)',
            filming: 'linear-gradient(135deg, #3B82F6, #2563EB)',
            editing: 'linear-gradient(135deg, #EC4899, #DB2777)',
            published: 'linear-gradient(135deg, #10B981, #059669)'
        };
        return colors[status] || colors.idea;
    },

    /**
     * Show add video modal
     */
    showAddModal(date = null) {
        const modal = document.getElementById('videoModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');

        if (!modal || !modalBody) return;

        const defaultDate = date || new Date().toISOString().split('T')[0];

        modalTitle.textContent = 'Thêm Video mới';
        modalBody.innerHTML = `
            <form id="addVideoForm">
                <div class="form-group">
                    <label>Tiêu đề video:</label>
                    <input type="text" id="videoTitleInput" class="input-field" placeholder="Nhập tiêu đề..." required>
                </div>
                <div class="form-group">
                    <label>Ngày đăng dự kiến:</label>
                    <input type="date" id="videoDateInput" class="input-field" value="${defaultDate}" required>
                </div>
                <div class="form-group">
                    <label>Trạng thái:</label>
                    <select id="videoStatusInput" class="select-input" style="width: 100%;">
                        <option value="idea">💡 Ý tưởng</option>
                        <option value="script">📝 Viết script</option>
                        <option value="filming">🎬 Quay</option>
                        <option value="editing">✂️ Chỉnh sửa</option>
                        <option value="published">✅ Đã đăng</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Ghi chú:</label>
                    <textarea id="videoNotesInput" class="textarea-field" rows="3" placeholder="Ghi chú thêm..."></textarea>
                </div>
                <button type="submit" class="btn btn-primary" style="width: 100%;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px;">
                        <line x1="12" y1="5" x2="12" y2="19"/>
                        <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Thêm Video
                </button>
            </form>
        `;

        modal.classList.add('active');

        // Bind form submit
        document.getElementById('addVideoForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addVideo();
        });

        // Close modal handlers
        document.getElementById('closeModal')?.addEventListener('click', () => this.closeModal());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeModal();
        });
    },

    /**
     * Show day modal with events
     * @param {string} dateStr - Date string
     */
    showDayModal(dateStr) {
        const modal = document.getElementById('videoModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');

        if (!modal || !modalBody) return;

        const events = this.getEventsForDate(dateStr);
        const dateObj = new Date(dateStr);
        const formattedDate = dateObj.toLocaleDateString('vi-VN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const statusLabels = {
            idea: '💡 Ý tưởng',
            script: '📝 Viết script',
            filming: '🎬 Quay',
            editing: '✂️ Chỉnh sửa',
            published: '✅ Đã đăng'
        };

        modalTitle.textContent = formattedDate;
        modalBody.innerHTML = `
            ${events.length > 0 ? `
                <div style="margin-bottom: 1.5rem;">
                    ${events.map(e => `
                        <div style="padding: 1rem; background: var(--bg-tertiary); border-radius: 0.5rem; margin-bottom: 0.5rem; border-left: 3px solid ${e.status === 'published' ? 'var(--success)' : 'var(--warning)'};">
                            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                                <h4 style="margin: 0;">${e.title}</h4>
                                <button class="btn btn-icon" style="width: 30px; height: 30px;" onclick="CalendarModule.deleteEvent('${e.id}')">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
                                        <polyline points="3 6 5 6 21 6"/>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                    </svg>
                                </button>
                            </div>
                            <p style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.5rem;">${statusLabels[e.status]}</p>
                            ${e.notes ? `<p style="font-size: 0.875rem; color: var(--text-muted);">${e.notes}</p>` : ''}
                        </div>
                    `).join('')}
                </div>
            ` : `
                <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
                    <p>Không có video nào được lên lịch</p>
                </div>
            `}
            <button class="btn btn-primary" style="width: 100%;" onclick="CalendarModule.showAddModal('${dateStr}')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px;">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Thêm Video cho ngày này
            </button>
        `;

        modal.classList.add('active');

        // Close modal handlers
        document.getElementById('closeModal')?.addEventListener('click', () => this.closeModal());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeModal();
        });
    },

    /**
     * Add video event
     */
    addVideo() {
        const title = document.getElementById('videoTitleInput')?.value.trim();
        const date = document.getElementById('videoDateInput')?.value;
        const status = document.getElementById('videoStatusInput')?.value;
        const notes = document.getElementById('videoNotesInput')?.value.trim();

        if (!title || !date) {
            app.showToast('Vui lòng nhập tiêu đề và ngày', 'warning');
            return;
        }

        const event = {
            id: Date.now().toString(),
            title,
            date,
            status: status || 'idea',
            notes
        };

        this.events.push(event);
        this.saveEvents();
        this.render();
        this.closeModal();

        app.showToast('Đã thêm video vào lịch!', 'success');
    },

    /**
     * Delete event
     * @param {string} id - Event ID
     */
    deleteEvent(id) {
        this.events = this.events.filter(e => e.id !== id);
        this.saveEvents();
        this.render();
        this.closeModal();
        app.showToast('Đã xóa video', 'success');
    },

    /**
     * Close modal
     */
    closeModal() {
        const modal = document.getElementById('videoModal');
        if (modal) modal.classList.remove('active');
    }
};
