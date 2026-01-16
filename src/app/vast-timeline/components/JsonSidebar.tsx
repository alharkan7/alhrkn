import React, { useState, useRef, useEffect } from 'react';

interface JsonSidebarProps {
    isOpen: boolean;
    jsonData: any;
    onJsonUpdate: (newData: any) => void;
    onError: (error: string) => void;
    onClose: () => void;
    footerHeight: number;
    isEditing: boolean;
    onEditingChange: (editing: boolean) => void;
    saveRequested: boolean;
    onSaveComplete: () => void;
}

const JsonSidebar: React.FC<JsonSidebarProps> = ({
    isOpen,
    jsonData,
    onJsonUpdate,
    onError,
    onClose,
    footerHeight,
    isEditing,
    onEditingChange,
    saveRequested,
    onSaveComplete
}) => {
    const [editedJson, setEditedJson] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Start editing
    useEffect(() => {
        if (isEditing) {
            setEditedJson(JSON.stringify(jsonData, null, 2));
        }
    }, [isEditing, jsonData]);

    // Handle save request from parent
    useEffect(() => {
        if (saveRequested && isEditing) {
            handleSaveEdit();
            onSaveComplete();
        }
    }, [saveRequested]);

    const handleSaveEdit = () => {
        try {
            const parsedData = JSON.parse(editedJson);
            onJsonUpdate(parsedData);
            onEditingChange(false);
            setEditedJson('');
        } catch (error) {
            onError('Invalid JSON format. Please check your syntax.');
        }
    };

    const handleCancelEdit = () => {
        onEditingChange(false);
        setEditedJson('');
    };

    const handleStartEdit = () => {
        onEditingChange(true);
    };

    return (
        <div
            className={`fixed left-0 bg-slate-900 text-slate-100 transition-all duration-300 overflow-hidden ${isOpen ? 'w-80 sm:w-96' : 'w-0'
                }`}
            style={{
                top: '64px', // Start right after main header
                height: `calc(100vh - 64px - ${footerHeight}px)`,
                zIndex: 25
            }}
        >
            <div className="h-full flex flex-col">
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
export type { JsonSidebarProps };
