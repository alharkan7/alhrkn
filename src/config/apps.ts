import { Sparkles, Languages, LucideIcon, Infinity, Wallet, Network, Feather } from 'lucide-react'

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
    name: 'Papermap',
    icon: Network,
    slug: 'papermap',
    description: 'Turn any PDF into Interactive Mindmap with AI',
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
