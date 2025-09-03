"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"

interface JoinServerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onServerJoined: () => void
  user: any
}

export function JoinServerDialog({ open, onOpenChange, onServerJoined, user }: JoinServerDialogProps) {
  const [inviteCode, setInviteCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleJoin = async () => {
    if (!inviteCode.trim()) return

    setLoading(true)
    setError("")
    const supabase = createClient()

    try {
      // Set user context for RLS
      await supabase.rpc("set_config", {
        parameter: "app.current_user_stack_id",
        value: user.stackUser.id,
      })

      // Use the join_server_via_invite function
      const { data, error } = await supabase.rpc("join_server_via_invite", {
        invite_code: inviteCode.trim(),
        joining_user_id: user.id,
      })

      if (error) throw error

      if (data) {
        setInviteCode("")
        onServerJoined()
      } else {
        setError("Invalid or expired invite code")
      }
    } catch (error: any) {
      setError(error.message || "Failed to join server")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Join a Server</DialogTitle>
          <DialogDescription>Enter an invite below to join an existing server.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-code">Invite Link</Label>
            <Input
              id="invite-code"
              placeholder="Enter invite code or link"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>

          <div className="text-sm text-slate-400">
            <p className="font-semibold mb-1">Example invite:</p>
            <p className="font-mono bg-slate-800 px-2 py-1 rounded">hTKzmak</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleJoin} disabled={!inviteCode.trim() || loading}>
            {loading ? "Joining..." : "Join Server"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
