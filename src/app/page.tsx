'use client'

import { apps } from '@/config/apps'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import AppsFooter from '@/components/apps-footer'

export default function HomePage() {
  return (
    <div className="min-h-[100vh] flex flex-col items-center">
      <div className="w-full max-w-7xl px-8 py-8">
        {/* Title Section */}
        <div className="text-center mb-10 pt-16">
          <h1 className="text-4xl font-heading text-text mb-4">
            Al's Apps
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto font-base">
            Collection of Experimental (AI) Apps by{' '}
            <a 
              href="https://x.com/alhrkn" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-main duration-200 underline"
            >
              @alhrkn
            </a>
          </p>
        </div>

        {/* Apps Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 justify-items-center justify-center">
          {apps.map((app) => {
            const IconComponent = app.icon
            return (
              <Link
                key={app.slug}
                href={app.slug === 'enaiblr' ? 'https://enaiblr.org/apps' : app.slug ? `/${app.slug}` : '/'}
                className="group"
                {...(app.slug === 'enaiblr' && { target: '_blank', rel: 'noopener noreferrer' })}
              >
                <div className="text-center p-6 hover:translate-x-boxShadowX hover:translate-y-boxShadowY transition-all duration-200 group-hover:scale-[1.02]">
                  <div className="flex justify-center mb-4">
                    <div className="w-20 h-20 bg-main border-2 border-border shadow-shadow rounded-xl flex items-center justify-center hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all duration-200 cursor-pointer">
                      <IconComponent className="w-8 h-8 text-mtext" />
                    </div>
                  </div>
                  <h3 className="text-xl font-heading text-text mb-2">
                    {app.name}
                  </h3>
                  <p className="text-sm text-text leading-relaxed hidden lg:block max-w-[200px] mx-auto">
                    {app.description}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
      
      {/* Fixed Footer */}
      <div className="fixed bottom-0 left-0 right-0 py-1 px-0 text-center bg-background">
        <div className="flex-none">
          <AppsFooter />
        </div>
      </div>
    </div>
  )
}
