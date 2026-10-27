// Lightbox Studio - Core Engine v66 (Fountain Parser + Pacing Analytics + Node Canvas)
class LightboxEngine {
    constructor() {
        this.state = {
            projectTitle: "Untitled Story",
            author: "BITRA NITISH SARADHI",
            content: "INT. LIGHTBOX STUDIO - DAY\n\nA blank digital canvas glowing in the dark.\n\nBITRA NITISH SARADHI types furiously.\n\nNARRATOR (V.O.)\nLet's build something legendary.",
            currentTab: 'editor', // 'editor' or 'canvas'
            nodes: [
                { id: 1, title: "Act I: Inciting Incident", x: 50, y: 50 },
                { id: 2, title: "Act II: Midpoint Reversal", x: 350, y: 150 },
                { id: 3, title: "Act III: Climax & Resolution", x: 650, y: 250 }
            ]
        };
        this.init();
    }

    init() {
        this.loadFromLocal();
        this.renderUI();
        this.setupEventListeners();
    }

    saveToLocal() {
        try {
            localStorage.setItem('lightbox_project', JSON.stringify(this.state));
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

    parseFountain(text) {
        const lines = text.split('\n');
        let html = '';
        
        lines.forEach(line => {
            const trimmed = line.trim();
            if (!trimmed) {
                html += '<div class="spacer"></div>';
                return;
            }

            if (/^(INT|EXT|EST|I\/E)\./i.test(trimmed)) {
                html += `<div class="script-line scene-heading">${this.escapeHTML(trimmed)}</div>`;
            } else if (trimmed === trimmed.toUpperCase() && trimmed.length < 30 && !trimmed.includes('.')) {
                html += `<div class="script-line character">${this.escapeHTML(trimmed)}</div>`;
            } else if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
                html += `<div class="script-line parenthetical">${this.escapeHTML(trimmed)}</div>`;
            } else {
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

    analyzePacing() {
        const words = this.state.content.split(/\s+/).filter(w => w.length > 0).length;
        const estimatedMinutes = (words / 250).toFixed(1);
        const dialogueLines = (this.state.content.match(/^[A-Z\s]+$/gm) || []).length;
        const actionDensity = words > 0 ? Math.round((dialogueLines / words) * 100) : 0;
        return { words, estimatedMinutes, actionDensity };
    }

    renderUI() {
        const root = document.getElementById('root');
        if (!root) return;

        const stats = this.analyzePacing();
        const parsedHTML = this.parseFountain(this.state.content);

        root.innerHTML = `
            <div style="font-family: system-ui, sans-serif; background: #f5efdf; color: #1a1a1a; min-height: 100vh; padding: 24px; box-sizing: border-box; display: flex; flex-direction: column;">
                <header style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1a1a1a; padding-bottom: 16px; margin-bottom: 20px;">
                    <div>
                        <h1 style="margin: 0; font-size: 1.8rem; font-weight: 800; letter-spacing: -0.5px;">LIGHTBOX STUDIO</h1>
                        <p style="margin: 4px 0 0 0; font-size: 0.9rem; color: #555;">Auteur Workspace & Narrative Engine by ${this.state.author}</p>
                    </div>
                    <div style="display: flex; gap: 12px; align-items: center;">
                        <div style="background: #ffffff; border: 2px solid #1a1a1a; padding: 6px 12px; border-radius: 4px; font-size: 0.85rem; font-weight: 600;">
                            Words: ${stats.words} | Runtime: ${stats.estimatedMinutes}m | Dialogue Ratio: ${stats.actionDensity}%
                        </div>
                        <button id="tab-editor" style="padding: 8px 16px; font-weight: 700; background: ${this.state.currentTab === 'editor' ? '#1a1a1a' : '#ffffff'}; color: ${this.state.currentTab === 'editor' ? '#f5efdf' : '#1a1a1a'}; border: 2px solid #1a1a1a; border-radius: 4px; cursor: pointer;">Script Editor</button>
                        <button id="tab-canvas" style="padding: 8px 16px; font-weight: 700; background: ${this.state.currentTab === 'canvas' ? '#1a1a1a' : '#ffffff'}; color: ${this.state.currentTab === 'canvas' ? '#f5efdf' : '#1a1a1a'}; border: 2px solid #1a1a1a; border-radius: 4px; cursor: pointer;">Story Atlas Canvas</button>
                    </div>
                </header>

                <main style="flex-grow: 1; display: flex; flex-direction: column;">
                    ${this.state.currentTab === 'editor' ? `
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; height: calc(100vh - 140px);">
                            <div style="display: flex; flex-direction: column; background: #ffffff; border: 2px solid #1a1a1a; border-radius: 8px; padding: 16px; box-shadow: 4px 4px 0px #1a1a1a;">
                                <label style="font-weight: 700; margin-bottom: 8px; font-size: 0.9rem; text-transform: uppercase;">Fountain Editor</label>
                                <textarea id="script-input" style="flex-grow: 1; font-family: 'Courier New', monospace; font-size: 1rem; border: 1px solid #ccc; padding: 12px; border-radius: 4px; resize: none; background: #faf8f5;">${this.state.content}</textarea>
                            </div>
                            <div style="display: flex; flex-direction: column; background: #ffffff; border: 2px solid #1a1a1a; border-radius: 8px; padding: 16px; box-shadow: 4px 4px 0px #1a1a1a;">
                                <label style="font-weight: 700; margin-bottom: 8px; font-size: 0.9rem; text-transform: uppercase;">Cinematic Preview</label>
                                <div id="preview-output" style="flex-grow: 1; font-family: 'Courier New', monospace; font-size: 0.95rem; border: 1px solid #ccc; padding: 24px; border-radius: 4px; overflow-y: auto; background: #ffffff; line-height: 1.5;">
                                    ${parsedHTML}
                                </div>
                            </div>
                        </div>
                    ` : `
                        <div style="flex-grow: 1; background: #ffffff; border: 2px solid #1a1a1a; border-radius: 8px; padding: 24px; box-shadow: 4px 4px 0px #1a1a1a; position: relative; overflow: hidden; height: calc(100vh - 140px);">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                                <h3 style="margin: 0; font-size: 1.1rem; text-transform: uppercase;">Interactive Narrative Map</h3>
                                <button id="add-node-btn" style="padding: 6px 12px; background: #1a1a1a; color: #f5efdf; border: none; border-radius: 4px; font-weight: 600; cursor: pointer;">+ Add Story Beat</button>
                            </div>
                            <div id="canvas-area" style="position: relative; width: 100%; height: calc(100% - 60px); background: #faf8f5; border: 1px dashed #1a1a1a; border-radius: 6px; overflow: auto;">
                                ${this.state.nodes.map(node => `
                                    <div class="story-node" data-id="${node.id}" style="position: absolute; left: ${node.x}px; top: ${node.y}px; background: #ffffff; border: 2px solid #1a1a1a; padding: 16px; border-radius: 6px; width: 220px; box-shadow: 3px 3px 0px #1a1a1a; cursor: grab;">
                                        <div style="font-weight: 700; font-size: 0.9rem; margin-bottom: 6px;">${node.title}</div>
                                        <div style="font-size: 0.8rem; color: #666;">Drag to map narrative flow across your structural acts.</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `}
                </main>
            </div>
        `;
    }

    setupEventListeners() {
        const textarea = document.getElementById('script-input');
        if (textarea) {
            textarea.addEventListener('input', (e) => {
                this.state.content = e.target.value;
                this.saveToLocal();
                const preview = document.getElementById('preview-output');
                if (preview) {
                    preview.innerHTML = this.parseFountain(this.state.content);
                }
            });
        }

        document.getElementById('tab-editor')?.addEventListener('click', () => {
            this.state.currentTab = 'editor';
            this.renderUI();
            this.setupEventListeners();
        });

        document.getElementById('tab-canvas')?.addEventListener('click', () => {
            this.state.currentTab = 'canvas';
            this.renderUI();
            this.setupEventListeners();
        });

        document.getElementById('add-node-btn')?.addEventListener('click', () => {
            const newNode = {
                id: Date.now(),
                title: `New Scene Beat #${this.state.nodes.length + 1}`,
                x: 100 + (this.state.nodes.length * 40) % 400,
                y: 100 + (this.state.nodes.length * 30) % 200
            };
            this.state.nodes.push(newNode);
            this.saveToLocal();
            this.renderUI();
            this.setupEventListeners();
        });

        // Basic Node Drag Interaction
        let activeNode = null;
        let offsetX = 0, offsetY = 0;

        document.querySelectorAll('.story-node').forEach(nodeEl => {
            nodeEl.addEventListener('mousedown', (e) => {
                activeNode = this.state.nodes.find(n => n.id == nodeEl.dataset.id);
                const rect = nodeEl.getBoundingClientRect();
                offsetX = e.clientX - rect.left;
                offsetY = e.clientY - rect.top;
                e.preventDefault();
            });
        });

        const canvasArea = document.getElementById('canvas-area');
        if (canvasArea) {
            canvasArea.addEventListener('mousemove', (e) => {
                if (!activeNode) return;
                const rect = canvasArea.getBoundingClientRect();
                activeNode.x = e.clientX - rect.left - offsetX;
                activeNode.y = e.clientY - rect.top - offsetY;
                
                const el = document.querySelector(`[data-id='${activeNode.id}']`);
                if (el) {
                    el.style.left = `${activeNode.x}px`;
                    el.style.top = `${activeNode.y}px`;
                }
            });

            window.addEventListener('mouseup', () => {
                if (activeNode) {
                    this.saveToLocal();
                    activeNode = null;
                }
            });
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.lightboxApp = new LightboxEngine();
});
