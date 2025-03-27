import { MindMapData } from '../types';

// Example PDF URL
export const EXAMPLE_PDF_URL = '/Steve_Jobs_Stanford_Commencement_Speech_2015.pdf'; // This should be placed in your public folder

// Expose the example PDF URL globally for other components to use
if (typeof window !== 'undefined') {
  (window as any).EXAMPLE_PDF_URL = EXAMPLE_PDF_URL;
}

// Example mindmap data structure for Steve Jobs Stanford Commencement Speech
export const EXAMPLE_MINDMAP: MindMapData = {
  "nodes": [
    {
      "description": "This commencement speech at Stanford University shares three life stories illustrating the importance of trusting intuition, embracing failure, and facing mortality.",
      "id": "node1",
      "level": 0,
      "parentId": null,
      "title": "Life Lessons from Stanford Commencement Speech",
      "pageNumber": 1
    },
    {
      "description": "The first story emphasizes connecting seemingly unrelated experiences to discover meaning and purpose in life.  It highlights the unexpected value of a calligraphy class, which later influenced the design of the Macintosh computer.",
      "id": "node2",
      "level": 1,
      "parentId": "node1",
      "title": "Connecting the Dots: Intuition and Unexpected Value",
      "pageNumber": 1
    },
    {
      "description": "Dropping out of Reed College after six months allowed the speaker to focus on classes of interest, including calligraphy, which unexpectedly proved crucial years later in the development of the Macintosh.",
      "id": "node3",
      "level": 2,
      "parentId": "node2",
      "title": "Reed College Dropout and Calligraphy",
      "pageNumber": 1
    },
    {
      "description": "The calligraphy class taught principles of typography and design that were later incorporated into the Macintosh's design, demonstrating the long-term value of seemingly unrelated experiences.",
      "id": "node4",
      "level": 3,
      "parentId": "node3",
      "title": "Calligraphy's Influence on Macintosh Design",
      "pageNumber": 1
    },
    {
      "description": "The second story discusses the speaker's experience of being fired from Apple and how this led to the creation of NeXT and Pixar, emphasizing the importance of resilience and pursuing one's passions.",
      "id": "node5",
      "level": 1,
      "parentId": "node1",
      "title": "Love and Loss: Resilience and Passion",
      "pageNumber": 2
    },
    {
      "description": "Being fired from Apple, though initially devastating, allowed the speaker to pursue new ventures, leading to the creation of NeXT and Pixar, and ultimately, a return to Apple.",
      "id": "node6",
      "level": 2,
      "parentId": "node5",
      "title": "Firing from Apple and Subsequent Successes",
      "pageNumber": 2
    },
    {
      "description": "The creation of Pixar, which produced the world's first computer-animated feature film, is highlighted as a significant achievement stemming from the experience of being fired from Apple.",
      "id": "node7",
      "level": 3,
      "parentId": "node6",
      "title": "Pixar's Success and First Computer-Animated Film",
      "pageNumber": 2
    },
    {
      "description": "The third story focuses on the importance of contemplating one's mortality and how this awareness can guide decision-making, encouraging individuals to prioritize their passions and values.",
      "id": "node8",
      "level": 1,
      "parentId": "node1",
      "title": "Death: Facing Mortality and Following Your Heart",
      "pageNumber": 3
    },
    {
      "description": "A personal experience with a cancer diagnosis is shared to emphasize the importance of living each day to the fullest and not wasting time on things that do not matter.",
      "id": "node9",
      "level": 2,
      "parentId": "node8",
      "title": "Cancer Diagnosis and Life's Priorities",
      "pageNumber": 3
    },
    {
      "description": "The speech concludes with the message \"Stay Hungry, Stay Foolish,\" urging the graduates to maintain their passion and curiosity throughout their lives.",
      "id": "node10",
      "level": 2,
      "parentId": "node8",
      "title": "Concluding Message: Stay Hungry, Stay Foolish",
      "pageNumber": 3
    }
  ]
}; 