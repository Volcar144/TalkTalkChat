"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Plus, Save, Trash2, Play, Settings, Code2, MessageSquare, FileText, Smile } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"

interface BotBuilderProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bot: any
  onBotUpdate: (bot: any) => void
}

interface BotCommand {
  id?: string
  name: string
  description: string
  usage: string
  category: string
  enabled: boolean
  cooldown: number
  permissions_required: number
  response_type: "text" | "embed" | "file" | "reaction"
  response_content: any
  trigger_conditions: any
}

const commandCategories = ["general", "moderation", "fun", "utility", "music", "games", "custom"]

const responseTypes = [
  { value: "text", label: "Text Message", icon: MessageSquare },
  { value: "embed", label: "Rich Embed", icon: FileText },
  { value: "reaction", label: "Reaction", icon: Smile },
]

export function BotBuilder({ open, onOpenChange, bot, onBotUpdate }: BotBuilderProps) {
  const supabase = createBrowserClient()
  const [commands, setCommands] = useState<BotCommand[]>([])
  const [selectedCommand, setSelectedCommand] = useState<BotCommand | null>(null)
  const [showCommandEditor, setShowCommandEditor] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("commands")

  // New command template
  const newCommandTemplate: BotCommand = {
    name: "",
    description: "",
    usage: "",
    category: "general",
    enabled: true,
    cooldown: 0,
    permissions_required: 0,
    response_type: "text",
    response_content: { message: "" },
    trigger_conditions: {},
  }

  useEffect(() => {
    if (open && bot) {
      fetchCommands()
    }
  }, [open, bot])

  const fetchCommands = async () => {
    if (!bot) return

    setLoading(true)
    try {
      const { data, error } = await supabase.from("bot_commands").select("*").eq("bot_id", bot.id).order("name")

      if (error) {
        console.error("Error fetching commands:", error)
        return
      }

      setCommands(data || [])
    } catch (error) {
      console.error("Error fetching commands:", error)
    } finally {
      setLoading(false)
    }
  }

  const saveCommand = async (command: BotCommand) => {
    if (!bot || !command.name.trim()) return

    setLoading(true)
    try {
      const commandData = {
        ...command,
        bot_id: bot.id,
        name: command.name.toLowerCase().replace(/\s+/g, ""),
      }

      if (command.id) {
        // Update existing command
        const { data, error } = await supabase
          .from("bot_commands")
          .update(commandData)
          .eq("id", command.id)
          .select()
          .single()

        if (error) {
          console.error("Error updating command:", error)
          return
        }

        setCommands(commands.map((cmd) => (cmd.id === command.id ? data : cmd)))
      } else {
        // Create new command
        const { data, error } = await supabase.from("bot_commands").insert(commandData).select().single()

        if (error) {
          console.error("Error creating command:", error)
          return
        }

        setCommands([...commands, data])
      }

      setShowCommandEditor(false)
      setSelectedCommand(null)
    } catch (error) {
      console.error("Error saving command:", error)
    } finally {
      setLoading(false)
    }
  }

  const deleteCommand = async (commandId: string) => {
    if (!confirm("Are you sure you want to delete this command?")) return

    try {
      const { error } = await supabase.from("bot_commands").delete().eq("id", commandId)

      if (error) {
        console.error("Error deleting command:", error)
        return
      }

      setCommands(commands.filter((cmd) => cmd.id !== commandId))
      setSelectedCommand(null)
      setShowCommandEditor(false)
    } catch (error) {
      console.error("Error deleting command:", error)
    }
  }

  const testCommand = async (command: BotCommand) => {
    // Simulate command execution
    console.log("Testing command:", command)
    // You could implement actual command testing here
  }

  const CommandEditor = ({
    command,
    onSave,
    onCancel,
  }: {
    command: BotCommand
    onSave: (command: BotCommand) => void
    onCancel: () => void
  }) => {
    const [editingCommand, setEditingCommand] = useState<BotCommand>(command)

    const updateCommand = (updates: Partial<BotCommand>) => {
      setEditingCommand({ ...editingCommand, ...updates })
    }

    const updateResponseContent = (updates: any) => {
      setEditingCommand({
        ...editingCommand,
        response_content: { ...editingCommand.response_content, ...updates },
      })
    }

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="cmd-name">Command Name</Label>
            <Input
              id="cmd-name"
              value={editingCommand.name}
              onChange={(e) => updateCommand({ name: e.target.value })}
              placeholder="ping"
            />
          </div>
          <div>
            <Label htmlFor="cmd-category">Category</Label>
            <Select value={editingCommand.category} onValueChange={(value) => updateCommand({ category: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {commandCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="cmd-description">Description</Label>
          <Input
            id="cmd-description"
            value={editingCommand.description}
            onChange={(e) => updateCommand({ description: e.target.value })}
            placeholder="Check bot latency"
          />
        </div>

        <div>
          <Label htmlFor="cmd-usage">Usage</Label>
          <Input
            id="cmd-usage"
            value={editingCommand.usage}
            onChange={(e) => updateCommand({ usage: e.target.value })}
            placeholder="!ping"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="cmd-cooldown">Cooldown (seconds)</Label>
            <Input
              id="cmd-cooldown"
              type="number"
              value={editingCommand.cooldown}
              onChange={(e) => updateCommand({ cooldown: Number.parseInt(e.target.value) || 0 })}
              min="0"
            />
          </div>
          <div className="flex items-center space-x-2 pt-6">
            <Switch
              id="cmd-enabled"
              checked={editingCommand.enabled}
              onCheckedChange={(checked) => updateCommand({ enabled: checked })}
            />
            <Label htmlFor="cmd-enabled">Enabled</Label>
          </div>
        </div>

        <div>
          <Label>Response Type</Label>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {responseTypes.map((type) => {
              const Icon = type.icon
              return (
                <button
                  key={type.value}
                  onClick={() => updateCommand({ response_type: type.value as any })}
                  className={`p-3 rounded-lg border-2 transition-colors ${
                    editingCommand.response_type === type.value ? "border-primary" : "border-border"
                  }`}
                >
                  <Icon className="h-5 w-5 mx-auto mb-1" />
                  <p className="text-xs font-medium">{type.label}</p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Response Content Editor */}
        <div>
          <Label>Response Content</Label>
          {editingCommand.response_type === "text" && (
            <Textarea
              value={editingCommand.response_content.message || ""}
              onChange={(e) => updateResponseContent({ message: e.target.value })}
              placeholder="Pong! 🏓"
              rows={4}
            />
          )}

          {editingCommand.response_type === "embed" && (
            <div className="space-y-3">
              <Input
                value={editingCommand.response_content.title || ""}
                onChange={(e) => updateResponseContent({ title: e.target.value })}
                placeholder="Embed Title"
              />
              <Textarea
                value={editingCommand.response_content.description || ""}
                onChange={(e) => updateResponseContent({ description: e.target.value })}
                placeholder="Embed Description"
                rows={3}
              />
              <Input
                value={editingCommand.response_content.color || ""}
                onChange={(e) => updateResponseContent({ color: e.target.value })}
                placeholder="Embed Color (hex)"
              />
            </div>
          )}

          {editingCommand.response_type === "reaction" && (
            <Input
              value={editingCommand.response_content.emoji || ""}
              onChange={(e) => updateResponseContent({ emoji: e.target.value })}
              placeholder="👍"
            />
          )}
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={() => testCommand(editingCommand)} variant="secondary">
            <Play className="h-4 w-4 mr-2" />
            Test
          </Button>
          <Button onClick={() => onSave(editingCommand)} disabled={!editingCommand.name.trim()}>
            <Save className="h-4 w-4 mr-2" />
            Save Command
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code2 className="h-5 w-5" />
            Bot Builder - {bot?.name}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="commands">Commands</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          </TabsList>

          <TabsContent value="commands" className="space-y-4">
            {!showCommandEditor ? (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Commands ({commands.length})</h3>
                  <Button
                    onClick={() => {
                      setSelectedCommand(newCommandTemplate)
                      setShowCommandEditor(true)
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Command
                  </Button>
                </div>

                <ScrollArea className="h-96">
                  <div className="space-y-2">
                    {commands.map((command) => (
                      <Card key={command.id} className="cursor-pointer hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <h4 className="font-medium">
                                  {bot.command_prefix}
                                  {command.name}
                                </h4>
                                <Badge variant={command.enabled ? "default" : "secondary"}>
                                  {command.enabled ? "Enabled" : "Disabled"}
                                </Badge>
                                <Badge variant="outline">{command.category}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{command.description}</p>
                              {command.usage && (
                                <p className="text-xs text-muted-foreground mt-1">Usage: {command.usage}</p>
                              )}
                            </div>
                            <div className="flex space-x-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedCommand(command)
                                  setShowCommandEditor(true)
                                }}
                              >
                                <Settings className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => testCommand(command)}>
                                <Play className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => command.id && deleteCommand(command.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>

                {commands.length === 0 && (
                  <Card className="text-center py-8">
                    <CardContent>
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold mb-2">No commands yet</h3>
                      <p className="text-muted-foreground mb-4">Create your first command to get started.</p>
                      <Button
                        onClick={() => {
                          setSelectedCommand(newCommandTemplate)
                          setShowCommandEditor(true)
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create First Command
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <CommandEditor
                command={selectedCommand || newCommandTemplate}
                onSave={saveCommand}
                onCancel={() => {
                  setShowCommandEditor(false)
                  setSelectedCommand(null)
                }}
              />
            )}
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Bot Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="bot-prefix">Command Prefix</Label>
                  <Input id="bot-prefix" value={bot?.command_prefix || "!"} placeholder="!" maxLength={3} />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch id="bot-public" checked={bot?.is_public || false} />
                  <Label htmlFor="bot-public">Public Bot</Label>
                </div>

                <Separator />

                <div>
                  <Label>Bot Token</Label>
                  <div className="flex space-x-2">
                    <Input value={bot?.token || ""} readOnly type="password" />
                    <Button variant="outline" onClick={() => navigator.clipboard.writeText(bot?.token || "")}>
                      Copy
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Keep this token secure. It's used to authenticate your bot.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="webhooks" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Webhooks</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Webhook functionality coming soon. This will allow your bot to receive events from external services.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
