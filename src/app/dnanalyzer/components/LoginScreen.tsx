import { AppsHeader } from '@/components/apps-header'
import AppsFooter from '@/components/apps-footer'
import { Button } from '@/components/ui/button'
import { FileText, LogIn } from 'lucide-react'
import { signIn } from 'next-auth/react'

export default function LoginScreen() {
    return (
        <div className="flex flex-col min-h-screen bg-background">
            <div className="z-50">
                <AppsHeader />
            </div>
            <div className="flex-1 flex flex-col justify-center items-center max-w-6xl mx-auto w-full">
                <div className="w-full relative overflow-hidden min-h-full">
                    {/* Full-width background */}
                    <div className="absolute inset-0"></div>

                    {/* Centered content */}
                    <div className="relative z-10 flex-1 w-full max-w-sm mx-auto flex flex-col">
                        {/* Header Space */}
                        <div className="p-3 w-full flex-shrink-0"></div>

                        {/* Login Content */}
                        <div className="flex-1 bg-white rounded-3xl p-4 flex flex-col items-center justify-center space-y-4 overflow-y-auto">
                            <div className="text-center space-y-3 max-w-md">
                                <FileText className="w-12 h-12 text-blue-500 mx-auto" />
                                <h1 className="text-xl font-bold text-gray-900">
                                    Automatic Discourse Identifier
                                </h1>
                            </div>

                            <div className="w-full max-w-sm flex flex-col items-center space-y-2">
                                <Button
                                    onClick={() => signIn('google')}
                                    className="w-80 h-10 text-base font-medium"
                                >
                                    <LogIn className="w-4 h-4 mr-2" />
                                    Sign in with Google
                                </Button>
                            </div>

                            <p className="text-gray-600 text-sm text-center">
                                Sign in to access the tools and manage your DNA (Discourse Network Analyzer) database.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex-none mb-1">
                <AppsFooter />
            </div>
        </div>
    )
}
