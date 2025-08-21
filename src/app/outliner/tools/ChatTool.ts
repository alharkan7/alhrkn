import { CHAT_ICON_SVG } from '../components/svg-icons';

// Inline tool to open chat interface with selected text/block using the ChatInterface
export class ChatTool {
    // Ensure only one global listener handles mini-toolbar events
    private static globalListenerInstalled: boolean = false;
    private static lastConstructedInstance: ChatTool | null = null;

    static isInline = true;
    static title = 'Chat';

    private api: any;
    private button: HTMLButtonElement;
    private config: {
        endpoint: string;
        language?: 'en' | 'id';
        getDocument: () => Promise<any>;
        notify?: (msg: string) => void;
        onOpenChat?: (selectedText: string) => void;
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

        // Create chat icon
        const icon = document.createElement('div');
        icon.innerHTML = CHAT_ICON_SVG;
        this.button.appendChild(icon);
        this.button.title = 'Chat about selected text';

        // Track latest constructed instance so the single global listener can delegate to it
        try { ChatTool.lastConstructedInstance = this; } catch { }

        // Install a single global listener once to avoid duplicate handling from many instances
        if (!ChatTool.globalListenerInstalled) {
            try {
                const w = window as any;
                if (!w.__outliner_chat_listener_installed) {
                    window.addEventListener('outliner-ai-chat-current', () => {
                        try {
                            const inst = ChatTool.lastConstructedInstance;
                            if (!inst) return;
                            if (inst.working) return;

                            // Get selected text
                            const selection = window.getSelection();
                            const selectedText = selection && selection.rangeCount > 0
                                ? selection.getRangeAt(0).toString().trim()
                                : '';

                            // Call the onOpenChat callback with the selected text
                            if (inst.config.onOpenChat) {
                                inst.config.onOpenChat(selectedText);
                            }
                        } catch (error) {
                            console.error('ChatTool error:', error);
                        }
                    });

                    w.__outliner_chat_listener_installed = true;
                }
            } catch { }
            ChatTool.globalListenerInstalled = true;
        }
    }

    render(): HTMLButtonElement {
        return this.button;
    }

    surround(range: Range): void {
        if (this.working) return;
        this.working = true;

        try {
            // Get selected text
            const selectedText = range.toString().trim();

            // Call the onOpenChat callback with the selected text
            if (this.config.onOpenChat) {
                this.config.onOpenChat(selectedText);
            }
        } catch (error) {
            console.error('ChatTool surround error:', error);
        } finally {
            this.working = false;
        }
    }

    checkState(): boolean {
        // Always enabled
        return true;
    }

    show(): void {
        this.button.style.display = 'inline-flex';
    }

    hide(): void {
        this.button.style.display = 'none';
    }

    destroy(): void {
        // Cleanup if needed
    }
}
