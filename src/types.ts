export interface FileInfo { id: string; name: string; url: string; auditStatus: string }
export interface User {
  id: string
  nickname: string
  avatar?: FileInfo
  reminderEnabled: boolean
  weightPublic: boolean
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
  avatar?: FileInfo
  description: string
  memberCount: number
  checkedCount: number
  currentChecked: boolean
  role: 'admin' | 'member'
  membershipStatus: 'active' | 'pending'
}
export interface Activity {
  checkinId: string
  userId: string
  nickname: string
  avatar?: FileInfo
  exerciseType: string
  durationMinutes: number
  checkinAt: number
}
export interface HomeData {
  todayChecked: boolean
  stats: Stats
  groups: GroupSummary[]
  activities: Activity[]
}
export interface MemberStatus {
  memberId: string
  userId: string
  nickname: string
  avatar?: FileInfo
  role: string
  status: string
  checked: boolean
  auditPending: boolean
  checkinId?: string
  checkinAt?: number
  exerciseType?: string
  durationMinutes?: number
  image?: FileInfo
  currentStreak: number
}
export interface GroupDetail extends GroupSummary {
  announcement: string
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
  content: string
  calories?: number
  weight?: number
  weightPublic: boolean
  mood: string
  auditStatus: string
  auditDetail?: string
  canManage: boolean
  createdAt: number
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
  groupAvatar?: FileInfo
  memberCount: number
  weeklyTarget: number
  requireApproval: boolean
}
