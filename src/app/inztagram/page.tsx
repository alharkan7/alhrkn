"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Info } from "lucide-react";
import { AppsHeader } from '@/components/apps-header';
import AppsFooter from '@/components/apps-footer';

const DIAGRAM_TYPES = [
  { value: "graph TD", label: "Flowchart (Top-Down)" },
  { value: "graph LR", label: "Flowchart (Left-Right)" },
  { value: "sequenceDiagram", label: "Sequence Diagram" },
  { value: "classDiagram", label: "Class Diagram" },
  { value: "stateDiagram-v2", label: "State Diagram" },
  { value: "erDiagram", label: "ER Diagram" },
  { value: "journey", label: "User Journey" },
  { value: "gantt", label: "Gantt Chart" },
  { value: "pie", label: "Pie Chart" },
  { value: "requirementDiagram", label: "Requirement Diagram" },
  { value: "gitGraph", label: "Gitgraph Diagram" },
  { value: "mindmap", label: "Mind Map" },
  { value: "timeline", label: "Timeline" },
];

const DIAGRAM_THEMES = [
  { value: "default", label: "Default" },
  { value: "neutral", label: "Neutral" },
  { value: "dark", label: "Dark" },
  { value: "forest", label: "Forest" },
  { value: "base", label: "Base (for custom theming)" },
];

const DEFAULT_DIAGRAM_TYPE = "graph TD";
const DEFAULT_DIAGRAM_TEXT = `A[Start] --> B{Is it?};\nB -- Yes --> C[OK];\nC --> D[End];\nB -- No --> E[Oops];\nE --> D;`;

