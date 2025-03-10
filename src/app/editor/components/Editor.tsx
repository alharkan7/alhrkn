'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import EditorJS from '@editorjs/editorjs'
import Header from '@editorjs/header'
import List from '@editorjs/list'
import '../styles/editor.css'

export default function EditorComponent() {
  const editorRef = useRef<EditorJS | null>(null)
  const editorInstanceRef = useRef<EditorJS | null>(null)
  const completionTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [suggestion, setSuggestion] = useState<string>('')
  const [activeSuggestionBlock, setActiveSuggestionBlock] = useState<string | null>(null)
  const originalTextRef = useRef<string>('');
  const [isEditorReady, setIsEditorReady] = useState(false)
  
  // Simple global lock system
  const lockRef = useRef<{
    isLocked: boolean;
    blockId: string | null;
    text: string;
    hasChangedSinceRejection: boolean;
    lastSuggestionText: string | null;
    charactersSinceLastAction: number;
  }>({
    isLocked: false,
    blockId: null,
    text: '',
    hasChangedSinceRejection: true,
    lastSuggestionText: null,
    charactersSinceLastAction: 0
  });

  // Function to clear the completion timeout
  const cancelPendingSuggestion = useCallback(() => {
    if (completionTimeoutRef.current) {
      clearTimeout(completionTimeoutRef.current);
      completionTimeoutRef.current = null;
    }
  }, []);

  // Check if suggestion is allowed for this block and text
  const isSuggestionAllowed = useCallback((blockId: string, text: string) => {
    // First, check if there's an existing suggestion span in the DOM
    const editor = editorRef.current as any;
    if (editor) {
      const suggestionSpan = editor.blocks.getById(blockId)?.holder?.querySelector('#current-suggestion');
      if (suggestionSpan) {
        console.log('Suggestion blocked: existing suggestion span found');
        return false;
      }
    }

    // No suggestions if locked
    if (lockRef.current.isLocked) {
      console.log('Suggestion blocked: locked');
      return false;
    }
    
    // No suggestions if there's already an active suggestion
    if (activeSuggestionBlock !== null || suggestion !== '') {
      console.log('Suggestion blocked: active suggestion exists', { activeSuggestionBlock, suggestion });
      return false;
    }
    
    // No suggestions if this block hasn't changed since rejection
    if (blockId === lockRef.current.blockId && 
        !lockRef.current.hasChangedSinceRejection) {
      console.log('Suggestion blocked: no changes since rejection');
      return false;
    }

    // No suggestions if not enough new characters typed (minimum 3 characters)
    if (lockRef.current.charactersSinceLastAction < 3) {
      console.log('Suggestion blocked: not enough new characters', lockRef.current.charactersSinceLastAction);
      return false;
    }
    
    // No suggestions if text is too short
    if (text.trim().length < 10) {
      console.log('Suggestion blocked: text too short');
      return false;
    }

    return true;
  }, [activeSuggestionBlock, suggestion]);

  const handleCompletion = useCallback(async (blockId: string, text: string) => {
    console.log('handleCompletion called', { blockId, hasActiveSuggestion: activeSuggestionBlock !== null || suggestion !== '' });
    
    // Check if suggestions are allowed
    if (!isSuggestionAllowed(blockId, text)) {
      return;
    }
    
    // Lock immediately to prevent multiple calls
    lockRef.current.isLocked = true;
    
    try {
      console.log('Fetching completion for text:', text);
      const response = await fetch('/api/editor/completion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ context: text }),
      });
      
      // Unlock if no longer in the correct state
      if (blockId !== lockRef.current.blockId || activeSuggestionBlock !== null || suggestion !== '') {
        console.log('Cancelling completion: state changed', { blockId, activeSuggestionBlock, suggestion });
        lockRef.current.isLocked = false;
        return;
      }
      
      const data = await response.json();
      console.log('Completion response:', data);
      
      if (data.completion) {
        // Set active suggestion
        setSuggestion(data.completion);
        setActiveSuggestionBlock(blockId);
        
        // Store the original text
        const editor = editorRef.current as any;
        const block = await editor.blocks.getBlockByIndex(editor.blocks.getCurrentBlockIndex());
        if (block) {
          const contentElement = block.holder.querySelector('[contenteditable="true"]');
          if (contentElement) {
            originalTextRef.current = contentElement.textContent || '';
          }
        }

        // Show suggestion inline
        showSuggestion(data.completion);
      }
      
      // Unlock after processing
      lockRef.current.isLocked = false;
    } catch (error) {
      console.error('Error fetching completion:', error);
      // Always unlock on error
      lockRef.current.isLocked = false;
    }
  }, [activeSuggestionBlock, suggestion, isSuggestionAllowed]);

  const showSuggestion = useCallback((suggestionText: string) => {
    // First check if there's already a suggestion span
    const editor = editorRef.current as any;
    if (!editor) {
      console.log('No editor reference');
      return;
    }

    const currentBlockIndex = editor.blocks.getCurrentBlockIndex();
    const block = editor.blocks.getBlockByIndex(currentBlockIndex);
    if (!block) {
      console.log('No block found');
      return;
    }

    const existingSuggestion = block.holder.querySelector('#current-suggestion');
    if (existingSuggestion) {
      console.log('Skipping showing suggestion: suggestion span already exists');
      return;
    }

    // Don't show new suggestion if there's already one
    if (activeSuggestionBlock !== null || suggestion !== '') {
      console.log('Skipping showing suggestion: active suggestion exists');
      return;
    }

    console.log('Showing suggestion:', suggestionText);

    try {
      const selection = window.getSelection();
      if (!selection || !selection.rangeCount) {
        console.log('No selection found');
        return;
      }

      // Create a span for the suggestion with a specific ID for easy reference
      const suggestionSpan = document.createElement('span');
      suggestionSpan.id = 'current-suggestion';
      suggestionSpan.textContent = suggestionText;
      suggestionSpan.style.opacity = '0.5'; // Make it visually distinct
      suggestionSpan.style.color = '#666'; // Lighter color
      suggestionSpan.dataset.suggestion = 'true'; // Add a data attribute for identification

      // Append the suggestion to the content element
      const contentElement = block.holder.querySelector('[contenteditable="true"]');
      if (contentElement) {
        contentElement.appendChild(suggestionSpan);
      }
    } catch (error) {
      console.error('Error showing suggestion:', error);
    }
  }, [activeSuggestionBlock, suggestion]);

  const clearSuggestion = useCallback(() => {
    console.log('Clearing suggestion');
    const editor = editorRef.current as any;
    if (!editor) return;

    try {
      const currentBlockIndex = editor.blocks.getCurrentBlockIndex();
      const block = editor.blocks.getBlockByIndex(currentBlockIndex);
      if (!block) return;

      const contentElement = block.holder.querySelector('[contenteditable="true"]');
      if (!contentElement) return;

      // Lock and record the rejected state
      lockRef.current = {
        isLocked: false,
        blockId: block.id,
        text: contentElement.textContent || '',
        hasChangedSinceRejection: false,
        lastSuggestionText: null,
        charactersSinceLastAction: 0
      };

      // Cancel any pending suggestion
      cancelPendingSuggestion();

      // Clear suggestion UI
      const suggestionSpan = contentElement.querySelector('#current-suggestion');
      if (suggestionSpan) {
        suggestionSpan.remove();
        
        // Update block content without the suggestion
        block.save({
          type: 'paragraph',
          data: {
            text: contentElement.textContent
          }
        });
      }

      // Clear React state
      setSuggestion('');
      setActiveSuggestionBlock(null);
    } catch (error: unknown) {
      console.error('Error clearing suggestion:', error);
    }
  }, [cancelPendingSuggestion]);

  const acceptSuggestion = useCallback(async () => {
    console.log('Accepting suggestion:', suggestion);
    if (!suggestion || !activeSuggestionBlock || !editorRef.current) return;

    try {
      const editor = editorRef.current as any;
      const currentBlockIndex = editor.blocks.getCurrentBlockIndex();
      const block = await editor.blocks.getBlockByIndex(currentBlockIndex);
      if (!block) return;

      // Reset lock state
      lockRef.current = {
        isLocked: false,
        blockId: null,
        text: '',
        hasChangedSinceRejection: true,
        lastSuggestionText: null,
        charactersSinceLastAction: 0
      };

      const contentElement = block.holder.querySelector('[contenteditable="true"]');
      if (!contentElement) return;

      const suggestionSpan = contentElement.querySelector('#current-suggestion');
      if (!suggestionSpan) return;

      // Get the current text without the suggestion span
      const suggestionText = suggestion;
      
      // Create a clone of the content element to work with
      const tempElement = contentElement.cloneNode(true) as HTMLElement;
      const tempSuggestionSpan = tempElement.querySelector('#current-suggestion');
      if (tempSuggestionSpan) {
        tempSuggestionSpan.remove();
      }
      
      // Get the text without the suggestion
      const currentText = tempElement.textContent || '';
      
      // Combine the current text with the suggestion
      const finalText = currentText + suggestionText;
      
      console.log('Accepting with final text:', finalText);

      // First, replace the suggestion span with normal text
      const textNode = document.createTextNode(suggestionText);
      suggestionSpan.parentNode?.replaceChild(textNode, suggestionSpan);

      // Clear the suggestion state
      setSuggestion('');
      setActiveSuggestionBlock(null);

      // Update the block content using Editor.js API
      await block.save({
        type: 'paragraph',
        data: {
          text: finalText
        }
      });

      // Position cursor at the end of the text
      try {
        const selection = window.getSelection();
        if (!selection) return;

        // Create a range at the end of the content
        const range = document.createRange();
        range.selectNodeContents(contentElement);
        range.collapse(false); // collapse to end

        // Apply the selection
        selection.removeAllRanges();
        selection.addRange(range);
        contentElement.focus();
      } catch (error) {
        console.error('Error positioning cursor:', error);
      }
    } catch (error) {
      console.error('Error accepting suggestion:', error);
    }
  }, [suggestion, activeSuggestionBlock]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!suggestion) return;

    // Don't handle suggestions when toolbar search is active
    const toolbarSearch = document.querySelector('.ce-inline-toolbar-input');
    if (toolbarSearch instanceof HTMLInputElement && document.activeElement === toolbarSearch) {
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      acceptSuggestion();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      clearSuggestion();
    } else if (
      // If user starts typing any printable character
      e.key.length === 1 || 
      e.key === 'Enter' || 
      e.key === 'Backspace' || 
      e.key === 'Delete'
    ) {
      // Clear suggestion as user is typing
      clearSuggestion();
    }
  }, [suggestion, acceptSuggestion, clearSuggestion]);

  // Add handler for cursor movement
  const handleSelectionChange = useCallback(async () => {
    if (!suggestion || !activeSuggestionBlock) return;

    const editor = editorRef.current as any;
    if (!editor) return;

    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    try {
      const currentBlockIndex = editor.blocks.getCurrentBlockIndex();
      const block = await editor.blocks.getBlockByIndex(currentBlockIndex);
      if (!block) return;

      const contentElement = block.holder.querySelector('[contenteditable="true"]');
      const suggestionSpan = contentElement?.querySelector('#current-suggestion');
      if (!contentElement || !suggestionSpan) return;

      // Get the text node right before the suggestion span
      const textNodeBeforeSuggestion = Array.from<Node>(contentElement.childNodes)
        .find((node) => node.nodeType === Node.TEXT_NODE && 
              node.nextSibling === suggestionSpan) as Text | undefined;

      const range = selection.getRangeAt(0);
      
      // Check if cursor is at the end of the suggestion span
      const isAtEnd = (
        // Case 1: Cursor is right after the suggestion span
        (!suggestionSpan.contains(range.startContainer) &&
         range.startContainer === contentElement &&
         range.startOffset === Array.from(contentElement.childNodes).indexOf(suggestionSpan) + 1) ||
        // Case 2: Cursor is at the end of the text node after suggestion
        (range.startContainer.nodeType === Node.TEXT_NODE &&
         range.startContainer.nextSibling === null &&
         range.startOffset === range.startContainer.textContent?.length)
      );

      if (isAtEnd) {
        acceptSuggestion();
      }
    } catch (error) {
      console.error('Error in handleSelectionChange:', error);
    }
  }, [suggestion, activeSuggestionBlock, acceptSuggestion]);

  // Initialize editor
  useEffect(() => {
    // Wait for next tick to ensure DOM is ready
    const timer = setTimeout(() => {
      const editorElement = document.getElementById('editorjs')
      if (!editorElement || editorInstanceRef.current) return

      try {
        const editor = new EditorJS({
          holder: 'editorjs',
          placeholder: 'Let\'s write something...',
          tools: {
            header: Header as any,
            list: List as any,
          },
          onChange: async (api: any) => {
            console.log('onChange triggered', { 
              hasActiveSuggestion: activeSuggestionBlock !== null || suggestion !== '',
              activeSuggestionBlock,
              suggestion 
            });

            // If there's an active suggestion, clear it since user is typing
            if (activeSuggestionBlock !== null || suggestion !== '') {
              console.log('Clearing suggestion since user is typing');
              clearSuggestion();
              return;
            }

            // Get current block and check if it's the same as the rejected one
            try {
              const currentBlockIndex = api.blocks.getCurrentBlockIndex();
              const currentBlock = await api.blocks.getBlockByIndex(currentBlockIndex);
              if (!currentBlock) return;
              
              const blockData = await currentBlock.save();
              const currentText = blockData?.data?.text || '';
              
              // Calculate characters added since last action
              if (currentBlock.id === lockRef.current.blockId) {
                const prevText = lockRef.current.text;
                const charDiff = currentText.length - prevText.length;
                lockRef.current.charactersSinceLastAction += Math.max(0, charDiff);
                
                // Check if text has meaningfully changed
                if (currentText !== prevText) {
                  lockRef.current.hasChangedSinceRejection = true;
                }
              } else {
                // Different block, reset the lock state completely
                lockRef.current = {
                  isLocked: false,
                  blockId: currentBlock.id,
                  text: currentText,
                  hasChangedSinceRejection: true,
                  lastSuggestionText: null,
                  charactersSinceLastAction: currentText.length // Count all chars in new block
                };
              }
              
              // Update current text in lock
              lockRef.current.text = currentText;
              
              // Don't schedule new suggestion if not allowed
              if (!isSuggestionAllowed(currentBlock.id, currentText)) {
                // Cancel any pending suggestion since we're not allowed to suggest
                cancelPendingSuggestion();
                return;
              }
              
              // Cancel any existing timeout before setting a new one
              cancelPendingSuggestion();
              
              // Set timeout for suggestion
              completionTimeoutRef.current = setTimeout(async () => {
                // Double-check if there's an active suggestion before proceeding
                if (activeSuggestionBlock !== null || suggestion !== '') {
                  console.log('Cancelling timeout: active suggestion exists');
                  return;
                }

                try {
                  // Get fresh state
                  const blockIndex = api.blocks.getCurrentBlockIndex();
                  const block = await api.blocks.getBlockByIndex(blockIndex);
                  if (!block) return;
                  
                  const data = await block.save();
                  const text = data?.data?.text || '';
                  
                  // Skip if suggestion not allowed
                  if (!isSuggestionAllowed(block.id, text)) {
                    return;
                  }
                  
                  // Skip if text hasn't changed since last suggestion
                  if (text === lockRef.current.lastSuggestionText) {
                    return;
                  }
                  
                  // Record block ID and text in lock
                  lockRef.current.blockId = block.id;
                  lockRef.current.text = text;
                  lockRef.current.lastSuggestionText = text;
                  
                  // Get context from previous blocks
                  const contextBlocks = [];
                  for (let i = Math.max(0, blockIndex - 3); i < blockIndex; i++) {
                    const prevBlock = await api.blocks.getBlockByIndex(i);
                    if (prevBlock) {
                      const prevData = await prevBlock.save();
                      if (prevData?.data?.text) {
                        contextBlocks.push(prevData.data.text);
                      }
                    }
                  }
                  
                  // Generate full context and request completion
                  const fullContext = [...contextBlocks, text].join('\n\n');
                  handleCompletion(block.id, fullContext);
                } catch (error) {
                  console.error('Error in suggestion timeout:', error);
                }
              }, 2000); // Reduced timeout to 2 seconds for better responsiveness
            } catch (error) {
              console.error('Error in onChange handler:', error);
            }
          },
          onReady: () => {
            console.log('Editor.js is ready to work!')
            editorRef.current = editor
            editorInstanceRef.current = editor
            setIsEditorReady(true)
          },
          autofocus: true,
        });
      } catch (error) {
        console.error('Failed to initialize editor:', error)
      }
    }, 100)

    return () => {
      clearTimeout(timer)
      // Cleanup
      if (editorInstanceRef.current) {
        try {
          editorInstanceRef.current.destroy()
          editorInstanceRef.current = null
          editorRef.current = null
          setIsEditorReady(false)
        } catch (error) {
          console.error('Error destroying editor:', error)
        }
      }
      // Cancel any pending suggestion
      cancelPendingSuggestion()
    }
  }, [cancelPendingSuggestion])

  // Handle keyboard events - only add listener when editor is ready
  useEffect(() => {
    if (!isEditorReady) return

    const editorElement = document.getElementById('editorjs')
    if (editorElement) {
      editorElement.addEventListener('keydown', handleKeyDown, true)
      return () => editorElement.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [handleKeyDown, isEditorReady])

  // Handle selection change
  useEffect(() => {
    if (!isEditorReady) return;

    const editorElement = document.getElementById('editorjs');
    if (editorElement) {
      // Use selectionchange event instead of MutationObserver
      document.addEventListener('selectionchange', handleSelectionChange);
      return () => {
        document.removeEventListener('selectionchange', handleSelectionChange);
      };
    }
  }, [handleSelectionChange, isEditorReady]);

  return (
    <div className="py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">AI Writing Assistant</h1>
        <div 
          id="editorjs" 
          className="prose max-w-none border rounded-lg p-4 min-h-[500px] relative"
        />
      </div>
    </div>
  )
} 