"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Camera, Palette, User, Shield } from "lucide-react"
import { createClient as createBrowserClient } from "@/lib/supabase/client"
import { useUser } from "@stackframe/stack"

interface UserProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId?: string
}

interface UserProfile {
  id: string
  username: string
  display_name: string
  bio: string
  avatar_url: string
  status: string
  custom_status: string
  theme: string
  accent_color: string
  banner_url: string
  badges: string[]
  privacy_settings: {
    show_activity: boolean
    show_status: boolean
    allow_dms: boolean
    show_servers: boolean
  }
}

const statusOptions = [
  { value: "online", label: "Online", color: "bg-green-500" },
  { value: "idle", label: "Idle", color: "bg-yellow-500" },
  { value: "dnd", label: "Do Not Disturb", color: "bg-red-500" },
  { value: "invisible", label: "Invisible", color: "bg-gray-500" },
]

const themeOptions = [
  { value: "dark", label: "Dark", preview: "bg-gray-900" },
  { value: "light", label: "Light", preview: "bg-white" },
  { value: "midnight", label: "Midnight", preview: "bg-slate-950" },
  { value: "ocean", label: "Ocean", preview: "bg-blue-900" },
  { value: "forest", label: "Forest", preview: "bg-green-900" },
  { value: "sunset", label: "Sunset", preview: "bg-orange-900" },
  { value: "lavender", label: "Lavender", preview: "bg-purple-900" },
  { value: "rose", label: "Rose", preview: "bg-pink-900" },
]

const accentColors = [
  "#5865F2",
  "#57F287",
  "#FEE75C",
  "#EB459E",
  "#ED4245",
  "#FF7A00",
  "#00D9FF",
  "#9C59B6",
  "#E67E22",
  "#2ECC71",
]

