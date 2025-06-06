'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import EditorJS from '@editorjs/editorjs'
import Header from '@editorjs/header'
import List from '@editorjs/list'
import Marker from '@editorjs/marker'
import InlineCode from '@editorjs/inline-code'
import Underline from '@editorjs/underline'
import CitationTool from './tools/CitationTool'
import ReferenceTool from './tools/ReferenceTool'
import '../styles/editor.css'

interface Citation {
  title: string;
  authors: string[];
  year: number;
  doi?: string;
  url?: string;
}

interface ReferenceBlock {
  type: string;
  data: {
    citations: Citation[];
  };
}

export default function EditorComponent() {
  const editorRef = useRef<EditorJS | null>(null)
  const editorInstanceRef = useRef<EditorJS | null>(null)
  const completionTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [suggestion, setSuggestion] = useState<string>('')
  const [activeSuggestionBlock, setActiveSuggestionBlock] = useState<string | null>(null)
  const originalTextRef = useRef<string>('');
  const [isEditorReady, setIsEditorReady] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const [pendingSuggestion, setPendingSuggestion] = useState<{text: string, keywords: string[]}>()
  const [pendingCitation, setPendingCitation] = useState<any>()
  
  // Helper function to extract last name
  const extractLastName = (fullName: string): string => {
    // If name contains comma, take the part before the comma
    if (fullName.includes(',')) {
      return fullName.split(',')[0].trim();
    }
    // Otherwise take the last word as last name
    return fullName.split(' ').pop() || fullName;
  };

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

  // Detect if device is desktop
  useEffect(() => {
    const checkIfDesktop = () => {
      setIsDesktop(window.matchMedia('(pointer: fine)').matches);
    };
    
    checkIfDesktop();
    window.addEventListener('resize', checkIfDesktop);
    return () => window.removeEventListener('resize', checkIfDesktop);
  }, []);

  // Function to clear the completion timeout
  const cancelPendingSuggestion = useCallback(() => {
    if (completionTimeoutRef.current) {
      clearTimeout(completionTimeoutRef.current);
      completionTimeoutRef.current = null;
    }
  }, []);

  // Function to strip HTML tags and normalize text
  const stripHtmlAndNormalize = (html: string) => {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
  };

  // Function to check if cursor is at the end of text
  const isCursorAtEnd = useCallback((blockId: string) => {
    const editor = editorRef.current as any;
    if (!editor) return false;

    const block = editor.blocks.getById(blockId);
    if (!block) return false;

    const contentElement = block.holder.querySelector('[contenteditable="true"]');
    if (!contentElement) return false;

    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return false;

    const range = selection.getRangeAt(0);
    
    // Get the text content without HTML
    const text = stripHtmlAndNormalize(contentElement.innerHTML);
    
    // Check if we're at the end of the text
    const isAtEnd = range.endOffset === text.length && 
                   range.endContainer === contentElement.firstChild;

    // Also check if we're at a natural break point (end of sentence or paragraph)
    const textUpToCursor = text.slice(0, range.endOffset);
    const isAtBreakPoint = /[.!?]\s*$/.test(textUpToCursor) || textUpToCursor.trim() === '';

    return isAtEnd || isAtBreakPoint;
  }, []);

  // Check if suggestion is allowed for this block and text
  const isSuggestionAllowed = useCallback((blockId: string, text: string) => {
    console.log('Checking if suggestion is allowed:', {
      blockId,
      textLength: text.length,
      isLocked: lockRef.current.isLocked,
      hasActiveSuggestion: activeSuggestionBlock !== null || suggestion !== '',
      charactersSinceLastAction: lockRef.current.charactersSinceLastAction
    });

    // First, check if there's an existing suggestion span in the DOM
    const editor = editorRef.current as any;
    if (editor) {
      const suggestionSpan = editor.blocks.getById(blockId)?.holder?.querySelector('#current-suggestion');
      if (suggestionSpan) {
        console.log('Suggestion blocked: existing suggestion span found');
        return false;
      }
    }

    // Check if cursor is in middle of text
    if (!isCursorAtEnd(blockId)) {
      console.log('Suggestion blocked: cursor not at end of text');
      return false;
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
    
    // No suggestions if text is too short
    if (text.trim().length < 10) {
      console.log('Suggestion blocked: text too short');
      return false;
    }

    // Reset character count if switching blocks
    if (blockId !== lockRef.current.blockId) {
      console.log('New block detected, resetting character count');
      lockRef.current.charactersSinceLastAction = text.length;
      lockRef.current.hasChangedSinceRejection = true;
      return text.length >= 10;
    }

    // Allow suggestions if enough new characters have been typed
    const hasEnoughNewChars = lockRef.current.charactersSinceLastAction >= 3;
    if (!hasEnoughNewChars) {
      console.log('Suggestion blocked: not enough new characters', lockRef.current.charactersSinceLastAction);
      return false;
    }

    console.log('Suggestion allowed');
    return true;
  }, [activeSuggestionBlock, suggestion, isCursorAtEnd]);

  const showSuggestionWithCitation = useCallback((inputText: string, citation: any) => {
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

    console.log('Showing suggestion:', inputText, { isDesktop });

    try {
      const selection = window.getSelection();
      if (!selection || !selection.rangeCount) {
        console.log('No selection found');
        return;
      }

      // Create container for suggestion and citation
      const container = document.createElement('span');
      container.id = 'current-suggestion-container';
      container.style.display = 'inline';
      container.style.whiteSpace = 'normal';
      container.style.wordWrap = 'break-word';
      container.style.wordBreak = 'break-word';

      // Create suggestion span
      const suggestionSpan = document.createElement('span');
      suggestionSpan.id = 'current-suggestion';
      // Ensure the suggestion text ends with a period
      const trimmedText = inputText.trim();
      const endsWithPeriod = trimmedText.endsWith('.');
      // Remove period if it exists and add space
      suggestionSpan.textContent = (endsWithPeriod ? trimmedText.slice(0, -1) : trimmedText) + ' ';
      suggestionSpan.style.opacity = '0.5';
      suggestionSpan.style.color = '#666';
      suggestionSpan.dataset.suggestion = 'true';
      suggestionSpan.style.display = 'inline';
      
      // Create citation span
      const citationSpan = document.createElement('span');
      citationSpan.id = 'current-citation';
      if (citation) {
        const citationLink = document.createElement('a');
        
        // Format citation based on number of authors
        if (citation.authors.length === 1) {
          citationLink.textContent = `(${extractLastName(citation.authors[0])}, ${citation.year})`;
        } else if (citation.authors.length === 2) {
          citationLink.textContent = `(${extractLastName(citation.authors[0])} & ${extractLastName(citation.authors[1])}, ${citation.year})`;
        } else {
          const etAlSpan = document.createElement('em');
          etAlSpan.textContent = 'et al.';
          citationLink.textContent = `(${extractLastName(citation.authors[0])} `;
          citationLink.appendChild(etAlSpan);
          citationLink.appendChild(document.createTextNode(`, ${citation.year})`));
        }
        
        citationLink.href = citation.doi ? `https://doi.org/${citation.doi}` : citation.url || '#';
        citationLink.target = '_blank';
        citationLink.rel = 'noopener noreferrer';
        citationLink.style.opacity = '0.5';
        citationLink.style.color = '#666';
        citationLink.style.fontSize = '0.9em';
        citationLink.style.textDecoration = 'none';
        citationLink.title = citation.title;
        citationLink.addEventListener('mouseover', () => {
          citationLink.style.textDecoration = 'underline';
        });
        citationLink.addEventListener('mouseout', () => {
          citationLink.style.textDecoration = 'none';
        });
        citationSpan.appendChild(citationLink);
      }
      
      // Add period after citation
      const periodSpan = document.createElement('span');
      periodSpan.textContent = '.';
      periodSpan.style.opacity = '0.5';
      periodSpan.style.color = '#666';
      
      // Add tab indicator for desktop
      if (window.matchMedia('(pointer: fine)').matches) {
        const tabIndicator = document.createElement('span');
        tabIndicator.id = 'suggestion-tab-indicator';
        tabIndicator.textContent = 'Tab';
        tabIndicator.style.fontSize = '11px';
        tabIndicator.style.padding = '1px 4px';
        tabIndicator.style.backgroundColor = '#e5e7eb';
        tabIndicator.style.color = '#374151';
        tabIndicator.style.borderRadius = '4px';
        tabIndicator.style.fontFamily = 'system-ui, -apple-system, sans-serif';
        tabIndicator.style.userSelect = 'none';
        tabIndicator.style.cursor = 'default';
        tabIndicator.style.marginRight = '4px';
        tabIndicator.style.verticalAlign = 'baseline';
        tabIndicator.style.display = 'inline-block';
        tabIndicator.style.position = 'relative';
        tabIndicator.style.top = '-1px';
        container.appendChild(tabIndicator);
      }

      // Add suggestion, citation, and period to container in correct order
      container.appendChild(suggestionSpan);
      if (citation) {
        container.appendChild(citationSpan);
      }
      container.appendChild(periodSpan);

      // Insert at current cursor position
      const contentElement = block.holder.querySelector('[contenteditable="true"]');
      if (contentElement) {
        const range = selection.getRangeAt(0);
        
        // Get the current cursor position
        const cursorPosition = range.endOffset;
        const cursorContainer = range.endContainer;
        
        // Normalize spaces before inserting
        if (cursorContainer.nodeType === Node.TEXT_NODE) {
          const text = cursorContainer.textContent || '';
          const trimmedText = text.slice(0, cursorPosition).replace(/\s+$/, '');
          cursorContainer.textContent = trimmedText + text.slice(cursorPosition);
          range.setStart(cursorContainer, trimmedText.length);
          range.setEnd(cursorContainer, trimmedText.length);
          
          if (trimmedText.length > 0) {
            range.insertNode(document.createTextNode(' '));
            range.collapse(false);
          }
        }
        
        range.insertNode(container);
        range.setStartBefore(container);
        range.setEndBefore(container);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    } catch (error) {
      console.error('Error showing suggestion with citation:', error);
    }
  }, [activeSuggestionBlock, suggestion, isDesktop]);

  const handleCompletion = useCallback(async (blockId: string, text: string) => {
    console.log('handleCompletion called', { blockId, hasActiveSuggestion: activeSuggestionBlock !== null || suggestion !== '' });
    
    // Check if suggestions are allowed
    if (!isSuggestionAllowed(blockId, text)) {
      return;
    }

    // Check if we're in the editor content area and not in toolbar or other UI elements
    const editor = editorRef.current as any;
    if (!editor) return;

    const block = editor.blocks.getById(blockId);
    if (!block) return;
    
    // Get the content editable element of the current block
    const contentElement = block?.holder?.querySelector('[contenteditable="true"]');
    
    // More specific checks for toolbar and search elements
    const activeElement = document.activeElement;
    const isInToolbar = activeElement?.closest('.ce-toolbar');
    const isInInlineToolbar = activeElement?.closest('.ce-inline-toolbar');
    const isInPopup = activeElement?.closest('.ce-popover');
    const isInSearchInput = activeElement?.matches('input, [role="searchbox"]');
    const isInContentArea = activeElement === contentElement;
    const isValidTarget = contentElement?.contains(activeElement);
    
    if (isInToolbar || isInInlineToolbar || isInPopup || isInSearchInput || (!isInContentArea && !isValidTarget)) {
      console.log('Suggestion blocked: not in valid content area');
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
      
      if (!response.ok) {
        console.error('Completion API error:', response.status, response.statusText);
        throw new Error('Completion API request failed');
      }
      
      const data = await response.json();
      console.log('Raw Completion API response:', data);
      console.log('Completion API response details:', {
        data,
        hasCompletion: !!data.completion,
        hasKeywords: !!data.keywords,
        keywords: data.keywords,
        completionType: typeof data.completion,
        keywordsType: typeof data.keywords,
        keywordsIsArray: Array.isArray(data.keywords)
      });
      
      // Check if the state is still valid
      if (blockId !== lockRef.current.blockId || activeSuggestionBlock !== null || suggestion !== '') {
        console.log('Cancelling completion: state changed', { blockId, activeSuggestionBlock, suggestion });
        lockRef.current.isLocked = false;
        return;
      }
      
      if (!data.completion || !data.keywords) {
        console.error('Invalid completion response format:', data);
        return;
      }

      // Ensure keywords is an array
      const keywords = Array.isArray(data.keywords) ? data.keywords : [data.keywords];

      // Set pending suggestion with keywords from API
      setPendingSuggestion({
        text: data.completion,
        keywords
      });
      
      try {
        // Fetch citation using keywords from API
        console.log('Fetching citation with keywords:', keywords);
        const citationResponse = await fetch('/api/editor/citation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ keywords }),
        });
        
        console.log('Citation API response status:', citationResponse.status);
        
        // Show suggestion with or without citation based on response
        if (citationResponse.status === 204) {
          console.log('No citation available, showing suggestion without citation');
          setSuggestion(data.completion);
          setActiveSuggestionBlock(blockId);
          showSuggestionWithCitation(data.completion, null);
        } else if (citationResponse.ok) {
          const citationData = await citationResponse.json();
          
          // Final state check before showing suggestion
          if (blockId !== lockRef.current.blockId || activeSuggestionBlock !== null || suggestion !== '') {
            console.log('Cancelling completion: state changed after citation fetch');
            return;
          }

          if (citationData.citation) {
            setPendingCitation(citationData.citation);
            setSuggestion(data.completion);
            setActiveSuggestionBlock(blockId);
            
            // Store the original text
            const currentBlockIndex = editor.blocks.getCurrentBlockIndex();
            const currentBlock = await editor.blocks.getBlockByIndex(currentBlockIndex);
            if (currentBlock) {
              const contentElement = currentBlock.holder.querySelector('[contenteditable="true"]');
              if (contentElement) {
                originalTextRef.current = contentElement.textContent || '';
              }
            }

            // Show suggestion with citation
            showSuggestionWithCitation(data.completion, citationData.citation);
          } else {
            // Citation data invalid, show suggestion without citation
            setSuggestion(data.completion);
            setActiveSuggestionBlock(blockId);
            showSuggestionWithCitation(data.completion, null);
          }
        } else {
          // Citation API error, show suggestion without citation
          setSuggestion(data.completion);
          setActiveSuggestionBlock(blockId);
          showSuggestionWithCitation(data.completion, null);
        }
      } catch (citationError) {
        console.error('Citation fetch error:', citationError);
        // Still show suggestion without citation if citation fetch fails
        setSuggestion(data.completion);
        setActiveSuggestionBlock(blockId);
        showSuggestionWithCitation(data.completion, null);
      }
    } catch (error) {
      console.error('Error in completion process:', error);
    } finally {
      lockRef.current.isLocked = false;
    }
  }, [isSuggestionAllowed, showSuggestionWithCitation, activeSuggestionBlock, suggestion]);

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

      // Clear suggestion UI - now remove the container instead of just the span
      const suggestionContainer = contentElement.querySelector('#current-suggestion-container');
      if (suggestionContainer) {
        suggestionContainer.remove();
        
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
      
      // Get current block safely
      let currentBlock;
      try {
        const currentBlockIndex = editor.blocks.getCurrentBlockIndex();
        currentBlock = await editor.blocks.getBlockByIndex(currentBlockIndex);
        
        if (!currentBlock) {
          console.error('No current block found');
          return;
        }
      } catch (error) {
        console.error('Error getting current block:', error);
        return;
      }

      // Reset lock state
      lockRef.current = {
        isLocked: false,
        blockId: null,
        text: '',
        hasChangedSinceRejection: true,
        lastSuggestionText: null,
        charactersSinceLastAction: 0
      };

      const contentElement = currentBlock.holder.querySelector('[contenteditable="true"]');
      if (!contentElement) return;

      // Now look for the container instead of just the suggestion span
      const suggestionContainer = contentElement.querySelector('#current-suggestion-container');
      if (!suggestionContainer) return;

      const suggestionSpan = suggestionContainer.querySelector('#current-suggestion');
      const citationSpan = suggestionContainer.querySelector('#current-citation');
      if (!suggestionSpan) return;

      // Get the suggestion text and citation text
      const suggestionText = suggestion.trim();
      const endsWithPeriod = suggestionText.endsWith('.');
      const cleanSuggestionText = (endsWithPeriod ? suggestionText.slice(0, -1) : suggestionText) + ' ';
      const citationLink = citationSpan?.querySelector('a');

      // Build the final text content
      let finalText = '';
      let citationData: Citation | null = null;

      try {
        // Get the text before the suggestion
        const tempElement = contentElement.cloneNode(true) as HTMLElement;
        const tempSuggestionContainer = tempElement.querySelector('#current-suggestion-container');
        if (tempSuggestionContainer) {
          tempSuggestionContainer.remove();
        }
        const currentText = tempElement.textContent || '';
        const trimmedCurrentText = currentText.replace(/\s+$/, '');

        // Start building the final text
        finalText = trimmedCurrentText;

        // Add space if there's existing text
        if (finalText.length > 0) {
          finalText += ' ';
        }

        // Add the suggestion text
        finalText += cleanSuggestionText.trim();

        // Process citation if exists
        if (citationLink) {
          // Extract citation data
          citationData = {
            title: citationLink.title,
            authors: [],
            year: parseInt(citationLink.textContent?.match(/\d{4}/)?.[0] || '0'),
            doi: citationLink.href.includes('doi.org/') ? citationLink.href.split('doi.org/')[1] : undefined,
            url: !citationLink.href.includes('doi.org/') ? citationLink.href : undefined
          };

          // Extract authors from citation text
          const citationText = citationLink.textContent || '';
          const authorMatch = citationText.match(/\((.*?)(?:,|\s+&\s+|et al\.)/);
          if (authorMatch) {
            const authorPart = authorMatch[1];
            if (citationText.includes('et al.')) {
              citationData.authors = [authorPart.trim()];
            } else if (citationText.includes('&')) {
              const authors = citationText.split('&')[0].replace(/[()]/g, '').split(',');
              citationData.authors = authors.map((author: string) => author.trim());
            } else {
              citationData.authors = [authorPart.trim()];
            }
          }

          // Add citation text to final content
          finalText += ` ${citationText}`;
        }

        // Add final period
        if (!finalText.endsWith('.')) {
          finalText += '.';
        }

        // Clear suggestion state before updating content
        setSuggestion('');
        setActiveSuggestionBlock(null);

        // Remove the suggestion container first
        suggestionContainer.remove();

        // Update the block content using the block's save method first
        await currentBlock.save({
          type: 'paragraph',
          data: {
            text: finalText
          }
        });

        // Wait for the content to update
        await new Promise(resolve => setTimeout(resolve, 10));

        // Get the updated content element and set cursor position
        const updatedContentElement = currentBlock.holder.querySelector('[contenteditable="true"]');
        if (updatedContentElement) {
          // Create a text node with the final content
          const textNode = document.createTextNode(finalText);
          updatedContentElement.innerHTML = ''; // Clear existing content
          updatedContentElement.appendChild(textNode);

          // Set cursor at the end of the text
          const selection = window.getSelection();
          if (selection) {
            const range = document.createRange();
            range.setStart(textNode, textNode.length);
            range.setEnd(textNode, textNode.length);
            selection.removeAllRanges();
            selection.addRange(range);
            updatedContentElement.focus();
          }
        }

        // Update references if we have citation data
        if (citationData) {
          // Get fresh block data
          const savedData = await editor.save();
          const blocks = savedData.blocks;
          
          // Find or create references block
          let referenceBlock = blocks.find((b: any) => b.type === 'references');
          let referenceBlockIndex = blocks.findIndex((b: any) => b.type === 'references');
          
          if (referenceBlock) {
            // Update existing block
            const existingCitations = referenceBlock.data?.citations || [];
            
            // Check for duplicates
            const isDuplicate = existingCitations.some((cite: Citation) => 
              cite.title === citationData?.title && 
              cite.year === citationData?.year
            );
            
            if (!isDuplicate && citationData) {
              // Add new citation and sort
              existingCitations.push(citationData);
              existingCitations.sort((a: Citation, b: Citation) => {
                const aName = a.authors[0]?.split(' ').pop() || '';
                const bName = b.authors[0]?.split(' ').pop() || '';
                return aName.localeCompare(bName);
              });
              
              // Update block using the block's save method
              const refBlock = await editor.blocks.getBlockByIndex(referenceBlockIndex);
              if (refBlock) {
                await refBlock.save({
                  type: 'references',
                  data: {
                    text: 'References',
                    level: 2,
                    citations: existingCitations
                  }
                });
              }
            }
          } else {
            // Create new block at the end
            await editor.blocks.insert('references', {
              text: 'References',
              level: 2,
              citations: [citationData]
            }, {}, blocks.length);
          }
        }
      } catch (error) {
        console.error('Error processing text:', error);
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

    // Only handle Tab for accepting suggestion
    if (e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      acceptSuggestion();
      return;
    }

    // For any other key press, reject the suggestion
    clearSuggestion();
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
          inlineToolbar: true,
          data: {
            blocks: []
          },
          tools: {
            header: Header as any,
            list: List as any,
            marker: {
              class: Marker,
              shortcut: 'CMD+SHIFT+M'
            } as const,
            inlineCode: {
              class: InlineCode,
              shortcut: 'CMD+SHIFT+C'
            } as const,
            underline: {
              class: Underline,
              shortcut: 'CMD+U'
            } as const,
            citation: CitationTool,
            references: {
              class: ReferenceTool,
              config: {
                defaultLevel: 2
              }
            }
          },
          onChange: async (api: any) => {
            console.log('onChange triggered', { 
              hasActiveSuggestion: activeSuggestionBlock !== null || suggestion !== '',
              activeSuggestionBlock,
              suggestion,
              lockState: lockRef.current
            });

            // If there's an active suggestion, reject it since user is typing/editing
            if (activeSuggestionBlock !== null || suggestion !== '') {
              console.log('Rejecting suggestion since user is typing/editing');
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
              
              console.log('Current block state:', {
                blockId: currentBlock.id,
                currentText,
                prevText: lockRef.current.text,
                isLocked: lockRef.current.isLocked,
                charactersSinceLastAction: lockRef.current.charactersSinceLastAction
              });
              
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
              
              // Don't schedule new suggestion if user hasn't typed since rejection
              if (!lockRef.current.hasChangedSinceRejection) {
                console.log('Skipping suggestion: no changes since last rejection');
                return;
              }
              
              // Set timeout for suggestion
              completionTimeoutRef.current = setTimeout(async () => {
                try {
                  // Double-check if there's an active suggestion before proceeding
                  if (activeSuggestionBlock !== null || suggestion !== '') {
                    console.log('Cancelling timeout: active suggestion exists');
                    return;
                  }

                  // Get fresh state
                  const blockIndex = api.blocks.getCurrentBlockIndex();
                  const block = await api.blocks.getBlockByIndex(blockIndex);
                  if (!block) return;
                  
                  const data = await block.save();
                  const text = data?.data?.text || '';
                  
                  console.log('Attempting suggestion for:', {
                    blockId: block.id,
                    text,
                    isAllowed: isSuggestionAllowed(block.id, text)
                  });
                  
                  // Skip if suggestion not allowed
                  if (!isSuggestionAllowed(block.id, text)) {
                    return;
                  }
                  
                  // Skip if text hasn't changed since last suggestion
                  if (text === lockRef.current.lastSuggestionText) {
                    return;
                  }
                  
                  // Get the previous two blocks' content for context
                  let context = stripHtmlAndNormalize(text);
                  try {
                    // Get up to 2 previous blocks
                    const currentIndex = api.blocks.getCurrentBlockIndex();
                    for (let i = 1; i <= 2; i++) {
                      if (currentIndex - i >= 0) {
                        const prevBlock = await api.blocks.getBlockByIndex(currentIndex - i);
                        if (prevBlock) {
                          const prevData = await prevBlock.save();
                          const prevText = prevData?.data?.text;
                          if (prevText) {
                            // Strip HTML from previous blocks too
                            const cleanPrevText = stripHtmlAndNormalize(prevText);
                            context = cleanPrevText + '\n\n' + context;
                          }
                        }
                      }
                    }
                  } catch (error) {
                    console.error('Error getting previous blocks:', error);
                  }
                  
                  // Call handleCompletion with the current block's text and context
                  await handleCompletion(block.id, context);
                } catch (error) {
                  console.error('Error in suggestion timeout:', error);
                }
              }, 5000); // Changed to 5 seconds
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
        <h1 className="text-2xl font-bold mb-6">Writer's Unblock</h1>
        <div 
          id="editorjs" 
          className="prose max-w-none border rounded-lg p-4 min-h-[500px] relative"
        />
      </div>
    </div>
  )
} 