import { EXPAND_ICON_SVG } from '../components/svg-icons';

// Inline tool to expand selected text using the /api/outliner/expand-passage endpoint
export class ExpandInlineTool {
    // Ensure only one global listener handles mini-toolbar events
    private static globalListenerInstalled: boolean = false;
    private static lastConstructedInstance: ExpandInlineTool | null = null;

    static isInline = true;
    static title = 'Expand';

    private api: any;
    private button: HTMLButtonElement;
    private skeletonEl: HTMLElement | null = null;
    private streamContainerEl: HTMLElement | null = null;
    private originalBlockEl: HTMLElement | null = null;
    private originalBlockPrevDisplay: string | null = null;
    private config: {
        endpoint: string;
        language?: 'en' | 'id';
        getDocument: () => Promise<any>;
        notify?: (msg: string) => void;
    };
    private working: boolean = false;
    private boundExpandCurrent?: () => void;

    constructor({ api, config }: { api: any; config: any; }) {
        this.api = api;
        this.config = config || {};
        this.button = document.createElement('button');
        this.button.type = 'button';
        this.button.className = 'ce-inline-tool';
        // Mark as AI tool and first in the AI group for styling a separator
        this.button.setAttribute('data-ai-tool', 'true');
        this.button.setAttribute('data-ai-first', 'true');
        // Create expand icon
        const icon = document.createElement('div');
        icon.innerHTML = EXPAND_ICON_SVG;
        this.button.appendChild(icon);
        this.button.title = 'Expand with AI';

        // Track latest constructed instance so the single global listener can delegate to it
        try { ExpandInlineTool.lastConstructedInstance = this; } catch { }

        // Install a single global listener once to avoid duplicate handling from many instances
        if (!ExpandInlineTool.globalListenerInstalled) {
            try {
                const w = window as any;
                if (!w.__outliner_expand_listener_installed) {
                    window.addEventListener('outliner-ai-expand-current', () => {
                        try {
                            const inst = ExpandInlineTool.lastConstructedInstance;
                            if (!inst) return;
                            if (inst.working) return;
                            const selection = window.getSelection();
                            const range = selection && selection.rangeCount > 0
                                ? selection.getRangeAt(0)
                                : (document.createRange());
                            // @ts-ignore - Range is compatible with EditorJS inline tool API
                            inst.surround(range as any);
                        } catch { /* noop */ }
                    });
                    w.__outliner_expand_listener_installed = true;
                }
                ExpandInlineTool.globalListenerInstalled = true;
            } catch { /* noop */ }
        }
    }

    render() {
        return this.button;
    }

    checkState() {
        return false;
    }

