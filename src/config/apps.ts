import { Sparkles, PenTool, SquareKanban, FileText, Sliders, Search, LucideIcon } from 'lucide-react'

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
]
