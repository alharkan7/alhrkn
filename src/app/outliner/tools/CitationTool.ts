import { CITE_ICON_SVG, OPEN_ICON_SVG, FILE_ICON_SVG, PENCIL_ICON_SVG, CHEVRON_UP_ICON_SVG, CHEVRON_DOWN_ICON_SVG, CHECK_ICON_SVG, X_ICON_SVG, ABSTRACT_ICON_SVG } from '../components/svg-icons';

// Inline tool to find citations for selected text using the /api/outliner/cite endpoint
export class CitationTool {
    // Ensure only one set of global listeners are installed
    private static globalListenersInstalled: boolean = false;
    private static lastConstructedInstance: CitationTool | null = null;
    private static lastEventTime: number = 0;
    private static readonly EVENT_DEBOUNCE_MS = 100;
    static isInline = true;
    static title = 'Cite';

    private api: any;
    private button: HTMLButtonElement;
    private savedSelectionRange: Range | null = null;
    private currentPage: number = 1;
    private perPage: number = 10;
    private pageCache: Map<number, any> = new Map();
    private lastSearchQuery: string | null = null;
    private lastSelectedTextKey: string | null = null;
    private config: {
        endpoint: string;
        language?: 'en' | 'id';
        getDocument: () => Promise<any>;
        notify?: (msg: string) => void;
    };
    private working: boolean = false;
    private modal: HTMLDivElement | null = null;
    private loadingOverlay: HTMLDivElement | null = null;
    private boundCiteCurrent?: () => void;
    private forceBlockPlacement: boolean = false;
    private abstractCache: Map<string, { abstract: string; timestamp: number }> = new Map();
    private expandedAbstracts: Set<string> = new Set();
    private abstractLoadingStates: Map<string, boolean> = new Map();

    constructor({ api, config }: { api: any; config: any; }) {
        this.api = api;
        this.config = config || {};
        this.button = document.createElement('button');
        this.button.type = 'button';
        this.button.className = 'ce-inline-tool';
        // Mark as AI tool (second in the AI group)
        this.button.setAttribute('data-ai-tool', 'true');
        this.button.title = 'Find citations';

        // Create citation icon (using a book icon)
        const icon = document.createElement('div');
        icon.innerHTML = CITE_ICON_SVG;
        this.button.appendChild(icon);

        // Track the latest constructed instance
        try { CitationTool.lastConstructedInstance = this; } catch { }

        // Install a single set of global listeners once
        if (!CitationTool.globalListenersInstalled) {
            try {
                const w = window as any;
                if (!w.__outliner_citation_listeners_installed) {
                    // Mini toolbar: cite current
                    window.addEventListener('outliner-ai-cite-current', () => {
                        try {
                            // Debounce rapid events
                            const now = Date.now();
                            if (now - CitationTool.lastEventTime < CitationTool.EVENT_DEBOUNCE_MS) {
                                return;
                            }
                            CitationTool.lastEventTime = now;

                            const inst = CitationTool.lastConstructedInstance;
                            if (!inst) return;
                            if (inst.working) return;
                            const selection = window.getSelection();
                            const hasSelection = selection && selection.rangeCount > 0 && !selection.getRangeAt(0).collapsed;
                            inst.forceBlockPlacement = true;
                            if (!hasSelection && selection && selection.rangeCount > 0) {
                                const range = selection.getRangeAt(0);
                                // @ts-ignore
                                inst.surround(range as any);
                            } else if (selection && selection.rangeCount > 0) {
                                const range = selection.getRangeAt(0);
                                // @ts-ignore
                                inst.surround(range as any);
                            }
                        } catch { /* noop */ }
                    });

                    // Document changed → update bibliography display
                    window.addEventListener('outliner-document-changed', () => {
                        try {
                            // Debounce rapid events
                            const now = Date.now();
                            if (now - CitationTool.lastEventTime < CitationTool.EVENT_DEBOUNCE_MS) {
                                return;
                            }
                            CitationTool.lastEventTime = now;

                            const inst = CitationTool.lastConstructedInstance;
                            if (!inst) return;
                            setTimeout(() => {
                                try { inst.updateBibliographyDisplay().catch(() => { }); } catch { }
                            }, 200);
                        } catch { /* noop */ }
                    });

                    // External open request
                    window.addEventListener('outliner-open-citations', () => {
                        try {
                            // Debounce rapid events
                            const now = Date.now();
                            if (now - CitationTool.lastEventTime < CitationTool.EVENT_DEBOUNCE_MS) {
                                return;
                            }
                            CitationTool.lastEventTime = now;

                            const inst = CitationTool.lastConstructedInstance;
                            if (!inst) return;
                            inst.openCitations().catch(() => { });
                        } catch { /* noop */ }
                    });

                    w.__outliner_citation_listeners_installed = true;
                }

                CitationTool.globalListenersInstalled = true;
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

        // Prevent multiple modals from being opened
        if (this.modal || document.querySelector('[data-citation-modal="true"]')) {
            return;
        }

        try {
            this.working = true;
            this.button.disabled = true;

            // Ensure any existing modals are closed before proceeding
            this.closeModal();

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

            // Reset pagination state if selection changed
            if (this.lastSelectedTextKey !== selectedText) {
                this.currentPage = 1;
                this.pageCache.clear();
                this.lastSearchQuery = null;
                this.lastSelectedTextKey = selectedText;
            }

            // Show loading overlay
            this.showLoading('Researching...');

            // Call the citation API
            const res = await fetch(this.config.endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: selectedText,
                    perPage: this.perPage,
                    page: 1,
                    language: this.config.language || 'en'
                })
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err?.error || `Request failed with ${res.status}`);
            }

            const data = await res.json();
            // sync pagination and cache
            this.perPage = data?.perPage || this.perPage;
            this.currentPage = data?.page || 1;
            this.lastSearchQuery = data?.searchQuery || null;
            this.pageCache.set(this.currentPage, data);
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
            try {
                document.body.removeChild(this.modal);
            } catch { }
            this.modal = null;
        }

