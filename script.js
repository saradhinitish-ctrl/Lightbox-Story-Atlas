// Lightbox Studio - Original Modular Workspace Engine
class LightboxApp {
    constructor() {
        this.state = {
            activeTab: 'writing',
            projectTitle: 'Lightbox Studio',
            author: 'BITRA NITISH SARADHI',
            content: '',
            notes: []
        };
        this.init();
    }

    init() {
        this.loadStorage();
        this.render();
        this.bindEvents();
    }

    loadStorage() {
        const saved = localStorage.getItem('lightbox_workspace');
        if (saved) {
            try {
                this.state = JSON.parse(saved);
            } catch (e) {
                console.error("Failed to load saved state", e);
            }
        }
    }

    saveStorage() {
        localStorage.setItem('lightbox_workspace', JSON.stringify(this.state));
    }

    render() {
        const root = document.getElementById('root');
        if (!root) return;

        root.innerHTML = `
            <div class="lightbox-container" style="font-family: system-ui, -apple-system, sans-serif; background: #f5efdf; color: #1a1a1a; min-height: 100vh; display: flex; flex-direction: column;">
                <!-- Header -->
                <header style="background: #ffffff; border-bottom: 2px solid #1a1a1a; padding: 16px 24px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h1 style="margin: 0; font-size: 1.4rem; font-weight: 800; letter-spacing: -0.5px;">LIGHTBOX STUDIO</h1>
                        <span style="font-size: 0.8rem; color: #666; font-weight: 600;">Architect: ${this.state.author}</span>
                    </div>
                    <nav style="display: flex; gap: 8px;">
                        <button class="nav-tab ${this.state.activeTab === 'writing' ? 'active' : ''}" data-tab="writing" style="padding: 6px 14px; font-weight: 700; border: 2px solid #1a1a1a; background: ${this.state.activeTab === 'writing' ? '#1a1a1a' : '#fff'}; color: ${this.state.activeTab === 'writing' ? '#f5efdf' : '#1a1a1a'}; border-radius: 4px; cursor: pointer;">Writing</button>
                        <button class="nav-tab ${this.state.activeTab === 'atlas' ? 'active' : ''}" data-tab="atlas" style="padding: 6px 14px; font-weight: 700; border: 2px solid #1a1a1a; background: ${this.state.activeTab === 'atlas' ? '#1a1a1a' : '#fff'}; color: ${this.state.activeTab === 'atlas' ? '#f5efdf' : '#1a1a1a'}; border-radius: 4px; cursor: pointer;">Atlas</button>
                        <button class="nav-tab ${this.state.activeTab === 'visuals' ? 'active' : ''}" data-tab="visuals" style="padding: 6px 14px; font-weight: 700; border: 2px solid #1a1a1a; background: ${this.state.activeTab === 'visuals' ? '#1a1a1a' : '#fff'}; color: ${this.state.activeTab === 'visuals' ? '#f5efdf' : '#1a1a1a'}; border-radius: 4px; cursor: pointer;">Visuals</button>
                        <button class="nav-tab ${this.state.activeTab === 'breakdown' ? 'active' : ''}" data-tab="breakdown" style="padding: 6px 14px; font-weight: 700; border: 2px solid #1a1a1a; background: ${this.state.activeTab === 'breakdown' ? '#1a1a1a' : '#fff'}; color: ${this.state.activeTab === 'breakdown' ? '#f5efdf' : '#1a1a1a'}; border-radius: 4px; cursor: pointer;">Breakdown</button>
                    </nav>
                </header>

                <!-- Main Content Area -->
                <main style="flex: 1; padding: 24px; max-width: 1200px; width: 100%; margin: 0 auto; box-sizing: border-box;">
                    ${this.renderActiveTabContent()}
                </main>
            </div>
        `;
    }

    renderActiveTabContent() {
        switch (this.state.activeTab) {
            case 'atlas':
                return `
                    <div style="background: #fff; border: 2px solid #1a1a1a; padding: 24px; border-radius: 8px; box-shadow: 4px 4px 0px #1a1a1a;">
                        <h2 style="margin-top: 0;">Story Atlas & Scene Map</h2>
                        <p style="color: #555;">Visual narrative mapping and structural act organization.</p>
                    </div>
                `;
            case 'visuals':
                return `
                    <div style="background: #fff; border: 2px solid #1a1a1a; padding: 24px; border-radius: 8px; box-shadow: 4px 4px 0px #1a1a1a;">
                        <h2 style="margin-top: 0;">Visual Worldbuilder</h2>
                        <p style="color: #555;">Aesthetic motifs, character cards, and moodboard references.</p>
                    </div>
                `;
            case 'breakdown':
                return `
                    <div style="background: #fff; border: 2px solid #1a1a1a; padding: 24px; border-radius: 8px; box-shadow: 4px 4px 0px #1a1a1a;">
                        <h2 style="margin-top: 0;">Script Breakdown & Sequence Notes</h2>
                        <p style="color: #555;">Detailed beat sheets, pacing schedules, and production notes.</p>
                    </div>
                `;
            case 'writing':
            default:
                const wordCount = this.state.content.trim() ? this.state.content.trim().split(/\s+/).length : 0;
                return `
                    <div style="display: flex; flex-direction: column; height: calc(100vh - 180px); background: #fff; border: 2px solid #1a1a1a; padding: 20px; border-radius: 8px; box-shadow: 4px 4px 0px #1a1a1a;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                            <span style="font-weight: 700; font-size: 0.9rem; text-transform: uppercase;">Screenplay Canvas</span>
                            <span id="word-count" style="font-size: 0.85rem; font-weight: 600; color: #555;">Words: ${wordCount}</span>
                        </div>
                        <textarea id="lightbox-editor" style="flex: 1; border: 1px solid #ccc; padding: 16px; font-family: 'Courier New', monospace; font-size: 1rem; border-radius: 4px; resize: none; background: #faf8f5; outline: none; line-height: 1.5;">${this.state.content}</textarea>
                    </div>
                `;
        }
    }

    bindEvents() {
        document.querySelectorAll('.nav-tab').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.state.activeTab = e.target.dataset.tab;
                this.render();
                this.bindEvents();
            });
        });

        const editor = document.getElementById('lightbox-editor');
        if (editor) {
            editor.addEventListener('input', (e) => {
                this.state.content = e.target.value;
                this.saveStorage();
                
                const words = this.state.content.trim() ? this.state.content.trim().split(/\s+/).length : 0;
                const wordCountEl = document.getElementById('word-count');
                if (wordCountEl) {
                    wordCountEl.textContent = `Words: ${words}`;
                }
            });
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.lightboxApp = new LightboxApp();
});
