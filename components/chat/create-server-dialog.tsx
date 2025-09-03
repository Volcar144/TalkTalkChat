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
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import { Upload } from "lucide-react"

interface CreateServerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onServerCreated: () => void
  user: any
}

export function CreateServerDialog({ open, onOpenChange, onServerCreated, user }: CreateServerDialogProps) {
  const [serverName, setServerName] = useState("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    if (!serverName.trim()) return

    setLoading(true)
    const supabase = createClient()

    try {
      // Set user context for RLS
      await supabase.rpc("set_config", {
        parameter: "app.current_user_stack_id",
        value: user.stackUser.id,
      })

      // Create server
      const { data: server, error: serverError } = await supabase
        .from("servers")
        .insert({
          name: serverName.trim(),
          description: description.trim() || null,
          owner_id: user.id,
        })
        .select()
        .single()

      if (serverError) throw serverError

      // Add owner as member
      const { error: memberError } = await supabase.from("server_members").insert({
        server_id: server.id,
        user_id: user.id,
      })

      if (memberError) throw memberError

      // Create default channels
      const defaultChannels = [
        { name: "general", type: "text", position: 0 },
        { name: "General", type: "voice", position: 1 },
      ]

      const { error: channelError } = await supabase.from("channels").insert(
        defaultChannels.map((channel) => ({
          ...channel,
          server_id: server.id,
        })),
      )

      if (channelError) throw channelError

      // Create default role (@everyone)
      const { error: roleError } = await supabase.from("roles").insert({
        server_id: server.id,
        name: "@everyone",
        color: "#99aab5",
        position: 0,
        permissions: 0,
      })

      if (roleError) throw roleError

      // Reset form
      setServerName("")
      setDescription("")
      onServerCreated()
    } catch (error) {
      console.error("Error creating server:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Your Server</DialogTitle>
          <DialogDescription>
            Your server is where you and your friends hang out. Make yours and start talking.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-slate-700 rounded-full flex items-center justify-center border-2 border-dashed border-slate-500 cursor-pointer hover:border-slate-400 transition-colors">
              <Upload className="w-8 h-8 text-slate-400" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="server-name">Server Name</Label>
            <Input
              id="server-name"
              placeholder="Enter server name"
              value={serverName}
              onChange={(e) => setServerName(e.target.value)}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="What's your server about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!serverName.trim() || loading}>
            {loading ? "Creating..." : "Create Server"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
