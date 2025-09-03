import { SignIn } from "@stackframe/stack"

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-slate-300">Sign in to continue to ChatApp</p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
          <SignIn />
        </div>
      </div>
    </div>
  )
}
