/**
 * Handles saving a follow-up question and getting an answer from the API
 * Using session-based approach for PDF context
 */
export const handleFollowUpSave = async (
  id: string, 
  question: string, 
  data: any,
  setShowFollowUpCard: (show: boolean) => void,
  setShowChatButton: (show: boolean) => void,
  fetchAndStoreExamplePdf: (url: string) => Promise<void>
) => {
  console.log('handleFollowUpSave called with:', { id, question });
  console.log('addFollowUpNode function available:', !!data.addFollowUpNode);

  if (!data.addFollowUpNode) {
    console.error('addFollowUpNode function not provided to node');
    alert('Error: Could not create follow-up node. Missing function reference.');
    return;
  }

  // Hide the card immediately
  setShowFollowUpCard(false);

  try {
    // Get the session ID and session data if available
    let sessionId = localStorage.getItem('pdfSessionId');
    let sessionData = localStorage.getItem('pdfSessionData');
    
    // Create a placeholder node immediately with loading state
    const loadingMessage = '<div class="flex items-center justify-center py-4"><div class="animate-pulse flex space-x-2"><div class="h-2 w-2 bg-blue-400 rounded-full"></div><div class="h-2 w-2 bg-blue-400 rounded-full"></div><div class="h-2 w-2 bg-blue-400 rounded-full"></div></div></div><div class="text-sm text-gray-500 text-center">Answering...</div>';

    // Generate a unique ID for the new node to reference it later
    const nodeId = `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create the node with loading state
    const createdNodeId = data.addFollowUpNode(id, question, loadingMessage, nodeId);

    console.log('Created placeholder node with ID:', createdNodeId);

    // After the placeholder node is created, update it to include the pageNumber from the parent node
    if (data.updateNodeData && data.pageNumber) {
      console.log(`Applying parent pageNumber ${data.pageNumber} to QnA node:`, createdNodeId);
      // Preserve the pageNumber from the parent node
      data.updateNodeData(createdNodeId, { pageNumber: data.pageNumber });
    }

    // Start fetching the answer
    console.log('Sending question to API:', question);

    // Prepare node context
    const nodeContext = {
      title: data.title,
      description: data.description
    };

    // Prepare request body with either sessionData, sessionId
    const requestBody: Record<string, any> = {
      nodeContext,
      question
    };
    
    // Include session data if available
    if (sessionId) {
      requestBody.sessionId = sessionId;
    }
    
    if (sessionData) {
      requestBody.sessionData = sessionData;
    }

    // Send request to API
    const response = await fetch('/api/papermap/ask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error:', response.status, errorText);
      throw new Error(`Failed to get answer: ${response.status}`);
    }

    const result = await response.json();
    
    // Save updated session data if returned from the API
    if (result.updatedSessionData) {
      localStorage.setItem('pdfSessionData', result.updatedSessionData);
      console.log('Updated session data in localStorage');
    }
    
    console.log('API response received:', {
      answerLength: result.answer ? result.answer.length : 0,
      answerPreview: result.answer ? result.answer.substring(0, 50) + '...' : 'No answer'
    });

    if (!result.answer) {
      throw new Error('API response contained no answer');
    }

    // Extract the answer - handle both direct string and JSON-formatted responses
    let answerContent = result.answer;
    
    // If the answer looks like a JSON string (rather than markdown), try to parse it
    if (answerContent.trim().startsWith('{') && answerContent.includes('"answer"')) {
      try {
        const parsed = JSON.parse(answerContent);
        if (parsed.answer) {
          answerContent = parsed.answer;
        }
      } catch (e) {
        console.log('Answer was not JSON format, using as-is');
      }
    }

    // Update the existing node with the actual answer
    if (data.updateNodeData) {
      console.log('Updating node with actual answer:', createdNodeId);
      // Preserve pageNumber when updating the node with the answer
      data.updateNodeData(createdNodeId, {
        description: answerContent,
        // Add pageNumber in case it wasn't added earlier
        pageNumber: data.pageNumber
      });
    } else {
      console.error('Cannot update node: updateNodeData function not available');
    }

  } catch (error) {
    console.error('Error getting answer:', error);
    // If there's already a node with loading state, update it with error message
    if (data.updateNodeData && data.lastCreatedNodeId) {
      data.updateNodeData(data.lastCreatedNodeId, {
        description: "Error: Could not generate an answer. Please try again.",
        // Also preserve pageNumber when updating with error message
        pageNumber: data.pageNumber
      });
    }
  } finally {
    // Make sure chat button is hidden after processing completes
    setShowChatButton(false);
  }
}; 