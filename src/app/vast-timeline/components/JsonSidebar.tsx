import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Edit, Save, X } from 'lucide-react';

interface JsonSidebarProps {
    isOpen: boolean;
    jsonData: any;
    onJsonUpdate: (newData: any) => void;
    onError: (error: string) => void;
    footerHeight: number;
}

const JsonSidebar: React.FC<JsonSidebarProps> = ({ isOpen, jsonData, onJsonUpdate, onError, footerHeight }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedJson, setEditedJson] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleStartEdit = () => {
        setEditedJson(JSON.stringify(jsonData, null, 2));
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditedJson('');
    };

    const handleSaveEdit = () => {
        try {
            const parsedData = JSON.parse(editedJson);
            onJsonUpdate(parsedData);
            setIsEditing(false);
            setEditedJson('');
        } catch (error) {
            onError('Invalid JSON format. Please check your syntax.');
        }
    };

    return (
        <div
            className={`fixed top-[64px] left-0 bg-slate-900 text-slate-100 transition-all duration-300 overflow-hidden ${isOpen ? 'w-80 sm:w-96' : 'w-0'
                }`}
            style={{ height: `calc(100vh - 64px - ${footerHeight}px)`, zIndex: 25 }}
        >
            <div className="h-full flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-700 shrink-0">
                    <h2 className="text-lg font-semibold">Timeline Data</h2>
                    {!isEditing ? (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleStartEdit}
                            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border-slate-600 text-white"
                        >
                            <Edit size={14} />
                            {/* <span className="text-xs">Edit</span> */}
                        </Button>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCancelEdit}
                                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border-slate-600 text-white"
                            >
                                <X size={14} />
                                {/* <span className="text-xs">Cancel</span> */}
                            </Button>
                            <Button
                                variant="default"
                                size="sm"
                                onClick={handleSaveEdit}
                                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700"
                            >
                                <Save size={14} />
                                {/* <span className="text-xs">Save</span> */}
                            </Button>
                        </div>
                    )}
                </div>

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto p-4">
                    {!isEditing ? (
                        <pre
                            className="text-xs overflow-x-auto bg-slate-800 p-3 rounded cursor-pointer hover:bg-slate-750 transition-colors"
                            onClick={handleStartEdit}
                            title="Click to edit"
                        >
                            {JSON.stringify(jsonData, null, 2)}
                        </pre>
                    ) : (
                        <textarea
                            ref={textareaRef}
                            value={editedJson}
                            onChange={(e) => setEditedJson(e.target.value)}
                            className="w-full h-full min-h-[500px] bg-slate-800 text-slate-100 p-3 rounded font-mono text-xs resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                            spellCheck={false}
                            autoFocus
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default JsonSidebar;
