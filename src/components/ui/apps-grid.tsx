'use client';

import * as React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { apps } from '@/config/apps';
import { useRouter } from 'next/navigation';
import { Mail } from 'lucide-react';

interface AppsGridProps {
  trigger: React.ReactNode;
  useHardReload?: boolean;
}

export function AppsGrid({ trigger, useHardReload = false }: AppsGridProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);
  const [showTooltips, setShowTooltips] = React.useState(false);
  const [isLoaded, setIsLoaded] = React.useState(false);

  const handleAppClick = (slug: string) => {
    if (slug === 'enaiblr') {
      window.location.href = 'https://enaiblr.org/apps';
      return;
    }

    const appUrl = `/${slug}`;
    if (useHardReload) {
      window.location.href = appUrl;
    } else {
      router.push(appUrl, { scroll: false });
    }
    setIsOpen(false);
  };

  React.useEffect(() => {
    if (isOpen) {
      // Reduced delay for better responsiveness
      const timer = setTimeout(() => setShowTooltips(true), 0);
      return () => clearTimeout(timer);
    } else {
      setShowTooltips(false);
    }
  }, [isOpen]);

  // Mark as loaded on mount
  React.useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    // <TooltipProvider>
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {trigger}
      </PopoverTrigger>
      <PopoverContent
        className="w-[240px] p-2"
        align="end"
        onPointerDownOutside={(e: Event) => {
          if (e.target instanceof Element && e.target.closest('.apps-grid-content')) {
            e.preventDefault();
          }
        }}
        // Add a fade-in animation
        style={{
          opacity: isLoaded ? 1 : 0,
          transition: 'opacity 0.15s ease-in-out'
        }}
      >
        <div className="apps-grid-content gap-3 grid grid-cols-2 max-h-[310px] pb-2 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full">
          {apps.map((app) => {
            const Icon = app.icon;
            return (
              // <Tooltip key={app.slug}>
              //   <TooltipTrigger asChild disabled={!showTooltips}>
              <Button
                key={app.slug}
                variant="neutral"
                className="relative h-[90px] w-[100px] flex flex-col items-center justify-center gap-3 hover:bg-muted rounded-2xl"
                onClick={() => handleAppClick(app.slug)}
              >
                <Icon className="size-12 text-foreground" />
                <div className="w-full h-8 flex items-start">
                  <span className="text-xs font-medium line-clamp-2 text-center whitespace-normal break-words w-full">{app.name}</span>
                </div>
              </Button>
              // </TooltipTrigger>
              //   <TooltipContent>
              //     {app.name}
              //   </TooltipContent>
              // </Tooltip>
            );
          })}
        </div>
        <div className="mt-2 pt-3 border-t border-border">
          <Button
            variant="neutral"
            className="w-full flex items-center justify-start gap-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => window.location.href = 'mailto:enaiblr@gmail.com'}
          >
            <Mail className='mr-1 ml-2' />
            Request New Apps
          </Button>
        </div>
      </PopoverContent>
    </Popover>
    // </TooltipProvider>
  );
}