export function UserProfileDialog({ open, onOpenChange, userId }: UserProfileDialogProps) {
  const user = useUser()
  const supabase = createBrowserClient()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("profile")

  const isOwnProfile = !userId || userId === user?.id

  useEffect(() => {
    if (open) {
      fetchProfile()
    }
  }, [open, userId])

  const fetchProfile = async () => {
    if (!user) return

    setLoading(true)
    try {
      const targetUserId = userId || user.id
      const { data, error } = await supabase.from("profiles").select("*").eq("id", targetUserId).single()

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching profile:", error)
        return
      }

      if (data) {
        setProfile(data)
      } else {
        // Create default profile
        const defaultProfile: Partial<UserProfile> = {
          id: targetUserId,
          username: user.primaryEmail?.split("@")[0] || "user",
          display_name: user.displayName || "User",
          bio: "",
          avatar_url: user.profileImageUrl || "",
          status: "online",
          custom_status: "",
          theme: "dark",
          accent_color: "#5865F2",
          banner_url: "",
          badges: [],
          privacy_settings: {
            show_activity: true,
            show_status: true,
            allow_dms: true,
            show_servers: true,
          },
        }
        setProfile(defaultProfile as UserProfile)
      }
    } catch (error) {
      console.error("Error fetching profile:", error)
    } finally {
      setLoading(false)
    }
  }

  const saveProfile = async () => {
    if (!profile || !user) return

    setSaving(true)
    try {
      const { error } = await supabase.from("user_profiles").upsert(profile)

      if (error) {
        console.error("Error saving profile:", error)
        return
      }

      // Apply theme immediately
      applyTheme(profile.theme, profile.accent_color)

      onOpenChange(false)
    } catch (error) {
      console.error("Error saving profile:", error)
    } finally {
      setSaving(false)
    }
  }

  const applyTheme = (theme: string, accentColor: string) => {
    document.documentElement.className = theme
    document.documentElement.style.setProperty("--accent-color", accentColor)
    localStorage.setItem("theme", theme)
    localStorage.setItem("accent-color", accentColor)
  }

  const updateProfile = (updates: Partial<UserProfile>) => {
    if (!profile) return
    setProfile({ ...profile, ...updates })
  }

  if (!profile) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {isOwnProfile ? "My Profile" : `${profile.display_name}'s Profile`}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="privacy">Privacy</TabsTrigger>
            <TabsTrigger value="badges">Badges</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            {/* Profile Header */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-6">
                  <div className="relative">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src={profile.avatar_url || "/placeholder.svg"} />
                      <AvatarFallback className="text-2xl">
                        {profile.display_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {isOwnProfile && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                      >
                        <Camera className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="display_name">Display Name</Label>
                        <Input
                          id="display_name"
                          value={profile.display_name}
                          onChange={(e) => updateProfile({ display_name: e.target.value })}
                          disabled={!isOwnProfile}
                        />
                      </div>
                      <div>
                        <Label htmlFor="username">Username</Label>
                        <Input
                          id="username"
                          value={profile.username}
                          onChange={(e) => updateProfile({ username: e.target.value })}
                          disabled={!isOwnProfile}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        value={profile.bio}
                        onChange={(e) => updateProfile({ bio: e.target.value })}
                        placeholder="Tell us about yourself..."
                        disabled={!isOwnProfile}
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Status Settings */}
            {isOwnProfile && (
              <Card>
                <CardHeader>
                  <CardTitle>Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Online Status</Label>
                    <Select value={profile.status} onValueChange={(value) => updateProfile({ status: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            <div className="flex items-center gap-2">
                              <div className={`h-3 w-3 rounded-full ${status.color}`} />
                              {status.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="custom_status">Custom Status</Label>
                    <Input
                      id="custom_status"
                      value={profile.custom_status}
                      onChange={(e) => updateProfile({ custom_status: e.target.value })}
                      placeholder="What's on your mind?"
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="appearance" className="space-y-6">
            {/* Theme Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Theme
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-3">
                  {themeOptions.map((theme) => (
                    <button
                      key={theme.value}
                      onClick={() => updateProfile({ theme: theme.value })}
                      className={`p-3 rounded-lg border-2 transition-colors ${
                        profile.theme === theme.value ? "border-primary" : "border-border"
                      }`}
                      disabled={!isOwnProfile}
                    >
                      <div className={`h-12 w-full rounded ${theme.preview} mb-2`} />
                      <p className="text-sm font-medium">{theme.label}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Accent Color */}
            <Card>
              <CardHeader>
                <CardTitle>Accent Color</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {accentColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => updateProfile({ accent_color: color })}
                      className={`h-12 w-12 rounded-full border-4 transition-transform hover:scale-110 ${
                        profile.accent_color === color ? "border-white shadow-lg" : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                      disabled={!isOwnProfile}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="privacy" className="space-y-6">
            {isOwnProfile && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Privacy Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Show Activity Status</Label>
                      <p className="text-sm text-muted-foreground">Let others see when you're online</p>
                    </div>
                    <Switch
                      checked={profile.privacy_settings.show_activity}
                      onCheckedChange={(checked) =>
                        updateProfile({
                          privacy_settings: { ...profile.privacy_settings, show_activity: checked },
                        })
                      }
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Show Custom Status</Label>
                      <p className="text-sm text-muted-foreground">Display your custom status to others</p>
                    </div>
                    <Switch
                      checked={profile.privacy_settings.show_status}
                      onCheckedChange={(checked) =>
                        updateProfile({
                          privacy_settings: { ...profile.privacy_settings, show_status: checked },
                        })
                      }
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Allow Direct Messages</Label>
                      <p className="text-sm text-muted-foreground">Let others send you direct messages</p>
                    </div>
                    <Switch
                      checked={profile.privacy_settings.allow_dms}
                      onCheckedChange={(checked) =>
                        updateProfile({
                          privacy_settings: { ...profile.privacy_settings, allow_dms: checked },
                        })
                      }
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Show Server List</Label>
                      <p className="text-sm text-muted-foreground">Display which servers you're in</p>
                    </div>
                    <Switch
                      checked={profile.privacy_settings.show_servers}
                      onCheckedChange={(checked) =>
                        updateProfile({
                          privacy_settings: { ...profile.privacy_settings, show_servers: checked },
                        })
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="badges" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Badges & Achievements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {profile.badges.length > 0 ? (
                    profile.badges.map((badge, index) => (
                      <Badge key={index} variant="secondary" className="px-3 py-1">
                        {badge}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-muted-foreground">No badges earned yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {isOwnProfile && (
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={saveProfile} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
