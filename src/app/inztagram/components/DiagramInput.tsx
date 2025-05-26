import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles } from 'lucide-react';

const DIAGRAM_TYPES = [
  { value: 'graph TD', label: 'Flowchart (Top-Down)' },
  { value: 'graph LR', label: 'Flowchart (Left-Right)' },
  { value: 'sequenceDiagram', label: 'Sequence Diagram' },
  { value: 'classDiagram', label: 'Class Diagram' },
  { value: 'stateDiagram-v2', label: 'State Diagram' },
  { value: 'erDiagram', label: 'ER Diagram' },
  { value: 'journey', label: 'User Journey' },
  { value: 'gantt', label: 'Gantt Chart' },
  { value: 'pie', label: 'Pie Chart' },
  { value: 'requirementDiagram', label: 'Requirement Diagram' },
  { value: 'gitGraph', label: 'Gitgraph Diagram' },
  { value: 'mindmap', label: 'Mind Map' },
  { value: 'timeline', label: 'Timeline' },
];

const DIAGRAM_THEMES = [
  { value: 'default', label: 'Default' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'dark', label: 'Dark' },
  { value: 'forest', label: 'Forest' },
  { value: 'base', label: 'Base' },
];

interface DiagramInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  onFocusChange?: (focused: boolean) => void;
  onSend?: (value: string, type: string, theme: string) => void;
}

export function DiagramInput({
  value,
  onChange,
  placeholder = 'Type a message...',
  disabled = false,
  onFocusChange,
  onSend,
}: DiagramInputProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [diagramType, setDiagramType] = useState(DIAGRAM_TYPES[0].value);
  const [diagramTheme, setDiagramTheme] = useState(DIAGRAM_THEMES[0].value);

  const handleFocus = () => {
    setIsFocused(true);
    onFocusChange?.(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
    onFocusChange?.(false);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSend) {
      onSend(value, diagramType, diagramTheme);
    }
  };

  return (
    <form onSubmit={handleSend} className={`relative flex flex-col gap-2 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-colors duration-200 max-w-2xl mx-auto w-full 
        ${isFocused ? 'border-[3px] border-ring shadow-[3px_3px_0px_0px_var(--ring)]' : 'border-[2px] border-border shadow-[var(--shadow)]'}
        bg-bw rounded-lg p-2`}>

      <div className="flex flex-col gap-2 w-full">
        <textarea
          ref={inputRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full mt-4 mb-2 bg-transparent border-0 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none disabled:opacity-50 p-0 resize-none min-h-[40px] max-h-[120px] overflow-y-auto px-1 pb-1 text-md"
          onFocus={handleFocus}
          onBlur={handleBlur}
          rows={1}
          style={{ height: 'auto' }}
          disabled={disabled}
          onInput={e => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            target.style.height = `${target.scrollHeight}px`;
          }}
        />
        <div className="flex flex-row md:flex-row gap-2 mb-2 items-center md:justify-between w-full">
          <div className="flex flex-row gap-2 flex-1">
            <Select value={diagramType} onValueChange={setDiagramType}>
              <SelectTrigger className="w-full min-w-[80px] max-w-[180px] md:w-auto md:min-w-[120px] md:max-w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIAGRAM_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="hidden md:block">
              <Select value={diagramTheme} onValueChange={setDiagramTheme}>
                <SelectTrigger className="w-auto min-w-[100px] max-w-[160px]">
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
          <Button
            type="submit"
            className="shrink-0 grow-0 p-2 transition-colors disabled:opacity-50 w-auto"
            disabled={disabled || !value.trim()}
            aria-label="Send diagram"
          >
            <Sparkles className="size-5" /> Create
          </Button>
        </div>
      </div>
    </form>
  );
}
