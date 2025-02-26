//// filepath: /d:/Repositories/alhrkn/src/app/scholar/plugins/PredictionPlugin.tsx
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect, useRef } from 'react';
import { $getSelection, $isRangeSelection, $getRoot } from 'lexical';
import { COMMAND_PRIORITY_NORMAL, KEY_TAB_COMMAND } from 'lexical';
import { $createPredictionNode, $isPredictionNode, PredictionNode } from './PredictionNode';

function PredictionPlugin() {
  const [editor] = useLexicalComposerContext();
  // This flag indicates that the user dismissed the prediction.
  const isPredictionDismissed = useRef(false);

  // Handle Tab key to accept predictions.
  useEffect(() => {
    const handleTabKey = async (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        editor.update(() => {
          const selection = $getSelection();
          if (!selection || !$isRangeSelection(selection)) return;
  
          // Retrieve prediction nodes
          const predictionElements: PredictionNode[] = editor.getEditorState().read(() => {
            const nodes: PredictionNode[] = [];
            editor.getEditorState()._nodeMap.forEach((node) => {
              if ($isPredictionNode(node)) {
                nodes.push(node);
              }
            });
            return nodes;
          });
  
          // Insert prediction text and remove the prediction nodes.
          predictionElements.forEach((node: PredictionNode) => {
            const text = node.__text;
            selection.insertText(text);
            node.remove();
          });
        });
      }
    };
  
    const unregisterTab = editor.registerCommand(
      KEY_TAB_COMMAND,
      (payload: KeyboardEvent) => {
        handleTabKey(payload);
        return false;
      },
      COMMAND_PRIORITY_NORMAL
    );
  
    return () => {
      unregisterTab();
    };
  }, [editor]);

  // Listen globally for Escape key to dismiss predictions.
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        editor.update(() => {
          const predictionElements: PredictionNode[] = editor.getEditorState().read(() => {
            const nodes: PredictionNode[] = [];
            editor.getEditorState()._nodeMap.forEach((node) => {
              if ($isPredictionNode(node)) {
                nodes.push(node);
              }
            });
            return nodes;
          });
          predictionElements.forEach((node: PredictionNode) => {
            node.remove();
          });
        });
        // Mark that prediction has been dismissed.
        isPredictionDismissed.current = true;
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [editor]);

  // Listen for updates and call the prediction API if needed.
  useEffect(() => {
    let predictionTimeout: NodeJS.Timeout;
    let lastContent = '';

    const requestPrediction = async (context: string) => {
      // If prediction was dismissed, do not call API.
      if (isPredictionDismissed.current) return;
      try {
        // Optionally you can remove existing prediction nodes here.
        editor.update(() => {
          // (Add logic if needed to clean prediction nodes)
        });
  
        const response = await fetch('/api/scholar/prediction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ context })
        });
        
        const data = await response.json();
        if (data.prediction) {
          editor.update(() => {
            const selection = $getSelection();
            if (!$isRangeSelection(selection)) return;
            // Insert the prediction node.
            selection.insertNodes([$createPredictionNode(data.prediction)]);
          });
        }
      } catch (error) {
        console.error('Prediction error:', error);
      }
    };

    const updateListener = () => {
      editor.update(() => {
        if (predictionTimeout) {
          clearTimeout(predictionTimeout);
        }
  
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;
  
        const root = $getRoot();
        const currentContent = root.getTextContent();
  
        // If the content changes (new character typed), reset the dismissal flag and schedule a prediction.
        if (currentContent !== lastContent) {
          lastContent = currentContent;
          isPredictionDismissed.current = false;
          predictionTimeout = setTimeout(() => {
            editor.update(() => {
              const selection = $getSelection();
              if (!$isRangeSelection(selection)) return;
              const root = $getRoot();
              const textContent = root.getTextContent();
              const cursorPosition = selection.anchor.offset;
              
              // Provide context from up to 200 characters before the cursor.
              const context = textContent.slice(Math.max(0, cursorPosition - 200), cursorPosition);
              if (context.trim()) {
                requestPrediction(context);
              }
            });
          }, 5000);
        }
      });
    };

    const removeUpdateListener = editor.registerUpdateListener(updateListener);
  
    return () => {
      if (predictionTimeout) {
        clearTimeout(predictionTimeout);
      }
      removeUpdateListener();
    };
  }, [editor]);

  return null;
}

export default PredictionPlugin;