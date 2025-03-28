/**
 * Handles saving a follow-up question and getting an answer from the API
 * Using session-based approach for PDF context
 */
export const handleFollowUpSave = async (
  id: string,
  question: string,
  data: {
    title: string;
    description: string;
    addFollowUpNode: (id: string, question: string, answer: string, customNodeId?: string) => string;
    updateNodeData?: (id: string, data: any) => void;
    pageNumber?: number;
  },
  setShowFollowUpCard: (show: boolean) => void,
  setShowChatButton: (show: boolean) => void,
  fetchAndStoreExamplePdf: (url: string) => Promise<void>
) => {
  console.log(`Processing follow-up question for node ${id}: ${question}`);
  console.log(`Context: ${data.title} (page ${data.pageNumber || 'unknown'})`);
  
  // Hide the follow-up card immediately
  setShowFollowUpCard(false);

  try {
    // Get the session ID and session data if available
    let sessionId = localStorage.getItem('pdfSessionId');
    let sessionData = localStorage.getItem('pdfSessionData');
    // Also get PDF data as fallback
    let pdfData = localStorage.getItem('pdfData');
    // Get blob URL if available
    let blobUrl = localStorage.getItem('pdfBlobUrl');
    
    // Log the state of stored data
    console.log('Stored data found in localStorage:', {
      hasSessionId: !!sessionId,
      hasSessionData: !!sessionData, 
      hasPdfData: !!pdfData,
      hasBlobUrl: !!blobUrl,
      blobUrlPreview: blobUrl ? `${blobUrl.substring(0, 50)}...` : 'none'
    });
    
    // Check if this is the example mindmap - detect by URL referencing Steve Jobs speech
    const isExampleMindmap = 
      blobUrl && 
      blobUrl.includes('Steve_Jobs_Stanford_Commencement_Speech_2015.pdf');
    
    // Log if we're dealing with the example mindmap
    if (isExampleMindmap) {
      console.log('Detected example mindmap with local PDF file:', blobUrl);
    }
    
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

    // If we don't have a session yet, initialize one with the PDF
    if (isExampleMindmap && (!sessionId || !sessionData)) {
      console.log('No existing session for example mindmap, initializing new session...');
      try {
        // Prepare request body with PDF data or URL
        const initRequestBody: Record<string, any> = {};
        
        // Include Blob URL as preferred method
        if (blobUrl) {
          initRequestBody.blobUrl = blobUrl;
          console.log('Including example mindmap Blob URL in initialization request');
        }
        
        // Include PDF data as fallback if available
        if (pdfData) {
          initRequestBody.pdfData = pdfData;
          console.log('Including PDF data as fallback in initialization request');
        }
        
        const initResponse = await fetch('/api/papermap/initialize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(initRequestBody)
        });
        
        if (initResponse.ok) {
          const initData = await initResponse.json();
          sessionId = initData.sessionId;
          sessionData = initData.sessionData;
          
          // Store the session data in localStorage
          if (initData.sessionId && initData.sessionData) {
            localStorage.setItem('pdfSessionId', initData.sessionId);
            localStorage.setItem('pdfSessionData', initData.sessionData);
            console.log('Successfully initialized new session for follow-up question:', initData.sessionId);
          } else {
            console.warn('Received incomplete session data from initialization');
          }
        } else {
          console.error('Failed to initialize session:', await initResponse.text());
        }
      } catch (initError) {
        console.error('Error initializing session:', initError);
      }
    }

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

    // Include PDF data if available (but not for example mindmap where we use Blob URL)
    if (pdfData && !isExampleMindmap) {
      requestBody.pdfData = pdfData;
      console.log('Including PDF data in request');
    }

    // Include blob URL in the request if available
    if (blobUrl) {
      requestBody.blobUrl = blobUrl;
      console.log('Including Blob URL in request:', blobUrl);
    }

    // Send request to API
    console.log('Sending follow-up question to API with requestBody:', {
      hasSessionId: !!requestBody.sessionId,
      hasSessionData: !!requestBody.sessionData,
      hasPdfData: !!requestBody.pdfData,
      blobUrl: requestBody.blobUrl,
      questionLength: question.length,
      nodeContextTitle: nodeContext.title
    });
    
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
        const parsedAnswer = JSON.parse(answerContent);
        if (parsedAnswer.answer) {
          answerContent = parsedAnswer.answer;
        }
      } catch (e) {
        console.warn('Failed to parse answer as JSON, using raw response');
      }
    }
    
    // Update the node with the actual answer
    console.log(`Updating node ${createdNodeId} with answer, length: ${answerContent.length}`);
    
    if (data.updateNodeData) {
      data.updateNodeData(createdNodeId, { 
        description: answerContent,
        loading: false 
      });
    }

    return createdNodeId;
  } catch (error) {
    console.error('Error handling follow-up question:', error);
    
    // Create error node with error message
    const errorMessage = `<div class="text-red-500">Error: Failed to get an answer. Please try again or reload the page.</div>`;
    
    // Generate a unique ID for the error node
    const errorNodeId = `error-node-${Date.now()}`;
    
    // Create the error node
    const createdNodeId = data.addFollowUpNode(id, question, errorMessage, errorNodeId);
    
    // Update the node with error styling if possible
    if (data.updateNodeData) {
      data.updateNodeData(errorNodeId, { 
        description: errorMessage,
        loading: false 
      });
    }

    return createdNodeId;
  } finally {
    // Make sure chat button is hidden after processing completes
    setShowChatButton(false);
  }
}; 