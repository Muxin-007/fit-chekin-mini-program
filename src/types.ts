export interface FileInfo { id: string; name: string; url: string; auditStatus: string }
export interface User {
  id: string
  nickname: string
  avatar?: FileInfo
  reminderEnabled: boolean
  status: string
}
export interface Stats {
  currentStreak: number
  longestStreak: number
  monthCount: number
  totalCount: number
  totalMinutes: number
}
export interface GroupSummary {
  id: string
  name: string
  memberCount: number
  checkedCount: number
  currentChecked: boolean
  role: 'admin' | 'member'
  membershipStatus: 'active' | 'pending'
}
export interface HomeData {
  todayChecked: boolean
  stats: Stats
  groups: GroupSummary[]
}
export interface MemberStatus {
  memberId: string
  label: string
  role: string
  status: string
  checked: boolean
  isCurrent: boolean
}
export interface GroupDetail extends GroupSummary {
  weeklyTarget: number
  reminderTime: string
  requireApproval: boolean
  memberLimit: number
  checkedMembers: MemberStatus[]
  uncheckedMembers: MemberStatus[]
  pendingMembers: MemberStatus[]
}
export interface Checkin {
  id: string
  date: string
  exerciseType: string
  durationMinutes: number
  auditStatus: string
  auditDetail?: string
  canManage: boolean
  images: FileInfo[]
  imageAuditSummary?: Record<string, number>
  groupIds: string[]
  groupNames: string[]
}
export interface CalendarData { month: string; stats: Stats; items: Checkin[] }
export interface Invitation {
  code: string
  expiresAt: number
  groupId: string
  groupName: string
  memberCount: number
  weeklyTarget: number
  requireApproval: boolean
}
