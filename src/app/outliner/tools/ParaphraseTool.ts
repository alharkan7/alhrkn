import { PARAPHRASE_ICON_SVG } from '../components/svg-icons';

// Inline tool to paraphrase selected text using the /api/outliner/paraphrase endpoint
export class ParaphraseTool {
    // Ensure only one global listener handles mini-toolbar events
    private static globalListenerInstalled: boolean = false;
    private static lastConstructedInstance: ParaphraseTool | null = null;

    static isInline = true;
    static title = 'Paraphrase';

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

    constructor({ api, config }: { api: any; config: any; }) {
        this.api = api;
        this.config = config || {};
        this.button = document.createElement('button');
        this.button.type = 'button';
        this.button.className = 'ce-inline-tool';
        // Mark as AI tool for styling
        this.button.setAttribute('data-ai-tool', 'true');
        // Create paraphrase icon
        const icon = document.createElement('div');
        icon.innerHTML = PARAPHRASE_ICON_SVG;
        this.button.appendChild(icon);
        this.button.title = 'Paraphrase with AI';

        // Track latest constructed instance so the single global listener can delegate to it
        try { ParaphraseTool.lastConstructedInstance = this; } catch { }

        // Install a single global listener once to avoid duplicate handling from many instances
        if (!ParaphraseTool.globalListenerInstalled) {
            try {
                const w = window as any;
                if (!w.__outliner_paraphrase_listener_installed) {
                    window.addEventListener('outliner-ai-paraphrase-current', () => {
                        try {
                            const inst = ParaphraseTool.lastConstructedInstance;
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
                    w.__outliner_paraphrase_listener_installed = true;
                }
                ParaphraseTool.globalListenerInstalled = true;
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

            if (!selectedText) {
                this.config.notify?.('Please select text to paraphrase.');
                return;
            }

            // Insert a temporary skeleton just below the current block while loading
            this.skeletonEl = this.insertSkeletonBelowCurrentBlock(range);
            this.streamContainerEl = this.ensureStreamContainer(this.skeletonEl);

            // Call API with streaming header
            console.log('ParaphraseTool: Calling API with language:', this.config.language || 'en');
            const res = await fetch(this.config.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'text/plain, application/json',
                    'x-stream': '1'
                },
                body: JSON.stringify({ 
                    text: selectedText,
                    language: this.config.language || 'en'
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
                            this.hideOriginalBlock(range);
                        }
                        this.renderStreamingPreview(buffered);
                    }
                    try { buffered += decoder.decode(); } catch {}
                    finalText = buffered;
                } else {
                    // Environments without stream reader
                    finalText = await res.text();
                    this.hideSkeletonPulse();
                    this.hideOriginalBlock(range);
                    this.renderStreamingPreview(finalText);
                }
            } else {
                // JSON fallback
                const json = await res.json();
                finalText = json?.paraphrasedText || '';
                this.hideSkeletonPulse();
                this.hideOriginalBlock(range);
                this.renderStreamingPreview(finalText);
            }

            if (!finalText.trim()) {
                this.config.notify?.('No paraphrased content returned.');
                this.removeSkeleton();
                return;
            }

            // Clean up any redundant text that might have been included by the AI
            finalText = this.cleanParaphrasedText(finalText);

            // Replace the selected text with the paraphrased version
            try {
                // Find the block that contains our original selection
                const targetBlock = this.findTargetBlock(range);
                
                if (targetBlock && targetBlock.index >= 0) {
                    // Use the delete and reinsert approach to avoid block ID issues
                    try {
                        // Safety check: verify the block exists before deleting
                        const totalBlocks = typeof this.api.blocks.getBlocksCount === 'function'
                            ? this.api.blocks.getBlocksCount()
                            : 0;
                        
                        if (targetBlock.index >= totalBlocks) {
                            throw new Error('Block index out of bounds');
                        }

                        // Delete the target block
                        this.api.blocks.delete(targetBlock.index);
                        
                        // Insert the paraphrased text as a new paragraph block
                        const html = finalText.replace(/\n/g, '<br>');
                        this.api.blocks.insert('paragraph', { text: html }, {}, targetBlock.index, false);
                        
                        // Set caret to the end of the new block
                        try {
                            this.api.caret?.setToBlock?.(targetBlock.index, 'end');
                        } catch {}
                    } catch (updateError) {
                        console.error('Error with delete/insert approach:', updateError);
                        
                        // Fallback: try to update the block directly
                        try {
                            const html = finalText.replace(/\n/g, '<br>');
                            this.api.blocks.update(targetBlock.index, { text: html });
                            
                            // Set caret to the end of the updated block
                            try {
                                this.api.caret?.setToBlock?.(targetBlock.index, 'end');
                            } catch {}
                        } catch (fallbackError) {
                            console.error('Fallback update also failed:', fallbackError);
                            
                            // Final fallback: insert at the end
                            try {
                                const html = finalText.replace(/\n/g, '<br>');
                                const insertIndex = typeof this.api.blocks.getBlocksCount === 'function'
                                    ? this.api.blocks.getBlocksCount()
                                    : 0;
                                this.api.blocks.insert('paragraph', { text: html }, {}, insertIndex, false);
                                
                                try {
                                    this.api.caret?.setToBlock?.(insertIndex, 'end');
                                } catch {}
                                
                                this.config.notify?.('Paraphrased text inserted at the end of document.');
                            } catch (finalError) {
                                console.error('All update methods failed:', finalError);
                                throw new Error('Failed to update text with paraphrase. Please copy and paste manually.');
                            }
                        }
                    }
                } else {
                    // Fallback: insert at current position
                    const currentIndex = typeof this.api?.blocks?.getCurrentBlockIndex === 'function'
                        ? this.api.blocks.getCurrentBlockIndex()
                        : 0;
                    
                    const html = finalText.replace(/\n/g, '<br>');
                    this.api.blocks.insert('paragraph', { text: html }, {}, currentIndex, false);
                    
                    try {
                        this.api.caret?.setToBlock?.(currentIndex, 'end');
                    } catch {}
                }
            } catch (error) {
                console.error('Error updating block with paraphrased text:', error);
                this.config.notify?.('Failed to update text with paraphrase.');
            }

            this.config.notify?.('Text paraphrased successfully.');
        } catch (e: any) {
            this.config.notify?.(e?.message || 'Failed to paraphrase text');
        } finally {
            this.working = false;
            this.button.disabled = false;
            this.unhideOriginalBlockIfPresent();
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
            // Clean the text before displaying
            const cleanedText = this.cleanParaphrasedText(text);
            const safe = this.escapeHTML(cleanedText);
            const html = `<p class="text-[0.95rem] leading-7 text-gray-800">${safe.replace(/\n/g, '<br>')}</p>`;
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
        try {
            const anchorNode: Node | null = range?.startContainer || null;
            const element = (anchorNode instanceof Element ? anchorNode : anchorNode?.parentElement) as Element | null;
            const blockEl = element?.closest?.('.ce-block') as HTMLElement | null;
            if (!blockEl) return;
            this.originalBlockEl = blockEl;
            this.originalBlockPrevDisplay = blockEl.style.display || '';
            blockEl.style.display = 'none';
        } catch { /* noop */ }
    }

    private unhideOriginalBlockIfPresent() {
        try {
            if (this.originalBlockEl && document.body.contains(this.originalBlockEl)) {
                this.originalBlockEl.style.display = this.originalBlockPrevDisplay || '';
            }
        } catch { /* noop */ }
        this.originalBlockEl = null;
        this.originalBlockPrevDisplay = null;
    }

    private findTargetBlock(range: Range): { index: number; block: any } | null {
        try {
            // Try to get the current block index from the API first
            if (typeof this.api?.blocks?.getCurrentBlockIndex === 'function') {
                const currentIndex = this.api.blocks.getCurrentBlockIndex();
                if (currentIndex >= 0) {
                    return { index: currentIndex, block: null };
                }
            }

            // Fallback: find the block by traversing the DOM
            const startNode = range.startContainer;
            const endNode = range.endContainer;

            // Find the block that contains the start node
            let blockElement: Element | null = null;

            if (startNode.nodeType === Node.TEXT_NODE) {
                // Text node - find parent block
                blockElement = startNode.parentElement?.closest('.ce-block') || null;
            } else if (startNode.nodeType === Node.ELEMENT_NODE) {
                // Element node - find containing block
                blockElement = (startNode as Element).closest('.ce-block');
            }

            if (!blockElement && endNode.nodeType === Node.TEXT_NODE) {
                // Try end node if start node didn't work
                blockElement = endNode.parentElement?.closest('.ce-block') || null;
            } else if (!blockElement && endNode.nodeType === Node.ELEMENT_NODE) {
                blockElement = (endNode as Element).closest('.ce-block');
            }

            if (blockElement) {
                // Find the index of this block by counting previous blocks
                let blockIndex = 0;
                let currentElement = blockElement.previousElementSibling;
                
                while (currentElement) {
                    if (currentElement.classList.contains('ce-block')) {
                        blockIndex++;
                    }
                    currentElement = currentElement.previousElementSibling;
                }

                return { index: blockIndex, block: blockElement };
            }

            return null;
        } catch (error) {
            console.error('Error finding target block:', error);
            return null;
        }
    }

    private cleanParaphrasedText(text: string): string {
        try {
            // Remove redundant phrases that might appear in AI responses
            let cleaned = text.trim();
            
            // Remove common redundant phrases in English
            const englishRedundantPhrases = [
                /\b[Nn]o citations?\b/g,
                /\b[Nn]o citations? need to be preserved\b/g,
                /\bCitations? that MUST be preserved.*?:\s*/g,
                /\bImportant instructions?:.*?$/gm,
                /^\s*-\s*.*$/gm // Remove bullet points that might appear
            ];
            
            // Remove common redundant phrases in Indonesian
            const indonesianRedundantPhrases = [
                /\b[Tt]idak ada kutipan\b/g,
                /\b[Tt]idak ada kutipan yang perlu dipertahankan\b/g,
                /\bKutipan yang HARUS dipertahankan.*?:\s*/g,
                /\bInstruksi penting:.*?$/gm
            ];
            
            // Apply English cleaning
            englishRedundantPhrases.forEach(regex => {
                cleaned = cleaned.replace(regex, '');
            });
            
            // Apply Indonesian cleaning
            indonesianRedundantPhrases.forEach(regex => {
                cleaned = cleaned.replace(regex, '');
            });
            
            // Clean up any remaining artifacts
            cleaned = cleaned
                .replace(/^\s*[\-\*]\s+/gm, '') // Remove bullet points at start of lines
                .replace(/\n\s*\n\s*\n/g, '\n\n') // Normalize multiple newlines
                .replace(/^\s+|\s+$/g, '') // Trim start and end
                .replace(/\s{2,}/g, ' '); // Normalize multiple spaces
            
            return cleaned || text; // Return original if cleaning resulted in empty string
        } catch (error) {
            console.error('Error cleaning paraphrased text:', error);
            return text; // Return original text if cleaning fails
        }
    }
}
