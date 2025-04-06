import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, LoaderCircle } from 'lucide-react';
import { followUpCardStyles } from '../styles/styles'; // Assuming we can reuse styles
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface EmailFormProps {
  onSubmit: (email: string) => Promise<void> | void; // Changed to onSubmit taking email
  onCancel: () => void;
  loading: boolean; // Renamed from isSubmitting for consistency
  error?: string | null; // Propagate error message
  downloadFormat: string; // To display which format is being downloaded
}

const EmailForm: React.FC<EmailFormProps> = ({
  onSubmit,
  onCancel,
  loading,
  error,
  downloadFormat
}) => {
  const [email, setEmail] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

  // Create portal container
  useEffect(() => {
    if (typeof document !== 'undefined') {
      let container = document.getElementById('email-prompt-portal');
      if (!container) {
        container = document.createElement('div');
        container.id = 'email-prompt-portal';
        // Basic portal styles (similar to FollowUpCard)
        container.style.position = 'fixed';
        container.style.top = '0';
        container.style.left = '0';
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.zIndex = '9999999';
        container.style.pointerEvents = 'none';
        document.body.appendChild(container);
      }
      setPortalContainer(container);
      return () => {
        if (container && container.childNodes.length === 0) {
           // Check if the container exists before attempting removal
           if(document.body.contains(container)) {
                document.body.removeChild(container);
            }
        }
      };
    }
  }, []);

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && email.trim() && !loading) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent); // Simulate form submit
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default form submission
    e.stopPropagation(); // Prevent triggering overlay click
    if (email.trim() && !loading) {
      onSubmit(email);
    }
  };

  // Content to be rendered in the portal
  const content = (
    <div
      className="email-prompt-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'auto',
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'fadeIn 0.1s ease-out forwards'
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (!loading) {
          onCancel();
        }
      }}
    >
      <div
        ref={cardRef}
        className="email-prompt-card"
        style={{
          width: '400px', // Adjusted width for email form
          pointerEvents: 'auto',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
          backgroundColor: 'var(--card)',
          background: 'hsl(var(--card) / 1)',
          borderRadius: '8px',
          overflow: 'hidden',
          border: '1px solid var(--border)',
          position: 'relative',
          animation: 'scaleIn 0.2s ease-out forwards'
        }}
        onClick={(e) => e.stopPropagation()} // Prevent overlay click when clicking card
      >
        {/* Assuming reuse of followUpCardStyles or similar global styles */}
        <style jsx global>{followUpCardStyles}</style>
        <div className="py-3 pr-3 pl-4 font-medium text-sm text-primary flex justify-between border-b border-border bg-muted">
          <span>Enter Email to Download</span>
          <button
            className="text-muted-foreground hover:text-foreground focus:outline-none"
            onClick={(e) => {
              e.stopPropagation();
              if (!loading) {
                onCancel();
              }
            }}
            disabled={loading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4">
          {/* User provided form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-2 w-full">
            <div className="flex gap-2">
              <Input
                ref={inputRef} // Added ref for focus
                name="email"
                type="email"
                placeholder="Enter your email"
                className="bg-background text-foreground" // Added text-foreground
                value={email} // Controlled input
                onChange={handleInputChange} // Handle change
                onKeyDown={handleKeyDown} // Handle Enter/Escape
                disabled={loading}
                autoFocus={true} // Added autoFocus
              />
              <Button type="submit" disabled={!email.trim() || loading} className="flex items-center gap-2">
                {loading ? (
                   <>
                     <LoaderCircle className="h-4 w-4 animate-spin" />
                     Processing...
                   </>
                 ) : (
                   'Download' // Changed from Subscribe
                 )}
              </Button>
            </div>
            {error && (
              <p className="text-sm text-red-500 mt-1">{error}</p> // Added margin-top
            )}
          </form>
        </div>
      </div>
    </div>
  );

  if (!portalContainer) {
    return null;
  }

  return createPortal(content, portalContainer);
};

export default EmailForm;