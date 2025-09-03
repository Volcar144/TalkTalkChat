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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { createClient } from "@/lib/supabase/client"
import { Hash, Volume2 } from "lucide-react"

interface CreateChannelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onChannelCreated: () => void
  serverId: string
  user: any
}

export function CreateChannelDialog({
  open,
  onOpenChange,
  onChannelCreated,
  serverId,
  user,
}: CreateChannelDialogProps) {
  const [channelName, setChannelName] = useState("")
  const [channelType, setChannelType] = useState("text")
  const [topic, setTopic] = useState("")
  const [nsfw, setNsfw] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    if (!channelName.trim()) return

    setLoading(true)
    const supabase = createClient()

    try {
      // Set user context for RLS
      await supabase.rpc("set_config", {
        parameter: "app.current_user_stack_id",
        value: user.stackUser.id,
      })

      // Get current channel count for position
      const { count } = await supabase
        .from("channels")
        .select("*", { count: "exact", head: true })
        .eq("server_id", serverId)

      const { error } = await supabase.from("channels").insert({
        server_id: serverId,
        name: channelName.trim().toLowerCase().replace(/\s+/g, "-"),
        type: channelType,
        topic: topic.trim() || null,
        nsfw,
        position: count || 0,
      })

      if (error) throw error

      // Reset form
      setChannelName("")
      setTopic("")
      setNsfw(false)
      onChannelCreated()
    } catch (error) {
      console.error("Error creating channel:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Channel</DialogTitle>
          <DialogDescription>Create a new channel for your server.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-3">
            <Label>Channel Type</Label>
            <RadioGroup value={channelType} onValueChange={setChannelType}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="text" id="text" />
                <Label htmlFor="text" className="flex items-center space-x-2 cursor-pointer">
                  <Hash className="w-4 h-4" />
                  <span>Text Channel</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="voice" id="voice" />
                <Label htmlFor="voice" className="flex items-center space-x-2 cursor-pointer">
                  <Volume2 className="w-4 h-4" />
                  <span>Voice Channel</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="channel-name">Channel Name</Label>
            <Input
              id="channel-name"
              placeholder="new-channel"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              maxLength={100}
            />
          </div>

          {channelType === "text" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="topic">Topic (Optional)</Label>
                <Textarea
                  id="topic"
                  placeholder="What's this channel about?"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  maxLength={1024}
                  rows={2}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>NSFW Channel</Label>
                  <p className="text-sm text-slate-400">Restrict this channel to members 18+</p>
                </div>
                <Switch checked={nsfw} onCheckedChange={setNsfw} />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!channelName.trim() || loading}>
            {loading ? "Creating..." : "Create Channel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
