import { Clock, PenTool, Sparkles, Languages, LucideIcon, Infinity, Wallet, Waypoints, Feather, SquareKanban, Network, FileText, Search, Sliders } from 'lucide-react'

export interface AppConfig {
  name: string
  icon: LucideIcon
  slug: string
  description: string
}

export const apps: AppConfig[] = [
  {
    name: 'Papermap',
    icon: Waypoints,
    slug: 'papermap',
    description: 'Learn Anything with Interactive Mindmap',
  },
  {
    name: 'Inztagram',
    icon: SquareKanban,
    slug: 'inztagram',
    description: 'Create Any Diagram in Seconds',
  },
  {
    name: 'Outliner',
    icon: Feather,
    slug: 'outliner',
    description: 'Quickly Draft Research Paper',
  },
  {
    name: 'FlowNote',
    icon: PenTool,
    slug: 'flownote',
    description: 'A Node-based Document Authoring System',
  },
  {
    name: 'Disposable Chat',
    icon: Sparkles,
    slug: 'chat',
    description: 'Chat with AI, No Data is Stored',
  },
  {
    name: 'Nusantara Timeline',
    icon: Clock,
    slug: 'indonesia-history',
    description: 'Interactive Timeline of Indonesian History',
  },
  {
    name: 'Japanese Flashcards',
    icon: Languages,
    slug: 'japanese-flashcards',
    description: 'Simple Japanese Letters Flashcards',
  },
  {
    name: 'Finance Tracker',
    icon: Wallet,
    slug: 'finance-tracker',
    description: 'Expense, Income, Budget & Excel Export',
  },
  {
    name: 'Discourse Extractor',
    icon: Network,
    slug: 'dnanalyzer',
    description: 'Automatic Discourse Extractor for DNAnalyzer',
  },
  // Experimental Apps
  {
    name: 'Autogram',
    icon: SquareKanban,
    slug: 'autogram',
    description: 'Text to Smart Art Diagrams',
  },
  {
    name: 'Autography',
    icon: PenTool,
    slug: 'autography',
    description: 'AI-Powered Writing Assistant',
  },
  {
    name: 'Editor',
    icon: FileText,
    slug: 'editor',
    description: 'Rich Text Editor Experiments',
  },
  {
    name: 'Reviewr',
    icon: Search,
    slug: 'reviewr',
    description: 'Essay Reviewing Tool',
  },
  {
    name: 'Slider',
    icon: Sliders,
    slug: 'slider',
    description: 'Interactive Component Experiments',
  },
  {
    name: 'Suspa-Analis',
    icon: Sparkles,
    slug: 'suspa-analis',
    description: 'Analysis Tool',
  },
  // End of Experimental Apps
  {
    name: 'More Apps',
    icon: Infinity,
    slug: 'enaiblr',
    description: 'Access Enaiblr Apps',
  },
]