'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import EditorJS from '@editorjs/editorjs'
import Header from '@editorjs/header'
import List from '@editorjs/list'
import './editor.css'

type EditorBlock = {
  id: string;
  holder: HTMLElement;
  save: () => Promise<{data: {text: string}}>;
}

export default function EditorPage() {
  const editorRef = useRef<EditorJS | null>(null)
  const completionTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [suggestion, setSuggestion] = useState<string>('')
  const [activeSuggestionBlock, setActiveSuggestionBlock] = useState<string | null>(null)
  const originalTextRef = useRef<string>('');

  const handleCompletion = useCallback(async (blockId: string, text: string) => {
    try {
      console.log('Fetching completion for text:', text);
      const response = await fetch('/api/editor/completion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ context: text }),
      })
      
      const data = await response.json()
      console.log('Completion response:', data);
      if (data.completion) {
        setSuggestion(data.completion)
        setActiveSuggestionBlock(blockId)
        
        // Store the original text
        const editor = editorRef.current as any;
        const block = await editor.blocks.getBlockByIndex(editor.blocks.getCurrentBlockIndex());
        if (block) {
          const contentElement = block.holder.querySelector('[contenteditable="true"]');
          if (contentElement) {
            originalTextRef.current = contentElement.textContent || '';
          }
        }

        // Show suggestion inline with different color
        showSuggestion(data.completion);
      }
    } catch (error) {
      console.error('Error fetching completion:', error)
    }
  }, [])

  const showSuggestion = useCallback((suggestionText: string) => {
    console.log('Showing suggestion:', suggestionText);
    const editor = editorRef.current as any;
    if (!editor) {
      console.log('No editor reference');
      return;
    }

    try {
      const currentBlockIndex = editor.blocks.getCurrentBlockIndex();
      const block = editor.blocks.getBlockByIndex(currentBlockIndex);
      if (!block) {
        console.log('No block found');
        return;
      }

      console.log('Found block:', block);
      const contentElement = block.holder.querySelector('[contenteditable="true"]');
      if (!contentElement) {
        console.log('No content element found');
        return;
      }

      const selection = window.getSelection();
      if (!selection || !selection.rangeCount) {
        console.log('No selection found');
        return;
      }

      const range = selection.getRangeAt(0);
      const cursorPosition = range.startOffset;
      console.log('Cursor position:', cursorPosition);

      // Create a new text node for the suggestion
      const suggestionNode = document.createTextNode(suggestionText);
      const suggestionSpan = document.createElement('span');
      suggestionSpan.style.color = '#666';
      suggestionSpan.style.opacity = '0.5';
      suggestionSpan.id = 'current-suggestion';
      suggestionSpan.appendChild(suggestionNode);

      // Insert at cursor position
      range.insertNode(suggestionSpan);
      
      // Move cursor before the suggestion
      const newRange = document.createRange();
      newRange.setStart(range.startContainer, cursorPosition);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);

    } catch (error: unknown) {
      console.error('Error showing suggestion:', error);
    }
  }, []);

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

      const suggestionSpan = contentElement.querySelector('#current-suggestion');
      if (suggestionSpan) {
        // Get the text content and remove the span
        const text = suggestionSpan.textContent;
        suggestionSpan.remove();
        
        // Update the block content without the suggestion
        block.save({
          type: 'paragraph',
          data: {
            text: contentElement.textContent
          }
        });
      }

      setSuggestion('')
      setActiveSuggestionBlock(null)
    } catch (error: unknown) {
      console.error('Error clearing suggestion:', error);
    }
  }, []);

  const acceptSuggestion = useCallback(async () => {
    console.log('Accepting suggestion:', suggestion);
    if (!suggestion || !activeSuggestionBlock || !editorRef.current) return;

    try {
      const editor = editorRef.current as any;
      const currentBlockIndex = editor.blocks.getCurrentBlockIndex();
      const block = editor.blocks.getBlockByIndex(currentBlockIndex);
      if (!block) return;

      const contentElement = block.holder.querySelector('[contenteditable="true"]');
      if (!contentElement) return;

      const suggestionSpan = contentElement.querySelector('#current-suggestion');
      if (!suggestionSpan) return;

      // Get current selection
      const selection = window.getSelection();
      if (!selection) return;

      // Get text before and after suggestion
      let beforeText = '';
      let afterText = '';
      const nodes = Array.from(contentElement.childNodes) as Node[];
      let foundSuggestion = false;

      for (const node of nodes) {
        if (node === suggestionSpan) {
          foundSuggestion = true;
          continue;
        }
        if (!foundSuggestion) {
          beforeText += node.textContent || '';
        } else {
          afterText += node.textContent || '';
        }
      }

      // Get suggestion text
      const suggestionText = suggestionSpan.textContent || '';

      // Create the final text
      const finalText = beforeText + suggestionText + afterText;

      // Create a temporary text node to replace the content
      const tempTextNode = document.createTextNode(finalText);
      contentElement.textContent = ''; // Clear existing content
      contentElement.appendChild(tempTextNode);

      // Update block content
      await block.save({ 
        type: 'paragraph',
        data: { text: finalText }
      });

      // Set cursor position after suggestion
      try {
        const range = document.createRange();
        const targetPosition = Math.min(beforeText.length + suggestionText.length, finalText.length);
        
        if (contentElement.firstChild && targetPosition <= (contentElement.firstChild as Text).length) {
          range.setStart(contentElement.firstChild, targetPosition);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      } catch (error) {
        console.error('Error setting cursor position:', error);
      }

      clearSuggestion();
    } catch (error: unknown) {
      console.error('Error accepting suggestion:', error);
    }
  }, [suggestion, activeSuggestionBlock, clearSuggestion]);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!suggestion) return;

      if (e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
        acceptSuggestion();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        clearSuggestion();
      }
    };

    const editorElement = document.getElementById('editorjs');
    if (editorElement) {
      editorElement.addEventListener('keydown', handleKeyDown, true);
      return () => editorElement.removeEventListener('keydown', handleKeyDown, true);
    }
  }, [suggestion, acceptSuggestion, clearSuggestion]);

  // Initialize editor
  useEffect(() => {
    if (!editorRef.current) {
      initEditor()
    }

    return () => {
      if (editorRef.current) {
        editorRef.current.destroy()
      }
    }
  }, [])

  const initEditor = () => {
    const editor = new EditorJS({
      holder: 'editorjs',
      placeholder: 'Let\'s write something...',
      tools: {
        header: Header as any,
        list: List as any,
      },
      onChange: async (api: any) => {
        // Clear any existing timeout
        if (completionTimeoutRef.current) {
          clearTimeout(completionTimeoutRef.current)
        }

        // Get the current block index and then get the block
        const currentBlockIndex = api.blocks.getCurrentBlockIndex();
        const blocks = await api.blocks.getBlockByIndex(currentBlockIndex);
        if (!blocks) return;

        // Set new timeout for completion
        completionTimeoutRef.current = setTimeout(async () => {
          try {
            const blockData = await blocks.save();
            if (blockData && blockData.data && blockData.data.text) {
              handleCompletion(blocks.id, blockData.data.text);
            }
          } catch (error) {
            console.error('Error getting block data:', error);
          }
        }, 5000) // 5 seconds delay
      },
    })
  
    editorRef.current = editor
  }

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