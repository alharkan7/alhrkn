import { Clock, PenTool, Sparkles, Languages, LucideIcon, Infinity, Wallet, Waypoints, Feather, SquareKanban, Network, FileText, Search, Sliders } from 'lucide-react'

export interface AppConfig {
  name: string
  icon: LucideIcon
  slug: string
  description: string
}

export const apps: AppConfig[] = [
  {
    name: 'Autogram',
    icon: SquareKanban,
    slug: 'experimentals/autogram',
    description: 'Text to Smart Art Diagrams',
  },
  {
    name: 'Autography',
    icon: PenTool,
    slug: 'experimentals/autography',
    description: 'AI-Powered Writing Assistant',
  },
  {
    name: 'Editor',
    icon: FileText,
    slug: 'experimentals/editor',
    description: 'Rich Text Editor Experiments',
  },
  {
    name: 'Reviewr',
    icon: Search,
    slug: 'experimentals/reviewr',
    description: 'Essay Reviewing Tool',
  },
  {
    name: 'Slider',
    icon: Sliders,
    slug: 'experimentals/slider',
    description: 'Interactive Component Experiments',
  },
  {
    name: 'Suspa-Analis',
    icon: Sparkles,
    slug: 'experimentals/suspa-analis',
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