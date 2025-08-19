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
    slug: '',
    description: 'Learn Anything with Interactive AI Mindmap',
  },
  {
    name: 'Inztagram',
    icon: SquareKanban,
    slug: 'inztagram',
    description: 'Create Any Diagram in Seconds with AI',
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
    description: 'Learn Anything with AI',
  },
  {
    name: 'Japanese Flashcards',
    icon: Languages,
    slug: 'japanese-flashcards',
    description: 'Simple Japanese Hiragana and Katakana Flashcards',
  },
  {
    name: 'Finance Tracker',
    icon: Wallet,
    slug: 'finance-tracker',
    description: 'Simple Finance Tracker that Records Directly to Google Sheets',
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
    description: 'Access Enaiblr Unlimited AI Platform',
  },
]
