import { CITE_ICON_SVG } from '../components/svg-icons';

// Inline tool to find citations for selected text using the /api/outliner/cite endpoint
export class CitationTool {
    static isInline = true;
    static title = 'Cite';

    private api: any;
    private button: HTMLButtonElement;
    private savedSelectionRange: Range | null = null;
    private config: {
        endpoint: string;
        getDocument: () => Promise<any>;
        notify?: (msg: string) => void;
    };
    private working: boolean = false;
    private modal: HTMLDivElement | null = null;
    private loadingOverlay: HTMLDivElement | null = null;

    constructor({ api, config }: { api: any; config: any; }) {
        this.api = api;
        this.config = config || {};
        this.button = document.createElement('button');
        this.button.type = 'button';
        this.button.className = 'ce-inline-tool';
        this.button.title = 'Find citations';

        // Create citation icon (using a book icon)
        const icon = document.createElement('div');
        icon.innerHTML = CITE_ICON_SVG;
        this.button.appendChild(icon);

        // Listen for document changes to update bibliography display
        window.addEventListener('outliner-document-changed', () => {
            // Add a small delay to ensure the document has been updated
            setTimeout(() => {
                this.updateBibliographyDisplay().catch(console.error);
            }, 200);
        });
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

            // Save selection range so we can restore it when the user clicks Cite in the modal
            try {
                this.savedSelectionRange = selection?.cloneRange?.() || null;
            } catch { this.savedSelectionRange = null; }

            if (!selectedText) {
                this.config.notify?.('Please select some text to find citations for.');
                return;
            }

            // Show loading overlay
            this.showLoading('Researching...');

            // Call the citation API
            const res = await fetch(this.config.endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    text: selectedText,
                    maxResults: 15
                })
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err?.error || `Request failed with ${res.status}`);
            }

            const data = await res.json();
            this.hideLoading();
            this.showCitationModal(data, selectedText);

        } catch (e: any) {
            this.config.notify?.(e?.message || 'Failed to find citations');
        } finally {
            this.hideLoading();
            this.working = false;
            this.button.disabled = false;
        }
    }

    private showCitationModal(data: any, selectedText: string) {
        // Remove existing modal if any
        if (this.modal) {
            document.body.removeChild(this.modal);
        }

        // Create modal with custom CSS variables
        this.modal = document.createElement('div');
        this.modal.className = 'fixed inset-0 flex items-center justify-center z-50 font-sans';
        this.modal.style.cssText = `
            background-color: var(--overlay);
        `;

        const modalContent = document.createElement('div');
        modalContent.className = 'max-w-4xl max-h-[90vh] w-[90vw] overflow-hidden rounded-lg';
        modalContent.style.cssText = `
            background-color: var(--bg);
            border: 1px solid var(--border);
            box-shadow: var(--shadow);
        `;

        // Header
        const header = document.createElement('div');
        header.className = 'p-5 border-b flex justify-between items-center';
        header.style.cssText = `
            border-bottom-color: var(--border);
            background-color: var(--bw);
        `;
        
        const title = document.createElement('h3');
        const citationCount = data.papers ? data.papers.length : 0;
        title.textContent = `Found ${citationCount} Reference${citationCount !== 1 ? 's' : ''}`;
        title.className = 'm-0 text-lg font-semibold';
        title.style.cssText = `
            color: var(--text);
            font-weight: var(--heading-font-weight);
        `;

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.className = 'border-none text-2xl cursor-pointer p-0 w-8 h-8 flex items-center justify-center rounded transition-colors duration-200';
        closeBtn.style.cssText = `
            background-color: transparent;
            color: var(--text);
        `;
        closeBtn.addEventListener('mouseenter', () => {
            closeBtn.style.backgroundColor = 'var(--main)';
            closeBtn.style.color = 'var(--mtext)';
        });
        closeBtn.addEventListener('mouseleave', () => {
            closeBtn.style.backgroundColor = 'transparent';
            closeBtn.style.color = 'var(--text)';
        });
        closeBtn.onclick = () => this.closeModal();

        header.appendChild(title);
        header.appendChild(closeBtn);

        // Content
        const content = document.createElement('div');
        content.className = 'p-5 overflow-y-auto max-h-[78vh]';
        content.style.cssText = `
            background-color: var(--bg);
        `;

        // Search info
        const searchInfo = document.createElement('div');
        searchInfo.className = 'mb-5 p-3 rounded-md text-sm';
        searchInfo.style.cssText = `
            background-color: var(--bw);
            border: 1px solid var(--border);
            color: var(--text);
        `;
        
        let searchInfoHTML = `
            <strong>Keywords:</strong> ${data.keywords?.join(', ') || 'N/A'}<br>
        `;
        
        searchInfo.innerHTML = searchInfoHTML;
        content.appendChild(searchInfo);

        // Papers list
        if (data.papers && data.papers.length > 0) {
            const papersList = document.createElement('div');
            papersList.className = 'flex flex-col gap-4';

            data.papers.forEach((paper: any, index: number) => {
                const paperCard = this.createPaperCard(paper, index + 1);
                papersList.appendChild(paperCard);
            });

            content.appendChild(papersList);
        } else {
                    const noResults = document.createElement('div');
        noResults.className = 'text-center py-10 px-5 text-base rounded-md';
        noResults.style.cssText = `
            color: var(--text);
            background-color: var(--bw);
            border: 1px solid var(--border);
        `;
        noResults.textContent = 'No relevant papers found. Try selecting different text or adjusting your search.';
        content.appendChild(noResults);
        }

        modalContent.appendChild(header);
        modalContent.appendChild(content);
        this.modal.appendChild(modalContent);
        document.body.appendChild(this.modal);

        // Close on backdrop click
        this.modal.onclick = (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        };
    }

    private createPaperCard(paper: any, index: number): HTMLDivElement {
        const card = document.createElement('div');
        card.className = 'rounded-md p-4 transition-all duration-200 hover:-translate-y-0.5';
        card.style.cssText = `
            border: 1px solid var(--border);
            background-color: var(--bw);
            box-shadow: var(--shadow);
        `;
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-2px)';
            card.style.boxShadow = 'var(--box-shadow-x) var(--box-shadow-y) 0px 0px var(--border)';
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
            card.style.boxShadow = 'var(--shadow)';
        });

        const title = document.createElement('h4');
        title.textContent = paper.title || 'Untitled';
        title.className = 'm-0 mb-2 text-base font-semibold leading-relaxed';
        title.style.cssText = `
            color: var(--text);
            font-weight: var(--heading-font-weight);
        `;

        const authors = document.createElement('div');
        authors.className = 'text-sm mb-2';
        authors.style.cssText = `
            color: var(--text);
            opacity: 0.8;
        `;
        authors.textContent = paper.authors?.map((a: any) => a.name).join(', ') || 'Unknown authors';

        const abstract = document.createElement('p');
        abstract.className = 'm-0 mb-3 text-sm leading-relaxed';
        abstract.style.cssText = `
            color: var(--text);
            opacity: 0.9;
        `;
        abstract.textContent = paper.abstract ? 
            (paper.abstract.length > 200 ? paper.abstract.substring(0, 200) + '...' : paper.abstract) : 
            'No abstract available';

        const metaInfo = document.createElement('div');
        metaInfo.className = 'flex gap-4 text-xs mb-3';
        metaInfo.style.cssText = `
            color: var(--text);
            opacity: 0.7;
        `;

        if (paper.year) {
            const year = document.createElement('span');
            year.textContent = `Year: ${paper.year}`;
            metaInfo.appendChild(year);
        }

        if (paper.venue) {
            const venue = document.createElement('span');
            venue.textContent = `Venue: ${paper.venue}`;
            metaInfo.appendChild(venue);
        }

        if (paper.citationCount !== undefined) {
            const citations = document.createElement('span');
            citations.textContent = `Citations: ${paper.citationCount}`;
            metaInfo.appendChild(citations);
        }

        const actions = document.createElement('div');
        actions.className = 'flex gap-2 flex-wrap';

        if (paper.url) {
            const viewBtn = document.createElement('a');
            viewBtn.textContent = 'View Paper';
            viewBtn.href = paper.url;
            viewBtn.target = '_blank';
            viewBtn.className = 'px-3 py-1.5 rounded-md text-xs font-medium border transition-all duration-200 hover:opacity-90 hover:-translate-y-0.5 cursor-pointer no-underline';
            viewBtn.style.cssText = `
                background-color: var(--main);
                color: var(--mtext);
                border-color: var(--border);
                font-weight: var(--base-font-weight);
            `;
            actions.appendChild(viewBtn);
        }

        // Add Cite button
        const citeBtn = document.createElement('button');
        citeBtn.textContent = 'Cite';
        citeBtn.className = 'px-3 py-1.5 rounded-md border text-xs font-medium cursor-pointer transition-all duration-200 hover:opacity-90 hover:-translate-y-0.5';
        citeBtn.style.cssText = `
            background-color: var(--main);
            color: var(--mtext);
            border-color: var(--border);
            font-weight: var(--base-font-weight);
        `;
        
        citeBtn.onclick = () => this.insertCitation(paper);
        actions.appendChild(citeBtn);

        card.appendChild(title);
        card.appendChild(authors);
        card.appendChild(abstract);
        card.appendChild(metaInfo);
        card.appendChild(actions);

        if (paper.openAccessPdf?.url) {
            const pdfBtn = document.createElement('a');
            pdfBtn.textContent = 'View PDF';
            pdfBtn.href = paper.openAccessPdf.url;
            pdfBtn.target = '_blank';
            pdfBtn.className = 'px-3 py-1.5 rounded-md text-xs font-medium border transition-all duration-200 hover:opacity-90 hover:-translate-y-0.5 cursor-pointer no-underline';
            pdfBtn.style.cssText = `
                background-color: var(--main);
                color: var(--mtext);
                border-color: var(--border);
                font-weight: var(--base-font-weight);
            `;
            actions.appendChild(pdfBtn);
        }

        return card;
    }

    private closeModal() {
        if (this.modal) {
            document.body.removeChild(this.modal);
            this.modal = null;
        }
    }

    private showLoading(message: string = 'Loading...') {
        try {
            if (this.loadingOverlay) return;
            const overlay = document.createElement('div');
            overlay.className = 'fixed inset-0 flex items-center justify-center z-50 font-sans';
            overlay.style.cssText = `
                background-color: var(--overlay);
            `;

            const box = document.createElement('div');
            box.className = 'flex items-center gap-3 rounded-md px-4 py-3';
            box.style.cssText = `
                background-color: var(--bw);
                border: 1px solid var(--border);
                box-shadow: var(--shadow);
                color: var(--text);
            `;

            const spinner = document.createElement('div');
            spinner.style.cssText = `
                width: 20px;
                height: 20px;
                border: 3px solid var(--border);
                border-top-color: var(--main);
                border-radius: 50%;
                animation: outliner-spin 1s linear infinite;
            `;

            const text = document.createElement('span');
            text.textContent = message;
            text.style.cssText = `
                font-weight: var(--base-font-weight);
            `;

            const style = document.createElement('style');
            style.textContent = `@keyframes outliner-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;

            box.appendChild(spinner);
            box.appendChild(text);
            overlay.appendChild(style);
            overlay.appendChild(box);
            document.body.appendChild(overlay);
            this.loadingOverlay = overlay;
        } catch { }
    }

    private hideLoading() {
        try {
            if (this.loadingOverlay) {
                document.body.removeChild(this.loadingOverlay);
                this.loadingOverlay = null;
            }
        } catch { }
    }

    private async getCurrentBlockInfo(): Promise<{ currentBlockIndex: number; currentBlock: any } | null> {
        try {
            // Method 1: Try getCurrentBlockIndex
            let currentBlockIndex = -1;
            try {
                currentBlockIndex = this.api.blocks.getCurrentBlockIndex();
                if (currentBlockIndex >= 0) {
                    const currentBlock = this.api.blocks.getBlockByIndex(currentBlockIndex);
                    if (currentBlock) {
                        console.log('Method 1 success:', { currentBlockIndex, currentBlock });
                        return { currentBlockIndex, currentBlock };
                    }
                }
            } catch (error) {
                console.warn('getCurrentBlockIndex failed:', error);
            }

            // Method 2: Try getCurrentBlock
            try {
                const currentBlock = this.api.blocks.getCurrentBlock();
                if (currentBlock && currentBlock.id) {
                    // Find the block index by ID
                    const blocksCount = this.api.blocks.getBlocksCount();
                    for (let i = 0; i < blocksCount; i++) {
                        try {
                            const block = this.api.blocks.getBlockByIndex(i);
                            if (block && block.id === currentBlock.id) {
                                console.log('Method 2 success:', { currentBlockIndex: i, currentBlock });
                                return { currentBlockIndex: i, currentBlock };
                            }
                        } catch (e) {
                            // Continue to next block
                        }
                    }
                }
            } catch (error) {
                console.warn('getCurrentBlock failed:', error);
            }

            // Method 3: Try to get from selection
            try {
                const selection = window.getSelection();
                if (selection && selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    const container = range.commonAncestorContainer;
                    // Find the closest paragraph element
                    let paragraphElement: Element | null = container.nodeType === Node.ELEMENT_NODE ? container as Element : (container.parentElement as Element | null);
                    while (paragraphElement && paragraphElement.tagName !== 'P') {
                        paragraphElement = paragraphElement.parentElement as Element | null;
                    }
                    if (paragraphElement) {
                        // Try to find the block index by traversing up to find the EditorJS container
                        let editorContainer: Element | null = paragraphElement;
                        while (editorContainer && !editorContainer.classList.contains('codex-editor')) {
                            editorContainer = editorContainer.parentElement as Element | null;
                        }
                        if (editorContainer) {
                            // This is a simplified approach - in practice, you might need more sophisticated block finding
                            return null;
                        }
                    }
                }
            } catch (error) {
                console.warn('Selection-based method failed:', error);
            }

            // Method 4: Try to get from document directly (fallback)
            try {
                // If we have a document, try to find the last paragraph block
                const doc = this.config.getDocument ? await this.config.getDocument() : null;
                if (doc && Array.isArray(doc.blocks)) {
                    // Find the last paragraph block
                    for (let i = doc.blocks.length - 1; i >= 0; i--) {
                        const block = doc.blocks[i];
                        if (block && block.type === 'paragraph') {
                            console.log('Method 4 success (fallback to last paragraph):', { currentBlockIndex: i, currentBlock: block });
                            return { currentBlockIndex: i, currentBlock: block };
                        }
                    }
                }
            } catch (error) {
                console.warn('Document fallback method failed:', error);
            }

            console.warn('All methods failed to get current block info');
            return null;
        } catch (error) {
            console.error('Error in getCurrentBlockInfo:', error);
            return null;
        }
    }

    private async insertCitation(paper: any) {
        try {
            // Citation text content using only last name
            const authorLastName = this.getAuthorLastName(paper);
            const citationTextCore = `(${authorLastName}, ${paper.year || 'n.d.'})`;

            // First try DOM-level insertion at the saved selection
            const insertedViaDom = this.insertCitationAtSavedSelection(citationTextCore);

            if (!insertedViaDom) {
                // Fallback to block-level insertion (end of current paragraph)
                const doc = await this.config.getDocument();
                if (!doc || !Array.isArray(doc.blocks)) {
                    this.config.notify?.('Failed to get document for citation insertion');
                    return;
                }

                const currentBlockInfo = await this.getCurrentBlockInfo();
                if (!currentBlockInfo) {
                    this.config.notify?.('Could not determine current block for citation. Please place your cursor in a paragraph and try again.');
                    return;
                }

                const { currentBlockIndex } = currentBlockInfo;
                const docBlock = doc.blocks[currentBlockIndex];
                if (!docBlock || docBlock.type !== 'paragraph' || !docBlock.data) {
                    this.config.notify?.('Citation can only be added to paragraph blocks.');
                    return;
                }

                let currentText = '';
                if (docBlock.data && typeof docBlock.data === 'object') {
                    currentText = docBlock.data.text || '';
                } else if (typeof docBlock.data === 'string') {
                    currentText = docBlock.data;
                }

                // Place citation before a trailing period (ignoring trailing whitespace), else append with space
                let rightTrimmed = currentText.replace(/[\s\u00A0]+$/g, '');
                if (rightTrimmed.endsWith('.')) {
                    const withoutPeriod = rightTrimmed.slice(0, -1).replace(/[\s\u00A0]+$/g, '');
                    const needsSpace = withoutPeriod.endsWith(' ') ? '' : ' ';
                    let newText = `${withoutPeriod}${needsSpace}${citationTextCore}.`;
                    currentText = newText; // override fully
                } else if (rightTrimmed.endsWith(')') && rightTrimmed.includes('(')) {
                    const lastParenIndex = rightTrimmed.lastIndexOf('(');
                    const beforeCitation = rightTrimmed.substring(0, lastParenIndex).replace(/[\s\u00A0]+$/g, '');
                    const existingCitation = rightTrimmed.substring(lastParenIndex);
                    const newText = `${beforeCitation} ${citationTextCore} ${existingCitation}`;
                    currentText = newText;
                } else {
                    const needsSpace = rightTrimmed.endsWith(' ') ? '' : ' ';
                    const newText = `${rightTrimmed}${needsSpace}${citationTextCore}`;
                    currentText = newText;
                }

                try {
                    const currentBlock = this.api.blocks.getBlockByIndex(currentBlockIndex);
                    if (currentBlock && currentBlock.id) {
                        this.api.blocks.update(currentBlock.id, { text: currentText });
                    } else {
                        this.api.blocks.update(currentBlockIndex, { text: currentText });
                    }
                } catch (error) {
                    console.warn('Block update failed, using fallback method:', error);
                    try {
                        const currentBlock = this.api.blocks.getBlockByIndex(currentBlockIndex);
                        if (currentBlock && currentBlock.id) {
                            this.api.blocks.delete(currentBlock.id);
                            this.api.blocks.insert('paragraph', { text: currentText }, {}, currentBlockIndex);
                        } else {
                            this.api.blocks.delete(currentBlockIndex);
                            this.api.blocks.insert('paragraph', { text: currentText }, {}, currentBlockIndex);
                        }
                    } catch (fallbackError) {
                        console.error('Fallback method also failed:', fallbackError);
                        this.config.notify?.('Failed to update block. Please try again.');
                        return;
                    }
                }
            }

            // Add to external bibliography display (not to EditorJS document)
            await this.addToExternalBibliography(paper);

            // Close modal and notify user
            this.closeModal();
            this.config.notify?.('Citation added successfully');

        } catch (error) {
            console.error('Error inserting citation:', error);
            this.config.notify?.('Failed to insert citation: ' + (error as Error).message);
        }
    }

    private getAuthorLastName(paper: any): string {
        try {
            const full = paper?.authors?.[0]?.name || 'Unknown';
            const base = full.includes(',') ? full.split(',')[0] : full;
            const parts = (base || '').trim().split(/\s+/).filter(Boolean);
            const last = parts.length > 0 ? parts[parts.length - 1] : (base || '').trim();
            return last || 'Unknown';
        } catch {
            return 'Unknown';
        }
    }

    private insertCitationAtSavedSelection(citationTextCore: string): boolean {
        try {
            if (!this.savedSelectionRange) return false;

            const selection = window.getSelection();
            if (!selection) return false;
            selection.removeAllRanges();
            selection.addRange(this.savedSelectionRange);

            const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
            if (!range) return false;

            // Determine spacing before citation
            let needsLeadingSpace = true;
            let endContainer = range.endContainer;
            let endOffset = range.endOffset;

            const makeTextNode = (txt: string) => document.createTextNode(txt);

            const insertAndMoveCaretAfter = (node: Node) => {
                // Move caret after inserted node
                try {
                    const newRange = document.createRange();
                    if (node.nodeType === Node.TEXT_NODE) {
                        newRange.setStart(node, (node as Text).data.length);
                        newRange.setEnd(node, (node as Text).data.length);
                    } else {
                        newRange.setStartAfter(node);
                        newRange.setEndAfter(node);
                    }
                    selection.removeAllRanges();
                    selection.addRange(newRange);
                } catch { }
            };

            const getEditableAncestor = (node: Node): HTMLElement | null => {
                const el = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : (node.parentElement as Element | null);
                return el ? (el.closest('[contenteditable="true"]') as HTMLElement | null) : null;
            };

            if (endContainer.nodeType === Node.TEXT_NODE) {
                const textNode = endContainer as Text;
                const data = textNode.data;
                const charBefore = endOffset > 0 ? data[endOffset - 1] : '';
                needsLeadingSpace = !(charBefore && /\s/.test(charBefore));

                // If selection already includes the period (previous char is '.'), insert before that period
                if (endOffset > 0 && data[endOffset - 1] === '.') {
                    const before = data.slice(0, endOffset - 1).replace(/[\s\u00A0]+$/g, '');
                    const after = data.slice(endOffset - 1); // starts with '.'

                    textNode.data = before;

                    const citationText = `${before.endsWith(' ') ? '' : ' '}${citationTextCore}`;
                    const citationNode = makeTextNode(citationText);

                    if (textNode.parentNode) {
                        textNode.parentNode.insertBefore(citationNode, textNode.nextSibling);
                        const afterNode = makeTextNode(after);
                        textNode.parentNode.insertBefore(afterNode, citationNode.nextSibling);
                        insertAndMoveCaretAfter(citationNode);
                    }
                }
                // Else if immediate next char is a period (or whitespace then period), insert before it
                else if (endOffset < data.length && /^(?:[\s\u00A0]*\.)/.test(data.slice(endOffset))) {
                    const before = data.slice(0, endOffset);
                    const after = data.slice(endOffset); // may start with spaces and then '.'

                    // Replace current text node with before part
                    textNode.data = before;

                    const citationText = `${needsLeadingSpace ? ' ' : ''}${citationTextCore}`;
                    const citationNode = makeTextNode(citationText);

                    // Insert citation then the remaining text (which begins with '.')
                    if (textNode.parentNode) {
                        textNode.parentNode.insertBefore(citationNode, textNode.nextSibling);
                        const afterNode = makeTextNode(after);
                        textNode.parentNode.insertBefore(afterNode, citationNode.nextSibling);
                        insertAndMoveCaretAfter(citationNode);
                    }
                } else {
                    // Insert at selection end
                    const citationText = `${needsLeadingSpace ? ' ' : ''}${citationTextCore}`;
                    const citationNode = makeTextNode(citationText);
                    range.collapse(false);
                    range.insertNode(citationNode);
                    insertAndMoveCaretAfter(citationNode);
                }
            } else {
                // Non-text end container. Try to inspect the next sibling for a period
                const parent = endContainer as Element;
                const next = parent.childNodes[endOffset] || parent.nextSibling;
                let inserted = false;
                if (next && next.nodeType === Node.TEXT_NODE) {
                    const nextText = next as Text;
                    const startsWithPeriod = /^(?:[\s\u00A0]*\.)/.test(nextText.data);
                    const prevChar = (() => {
                        const prevNode = parent.childNodes[endOffset - 1];
                        if (prevNode && prevNode.nodeType === Node.TEXT_NODE) {
                            const t = (prevNode as Text).data;
                            return t[t.length - 1] || '';
                        }
                        return '';
                    })();
                    needsLeadingSpace = !(prevChar && /\s/.test(prevChar));

                    const citationText = `${needsLeadingSpace ? ' ' : ''}${citationTextCore}`;
                    const citationNode = makeTextNode(citationText);
                    if (startsWithPeriod) {
                        parent.insertBefore(citationNode, next);
                        inserted = true;
                        insertAndMoveCaretAfter(citationNode);
                    }
                }
                if (!inserted) {
                    const citationText = ` ${citationTextCore}`;
                    const citationNode = makeTextNode(citationText);
                    range.collapse(false);
                    range.insertNode(citationNode);
                    insertAndMoveCaretAfter(citationNode);
                }
            }

            // Inform EditorJS of DOM changes by dispatching input on the nearest contenteditable
            try {
                const editable = getEditableAncestor(endContainer);
                if (editable) {
                    const evt = new InputEvent('input', { bubbles: true, cancelable: true, composed: true });
                    editable.dispatchEvent(evt);
                }
            } catch { }

            return true;
        } catch (e) {
            console.warn('Failed DOM insertion, will fallback to block update:', e);
            return false;
        } finally {
            // Do not clear savedSelectionRange so subsequent cites can still use it if needed
        }
    }

    private async addToExternalBibliography(paper: any) {
        try {
            // Get the bibliography container
            const container = document.getElementById('bibliography-container');
            if (!container) {
                console.warn('Bibliography container not found');
                return;
            }

            // Check if this paper is already in the bibliography
            const paperId = paper.paperId || paper.title;
            const existingReference = this.findExistingReferenceInDisplay(container, paperId);
            
            if (existingReference) {
                // Paper already exists, don't add duplicate
                this.config.notify?.('This paper is already cited in the bibliography');
                return;
            }

            // Create reference entry
            const referenceText = this.formatReference(paper);
            
            // Add the new reference to the display
            this.addReferenceToDisplay(container, referenceText);
            
            // Sort the bibliography display
            this.sortBibliographyDisplay(container);

        } catch (error) {
            console.error('Error adding to external bibliography:', error);
        }
    }

    private findExistingReferenceInDisplay(container: HTMLElement, paperId: string): boolean {
        // Check if this paper is already in the bibliography display
        const existingReferences = container.querySelectorAll('.reference-entry');
        for (const ref of existingReferences) {
            const refText = ref.textContent || '';
            if (paperId && refText.includes(paperId)) {
                return true;
            }
        }
        return false;
    }

    private addReferenceToDisplay(container: HTMLElement, reference: { text: string; url?: string }) {
        // Remove any placeholder variants
        this.removeBibliographyPlaceholders(container);

        // Create new reference entry with custom CSS variables
        const referenceDiv = document.createElement('div');
        referenceDiv.className = 'reference-entry p-4 rounded-md border-l-4 mb-2 border';
        referenceDiv.style.cssText = `
            background-color: var(--bw);
            border-left-color: var(--main);
            border-color: var(--border);
        `;
        
        const referenceTextElement = document.createElement('p');
        referenceTextElement.className = 'leading-relaxed m-0 text-sm';
        referenceTextElement.style.cssText = `
            color: var(--text);
        `;

        // Add the main text portion
        referenceTextElement.appendChild(document.createTextNode(reference.text));

        // If a DOI/URL exists, append it as a clickable link
        if (reference.url) {
            const spacer = document.createTextNode(' Retrieved from ');
            const link = document.createElement('a');
            link.href = reference.url;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.textContent = reference.url;
            link.style.color = 'var(--link, inherit)';
            link.style.textDecoration = 'underline';
            referenceTextElement.appendChild(spacer);
            referenceTextElement.appendChild(link);
        }

        referenceDiv.appendChild(referenceTextElement);
        container.appendChild(referenceDiv);

        // Extra safety: schedule a cleanup in case of race with updater
        setTimeout(() => {
            try { this.removeBibliographyPlaceholders(container); } catch {}
        }, 0);
    }

    private sortBibliographyDisplay(container: HTMLElement) {
        try {
            // Get all reference entries
            const references = Array.from(container.querySelectorAll('.reference-entry'));
            if (references.length <= 1) return; // No need to sort

            // Sort references alphabetically
            references.sort((a, b) => {
                const textA = a.textContent || '';
                const textB = b.textContent || '';
                return textA.localeCompare(textB);
            });

            // Clear container and re-add sorted references
            const placeholder = container.querySelector('[data-bibliography-placeholder="true"]');
            container.innerHTML = '';
            
            // Re-add placeholder if it was there
            if (placeholder) {
                container.appendChild(placeholder);
            }
            
            // Add sorted references
            references.forEach(ref => {
                container.appendChild(ref);
            });

        } catch (error) {
            console.error('Error sorting bibliography display:', error);
        }
    }

    private formatReference(paper: any): { text: string; url?: string } {
        const authorsArray: string[] = Array.isArray(paper.authors)
            ? paper.authors.map((a: any) => a?.name || '').filter(Boolean)
            : [];

        const formattedAuthors = this.formatAuthors(authorsArray) || 'Unknown authors';
        const year = paper.year || 'n.d.';
        const title = paper.title || 'Untitled';
        const venue = paper.venue || '';
        const url = paper.url || '';

        let text = `${formattedAuthors} (${year}). ${title}`;
        if (venue) {
            text += `. ${venue}`;
        }

        return { text, url: url || undefined };
    }

    private formatAuthors(authorNames: string[]): string {
        if (!authorNames || authorNames.length === 0) return '';

        const formatSingle = (fullName: string): string => {
            try {
                if (!fullName) return '';
                let last = '';
                let first = '';

                if (fullName.includes(',')) {
                    const [lastPart, firstPart] = fullName.split(',');
                    last = (lastPart || '').trim();
                    first = (firstPart || '').trim().split(/\s+/)[0] || '';
                } else {
                    const parts = fullName.trim().split(/\s+/).filter(Boolean);
                    if (parts.length === 1) {
                        last = parts[0];
                    } else {
                        first = parts[0];
                        last = parts[parts.length - 1];
                    }
                }

                const initial = first ? `${first[0].toUpperCase()}.` : '';
                return last ? `${last}, ${initial}`.trim() : fullName;
            } catch {
                return fullName;
            }
        };

        const maxAuthors = 2;
        const limited = authorNames.slice(0, maxAuthors).map(formatSingle);
        const etAl = authorNames.length > maxAuthors ? 'et al.' : '';
        return [
            ...limited,
            ...(etAl ? [etAl] : [])
        ].join(', ');
    }

    private async updateBibliographyDisplay() {
        try {
            // Get the bibliography container
            const container = document.getElementById('bibliography-container');
            if (!container) return;

            // Check if there are any existing references in the display
            const existingReferences = container.querySelectorAll('.reference-entry');
            
            if (existingReferences.length === 0) {
                // No references yet, show placeholder (idempotent)
                const already = container.querySelector('[data-bibliography-placeholder="true"]');
                if (!already) {
                    const placeholder = document.createElement('p');
                    placeholder.setAttribute('data-bibliography-placeholder', 'true');
                    placeholder.className = 'italic text-center py-5 px-5 m-0';
                    placeholder.style.cssText = `
                        color: var(--text);
                        opacity: 0.6;
                    `;
                    placeholder.textContent = 'Citations will appear here as you add them to your document using the citation tool.';
                    container.innerHTML = '';
                    container.appendChild(placeholder);
                }
            } else {
                // References exist, ensure any placeholder is removed
                this.removeBibliographyPlaceholders(container);
            }

        } catch (error) {
            console.error('Error updating bibliography display:', error);
        }
    }

    private removeBibliographyPlaceholders(container: HTMLElement) {
        try {
            const selectors = [
                '[data-bibliography-placeholder="true"]',
                '.text-gray-500.italic',
                'p.italic',
                'p[style*="opacity"]'
            ];
            const seen = new Set<Element>();
            selectors.forEach(sel => {
                container.querySelectorAll(sel).forEach(el => {
                    if (!seen.has(el)) {
                        seen.add(el);
                        el.remove();
                    }
                });
            });
        } catch {}
    }
}