        // Also remove any existing modals from other instances to prevent multiple overlays
        const existingModals = document.querySelectorAll('[data-citation-modal="true"]');
        existingModals.forEach(modal => {
            try {
                if (modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
            } catch { }
        });

        // Create modal with custom CSS variables
        this.modal = document.createElement('div');
        this.modal.setAttribute('data-citation-modal', 'true');
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
        const totalFound = data?.totalFound ?? (data.papers ? data.papers.length : 0);
        const page = data?.page ?? this.currentPage;
        const perPage = data?.perPage ?? this.perPage;
        const showingCount = data?.papers?.length ?? 0;
        title.textContent = `Found ${totalFound} Reference${totalFound !== 1 ? 's' : ''} — Page ${page}`;
        title.className = 'm-0 text-lg font-semibold';
        title.style.cssText = `
            color: var(--text);
            font-weight: var(--heading-font-weight);
        `;

        // Pagination controls
        const pager = document.createElement('div');
        pager.className = 'flex flex-col gap-2';

        // Button row with responsive layout
        const buttonRow = document.createElement('div');
        buttonRow.className = 'flex flex-col sm:flex-row items-center gap-2';

        const prevBtn = document.createElement('button');
        prevBtn.textContent = 'Prev';
        prevBtn.className = 'px-3 py-1.5 rounded-md border text-xs font-medium cursor-pointer transition-all duration-200 hover:opacity-90';
        prevBtn.style.cssText = `
            background-color: var(--bw);
            color: var(--text);
            border-color: var(--border);
            font-weight: var(--base-font-weight);
        `;
        prevBtn.disabled = page <= 1;
        prevBtn.onclick = () => this.goToPage(page - 1);

        const nextBtn = document.createElement('button');
        nextBtn.textContent = 'Next';
        nextBtn.className = 'px-3 py-1.5 rounded-md border text-xs font-medium cursor-pointer transition-all duration-200 hover:opacity-90';
        nextBtn.style.cssText = `
            background-color: var(--main);
            color: var(--mtext);
            border-color: var(--border);
            font-weight: var(--base-font-weight);
        `;
        const hasMore = totalFound ? (page * perPage) < totalFound : showingCount === perPage;
        nextBtn.disabled = !hasMore;
        nextBtn.onclick = () => this.goToPage(page + 1);

        // Page info that goes between buttons on larger screens
        // const pageInfo = document.createElement('span');
        // pageInfo.textContent = `${(page - 1) * perPage + 1}-${(page - 1) * perPage + showingCount} of ${totalFound}`;
        // pageInfo.className = 'text-xs opacity-80 text-center order-first sm:order-none';
        // pageInfo.style.cssText = `color: var(--text);`;

        buttonRow.appendChild(prevBtn);
        // buttonRow.appendChild(pageInfo);
        buttonRow.appendChild(nextBtn);

        pager.appendChild(buttonRow);

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
        const rightActions = document.createElement('div');
        rightActions.className = 'flex items-center gap-3';
        rightActions.appendChild(pager);
        rightActions.appendChild(closeBtn);
        header.appendChild(rightActions);

        // Content
        const content = document.createElement('div');
        content.className = 'p-5 overflow-y-auto max-h-[78vh]';
        content.style.cssText = `
            background-color: var(--bg);
        `;

        // Search info with editable keywords
        const searchInfo = document.createElement('div');
        searchInfo.className = 'mb-5 p-3 rounded-md text-sm';
        searchInfo.style.cssText = `
            background-color: var(--bw);
            border: 1px solid var(--border);
            color: var(--text);
        `;

        const searchRow = document.createElement('div');
        searchRow.className = 'flex items-center justify-between gap-2';

        const keywordsLeft = document.createElement('div');
        const keywordsLabel = document.createElement('strong');
        keywordsLabel.textContent = 'Keywords: ';
        const keywordsValue = document.createElement('span');
        keywordsValue.textContent = data.keywords?.join(', ') || 'N/A';
        keywordsLeft.appendChild(keywordsLabel);
        keywordsLeft.appendChild(keywordsValue);

        const actionsRight = document.createElement('div');
        actionsRight.className = 'flex items-center gap-2';
        const editBtn = document.createElement('button');
        editBtn.title = 'Edit keywords';
        editBtn.className = 'p-1.5 rounded-md border text-xs cursor-pointer transition-all duration-200 hover:opacity-90';
        editBtn.style.cssText = `
            background-color: var(--bw);
            color: var(--text);
            border-color: var(--border);
        `;
        // Pencil icon SVG
        const editIcon = document.createElement('span');
        editIcon.innerHTML = PENCIL_ICON_SVG;
        editBtn.appendChild(editIcon);

        const renderEdit = () => {
            searchRow.innerHTML = '';
            const editContainer = document.createElement('div');
            editContainer.className = 'flex items-center justify-between gap-2 w-full';

            const input = document.createElement('input');
            input.type = 'text';
            input.value = (data.keywords && data.keywords.length > 0) ? data.keywords.join(', ') : '';
            input.placeholder = 'keyword1, keyword2, keyword3';
            input.className = 'flex-1 px-2 py-1 rounded-md border text-sm';
            input.style.cssText = `
                background-color: var(--bg);
                color: var(--text);
                border-color: var(--border);
            `;

            const saveBtn = document.createElement('button');
            saveBtn.innerHTML = CHECK_ICON_SVG;
            saveBtn.className = 'rounded-md border cursor-pointer transition-all duration-200 hover:opacity-90';
            saveBtn.style.cssText = `
                background-color: var(--main);
                color: var(--mtext);
                border-color: var(--border);
                width: 28px;
                height: 28px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                padding: 0;
            `;

            const cancelBtn = document.createElement('button');
            cancelBtn.innerHTML = X_ICON_SVG;
            cancelBtn.className = 'rounded-md border cursor-pointer transition-all duration-200 hover:opacity-90';
            cancelBtn.style.cssText = `
                background-color: var(--bw);
                color: var(--text);
                border-color: var(--border);
                width: 28px;
                height: 28px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                padding: 0;
            `;

            const submit = async () => {
                const raw = input.value || '';
                const keywords = raw.split(',').map(k => k.trim()).filter(k => k.length > 0);
                if (keywords.length === 0) {
                    this.config.notify?.('Please enter at least one keyword.');
                    return;
                }
                await this.applyEditedKeywords(keywords);
            };

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    submit();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    renderView();
                }
            });
            saveBtn.onclick = () => submit();
            cancelBtn.onclick = () => renderView();

            editContainer.appendChild(input);
            editContainer.appendChild(cancelBtn);
            editContainer.appendChild(saveBtn);
            searchRow.appendChild(editContainer);
            // Focus after the element is attached to DOM and move caret to end
            setTimeout(() => {
                try {
                    input.focus();
                    const len = input.value.length;
                    input.setSelectionRange(len, len);
                } catch { }
            }, 0);
        };

        const renderView = () => {
            searchRow.innerHTML = '';
            keywordsValue.textContent = data.keywords?.join(', ') || 'Waiting for input...';
            actionsRight.innerHTML = '';
            actionsRight.appendChild(editBtn);
            searchRow.appendChild(keywordsLeft);
            searchRow.appendChild(actionsRight);
        };

        editBtn.onclick = () => renderEdit();

        // If user has no input yet, start in edit mode by default
        const shouldStartInEditMode = (
            (!data.keywords || data.keywords.length === 0) &&
            (!data.searchQuery || String(data.searchQuery).trim() === '') &&
            (!data.papers || data.papers.length === 0)
        );

        if (shouldStartInEditMode) {
            renderEdit();
        } else {
            renderView();
        }
        searchInfo.appendChild(searchRow);
        content.appendChild(searchInfo);

        // Papers list
        if (data.papers && data.papers.length > 0) {
            const papersList = document.createElement('div');
            papersList.className = 'grid grid-cols-1 md:grid-cols-2 gap-4';
            papersList.style.cssText = `
                display: grid;
                grid-template-columns: repeat(1, 1fr);
                gap: 1rem;
                align-items: stretch;
            `;

            // Apply responsive grid layout using CSS media queries
            const style = document.createElement('style');
            style.textContent = `
                @media (min-width: 768px) {
                    .citation-papers-grid {
                        grid-template-columns: repeat(2, 1fr) !important;
                    }
                }
                .citation-papers-grid > * {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                }
            `;
            if (!document.querySelector('style[data-citation-grid="true"]')) {
                style.setAttribute('data-citation-grid', 'true');
                document.head.appendChild(style);
            }
            papersList.classList.add('citation-papers-grid');

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
            noResults.textContent = 'No papers yet. Try inputing keywords or adjusting your search.';
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

    private async goToPage(page: number) {
        try {
            if (page < 1) return;
            if (this.working) return;
            this.working = true;

            // If cached, use it
            const cached = this.pageCache.get(page);
            if (cached) {
                this.currentPage = page;
                this.hideLoading();
                this.showCitationModal(cached, this.lastSelectedTextKey || '');
                return;
            }

            this.showLoading('Loading...');

            const body: any = {
                page,
                perPage: this.perPage,
            };
            if (this.lastSearchQuery) {
                body.searchQuery = this.lastSearchQuery;
            } else if (this.lastSelectedTextKey) {
                body.text = this.lastSelectedTextKey;
            }

            const res = await fetch(this.config.endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...body,
                    language: this.config.language || 'en'
                })
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err?.error || `Request failed with ${res.status}`);
            }

            const data = await res.json();
            this.perPage = data?.perPage || this.perPage;
            this.currentPage = data?.page || page;
            this.lastSearchQuery = data?.searchQuery || this.lastSearchQuery;
            this.pageCache.set(this.currentPage, data);
            this.hideLoading();
            this.showCitationModal(data, this.lastSelectedTextKey || '');
        } catch (e: any) {
            this.config.notify?.(e?.message || 'Failed to load page');
        } finally {
            this.hideLoading();
            this.working = false;
        }
    }

    private async applyEditedKeywords(keywords: string[]) {
        try {
            if (!keywords || keywords.length === 0) return;
            if (this.working) return;
            this.working = true;

            this.currentPage = 1;
            this.pageCache.clear();
            const searchQuery = keywords.join(' AND ');
            this.lastSearchQuery = searchQuery;

            this.showLoading('Searching...');

            const res = await fetch(this.config.endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    searchQuery,
                    perPage: this.perPage,
                    page: 1,
                    language: this.config.language || 'en'
                })
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err?.error || `Request failed with ${res.status}`);
            }

            const data = await res.json();
            this.perPage = data?.perPage || this.perPage;
            this.currentPage = data?.page || 1;
            this.lastSearchQuery = data?.searchQuery || searchQuery;
            this.pageCache.set(this.currentPage, data);

            this.hideLoading();
            this.showCitationModal(data, this.lastSelectedTextKey || '');
        } catch (e: any) {
            this.config.notify?.(e?.message || 'Failed to update keywords');
        } finally {
            this.hideLoading();
            this.working = false;
        }
    }

    private async openCitations() {
        try {
            if (this.working) return;
            // If we have cached data for current page, show it
            const cached = this.pageCache.get(this.currentPage);
            if (cached) {
                this.showCitationModal(cached, this.lastSelectedTextKey || '');
                return;
            }

            // If we have a lastSearchQuery, fetch first page
            if (this.lastSearchQuery) {
                this.working = true;
                this.showLoading('Loading...');
                const res = await fetch(this.config.endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        searchQuery: this.lastSearchQuery,
                        perPage: this.perPage,
                        page: 1,
                        language: this.config.language || 'en'
                    })
                });
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err?.error || `Request failed with ${res.status}`);
                }
                const data = await res.json();
                this.perPage = data?.perPage || this.perPage;
                this.currentPage = data?.page || 1;
                this.lastSearchQuery = data?.searchQuery || this.lastSearchQuery;
                this.pageCache.set(this.currentPage, data);
                this.hideLoading();
                this.showCitationModal(data, this.lastSelectedTextKey || '');
                return;
            }

            // Otherwise, open an empty modal encouraging keyword edit
            const emptyData = {
                keywords: [],
                searchQuery: '',
                papers: [],
                totalFound: 0,
                page: 1,
                perPage: this.perPage,
            };
            this.showCitationModal(emptyData, '');
        } catch (e: any) {
            this.config.notify?.(e?.message || 'Failed to open citations');
        } finally {
            this.hideLoading();
            this.working = false;
        }
    }

    private createPaperCard(paper: any, index: number): HTMLDivElement {
        const card = document.createElement('div');
        card.className = 'rounded-md p-4 transition-all duration-200 hover:-translate-y-0.5';
        card.style.cssText = `
            border: 1px solid var(--border);
            background-color: var(--bw);
            box-shadow: var(--shadow);
            overflow: visible;
            height: 100%;
            display: flex;
            flex-direction: column;
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
        const authorNames = Array.isArray(paper.authors)
            ? paper.authors.map((a: any) => a?.name).filter(Boolean)
            : [];
        authors.textContent = authorNames.length > 3
            ? `${authorNames.slice(0, 3).join(', ')}, et al.`
            : (authorNames.join(', ') || 'Unknown authors');

        const metaInfo = document.createElement('div');
        metaInfo.className = 'flex flex-wrap gap-2 text-xs mb-3';
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
            venue.textContent = `Publisher: ${paper.venue}`;
            metaInfo.appendChild(venue);
        }

        if (paper.citationCount !== undefined) {
            const citations = document.createElement('span');
            citations.textContent = `Citations: ${paper.citationCount}`;
            metaInfo.appendChild(citations);
        }

        const actions = document.createElement('div');
        actions.className = 'flex gap-2 flex-wrap mt-auto';
        actions.style.cssText = `
            margin-top: auto;
        `;

        // Add Cite button
        const citeBtn = document.createElement('button');
        citeBtn.className = 'inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-medium cursor-pointer transition-all duration-200 hover:opacity-90 hover:-translate-y-0.5';
        citeBtn.style.cssText = `
                    background-color: var(--main);
                    color: var(--mtext);
                    border-color: var(--border);
                    font-weight: var(--base-font-weight);
                `;
        citeBtn.innerHTML = `<span class="icon" aria-hidden="true">${CITE_ICON_SVG}</span><span>Cite</span>`;

        citeBtn.onclick = () => this.insertCitation(paper);
        actions.appendChild(citeBtn);

        // Add Show Abstract button
        const abstractBtn = document.createElement('button');
        abstractBtn.setAttribute('data-abstract-btn', 'true');
        abstractBtn.className = 'inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-medium cursor-pointer transition-all duration-200 hover:opacity-90 hover:-translate-y-0.5';
        abstractBtn.style.cssText = `
            background-color: var(--main);
            color: var(--mtext);
            border-color: var(--border);
            font-weight: var(--base-font-weight);
        `;
        abstractBtn.innerHTML = `<span class="icon" aria-hidden="true">${ABSTRACT_ICON_SVG}</span><span>Abstract</span>`;
        abstractBtn.onclick = () => this.toggleAbstract(paper, card);
        actions.appendChild(abstractBtn);

        // Create content wrapper for main content
        const contentWrapper = document.createElement('div');
        contentWrapper.style.cssText = `
            flex: 1;
            display: flex;
            flex-direction: column;
        `;

        contentWrapper.appendChild(title);
        contentWrapper.appendChild(authors);
        contentWrapper.appendChild(metaInfo);

        card.appendChild(contentWrapper);
        card.appendChild(actions);

        if (paper.url) {
            const viewBtn = document.createElement('a');
            viewBtn.href = paper.url;
            viewBtn.target = '_blank';
            viewBtn.className = 'inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium border transition-all duration-200 hover:opacity-90 hover:-translate-y-0.5 cursor-pointer no-underline';
            viewBtn.style.cssText = `
                background-color: var(--main);
                color: var(--mtext);
                border-color: var(--border);
                font-weight: var(--base-font-weight);
            `;
            viewBtn.innerHTML = `<span class="icon" aria-hidden="true">${OPEN_ICON_SVG}</span><span>Web</span>`;
            actions.appendChild(viewBtn);
        }

        if (paper.openAccessPdf?.url) {
            const pdfBtn = document.createElement('a');
            pdfBtn.href = paper.openAccessPdf.url;
            pdfBtn.target = '_blank';
            pdfBtn.className = 'inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium border transition-all duration-200 hover:opacity-90 hover:-translate-y-0.5 cursor-pointer no-underline';
            pdfBtn.style.cssText = `
                background-color: var(--main);
                color: var(--mtext);
                border-color: var(--border);
                font-weight: var(--base-font-weight);
            `;
            pdfBtn.innerHTML = `<span class="icon" aria-hidden="true">${FILE_ICON_SVG}</span><span>PDF</span>`;
            actions.appendChild(pdfBtn);
        }

        return card;
    }

    private async toggleAbstract(paper: any, card: HTMLDivElement) {
        const paperId = paper.paperId || paper.id;
        if (!paperId) {
            this.config.notify?.('Paper ID not available for abstract fetch');
            return;
        }

        // Check if abstract is already expanded
        const isExpanded = this.expandedAbstracts.has(paperId);
        const existingAbstract = card.querySelector('.abstract-container');

        if (isExpanded && existingAbstract) {
            // Collapse the abstract
            this.expandedAbstracts.delete(paperId);
            existingAbstract.remove();
            
            // Update button text
            const button = card.querySelector('button[data-abstract-btn="true"]') as HTMLButtonElement;
            if (button) {
                button.innerHTML = `<span class="icon" aria-hidden="true">${ABSTRACT_ICON_SVG}</span><span>Abstract</span>`;
            }
            return;
        }

        // Show the abstract
        try {
            // Update button to show loading state
            const button = card.querySelector('button[data-abstract-btn="true"]') as HTMLButtonElement;
            if (button) {
                button.disabled = true;
                button.innerHTML = `<span class="icon" aria-hidden="true">${ABSTRACT_ICON_SVG}</span><span>Loading...</span>`;
            }
            
            const abstract = await this.fetchAbstract(paperId);
            this.displayAbstract(paper, card, abstract);
            this.expandedAbstracts.add(paperId);
            
            // Update button text to hide state
            if (button) {
                button.disabled = false;
                button.innerHTML = `<span class="icon" aria-hidden="true">${CHEVRON_UP_ICON_SVG}</span><span>Hide</span>`;
            }
        } catch (error) {
            // Reset button on error
            const button = card.querySelector('button[data-abstract-btn="true"]') as HTMLButtonElement;
            if (button) {
                button.disabled = false;
                button.innerHTML = `<span class="icon" aria-hidden="true">${ABSTRACT_ICON_SVG}</span><span>Show Abstract</span>`;
            }
            this.config.notify?.(`Failed to fetch abstract: ${(error as Error).message}`);
        }
    }

    private async fetchAbstract(paperId: string): Promise<string> {
        // Check cache first
        const CACHE_TTL = 15 * 60 * 1000; // 15 minutes
        const cached = this.abstractCache.get(paperId);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            return cached.abstract;
        }

        // Check if already loading
        if (this.abstractLoadingStates.get(paperId)) {
            throw new Error('Abstract is already being fetched');
        }

        // Add small delay to prevent rapid-fire requests
        await new Promise(resolve => setTimeout(resolve, 200));
        
        try {
            this.abstractLoadingStates.set(paperId, true);
            
            const response = await fetch('/api/outliner/abstract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paperId })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                
                // Provide user-friendly error messages
                let userMessage = 'Failed to fetch abstract';
                if (response.status === 404) {
                    userMessage = 'Paper not found';
                } else if (response.status === 403) {
                    userMessage = 'Access denied to abstract';
                } else if (response.status === 429) {
                    userMessage = 'Too many requests. Please try again in a moment.';
                } else if (response.status >= 500) {
                    userMessage = 'Server error. Please try again later.';
                }
                
                throw new Error(errorData.error || userMessage);
            }

            const data = await response.json();
            const abstract = data.abstract || 'No abstract available for this paper.';
            
            // Cache the result
            this.abstractCache.set(paperId, { abstract, timestamp: Date.now() });
            
            return abstract;
        } catch (error) {
            // Log the error for debugging but throw user-friendly message
            console.error('Error fetching abstract for paper:', paperId, error);
            
            if (error instanceof Error) {
                throw error;
            } else {
                throw new Error('Unexpected error occurred while fetching abstract');
            }
        } finally {
            this.abstractLoadingStates.delete(paperId);
        }
    }

    private displayAbstract(paper: any, card: HTMLDivElement, abstract: string) {
        // Remove any existing abstract
        const existingAbstract = card.querySelector('.abstract-container');
        if (existingAbstract) {
            existingAbstract.remove();
        }

        // Create abstract container
        const abstractContainer = document.createElement('div');
        abstractContainer.className = 'abstract-container mt-3 p-3 rounded-md border-t';
        abstractContainer.style.cssText = `
            background-color: var(--bg);
            border-top-color: var(--border);
            margin-top: 12px;
            margin-bottom: 12px;
            padding: 12px;
            border-top-width: 1px;
            border-top-style: solid;
        `;

        const abstractLabel = document.createElement('h4');
        abstractLabel.className = 'text-sm font-semibold mb-2 m-0';
        abstractLabel.style.cssText = `
            color: var(--text);
            font-weight: var(--heading-font-weight);
            margin: 0 0 8px 0;
        `;
        abstractLabel.textContent = 'Abstract';

        const abstractText = document.createElement('p');
        abstractText.className = 'text-sm leading-relaxed m-0';
        abstractText.style.cssText = `
            color: var(--text);
            opacity: 0.9;
            line-height: 1.6;
            margin: 0;
            word-break: break-word;
            overflow-wrap: anywhere;
        `;
        abstractText.textContent = abstract;

        abstractContainer.appendChild(abstractLabel);
        abstractContainer.appendChild(abstractText);

        // Insert before the actions div
        const actions = card.querySelector('.flex.gap-2.flex-wrap.mt-auto');
        if (actions && actions.parentNode) {
            actions.parentNode.insertBefore(abstractContainer, actions);
        } else {
            card.appendChild(abstractContainer);
        }
    }

    private closeModal() {
        if (this.modal) {
            try {
                document.body.removeChild(this.modal);
            } catch { }
            this.modal = null;
        }

        // Also remove any other citation modals that might exist
        const existingModals = document.querySelectorAll('[data-citation-modal="true"]');
        existingModals.forEach(modal => {
            try {
                if (modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
            } catch { }
        });
    }

    private showLoading(message: string = 'Loading...') {
        try {
            if (this.loadingOverlay) return;

            // Remove any existing loading overlays to prevent multiple layers
            const existingOverlays = document.querySelectorAll('[data-citation-loading="true"]');
            existingOverlays.forEach(overlay => {
                try {
                    if (overlay.parentNode) {
                        overlay.parentNode.removeChild(overlay);
                    }
                } catch { }
            });

            const overlay = document.createElement('div');
            overlay.setAttribute('data-citation-loading', 'true');
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

            // Also remove any other loading overlays that might exist
            const existingOverlays = document.querySelectorAll('[data-citation-loading="true"]');
            existingOverlays.forEach(overlay => {
                try {
                    if (overlay.parentNode) {
                        overlay.parentNode.removeChild(overlay);
                    }
                } catch { }
            });
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

            // First try DOM-level insertion at the saved selection (skip if forced block placement)
            const insertedViaDom = this.forceBlockPlacement ? false : this.insertCitationAtSavedSelection(citationTextCore);

            if (!insertedViaDom) {
                // Fallback to block-level insertion (end of current paragraph)
                const doc = await this.config.getDocument();
                if (!doc || !Array.isArray(doc.blocks)) {
                    this.config.notify?.('Failed to get document for citation insertion');
                    return;
                }

                const currentBlockInfo = await this.getCurrentBlockInfo();
                if (!currentBlockInfo) {
                    // No focused block (likely opened from toolbar). Insert a new paragraph at end with the citation.
                    try {
                        const blocksCount = typeof this.api.blocks.getBlocksCount === 'function' ? this.api.blocks.getBlocksCount() : (Array.isArray(doc.blocks) ? doc.blocks.length : 0);
                        this.api.blocks.insert('paragraph', { text: citationTextCore }, {}, blocksCount);
                    } catch (e) {
                        console.error('Failed to insert citation at end of document:', e);
                        this.config.notify?.('Failed to insert citation at end of document.');
                        return;
                    }
                } else {
                    const { currentBlockIndex } = currentBlockInfo;
                    const docBlock = doc.blocks[currentBlockIndex];
                    if (!docBlock || docBlock.type !== 'paragraph' || !docBlock.data) {
                        // If not a paragraph, append a new paragraph at end instead
                        try {
                            const blocksCount = typeof this.api.blocks.getBlocksCount === 'function' ? this.api.blocks.getBlocksCount() : (Array.isArray(doc.blocks) ? doc.blocks.length : 0);
                            this.api.blocks.insert('paragraph', { text: citationTextCore }, {}, blocksCount);
                        } catch (e) {
                            console.error('Failed to insert citation at end of document:', e);
                            this.config.notify?.('Failed to insert citation at end of document.');
                            return;
                        }
                    } else {
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
                }
            }

            // Reset force flag after operation
            this.forceBlockPlacement = false;

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
            word-break: break-word;
            overflow-wrap: anywhere;
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
            link.style.wordBreak = 'break-word';
            link.style.overflowWrap = 'anywhere';
            referenceTextElement.appendChild(spacer);
            referenceTextElement.appendChild(link);
        }

        referenceDiv.appendChild(referenceTextElement);
        container.appendChild(referenceDiv);

        // Extra safety: schedule a cleanup in case of race with updater
        setTimeout(() => {
            try { this.removeBibliographyPlaceholders(container); } catch { }
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

        const maxAuthors = 3;
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
        } catch { }
    }

    // Cleanup method to be called when the tool is destroyed
    destroy() {
        try {
            this.closeModal();
            this.hideLoading();
            // Clear any references
            this.savedSelectionRange = null;
            this.pageCache.clear();
            this.lastSearchQuery = null;
            this.lastSelectedTextKey = null;
            // Clear abstract-related properties
            this.abstractCache.clear();
            this.expandedAbstracts.clear();
            this.abstractLoadingStates.clear();
        } catch { }
    }
}
