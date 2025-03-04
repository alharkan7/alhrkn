import { Sparkles, Languages, LucideIcon, Infinity, Wallet, Lightbulb, Feather } from 'lucide-react'

export interface AppConfig {
  name: string
  icon: LucideIcon
  slug: string
  description: string
}

export const apps: AppConfig[] = [
  {
    name: 'AI Chat',
    icon: Sparkles,
    slug: '',
    description: 'Ask Anything to AI',
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
  {
    name: 'PDF Mindmap',
    icon: Lightbulb,
    slug: 'mindmap',
    description: 'Turn any PDF into Interactive Mindmap with AI',
  },
  {
    name: "Writer's Unblock",
    icon: Feather,
    slug: 'scholar',
    description: "Overcome Writer's Unblock by Having AI Suggest the Next Ideas For You",
  },
  {
    name: 'AI Apps',
    icon: Infinity,
    slug: 'enaiblr',
    description: 'Access Enaiblr Unlimited AI Platform',
  },
]