    async surround(range: Range) {
        if (this.working) return;
        try {
            this.working = true;
            this.button.disabled = true;
            const selection = range?.cloneRange?.() || range;
            const selectedText = selection?.toString?.().trim?.() || '';

            // Insert a temporary skeleton just below the current block while loading
            this.skeletonEl = this.insertSkeletonBelowCurrentBlock(range);
            this.streamContainerEl = this.ensureStreamContainer(this.skeletonEl);

            const doc = await this.config.getDocument();
            const blocks: Array<any> = Array.isArray(doc?.blocks) ? doc.blocks : [];

            // Find title (first H1 header block)
            let title = '';
            for (const b of blocks) {
                if (b?.type === 'header' && b?.data?.level === 1 && typeof b?.data?.text === 'string') {
                    title = b.data.text;
                    break;
                }
            }

            // Current block index and text
            const currentIndex = typeof this.api?.blocks?.getCurrentBlockIndex === 'function'
                ? this.api.blocks.getCurrentBlockIndex()
                : -1;
            const currentBlock = currentIndex >= 0 ? blocks[currentIndex] : null;
            const currentText = (currentBlock?.data?.text && typeof currentBlock.data.text === 'string') ? currentBlock.data.text : '';

            // Collect up to 3 previous paragraph texts for context
            const previousParas: string[] = [];
            if (currentIndex > 0) {
                for (let i = currentIndex - 1; i >= 0 && previousParas.length < 3; i--) {
                    const b = blocks[i];
                    if (b?.type === 'paragraph' && typeof b?.data?.text === 'string' && b.data.text.trim()) {
                        previousParas.unshift(b.data.text);
                    }
                }
            }

            // Collect up to 2 next paragraph texts for context
            const nextParas: string[] = [];
            if (currentIndex >= 0 && currentIndex < blocks.length - 1) {
                for (let i = currentIndex + 1; i < blocks.length && nextParas.length < 2; i++) {
                    const b = blocks[i];
                    if (b?.type === 'paragraph' && typeof b?.data?.text === 'string' && b.data.text.trim()) {
                        nextParas.push(b.data.text);
                    }
                }
            }

            // Find the nearest section header above current block to understand context
            let currentSection = '';
            if (currentIndex > 0) {
                for (let i = currentIndex - 1; i >= 0; i--) {
                    const b = blocks[i];
                    if (b?.type === 'header' && b?.data?.level === 2 && typeof b?.data?.text === 'string') {
                        currentSection = b.data.text;
                        break;
                    }
                }
            }

            const focusText = selectedText || currentText || '';
            if (!focusText) {
                this.config.notify?.('Select text or place cursor in a paragraph to expand.');
                this.removeSkeleton();
                return;
            }

            // Build enhanced context for API with better structure
            const contextParts: string[] = [];
            if (title) contextParts.push(`Document Title: ${title}`);
            if (currentSection) contextParts.push(`Current Section: ${currentSection}`);
            if (previousParas.length) {
                contextParts.push(`Previous Context:\n${previousParas.join('\n\n')}`);
            }
            contextParts.push(`Text to Expand:\n${focusText}`);
            if (nextParas.length) {
                contextParts.push(`Following Context:\n${nextParas.join('\n\n')}`);
            }
            const contextText = contextParts.join('\n\n---\n\n');

            // Call API with streaming header
            console.log('ExpandInlineTool: Calling API with language:', this.config.language || 'en');
            const res = await fetch(this.config.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'text/plain, application/json',
                    'x-stream': '1'
                },
                body: JSON.stringify({ 
                    text: contextText,
                    language: this.config.language || 'en',
                    section: currentSection || 'Unknown'
                })
            });

            // If server does not support streaming, fall back to JSON mode
            const contentType = (res.headers.get('Content-Type') || '').toLowerCase();
            if (!res.ok) {
                let errMsg = `Request failed with ${res.status}`;
                try {
                    const e = await res.json();
                    if (e?.error) errMsg = e.error;
                } catch {}
                throw new Error(errMsg);
            }

            let finalText = '';
            if (contentType.includes('text/plain')) {
                const reader = res.body?.getReader();
                const decoder = new TextDecoder();
                let buffered = '';
                let firstChunk = true;
                if (reader) {
                    while (true) {
                        const { value, done } = await reader.read();
                        if (done) break;
                        const chunk = decoder.decode(value, { stream: true });
                        buffered += chunk;
                        finalText = buffered;
                        if (firstChunk) {
                            firstChunk = false;
                            this.hideSkeletonPulse();
                        }
                        this.renderStreamingPreview(buffered);
                    }
                    try { buffered += decoder.decode(); } catch {}
                    finalText = buffered;
                } else {
                    // Environments without stream reader
                    finalText = await res.text();
                    this.hideSkeletonPulse();
                    this.renderStreamingPreview(finalText);
                }
            } else {
                // JSON fallback
                const json = await res.json();
                const paragraphs: string[] = Array.isArray(json?.paragraphs) ? json.paragraphs : [];
                finalText = paragraphs.join('\n\n');
                this.hideSkeletonPulse();
                this.renderStreamingPreview(finalText);
            }

            // Compute paragraphs from finalText
            const paragraphsFromText: string[] = String(finalText || '')
                .split(/\n\n+/)
                .map(p => p.trim())
                .filter(Boolean);

            if (!paragraphsFromText.length) {
                this.config.notify?.('No expanded content returned.');
                this.removeSkeleton();
                return;
            }

            // Instead of replacing, insert new paragraphs after the current block
            let insertionIndex = currentIndex >= 0 ? currentIndex + 1 : undefined as any;
            
