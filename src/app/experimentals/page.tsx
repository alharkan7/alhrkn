'use client'

import { apps } from '@/config/apps-exp'
import { AppsGallery } from '@/components/apps-gallery'

export default function ExperimentalsPage() {
  return <AppsGallery apps={apps} />
}
