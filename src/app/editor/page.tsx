'use client'

import dynamic from 'next/dynamic'

// Create a loading component
function LoadingEditor() {
  return (
    <div className="py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Writer's Unblock</h1>
        <div className="prose max-w-none border rounded-lg p-4 min-h-[500px] relative flex items-center justify-center text-gray-500">
          Loading editor...
        </div>
      </div>
    </div>
  )
}

// Dynamically import the editor component with SSR disabled
const EditorComponent = dynamic(
  () => import('./components/Editor'),
  { 
    ssr: false,
    loading: LoadingEditor
  }
)

// Main page component
export default function EditorPage() {
  return <EditorComponent />
} 