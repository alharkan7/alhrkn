"use client";

import { useState } from "react";
import { DiagramInput } from "./components/DiagramInput";
import { AppsHeader } from '@/components/apps-header';
import AppsFooter from '@/components/apps-footer';
import { MermaidRenderer } from "./components/MermaidRenderer";
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DIAGRAM_THEMES } from './components/diagram-types';

export default function InztagramPage() {
  const [input, setInput] = useState("");
  const [diagramCode, setDiagramCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diagramType, setDiagramType] = useState<string>('graph TD');
  const [diagramTheme, setDiagramTheme] = useState<string>('default');

  const handleSend = async (value: string, type: string, theme: string) => {
    setLoading(true);
    setError(null);
    setDiagramType(type);
    setDiagramTheme(theme);
    try {
      const res = await fetch("/api/inztagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: value, diagramType: type }),
      });
      const data = await res.json();
      if (res.ok && data.code) {
        setDiagramCode(data.code);
      } else {
        setError(data.error || "Failed to generate diagram");
      }
    } catch (e: any) {
      setError(e.message || "Failed to generate diagram");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="fixed top-0 left-0 right-0 z-50">
        <AppsHeader />
      </div>
      {diagramCode ? (
        <MermaidRenderer
          code={diagramCode}
          diagramType={diagramType}
          diagramTheme={diagramTheme}
          onThemeChange={setDiagramTheme}
          onNewDiagram={() => setDiagramCode(null)}
        />
      ) : (
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
            <div className="w-full h-full max-w-2xl">
              <DiagramInput
                value={input}
                onChange={setInput}
                placeholder="Describe your diagram..."
                onSend={handleSend}
                disabled={loading}
              />
              {loading && <div className="text-center text-muted-foreground mt-2">Generating diagram...</div>}
              {error && <div className="text-center text-red-500 mt-2">{error}</div>}
            </div>
          </div>
        </div>
      )}
      <div className="flex-none mb-1">
        <AppsFooter />
      </div>
    </div>
  );
}
