import { RefreshCcw } from 'lucide-react'
import { Button } from '@/components/ui/button';
import { AppsHeader } from '@/components/apps-header';

interface ChatTitleProps {
    compact?: boolean;
    clearMessages: () => void;
    hasUserSentMessage?: boolean;
    onClear?: () => void;  // New prop for handling UI reset
}

export function ChatTitle({ compact, clearMessages, hasUserSentMessage, onClear }: ChatTitleProps) {
    const refreshButton = (
        <Button 
            onClick={() => {
                clearMessages();
                onClear?.();  // Call onClear to reset the UI state
            }}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            title="Clear chat history"
            variant="default"
        >
            <RefreshCcw size={14} />
        </Button>
    );

    return hasUserSentMessage ? (
        <AppsHeader
            title={<><span className="text-primary">Ask</span> Al</>}
            leftButton={refreshButton}
        />
    ) : (
        <div className="text-center py-4">
            <h1 className="text-5xl font-black mb-2">
                <span className="text-primary whitespace-nowrap">Ask</span>{' '}
                <span className="whitespace-nowrap">Al</span>
            </h1>
            <div className="text-sm text-muted-foreground">
                <a 
                    href="https://x.com/alhrkn" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:text-primary transition-colors hover:font-bold"
                >
                    @alhrkn
                </a>
                's Experimental Apps
            </div>
        </div>
    );
}