import { AppsHeader } from '@/components/apps-header'
import AppsFooter from '@/components/apps-footer'

export default function LoadingSkeleton() {
    return (
        <div className="flex flex-col min-h-screen bg-background">
            <div className="z-50">
                <AppsHeader />
            </div>
            <div className="flex-1 flex flex-col justify-center items-center max-w-6xl mx-auto w-full">
                <div className="animate-pulse space-y-4 w-full max-w-md">
                    <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
                    <div className="h-32 bg-gray-200 rounded"></div>
                </div>
            </div>
            <div className="flex-none mb-1">
                <AppsFooter />
            </div>
        </div>
    )
}
