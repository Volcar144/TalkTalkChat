"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createClient } from "@/lib/supabase/client"
import { Upload, Trash2 } from "lucide-react"
import { RoleManagement } from "./role-management"
import { ModerationPanel } from "./moderation-panel"
import { AuditLog } from "./audit-log"

interface ServerSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  server: any
  user: any
}

export function ServerSettingsDialog({ open, onOpenChange, server, user }: ServerSettingsDialogProps) {
  const [serverName, setServerName] = useState(server?.name || "")
  const [description, setDescription] = useState(server?.description || "")
  const [vanityUrl, setVanityUrl] = useState(server?.vanity_url || "")
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if (!server || !serverName.trim()) return

    setLoading(true)
    const supabase = createClient()

    try {
      // Set user context for RLS
      await supabase.rpc("set_config", {
        parameter: "app.current_user_stack_id",
        value: user.stackUser.id,
      })

      const { error } = await supabase
        .from("servers")
        .update({
          name: serverName.trim(),
          description: description.trim() || null,
          vanity_url: vanityUrl.trim() || null,
        })
        .eq("id", server.id)

      if (error) throw error

      onOpenChange(false)
    } catch (error) {
      console.error("Error updating server:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!server || !confirm("Are you sure you want to delete this server? This action cannot be undone.")) return

    setLoading(true)
    const supabase = createClient()

    try {
      // Set user context for RLS
      await supabase.rpc("set_config", {
        parameter: "app.current_user_stack_id",
        value: user.stackUser.id,
      })

      const { error } = await supabase.from("servers").delete().eq("id", server.id)

      if (error) throw error

      onOpenChange(false)
      window.location.reload() // Refresh to update server list
    } catch (error) {
      console.error("Error deleting server:", error)
    } finally {
      setLoading(false)
    }
  }

  if (!server) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Server Settings</DialogTitle>
          <DialogDescription>Manage your server settings and preferences.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="roles">Roles</TabsTrigger>
            <TabsTrigger value="moderation">Moderation</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="audit">Audit Log</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
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
                  value={serverName}
                  onChange={(e) => setServerName(e.target.value)}
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={500}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vanity-url">Vanity URL</Label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-slate-600 bg-slate-700 text-slate-400 text-sm">
                    {typeof window !== "undefined" ? window.location.origin : ""}/
                  </span>
                  <Input
                    id="vanity-url"
                    value={vanityUrl}
                    onChange={(e) => setVanityUrl(e.target.value)}
                    className="rounded-l-none"
                    placeholder="my-awesome-server"
                    maxLength={50}
                  />
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="destructive" onClick={handleDelete} disabled={loading}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Server
                </Button>
                <div className="space-x-2">
                  <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={loading}>
                    {loading ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="roles" className="space-y-4">
            <RoleManagement serverId={server.id} user={user} />
          </TabsContent>

          <TabsContent value="moderation" className="space-y-4">
            <ModerationPanel serverId={server.id} user={user} />
          </TabsContent>

          <TabsContent value="members" className="space-y-4">
            <div className="text-center py-8 text-slate-400">
              <p>Member management coming soon...</p>
            </div>
          </TabsContent>

          <TabsContent value="audit" className="space-y-4">
            <AuditLog serverId={server.id} user={user} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
