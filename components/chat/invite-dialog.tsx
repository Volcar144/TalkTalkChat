"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { createClient } from "@/lib/supabase/client"
import { Copy, Trash2 } from "lucide-react"

interface InviteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  serverId: string
  user: any
}

export function InviteDialog({ open, onOpenChange, serverId, user }: InviteDialogProps) {
  const [invites, setInvites] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [maxAge, setMaxAge] = useState("86400") // 1 day
  const [maxUses, setMaxUses] = useState("0") // unlimited
  const [temporary, setTemporary] = useState(false)

  useEffect(() => {
    if (open && serverId) {
      loadInvites()
    }
  }, [open, serverId])

  const loadInvites = async () => {
    const supabase = createClient()

    // Set user context for RLS
    await supabase.rpc("set_config", {
      parameter: "app.current_user_stack_id",
      value: user.stackUser.id,
    })

    const { data } = await supabase
      .from("invites")
      .select(`
        *,
        users!invites_inviter_id_fkey(username, display_name),
        channels(name)
      `)
      .eq("server_id", serverId)
      .order("created_at", { ascending: false })

    setInvites(data || [])
  }

  const createInvite = async () => {
    setLoading(true)
    const supabase = createClient()

    try {
      // Set user context for RLS
      await supabase.rpc("set_config", {
        parameter: "app.current_user_stack_id",
        value: user.stackUser.id,
      })

      const expiresAt = maxAge === "0" ? null : new Date(Date.now() + Number.parseInt(maxAge) * 1000).toISOString()

      const { error } = await supabase.from("invites").insert({
        server_id: serverId,
        inviter_id: user.id,
        max_uses: Number.parseInt(maxUses),
        max_age: Number.parseInt(maxAge),
        temporary,
        expires_at: expiresAt,
      })

      if (error) throw error

      loadInvites()
    } catch (error) {
      console.error("Error creating invite:", error)
    } finally {
      setLoading(false)
    }
  }

  const copyInvite = (code: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/invite/${code}`)
  }

  const deleteInvite = async (inviteId: string) => {
    const supabase = createClient()

    // Set user context for RLS
    await supabase.rpc("set_config", {
      parameter: "app.current_user_stack_id",
      value: user.stackUser.id,
    })

    const { error } = await supabase.from("invites").delete().eq("id", inviteId)

    if (!error) {
      loadInvites()
    }
  }

  const formatExpiry = (expiresAt: string | null, maxAge: number) => {
    if (!expiresAt || maxAge === 0) return "Never"
    const now = new Date()
    const expiry = new Date(expiresAt)
    const diff = expiry.getTime() - now.getTime()

    if (diff <= 0) return "Expired"

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Invite Friends</DialogTitle>
          <DialogDescription>Send a server invite link to a friend</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Create New Invite */}
          <div className="space-y-4 p-4 bg-slate-800 rounded-lg">
            <h4 className="font-semibold">Create Invite Link</h4>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Expire after</Label>
                <Select value={maxAge} onValueChange={setMaxAge}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1800">30 minutes</SelectItem>
                    <SelectItem value="3600">1 hour</SelectItem>
                    <SelectItem value="21600">6 hours</SelectItem>
                    <SelectItem value="43200">12 hours</SelectItem>
                    <SelectItem value="86400">1 day</SelectItem>
                    <SelectItem value="604800">7 days</SelectItem>
                    <SelectItem value="0">Never</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Max uses</Label>
                <Select value={maxUses} onValueChange={setMaxUses}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 use</SelectItem>
                    <SelectItem value="5">5 uses</SelectItem>
                    <SelectItem value="10">10 uses</SelectItem>
                    <SelectItem value="25">25 uses</SelectItem>
                    <SelectItem value="50">50 uses</SelectItem>
                    <SelectItem value="100">100 uses</SelectItem>
                    <SelectItem value="0">No limit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Temporary membership</Label>
                <p className="text-sm text-slate-400">Members are removed when they go offline</p>
              </div>
              <Switch checked={temporary} onCheckedChange={setTemporary} />
            </div>

            <Button onClick={createInvite} disabled={loading} className="w-full">
              {loading ? "Creating..." : "Generate a New Link"}
            </Button>
          </div>

          {/* Existing Invites */}
          {invites.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold">Active Invites</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {invites.map((invite) => (
                  <div key={invite.id} className="flex items-center justify-between p-3 bg-slate-800 rounded">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <code className="text-sm bg-slate-700 px-2 py-1 rounded">{invite.code}</code>
                        <span className="text-sm text-slate-400">
                          {invite.uses}/{invite.max_uses === 0 ? "∞" : invite.max_uses} uses
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Expires: {formatExpiry(invite.expires_at, invite.max_age)} • Created by{" "}
                        {invite.users?.display_name || invite.users?.username}
                      </p>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => copyInvite(invite.code)}>
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteInvite(invite.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
