/** Pure four-role contract shared by server validation and client controls. */
export const TEAM_ROLES = ['owner', 'admin', 'analyst', 'viewer'] as const;
export const TEAM_INVITABLE_ROLES = ['admin', 'analyst', 'viewer'] as const;

export type Role = (typeof TEAM_ROLES)[number];
export type InvitableRole = (typeof TEAM_INVITABLE_ROLES)[number];
