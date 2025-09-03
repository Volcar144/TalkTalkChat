"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { PERMISSIONS, DEFAULT_PERMISSIONS, hasPermission, getPermissionName } from "@/lib/permissions"
import { Plus, Trash2, Crown, Shield } from "lucide-react"

interface RoleManagementProps {
  serverId: string
  user: any
}

export function RoleManagement({ serverId, user }: RoleManagementProps) {
  const [roles, setRoles] = useState<any[]>([])
  const [selectedRole, setSelectedRole] = useState<any>(null)
  const [newRoleName, setNewRoleName] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadRoles()
  }, [serverId])

  const loadRoles = async () => {
    const supabase = createClient()

    // Set user context for RLS
    await supabase.rpc("set_config", {
      parameter: "app.current_user_stack_id",
      value: user.stackUser.id,
    })

    const { data } = await supabase
      .from("roles")
      .select("*")
      .eq("server_id", serverId)
      .order("position", { ascending: false })

    setRoles(data || [])
    if (data && data.length > 0 && !selectedRole) {
      setSelectedRole(data[0])
    }
  }

  const createRole = async () => {
    if (!newRoleName.trim()) return

    setLoading(true)
    const supabase = createClient()

    try {
      // Set user context for RLS
      await supabase.rpc("set_config", {
        parameter: "app.current_user_stack_id",
        value: user.stackUser.id,
      })

      const { data, error } = await supabase
        .from("roles")
        .insert({
          server_id: serverId,
          name: newRoleName.trim(),
          color: "#99aab5",
          position: roles.length,
          permissions: DEFAULT_PERMISSIONS.toString(),
        })
        .select()
        .single()

      if (error) throw error

      setNewRoleName("")
      loadRoles()
      setSelectedRole(data)
    } catch (error) {
      console.error("Error creating role:", error)
    } finally {
      setLoading(false)
    }
  }

  const updateRole = async (updates: any) => {
    if (!selectedRole) return

    const supabase = createClient()

    // Set user context for RLS
    await supabase.rpc("set_config", {
      parameter: "app.current_user_stack_id",
      value: user.stackUser.id,
    })

    const { error } = await supabase.from("roles").update(updates).eq("id", selectedRole.id)

    if (!error) {
      setSelectedRole({ ...selectedRole, ...updates })
      loadRoles()
    }
  }

  const deleteRole = async (roleId: string) => {
    if (!confirm("Are you sure you want to delete this role?")) return

    const supabase = createClient()

    // Set user context for RLS
    await supabase.rpc("set_config", {
      parameter: "app.current_user_stack_id",
      value: user.stackUser.id,
    })

    const { error } = await supabase.from("roles").delete().eq("id", roleId)

    if (!error) {
      loadRoles()
      setSelectedRole(null)
    }
  }

  const togglePermission = (permission: bigint) => {
    if (!selectedRole) return

    const currentPermissions = BigInt(selectedRole.permissions || 0)
    const newPermissions = currentPermissions ^ permission

    updateRole({ permissions: newPermissions.toString() })
  }

  const permissionGroups = [
    {
      name: "General Server Permissions",
      permissions: [
        PERMISSIONS.VIEW_CHANNELS,
        PERMISSIONS.MANAGE_CHANNELS,
        PERMISSIONS.MANAGE_ROLES,
        PERMISSIONS.MANAGE_SERVER,
        PERMISSIONS.CREATE_INSTANT_INVITE,
        PERMISSIONS.ADMINISTRATOR,
      ],
    },
    {
      name: "Membership Permissions",
      permissions: [PERMISSIONS.KICK_MEMBERS, PERMISSIONS.BAN_MEMBERS, PERMISSIONS.MANAGE_NICKNAMES],
    },
    {
      name: "Text Channel Permissions",
      permissions: [
        PERMISSIONS.SEND_MESSAGES,
        PERMISSIONS.EMBED_LINKS,
        PERMISSIONS.ATTACH_FILES,
        PERMISSIONS.READ_MESSAGE_HISTORY,
        PERMISSIONS.MENTION_EVERYONE,
        PERMISSIONS.MANAGE_MESSAGES,
        PERMISSIONS.ADD_REACTIONS,
      ],
    },
    {
      name: "Voice Channel Permissions",
      permissions: [
        PERMISSIONS.CONNECT,
        PERMISSIONS.SPEAK,
        PERMISSIONS.MUTE_MEMBERS,
        PERMISSIONS.DEAFEN_MEMBERS,
        PERMISSIONS.MOVE_MEMBERS,
      ],
    },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Role List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Roles</h3>
          <Button size="sm" onClick={createRole} disabled={loading}>
            <Plus className="w-4 h-4 mr-2" />
            Create Role
          </Button>
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Role name"
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && createRole()}
          />
        </div>

        <ScrollArea className="h-96">
          <div className="space-y-2">
            {roles.map((role) => (
              <Card
                key={role.id}
                className={`cursor-pointer transition-colors ${
                  selectedRole?.id === role.id ? "bg-slate-700" : "bg-slate-800 hover:bg-slate-700"
                }`}
                onClick={() => setSelectedRole(role)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {role.name === "@everyone" ? (
                        <Shield className="w-4 h-4" />
                      ) : hasPermission(BigInt(role.permissions || 0), PERMISSIONS.ADMINISTRATOR) ? (
                        <Crown className="w-4 h-4 text-yellow-500" />
                      ) : (
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: role.color }} />
                      )}
                      <span className="font-medium">{role.name}</span>
                    </div>
                    {role.name !== "@everyone" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteRole(role.id)
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-slate-400 mt-1">
                    {
                      Object.values(PERMISSIONS).filter((perm) => hasPermission(BigInt(role.permissions || 0), perm))
                        .length
                    }{" "}
                    permissions
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Role Editor */}
      <div className="space-y-4">
        {selectedRole ? (
          <>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Edit Role</h3>
              <Badge style={{ backgroundColor: selectedRole.color }}>{selectedRole.name}</Badge>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Role Name</Label>
                <Input
                  value={selectedRole.name}
                  onChange={(e) => updateRole({ name: e.target.value })}
                  disabled={selectedRole.name === "@everyone"}
                />
              </div>

              <div className="space-y-2">
                <Label>Role Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={selectedRole.color}
                    onChange={(e) => updateRole({ color: e.target.value })}
                    className="w-16 h-10"
                  />
                  <Input
                    value={selectedRole.color}
                    onChange={(e) => updateRole({ color: e.target.value })}
                    placeholder="#99aab5"
                  />
                </div>
              </div>

              <ScrollArea className="h-96">
                <div className="space-y-6">
                  {permissionGroups.map((group) => (
                    <div key={group.name} className="space-y-3">
                      <h4 className="font-medium text-slate-300">{group.name}</h4>
                      <div className="space-y-2">
                        {group.permissions.map((permission) => (
                          <div key={permission.toString()} className="flex items-center space-x-2">
                            <Checkbox
                              id={permission.toString()}
                              checked={hasPermission(BigInt(selectedRole.permissions || 0), permission)}
                              onCheckedChange={() => togglePermission(permission)}
                            />
                            <Label htmlFor={permission.toString()} className="text-sm">
                              {getPermissionName(permission)}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-slate-400">
            <p>Select a role to edit its permissions</p>
          </div>
        )}
      </div>
    </div>
  )
}
