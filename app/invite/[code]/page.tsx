import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"
import { InviteAcceptPage } from "@/components/invite/invite-accept-page"

interface InvitePageProps {
  params: Promise<{ code: string }>
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { code } = await params
  const user = await getCurrentUser()

  if (!user) {
    redirect(`/auth/signin?redirect=/invite/${code}`)
  }

  const supabase = await createClient()

  // Set user context for RLS
  await supabase.rpc("set_config", {
    parameter: "app.current_user_stack_id",
    value: user.stackUserId,
  })

  // Get invite details
  const { data: invite } = await supabase
    .from("invites")
    .select(`
      *,
      servers(name, description, icon_url, member_count),
      users!invites_inviter_id_fkey(username, display_name, avatar_url)
    `)
    .eq("code", code)
    .single()

  if (!invite || (invite.expires_at && new Date(invite.expires_at) < new Date())) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Invalid Invite</h1>
          <p className="text-slate-400">This invite link is invalid or has expired.</p>
        </div>
      </div>
    )
  }

  return <InviteAcceptPage invite={invite} user={user} />
}