            // If we have a specific selection, we might want to insert right after the selection
            if (selectedText && currentIndex >= 0) {
                insertionIndex = currentIndex + 1;
            }

            for (let i = 0; i < paragraphsFromText.length; i++) {
                const p = String(paragraphsFromText[i] || '').trim();
                if (!p) continue;
                const html = p.replace(/\n/g, '<br>');
                try {
                    this.api.blocks.insert('paragraph', { text: html }, {}, insertionIndex, false);
                    if (typeof insertionIndex === 'number') insertionIndex++;
                } catch {}
            }

            try {
                const lastIndex = (typeof insertionIndex === 'number' ? insertionIndex : this.api.blocks.getBlocksCount()) - 1;
                if (lastIndex >= 0) this.api.caret?.setToBlock?.(lastIndex, 'end');
            } catch {}

            this.config.notify?.('Expanded content added after selection.');
        } catch (e: any) {
            this.config.notify?.(e?.message || 'Failed to expand passage');
        } finally {
            this.working = false;
            this.button.disabled = false;
            this.removeSkeleton();
        }
    }

    private insertSkeletonBelowCurrentBlock(range: Range): HTMLElement | null {
        try {
            const anchorNode: Node | null = range?.startContainer || null;
            const element = (anchorNode instanceof Element ? anchorNode : anchorNode?.parentElement) as Element | null;
            const blockEl = element?.closest?.('.ce-block') as HTMLElement | null;
            if (!blockEl || !blockEl.parentElement) return null;

            const skeleton = document.createElement('div');
            skeleton.setAttribute('data-outliner-skeleton', 'true');
            skeleton.className = 'my-2';
            skeleton.innerHTML = `
                <div class="animate-pulse space-y-2" data-skeleton-pulse="true">
                    <div class="h-4 bg-gray-200 rounded w-full"></div>
                    <div class="h-4 bg-gray-200 rounded w-full"></div>
                    <div class="h-4 bg-gray-200 rounded w-full"></div>
                    <div class="h-4 bg-gray-200 rounded w-full"></div>
                </div>
                <div data-stream-container="true" class="mt-3"></div>
            `;
            blockEl.insertAdjacentElement('afterend', skeleton);
            return skeleton;
        } catch {
            return null;
        }
    }

    private removeSkeleton() {
        try {
            if (this.streamContainerEl) {
                this.streamContainerEl.innerHTML = '';
            }
            if (this.skeletonEl && this.skeletonEl.parentNode) {
                this.skeletonEl.parentNode.removeChild(this.skeletonEl);
            }
        } catch { /* noop */ }
        this.skeletonEl = null;
        this.streamContainerEl = null;
    }

    private ensureStreamContainer(parent: HTMLElement | null): HTMLElement | null {
        if (!parent) return null;
        const existing = parent.querySelector('[data-stream-container="true"]') as HTMLElement | null;
        if (existing) return existing;
        const el = document.createElement('div');
        el.setAttribute('data-stream-container', 'true');
        el.className = 'mt-3';
        parent.appendChild(el);
        return el;
    }

    private renderStreamingPreview(text: string) {
        try {
            if (!this.streamContainerEl) return;
            const safe = this.escapeHTML(text);
            const paragraphs = safe.split(/\n\n+/).filter(Boolean);
            const html = paragraphs.map(p => `<p class="text-[0.95rem] leading-7 text-gray-800">${p.replace(/\n/g, '<br>')}</p>`).join('');
            this.streamContainerEl.innerHTML = html;
        } catch { /* noop */ }
    }

    private escapeHTML(s: string): string {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    private hideSkeletonPulse() {
        try {
            if (!this.skeletonEl) return;
            const pulse = this.skeletonEl.querySelector('[data-skeleton-pulse="true"]') as HTMLElement | null;
            if (pulse) pulse.style.display = 'none';
        } catch { /* noop */ }
    }

    private hideOriginalBlock(range: Range) {
        // No longer hiding the original block since we're adding after it
        // This method is kept for compatibility but doesn't do anything
    }

    private unhideOriginalBlockIfPresent() {
        // No longer needed since we don't hide the original block
        // This method is kept for compatibility but doesn't do anything
    }
}
