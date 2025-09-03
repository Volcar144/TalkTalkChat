"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Users, Hash } from "lucide-react"

interface InviteAcceptPageProps {
  invite: any
  user: any
}

export function InviteAcceptPage({ invite, user }: InviteAcceptPageProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleAccept = async () => {
    setLoading(true)
    const supabase = createClient()

    try {
      // Set user context for RLS
      await supabase.rpc("set_config", {
        parameter: "app.current_user_stack_id",
        value: user.stackUserId,
      })

      // Use the join_server_via_invite function
      const { data, error } = await supabase.rpc("join_server_via_invite", {
        invite_code: invite.code,
        joining_user_id: user.id,
      })

      if (error) throw error

      if (data) {
        router.push("/chat")
      }
    } catch (error) {
      console.error("Error joining server:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-800/50 border-slate-700">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={invite.servers?.icon_url || "/placeholder.svg"} />
              <AvatarFallback className="bg-indigo-600 text-white text-xl">
                <Hash className="w-8 h-8" />
              </AvatarFallback>
            </Avatar>
          </div>
          <CardTitle className="text-white">{invite.servers?.name}</CardTitle>
          <CardDescription className="text-slate-300">
            {invite.servers?.description || "Join this server to start chatting!"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex items-center justify-center space-x-4 text-sm text-slate-400">
            <div className="flex items-center space-x-1">
              <Users className="w-4 h-4" />
              <span>{invite.servers?.member_count || 0} members</span>
            </div>
          </div>

          <div className="text-center text-sm text-slate-400">
            <p>
              Invited by{" "}
              <span className="text-white font-medium">{invite.users?.display_name || invite.users?.username}</span>
            </p>
          </div>

          <div className="space-y-2">
            <Button onClick={handleAccept} disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700">
              {loading ? "Joining..." : "Accept Invite"}
            </Button>
            <Button variant="outline" onClick={() => router.push("/chat")} className="w-full">
              No, thanks
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