export default function MermaidAIGeneratorPage() {
  const [diagramType, setDiagramType] = useState(DEFAULT_DIAGRAM_TYPE);
  const [diagramTheme, setDiagramTheme] = useState("default");
  const [naturalInput, setNaturalInput] = useState("");
  const [mermaidInput, setMermaidInput] = useState(DEFAULT_DIAGRAM_TEXT);
  const [outputSvg, setOutputSvg] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mermaidContainerRef = useRef<HTMLDivElement>(null);

  // Load Mermaid.js dynamically (client-side only)
  const mermaidRef = useRef<any>(null);
  useEffect(() => {
    if (typeof window !== "undefined" && !mermaidRef.current) {
      import("mermaid").then((mod) => {
        mermaidRef.current = mod.default;
      });
    }
  }, []);

  // Render diagram when input/type/theme changes
  useEffect(() => {
    renderDiagram();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mermaidInput, diagramType, diagramTheme]);

  async function renderDiagram() {
    setIsRendering(true);
    setError(null);
    setOutputSvg(null);
    if (!mermaidRef.current) {
      setError("Mermaid.js not loaded.");
      setIsRendering(false);
      return;
    }
    if (!mermaidInput.trim()) {
      setOutputSvg(null);
      setIsRendering(false);
      return;
    }
    try {
      mermaidRef.current.initialize({
        startOnLoad: false,
        theme: diagramTheme,
        securityLevel: "sandbox",
        fontFamily: 'Inter, sans-serif',
      });
      const fullDef = diagramType + "\n" + mermaidInput;
      const { svg } = await mermaidRef.current.render(
        "mermaid-svg-" + Date.now(),
        fullDef
      );
      setOutputSvg(svg);
      setMessage({ type: "success", text: "Diagram rendered successfully!" });
    } catch (err: any) {
      setError(err?.message || "Unknown error rendering diagram.");
      setOutputSvg(null);
      setMessage({ type: "error", text: "Error rendering diagram." });
    } finally {
      setIsRendering(false);
      setTimeout(() => setMessage(null), 2500);
    }
  }

  async function handleCopySvg() {
    if (!outputSvg) {
      setMessage({ type: "error", text: "No SVG to copy." });
      return;
    }
    try {
      const textarea = document.createElement("textarea");
      textarea.value = outputSvg;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setMessage({ type: "success", text: "SVG copied to clipboard!" });
    } catch (err) {
      setMessage({ type: "error", text: "Failed to copy SVG." });
    }
    setTimeout(() => setMessage(null), 2000);
  }

  async function handleGenerateSyntax() {
    if (!naturalInput.trim()) {
      setMessage({ type: "error", text: "Please enter a description." });
      setTimeout(() => setMessage(null), 2000);
      return;
    }
    setIsGenerating(true);
    setMessage({ type: "info", text: "✨ AI is thinking..." });
    setError(null);
    // --- Gemini API integration placeholder ---
    // Replace this with your actual API call
    try {
      // Simulate API call
      await new Promise((res) => setTimeout(res, 1200));
      // For demo, just echo a simple diagram
      setMermaidInput("A --> B\nB --> C");
      setMessage({ type: "success", text: "✨ Mermaid syntax generated by AI!" });
    } catch (err: any) {
      setError("AI generation failed.");
      setMessage({ type: "error", text: "AI Error: " + (err?.message || "Unknown error") });
    } finally {
      setIsGenerating(false);
      setTimeout(() => setMessage(null), 2000);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-bg py-4 px-1">
      <div className="fixed top-0 left-0 right-0 z-50">
        <AppsHeader />
      </div>
      <div className="w-full max-w-4xl mx-auto bg-card shadow-xl rounded-lg p-4 md:p-8 mt-16 mb-8">
        <header className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-text flex items-center justify-center gap-2">
            Mermaid Chart Generator
            <Info className="h-5 w-5 opacity-60" />
          </h1>
          <p className="text-muted-foreground mt-2">Describe your diagram or write Mermaid syntax. Visualize instantly with various themes!</p>
        </header>

        {/* Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-text mb-1">Diagram Type</label>
            <Select value={diagramType} onValueChange={setDiagramType}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIAGRAM_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">Theme</label>
            <Select value={diagramTheme} onValueChange={setDiagramTheme}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIAGRAM_THEMES.map((theme) => (
                  <SelectItem key={theme.value} value={theme.value}>{theme.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* AI Natural Language Input */}
        <Card className="mb-6 border-dashed border-2 border-main bg-main/10">
          <CardContent className="p-4">
            <label className="block text-sm font-medium text-main mb-1">Describe your diagram (AI Powered ✨)</label>
            <Textarea
              rows={3}
              className="w-full mb-2"
              placeholder="e.g., A user logs in, the system verifies credentials, then grants access or shows an error."
              value={naturalInput}
              onChange={e => setNaturalInput(e.target.value)}
              disabled={isGenerating}
            />
            <Button
              onClick={handleGenerateSyntax}
              className="w-full sm:w-auto mt-2"
              disabled={isGenerating}
              variant="default"
            >
              {isGenerating ? (
                <span className="flex items-center gap-2"><span className="animate-spin w-4 h-4 border-2 border-b-transparent border-main rounded-full" /> Generating...</span>
              ) : (
                <span>✨ Generate Syntax from Description</span>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Mermaid Syntax Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-text mb-1">Mermaid Syntax</label>
          <Textarea
            rows={8}
            className="w-full"
            placeholder="Enter your Mermaid diagram definition here... or generate it using the AI feature above!"
            value={mermaidInput}
            onChange={e => setMermaidInput(e.target.value)}
            disabled={isRendering}
          />
        </div>

        {/* Render/Copy Buttons */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-8">
          <Button
            onClick={renderDiagram}
            className="w-full sm:w-auto"
            disabled={isRendering}
            variant="default"
          >
            {isRendering ? (
              <span className="flex items-center gap-2"><span className="animate-spin w-4 h-4 border-2 border-b-transparent border-green-600 rounded-full" /> Rendering...</span>
            ) : (
              <span>Render Diagram</span>
            )}
          </Button>
          <Button
            onClick={handleCopySvg}
            className="w-full sm:w-auto"
            variant="noShadow"
            disabled={!outputSvg}
          >
            Copy SVG
          </Button>
        </div>

        {/* Output */}
        <div className="bg-muted p-4 rounded-lg border border-border min-h-[300px] flex justify-center items-center mb-2">
          <div ref={mermaidContainerRef} className="w-full">
            {isRendering ? (
              <div className="text-muted-foreground">Rendering...</div>
            ) : outputSvg ? (
              <div dangerouslySetInnerHTML={{ __html: outputSvg }} />
            ) : (
              <div className="text-muted-foreground">Please enter Mermaid syntax to render a diagram.</div>
            )}
          </div>
        </div>
        {error && (
          <div className="mt-2 text-sm text-destructive">
            <pre className="whitespace-pre-wrap p-2 bg-destructive/10 rounded-md">{error}</pre>
          </div>
        )}
      </div>
      {message && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-md shadow-lg text-sm font-medium ${
          message.type === "success"
            ? "bg-green-50 text-green-800 border border-green-200"
            : message.type === "error"
            ? "bg-red-50 text-red-800 border border-red-200"
            : "bg-blue-50 text-blue-800 border border-blue-200"
        }`}>
          {message.text}
        </div>
      )}
      <footer className="mt-8 text-center text-xs text-muted-foreground">
        <p>Powered by Mermaid.js, shadcn/ui, and Gemini AI ✨.</p>
        <div className="flex-none mt-2">
          <AppsFooter />
        </div>
      </footer>
    </div>
  );
}
