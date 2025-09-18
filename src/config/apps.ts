import { Sparkles, Languages, LucideIcon, Infinity, Wallet, Waypoints, Feather, SquareKanban } from 'lucide-react'

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
    name: 'AI Chat',
    icon: Sparkles,
    slug: 'chat',
    description: 'Ask Anything with Chat Assistant',
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
    description: 'Simple Finance Tracker',
  },
  //{
    //name: "Writer's Unblock",
    //icon: Feather,
    //slug: 'scholar',
    //description: "Overcome Writer's Unblock by Having AI Suggest the Next Ideas For You",
  //},
  {
    name: 'More AI Apps',
    icon: Infinity,
    slug: 'enaiblr',
    description: 'Access Enaiblr AI Apps',
  },
]
