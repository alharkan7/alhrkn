# PaperMap Implementation: Prepopulated Example Mindmap

This implementation adds a prepopulated example mindmap to the PaperMap application, enhancing the user experience by:

1. Giving users an immediate example to interact with when they first open the app
2. Providing a way to reset to the example mindmap through the sidebar
3. Supporting both base64-encoded PDFs and URL-based PDFs

## Implementation Details

### Main Components Modified:

1. **useMindMap Hook**
   - Added example mindmap data
   - Added a `loadExampleMindMap` function
   - Modified to initialize with example data
   - Added support for PDF URL

2. **PdfViewer Components**
   - Updated to handle both base64-encoded PDFs and PDF URLs
   - Modified interface to accept URL-based PDFs

3. **UI Components**
   - Added "Load Example Mindmap" button in the sidebar
   - Updated component props to pass the loadExampleMindMap function

### Example Data

The example mindmap is about quantum computing advancements and contains:
- A root node explaining quantum computing breakthroughs
- Level 1 nodes covering quantum error correction, algorithm development, quantum supremacy, and hardware advances
- Level 2 nodes with more specific details
- Each node has an associated page number for PDF navigation

## Usage Instructions

1. **Default Experience**
   - When users open the app, they'll see the example mindmap automatically loaded
   - The mindmap is fully interactive - users can:
     - Click nodes to expand/collapse
     - Add follow-up questions to nodes
     - View the associated PDF by clicking on page numbers

2. **Loading New Papers**
   - Users can still upload their own PDFs through the sidebar
   - This will replace the example mindmap with a new one generated from their PDF

3. **Resetting to Example**
   - Users can click the "Load Example Mindmap" button in the sidebar to:
     - Clear any currently loaded mindmap
     - Restore the example mindmap
     - This is useful for demonstrations or when users want to start fresh

## Next Steps

1. **Replace Placeholder PDF**
   - Replace `public/example-paper.pdf` with an actual PDF file about quantum computing
   - The page numbers in the example mindmap should ideally match up with content in the PDF

2. **Refine Example Data**
   - Adjust the example mindmap data in `useMindMap.ts` to better match your chosen PDF
   - Ensure the page numbers are accurate

3. **Consider Adding More Examples**
   - You could extend this to provide multiple example mindmaps on different topics
   - This would require modifying the UI to show a selection of examples

4. **Add Persistence**
   - Consider adding local storage to remember the last state between visits
   - This would allow users to continue where they left off 