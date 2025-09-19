export interface RubricCriteria {
  name: string
  weight: number
  description: string
  points: string[]
}

export interface EssayRubric {
  title: string
  description: string
  criteria: RubricCriteria[]
  focusAreas: string[]
}

export const essayRubrics: Record<string, EssayRubric> = {
  scholarship: {
    title: "Scholarship Essay Evaluation Rubric",
    description: "Evaluation criteria for scholarship application essays focusing on personal achievements and future goals.",
    criteria: [
      {
        name: "Content & Message",
        weight: 40,
        description: "Personal story, achievements, and future aspirations",
        points: [
          "Personal story and experiences are compelling and authentic",
          "Clear demonstration of achievements, goals, and motivation",
          "Strong connection between past experiences and future aspirations",
          "Evidence of leadership, community service, or overcoming challenges"
        ]
      },
      {
        name: "Writing Quality & Clarity",
        weight: 25,
        description: "Grammar, style, and communication effectiveness",
        points: [
          "Clear, engaging writing style",
          "Proper grammar, punctuation, and spelling",
          "Varied sentence structure and vocabulary",
          "Logical flow and transitions between ideas"
        ]
      },
      {
        name: "Structure & Organization",
        weight: 20,
        description: "Essay structure and paragraph organization",
        points: [
          "Strong introduction that hooks the reader",
          "Well-organized body paragraphs with clear main ideas",
          "Effective conclusion that reinforces main message",
          "Appropriate length and paragraph development"
        ]
      },
      {
        name: "Persuasiveness & Impact",
        weight: 15,
        description: "Convincing argument and memorable presentation",
        points: [
          "Convincing argument for why the applicant deserves the scholarship",
          "Memorable and distinctive voice",
          "Evidence of reflection and self-awareness",
          "Demonstrates fit with scholarship values/criteria"
        ]
      }
    ],
    focusAreas: [
      "Personal narrative and authenticity",
      "Academic and career goals clarity",
      "Evidence of achievements and potential",
      "Financial need demonstration (if applicable)",
      "Writing mechanics and style"
    ]
  },

  admission: {
    title: "School Admission Essay Evaluation Rubric",
    description: "Evaluation criteria for college and university admission essays and personal statements.",
    criteria: [
      {
        name: "Personal Voice & Authenticity",
        weight: 35,
        description: "Genuine personal voice and character development",
        points: [
          "Genuine, unique personal voice that stands out",
          "Authentic stories and experiences that reveal character",
          "Clear demonstration of self-awareness and reflection",
          "Shows growth, maturity, and personal development"
        ]
      },
      {
        name: "Academic Fit & Goals",
        weight: 30,
        description: "Understanding of program and future aspirations",
        points: [
          "Clear understanding of chosen field/program",
          "Compelling reasons for pursuing this academic path",
          "Evidence of research into the institution",
          "Realistic and well-articulated future goals"
        ]
      },
      {
        name: "Writing Quality & Communication",
        weight: 20,
        description: "Technical writing skills and communication",
        points: [
          "Excellent grammar, syntax, and vocabulary",
          "Engaging and clear writing style",
          "Strong organization and flow",
          "Appropriate tone for academic audience"
        ]
      },
      {
        name: "Impact & Contribution",
        weight: 15,
        description: "Potential contribution to the academic community",
        points: [
          "Shows potential to contribute to campus community",
          "Evidence of leadership, initiative, or unique perspective",
          "Demonstrates intellectual curiosity and passion",
          "Clear value proposition for the institution"
        ]
      }
    ],
    focusAreas: [
      "Personal story and character development",
      "Academic passion and intellectual curiosity",
      "Fit with institution and program",
      "Communication skills and writing quality",
      "Potential for contribution and impact"
    ]
  },

  blog: {
    title: "Blog Post Evaluation Rubric",
    description: "Evaluation criteria for online blog posts and web articles.",
    criteria: [
      {
        name: "Content Value & Engagement",
        weight: 40,
        description: "Value provided to readers and engagement level",
        points: [
          "Provides valuable, useful, or entertaining content",
          "Engages target audience effectively",
          "Clear takeaways or actionable insights",
          "Original perspective or unique angle"
        ]
      },
      {
        name: "Writing Style & Voice",
        weight: 25,
        description: "Conversational style and consistent voice",
        points: [
          "Conversational yet professional tone",
          "Clear, accessible language for intended audience",
          "Consistent voice and personality",
          "Appropriate use of storytelling and examples"
        ]
      },
      {
        name: "Structure & Readability",
        weight: 20,
        description: "Online readability and formatting",
        points: [
          "Scannable format with headers and bullet points",
          "Logical flow and smooth transitions",
          "Compelling headline and introduction",
          "Strong conclusion with clear call-to-action"
        ]
      },
      {
        name: "SEO & Online Optimization",
        weight: 15,
        description: "Search engine and social media optimization",
        points: [
          "Strategic use of keywords and phrases",
          "Meta description and title optimization potential",
          "Internal and external linking opportunities",
          "Shareable and linkable content"
        ]
      }
    ],
    focusAreas: [
      "Audience value and engagement",
      "Writing style and voice consistency",
      "Content structure and readability",
      "SEO and online performance potential",
      "Actionable insights and takeaways"
    ]
  },

  academic: {
    title: "Academic Paper Evaluation Rubric",
    description: "Evaluation criteria for research papers and scholarly writing.",
    criteria: [
      {
        name: "Argument & Analysis",
        weight: 35,
        description: "Thesis strength and analytical rigor",
        points: [
          "Clear, focused thesis statement",
          "Strong supporting evidence and citations",
          "Rigorous analysis and critical thinking",
          "Addresses counterarguments appropriately"
        ]
      },
      {
        name: "Research & Sources",
        weight: 30,
        description: "Quality and integration of research sources",
        points: [
          "Comprehensive literature review",
          "High-quality, credible sources",
          "Proper citation format and style",
          "Integration of sources into argument"
        ]
      },
      {
        name: "Organization & Structure",
        weight: 20,
        description: "Academic organization and formatting",
        points: [
          "Logical progression of ideas",
          "Clear introduction, body, and conclusion",
          "Effective transitions between sections",
          "Adherence to academic formatting standards"
        ]
      },
      {
        name: "Writing Quality & Style",
        weight: 15,
        description: "Academic writing conventions and clarity",
        points: [
          "Clear, precise academic language",
          "Proper grammar and syntax",
          "Appropriate tone for scholarly audience",
          "Concise and efficient expression"
        ]
      }
    ],
    focusAreas: [
      "Thesis clarity and argument strength",
      "Quality and integration of research",
      "Academic writing style and tone",
      "Organizational structure and flow",
      "Citation accuracy and format"
    ]
  },

  personal: {
    title: "Personal Essay Evaluation Rubric",
    description: "Evaluation criteria for personal narratives and reflective writing.",
    criteria: [
      {
        name: "Narrative & Storytelling",
        weight: 40,
        description: "Storytelling effectiveness and narrative techniques",
        points: [
          "Compelling personal narrative",
          "Effective use of storytelling techniques",
          "Vivid details and sensory descriptions",
          "Emotional resonance and authenticity"
        ]
      },
      {
        name: "Self-Reflection & Insight",
        weight: 30,
        description: "Personal growth and self-awareness",
        points: [
          "Deep self-awareness and introspection",
          "Meaningful insights about personal growth",
          "Connection between experiences and lessons learned",
          "Evidence of emotional intelligence"
        ]
      },
      {
        name: "Writing Craft & Style",
        weight: 20,
        description: "Literary techniques and writing quality",
        points: [
          "Engaging, personal voice",
          "Strong descriptive and narrative techniques",
          "Varied sentence structure and pacing",
          "Appropriate tone and mood"
        ]
      },
      {
        name: "Universal Themes & Connection",
        weight: 10,
        description: "Broader relevance and reader connection",
        points: [
          "Relatable themes that resonate with readers",
          "Balance between personal and universal",
          "Clear message or takeaway",
          "Ability to connect with diverse audiences"
        ]
      }
    ],
    focusAreas: [
      "Storytelling effectiveness and narrative flow",
      "Self-reflection and personal insight",
      "Writing craft and stylistic choices",
      "Emotional authenticity and vulnerability",
      "Universal themes and reader connection"
    ]
  },

  general: {
    title: "General Essay Evaluation Rubric",
    description: "Evaluation criteria for general essays and written content.",
    criteria: [
      {
        name: "Argument & Analysis",
        weight: 35,
        description: "Thesis development and analytical thinking",
        points: [
          "Clear thesis statement",
          "Strong supporting evidence",
          "Logical reasoning and analysis",
          "Addresses counterarguments where appropriate"
        ]
      },
      {
        name: "Content & Development",
        weight: 30,
        description: "Topic coverage and depth of understanding",
        points: [
          "Comprehensive coverage of topic",
          "Depth of understanding demonstrated",
          "Use of relevant examples and evidence",
          "Original insights and critical thinking"
        ]
      },
      {
        name: "Organization & Structure",
        weight: 20,
        description: "Essay organization and logical flow",
        points: [
          "Clear introduction, body, and conclusion",
          "Logical progression of ideas",
          "Effective transitions",
          "Coherent paragraph structure"
        ]
      },
      {
        name: "Writing Mechanics",
        weight: 15,
        description: "Grammar, style, and technical execution",
        points: [
          "Grammar, spelling, and punctuation",
          "Sentence variety and clarity",
          "Appropriate tone and style",
          "Proper citation format (if applicable)"
        ]
      }
    ],
    focusAreas: [
      "Thesis clarity and argument strength",
      "Evidence quality and analysis",
      "Organization and flow",
      "Writing mechanics and style",
      "Critical thinking demonstration"
    ]
  }
}

export function getRubric(essayType: string): EssayRubric {
  return essayRubrics[essayType] || essayRubrics.general
}
