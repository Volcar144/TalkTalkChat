import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TalkTalkLogo } from "@/components/ui/logo"
import Link from "next/link"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <TalkTalkLogo size={48} className="text-white" />
          </div>
          <p className="text-slate-300">Connect, communicate, collaborate</p>
        </div>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="text-center">
            <CardTitle className="text-white">Welcome to TalkTalk</CardTitle>
            <CardDescription className="text-slate-300">
              Join the next generation of secure, feature-rich communication
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild className="w-full bg-indigo-600 hover:bg-indigo-700">
              <Link href="/auth/signin">Sign In</Link>
            </Button>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-slate-400">
          <p>Features: E2E Encryption • Voice/Video Calls • Custom Bots • Advanced Themes</p>
        </div>
      </div>
    </div>
  )
}
