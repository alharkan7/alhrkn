import { LoadingIcon, PlusIcon } from './Icons';
import Downloader from './Downloader';
import { RefObject, useState } from 'react';
import { Node } from 'reactflow';
import { MindMapData } from './MindMapTypes';
import Sidebar from './Sidebar';
import { Button } from "@/components/ui/button";

interface TopBarProps {
  loading: boolean;
  error: string | null;
  nodes: Node[];
  mindMapData: MindMapData | null;
  reactFlowWrapper: RefObject<HTMLDivElement | null>;
  reactFlowInstance: RefObject<any>;
  fileName: string;
  onFileUpload: (file: File) => void;
  loadExampleMindMap?: () => void;
}

export default function TopBar({
  loading,
  error,
  nodes,
  mindMapData,
  reactFlowWrapper,
  reactFlowInstance,
  fileName,
  onFileUpload,
  loadExampleMindMap
}: TopBarProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      <div className="p-2 bg-muted/50 print:hidden">
        <div className="flex items-center justify-between gap-4">
          {/* Left side - New button */}
          <div>
            <Button
              onClick={() => setSidebarOpen(true)}
              variant="default"
              className="flex items-center"
              title="New Mindmap"
            >
              <PlusIcon className="h-4 w-4" />
              <span className="sm:inline hidden">New</span>
            </Button>
          </div>
          
          {/* Center - Status messages */}
          <div className="flex-1 text-center min-w-0">
            {loading && (
              <div className="flex items-center justify-center text-primary">
                <LoadingIcon className="h-4 w-4 animate-spin mr-2" />
                <span>Creating Mindmap...</span>
              </div>
            )}

            {error && (
              <div className="text-destructive">
                {error}
              </div>
            )}

            {!loading && !error && (
              <div className="text-muted-foreground truncate">
                {fileName !== 'mindmap' ? fileName : "Example: Steve Jobs' Stanford Commencement Speech"}
              </div>
            )}
          </div>
          
          {/* Right side - Download button */}
          <div>
            <Downloader
              nodes={nodes}
              mindMapData={mindMapData}
              reactFlowWrapper={reactFlowWrapper}
              reactFlowInstance={reactFlowInstance}
              fileName={fileName}
            />
          </div>
        </div>
      </div>

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onFileUpload={(file) => {
          onFileUpload(file);
          setSidebarOpen(false);
        }}
        loading={loading}
        error={error}
        loadExampleMindMap={loadExampleMindMap}
      />
    </>
  );
} 