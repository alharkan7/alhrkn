import { LoadingIcon } from './Icons';
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
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md flex items-center text-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>New Mindmap</span>
            </button>
            
            {loading && (
              <div className="flex items-center text-blue-600">
                <LoadingIcon className="animate-spin mr-2" />
                <span>Analyzing paper...</span>
              </div>
            )}
            {error && (
              <div className="text-red-500">
                {error}
              </div>
            )}
          </div>
          
          {/* Download button positioned on the right */}
          <div className="md:ml-auto">
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