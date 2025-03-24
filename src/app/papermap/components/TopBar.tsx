import { LoadingIcon, PlusIcon } from './Icons';
import Downloader from './Downloader';
import { RefObject, useState } from 'react';
import { Node } from 'reactflow';
import { MindMapData } from './MindMapTypes';
import Sidebar from './Sidebar';

interface TopBarProps {
  loading: boolean;
  error: string | null;
  nodes: Node[];
  mindMapData: MindMapData | null;
  reactFlowWrapper: RefObject<HTMLDivElement | null>;
  reactFlowInstance: RefObject<any>;
  fileName: string;
  onFileUpload: (file: File) => void;
}

export default function TopBar({
  loading,
  error,
  nodes,
  mindMapData,
  reactFlowWrapper,
  reactFlowInstance,
  fileName,
  onFileUpload
}: TopBarProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      <div className="p-4 bg-gray-50 border-b print:hidden">
        <div className="flex items-center justify-between gap-4">
          {/* Left side - New button */}
          <div>
            <button
              onClick={() => setSidebarOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1.5 rounded-md flex items-center text-sm"
              title="New Mindmap"
            >
              <PlusIcon className="h-4 w-4" />
              <span className="ml-1.5 sm:inline hidden">New</span>
            </button>
          </div>
          
          {/* Center - Status messages */}
          <div className="flex-1 text-center min-w-0">
            {loading && (
              <div className="flex items-center justify-center text-blue-600">
                <LoadingIcon className="h-4 w-4 animate-spin mr-2" />
                <span>Creating Mindmap...</span>
              </div>
            )}

            {error && (
              <div className="text-red-500">
                {error}
              </div>
            )}

            {!loading && !error && fileName !== 'mindmap' && (
              <div className="text-gray-600 truncate">
                {fileName}
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
      />
    </>
  );
} 