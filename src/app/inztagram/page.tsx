"use client";

import { useState } from "react";
import { DiagramInput } from "./components/DiagramInput";
import { AppsHeader } from '@/components/apps-header';
import AppsFooter from '@/components/apps-footer';

export default function InztagramPage() {
  const [input, setInput] = useState("");

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="fixed top-0 left-0 right-0 z-50">
        <AppsHeader />
      </div>
      <div className="flex-1 flex flex-col justify-start items-center max-w-4xl mx-auto w-full px-1 md:px-4 mt-[25vh]">
        <div className="text-center py-4">
          <h1 className="text-5xl font-black mb-2">
            <span className="text-primary whitespace-nowrap">Inztagram</span>{' '}
          </h1>
          <div className="text-lg text-muted-foreground">
            Create Instant Diagram with AI
          </div>
        </div>
        <div className="w-full flex justify-center">
          <div className="w-full max-w-2xl">
            <DiagramInput
              value={input}
              onChange={setInput}
              placeholder="Describe your diagram..."
            />
          </div>
        </div>
      </div>
      <div className="flex-none mb-1">
        <AppsFooter />
      </div>
    </div>
  );
}
