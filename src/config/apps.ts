import { Sparkles, Languages, LucideIcon, Infinity } from 'lucide-react'

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
    name: 'Enaiblr AI',
    icon: Infinity,
    slug: 'enaiblr',
    description: 'Access Enaiblr Unlimited AI Platform',
  },
]
