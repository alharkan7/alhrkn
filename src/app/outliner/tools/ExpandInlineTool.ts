import { EXPAND_ICON_SVG } from '../components/svg-icons';

// Inline tool to expand selected text using the /api/outliner/expand-passage endpoint
export class ExpandInlineTool {
    static isInline = true;
    static title = 'Expand';

    private api: any;
    private button: HTMLButtonElement;
    private skeletonEl: HTMLElement | null = null;
    private config: {
        endpoint: string;
        getDocument: () => Promise<any>;
        notify?: (msg: string) => void;
    };
    private working: boolean = false;

    constructor({ api, config }: { api: any; config: any; }) {
        this.api = api;
        this.config = config || {};
        this.button = document.createElement('button');
        this.button.type = 'button';
        this.button.className = 'ce-inline-tool';
        // Create expand icon
        const icon = document.createElement('div');
        icon.innerHTML = EXPAND_ICON_SVG;
        this.button.appendChild(icon);
        this.button.title = 'Expand with AI';
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

            // Collect up to 3 previous paragraph texts
            const previousParas: string[] = [];
            if (currentIndex > 0) {
                for (let i = currentIndex - 1; i >= 0 && previousParas.length < 3; i--) {
                    const b = blocks[i];
                    if (b?.type === 'paragraph' && typeof b?.data?.text === 'string' && b.data.text.trim()) {
                        previousParas.unshift(b.data.text);
                    }
                }
            }

            const focusText = selectedText || currentText || '';
            if (!focusText) {
                this.config.notify?.('Select text or place cursor in a paragraph to expand.');
                this.removeSkeleton();
                return;
            }

            // Build context for API
            const contextParts: string[] = [];
            if (title) contextParts.push(`Title: ${title}`);
            if (previousParas.length) {
                contextParts.push(previousParas.join('\n\n'));
            }
            contextParts.push(focusText);
            const contextText = contextParts.join('\n\n');

            // Call API
            const res = await fetch(this.config.endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: contextText })
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err?.error || `Request failed with ${res.status}`);
            }
            const json = await res.json();
            const paragraphs: string[] = Array.isArray(json?.paragraphs) ? json.paragraphs : [];
            if (!paragraphs.length) {
                this.config.notify?.('No expanded content returned.');
                this.removeSkeleton();
                return;
            }

            // Replace current paragraph block with the expanded paragraphs as separate blocks
            // 1) Remove current block
            if (currentIndex >= 0) {
                try {
                    this.api.blocks.delete(currentIndex);
                } catch { }
            }

            // 2) Insert new paragraphs at the same index
            let insertionIndex = currentIndex >= 0 ? currentIndex : undefined as any;
            for (let i = 0; i < paragraphs.length; i++) {
                const p = String(paragraphs[i] || '').trim();
                if (!p) continue;
                // Replace newlines with <br> for EditorJS paragraph tool
                const html = p.replace(/\n/g, '<br>');
                try {
                    this.api.blocks.insert('paragraph', { text: html }, {}, insertionIndex, false);
                    if (typeof insertionIndex === 'number') insertionIndex++;
                } catch { }
            }

            // Focus the last inserted block
            try {
                const lastIndex = (typeof insertionIndex === 'number' ? insertionIndex : this.api.blocks.getBlocksCount()) - 1;
                if (lastIndex >= 0) this.api.caret?.setToBlock?.(lastIndex, 'end');
            } catch { }

            this.config.notify?.('Expanded passage inserted.');
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
                <div class="animate-pulse space-y-2">
                    <div class="h-4 bg-gray-200 rounded w-5/6"></div>
                    <div class="h-4 bg-gray-200 rounded w-5/6"></div>
                    <div class="h-4 bg-gray-200 rounded w-5/6"></div>
                    <div class="h-4 bg-gray-200 rounded w-5/6"></div>
                </div>
            `;
            blockEl.insertAdjacentElement('afterend', skeleton);
            return skeleton;
        } catch {
            return null;
        }
    }

    private removeSkeleton() {
        try {
            if (this.skeletonEl && this.skeletonEl.parentNode) {
                this.skeletonEl.parentNode.removeChild(this.skeletonEl);
            }
        } catch { /* noop */ }
        this.skeletonEl = null;
    }
}
