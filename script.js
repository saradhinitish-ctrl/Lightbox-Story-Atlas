// Lightbox Studio - Core Engine v65 (Local-First & Fountain Parser)
class LightboxEngine {
    constructor() {
        this.state = {
            projectTitle: "Untitled Story",
            author: "BITRA NITISH SARADHI",
            content: "INT. LIGHTBOX STUDIO - DAY\n\nA blank digital canvas glowing in the dark.\n\nBITRA NITISH SARADHI types furiously.\n\nNARRATOR (V.O.)\nLet's build something legendary.",
            scenes: [],
            pacingScore: 0
        };
        this.init();
    }

    init() {
        this.loadFromLocal();
        this.renderUI();
        this.setupEventListeners();
    }

    // Local-First Persistence (IndexedDB / LocalStorage Fallback)
    saveToLocal() {
        try {
            localStorage.setItem('lightbox_project', JSON.stringify(this.state));
            console.log("Lightbox: Project saved locally.");
        } catch (e) {
            console.error("Storage error:", e);
        }
    }

    loadFromLocal() {
        const saved = localStorage.getItem('lightbox_project');
        if (saved) {
            try {
                this.state = JSON.parse(saved);
            } catch (e) {
                console.error("Parse error:", e);
            }
        }
    }

    // Fountain Markup Parser
    parseFountain(text) {
        const lines = text.split('\n');
        let html = '';
        
        lines.forEach(line => {
            const trimmed = line.trim();
            if (!trimmed) {
                html += '<div class="spacer"></div>';
                return;
            }

            // Scene Headings (INT., EXT., etc.)
            if (/^(INT|EXT|EST|I\/E)\./i.test(trimmed)) {
                html += `<div class="script-line scene-heading">${this.escapeHTML(trimmed)}</div>`;
            } 
            // Character Names
            else if (trimmed === trimmed.toUpperCase() && trimmed.length < 30 && !trimmed.includes('.')) {
                html += `<div class="script-line character">${this.escapeHTML(trimmed)}</div>`;
            } 
            // Parentheticals
            else if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
                html += `<div class="script-line parenthetical">${this.escapeHTML(trimmed)}</div>`;
            } 
            // Action / Description
            else {
                html += `<div class="script-line action">${this.escapeHTML(trimmed)}</div>`;
            }
        });

        return html;
    }

    escapeHTML(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
        );
    }

    // Calculate basic pacing & stats
    analyzePacing() {
        const words = this.state.content.split(/\s+/).length;
        // Standard rule: ~1 page = 250 words = 1 minute screen time
        const estimatedMinutes = (words / 250).toFixed(1);
        return { words, estimatedMinutes };
    }

    renderUI() {
        const root = document.getElementById('root');
        if (!root) return;

        const stats = this.analyzePacing();
        const parsedHTML = this.parseFountain(this.state.content);

        root.innerHTML = `
            <div style="font-family: system-ui, sans-serif; background: #f5efdf; color: #1a1a1a; min-height: 100vh; padding: 24px; box-sizing: border-box;">
                <header style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1a1a1a; padding-bottom: 16px; margin-bottom: 24px;">
                    <div>
                        <h1 style="margin: 0; font-size: 1.8rem; font-weight: 800;">LIGHTBOX STUDIO</h1>
                        <p style="margin: 4px 0 0 0; font-size: 0.9rem; color: #555;">Auteur Workspace & Narrative Engine by ${this.state.author}</p>
                    </div>
                    <div style="background: #1a1a1a; color: #f5efdf; padding: 8px 16px; border-radius: 4px; font-size: 0.85rem; font-weight: 600;">
                        Words: ${stats.words} | Est. Runtime: ${stats.estimatedMinutes} min
                    </div>
                </header>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; height: calc(100vh - 140px);">
                    <!-- Editor Pane -->
                    <div style="display: flex; flex-direction: column; background: #ffffff; border: 2px solid #1a1a1a; border-radius: 8px; padding: 16px; box-shadow: 4px 4px 0px #1a1a1a;">
                        <label style="font-weight: 700; margin-bottom: 8px; font-size: 0.9rem; text-transform: uppercase;">Fountain Editor</label>
                        <textarea id="script-input" style="flex-grow: 1; font-family: 'Courier New', monospace; font-size: 1rem; border: 1px solid #ccc; padding: 12px; border-radius: 4px; resize: none; background: #faf8f5;">${this.state.content}</textarea>
                    </div>

                    <!-- Live Formatted Preview Pane -->
                    <div style="display: flex; flex-direction: column; background: #ffffff; border: 2px solid #1a1a1a; border-radius: 8px; padding: 16px; box-shadow: 4px 4px 0px #1a1a1a;">
                        <label style="font-weight: 700; margin-bottom: 8px; font-size: 0.9rem; text-transform: uppercase;">Cinematic Preview</label>
                        <div id="preview-output" style="flex-grow: 1; font-family: 'Courier New', monospace; font-size: 0.95rem; border: 1px solid #ccc; padding: 24px; border-radius: 4px; overflow-y: auto; background: #ffffff; line-height: 1.5;">
                            ${parsedHTML}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        const textarea = document.getElementById('script-input');
        if (textarea) {
            textarea.addEventListener('input', (e) => {
                this.state.content = e.target.value;
                this.saveToLocal();
                
                // Real-time DOM update for preview & stats without full re-render
                const preview = document.getElementById('preview-output');
                if (preview) {
                    preview.innerHTML = this.parseFountain(this.state.content);
                }
            });
        }
    }
}

// Launch engine on load
window.addEventListener('DOMContentLoaded', () => {
    window.lightboxApp = new LightboxEngine();
});
