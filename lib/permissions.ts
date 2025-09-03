// Permission constants (bitwise flags)
export const PERMISSIONS = {
  // General server permissions
  VIEW_CHANNELS: 1n << 0n,
  MANAGE_CHANNELS: 1n << 1n,
  MANAGE_ROLES: 1n << 2n,
  MANAGE_SERVER: 1n << 3n,
  CREATE_INSTANT_INVITE: 1n << 4n,
  KICK_MEMBERS: 1n << 5n,
  BAN_MEMBERS: 1n << 6n,
  ADMINISTRATOR: 1n << 7n,
  MANAGE_MESSAGES: 1n << 8n,
  MANAGE_NICKNAMES: 1n << 9n,
  MANAGE_WEBHOOKS: 1n << 10n,
  VIEW_AUDIT_LOG: 1n << 11n,

  // Text channel permissions
  SEND_MESSAGES: 1n << 12n,
  SEND_TTS_MESSAGES: 1n << 13n,
  EMBED_LINKS: 1n << 14n,
  ATTACH_FILES: 1n << 15n,
  READ_MESSAGE_HISTORY: 1n << 16n,
  MENTION_EVERYONE: 1n << 17n,
  USE_EXTERNAL_EMOJIS: 1n << 18n,
  ADD_REACTIONS: 1n << 19n,

  // Voice channel permissions
  CONNECT: 1n << 20n,
  SPEAK: 1n << 21n,
  MUTE_MEMBERS: 1n << 22n,
  DEAFEN_MEMBERS: 1n << 23n,
  MOVE_MEMBERS: 1n << 24n,
  USE_VOICE_ACTIVATION: 1n << 25n,
} as const

export const DEFAULT_PERMISSIONS =
  PERMISSIONS.VIEW_CHANNELS |
  PERMISSIONS.SEND_MESSAGES |
  PERMISSIONS.READ_MESSAGE_HISTORY |
  PERMISSIONS.ADD_REACTIONS |
  PERMISSIONS.CONNECT |
  PERMISSIONS.SPEAK |
  PERMISSIONS.USE_VOICE_ACTIVATION

export const ADMIN_PERMISSIONS =
  PERMISSIONS.ADMINISTRATOR |
  PERMISSIONS.MANAGE_SERVER |
  PERMISSIONS.MANAGE_CHANNELS |
  PERMISSIONS.MANAGE_ROLES |
  PERMISSIONS.KICK_MEMBERS |
  PERMISSIONS.BAN_MEMBERS |
  PERMISSIONS.MANAGE_MESSAGES |
  PERMISSIONS.VIEW_AUDIT_LOG

export function hasPermission(userPermissions: bigint, permission: bigint): boolean {
  // Administrator has all permissions
  if (userPermissions & PERMISSIONS.ADMINISTRATOR) return true
  return (userPermissions & permission) === permission
}

export function calculatePermissions(roles: any[]): bigint {
  let permissions = 0n

  for (const role of roles) {
    permissions |= BigInt(role.permissions || 0)
  }

  return permissions
}

export function getPermissionName(permission: bigint): string {
  const permissionNames: Record<string, string> = {
    [PERMISSIONS.VIEW_CHANNELS.toString()]: "View Channels",
    [PERMISSIONS.MANAGE_CHANNELS.toString()]: "Manage Channels",
    [PERMISSIONS.MANAGE_ROLES.toString()]: "Manage Roles",
    [PERMISSIONS.MANAGE_SERVER.toString()]: "Manage Server",
    [PERMISSIONS.CREATE_INSTANT_INVITE.toString()]: "Create Invite",
    [PERMISSIONS.KICK_MEMBERS.toString()]: "Kick Members",
    [PERMISSIONS.BAN_MEMBERS.toString()]: "Ban Members",
    [PERMISSIONS.ADMINISTRATOR.toString()]: "Administrator",
    [PERMISSIONS.MANAGE_MESSAGES.toString()]: "Manage Messages",
    [PERMISSIONS.MANAGE_NICKNAMES.toString()]: "Manage Nicknames",
    [PERMISSIONS.SEND_MESSAGES.toString()]: "Send Messages",
    [PERMISSIONS.READ_MESSAGE_HISTORY.toString()]: "Read Message History",
    [PERMISSIONS.ADD_REACTIONS.toString()]: "Add Reactions",
    [PERMISSIONS.CONNECT.toString()]: "Connect to Voice",
    [PERMISSIONS.SPEAK.toString()]: "Speak in Voice",
    [PERMISSIONS.MUTE_MEMBERS.toString()]: "Mute Members",
    [PERMISSIONS.DEAFEN_MEMBERS.toString()]: "Deafen Members",
  }

  return permissionNames[permission.toString()] || "Unknown Permission"
}
