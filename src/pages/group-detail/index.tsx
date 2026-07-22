import { Button, Image, Text, View } from '@tarojs/components'
import Taro, { useLoad, usePullDownRefresh, useShareAppMessage } from '@tarojs/taro'
import { useCallback, useState } from 'react'
import Avatar from '../../components/Avatar'
import { request, showError } from '../../services/api'
import { FileInfo, GroupDetail, MemberStatus, User } from '../../types'
import { exerciseLabels, formatTime } from '../../utils/format'
import './index.scss'

interface InvitationState { code: string; qrCode: FileInfo; expiresAt?: number }

export default function GroupDetailPage() {
  const [id, setId] = useState('')
  const [group, setGroup] = useState<GroupDetail>()
  const [currentUser, setCurrentUser] = useState<User>()
  const [invitation, setInvitation] = useState<InvitationState>()
  const [showInvite, setShowInvite] = useState(false)

  const load = useCallback(async (groupId = id) => {
    if (!groupId) return
    try {
      const [detail, profile] = await Promise.all([
        request<GroupDetail>(`/groups/${groupId}`),
        request<{ user: User }>('/profile')
      ])
      setGroup(detail)
      setCurrentUser(profile.user)
      Taro.setNavigationBarTitle({ title: detail.name })
      const stored = Taro.getStorageSync(`group-invitation-${groupId}`) as InvitationState
      if (stored?.code) {
        setInvitation(stored)
      } else {
        try {
          const activeInvitation = await request<InvitationState>(`/groups/${groupId}/invitation`)
          setInvitation(activeInvitation)
          Taro.setStorageSync(`group-invitation-${groupId}`, activeInvitation)
        } catch {
          setInvitation(undefined)
        }
      }
    } catch (error) {
      showError(error)
    } finally {
      Taro.stopPullDownRefresh()
    }
  }, [id])

  useLoad(options => {
    setId(options.id)
    const stored = Taro.getStorageSync(`group-invitation-${options.id}`) as InvitationState
    if (stored?.code) {
      setInvitation(stored)
      if (options.created === '1') setShowInvite(true)
    }
    void load(options.id)
  })
  usePullDownRefresh(() => { void load() })

  useShareAppMessage(() => ({
    title: `${currentUser?.nickname || '好友'}邀请你加入「${group?.name || '健身小组'}」`,
    path: `/pages/invite/index?code=${invitation?.code || ''}`,
    imageUrl: invitation?.qrCode?.url
  }))

  const createInvitation = async () => {
    if (!group) return
    try {
      Taro.showLoading({ title: '生成邀请中' })
      const result = await request<InvitationState>(`/groups/${group.id}/invitations`, {
        method: 'POST',
        data: { validHours: 168 }
      })
      setInvitation(result)
      Taro.setStorageSync(`group-invitation-${group.id}`, result)
      setShowInvite(true)
    } catch (error) {
      showError(error)
    } finally {
      Taro.hideLoading()
    }
  }

  const openInvitation = () => {
    if (invitation) {
      setShowInvite(true)
    } else {
      void createInvitation()
    }
  }

  const remind = async (targetUserId?: string) => {
    if (!group) return
    if (!targetUserId && !group.uncheckedMembers.some(member => member.userId !== currentUser?.id)) {
      Taro.showToast({ title: '没有其他需要提醒的成员', icon: 'none' })
      return
    }
    try {
      const result = await request<Array<{ status: string; reason?: string }> | null>('/reminders', {
        method: 'POST',
        data: { groupId: group.id, targetUserId: targetUserId || '', allPending: !targetUserId }
      })
      const outcomes = result || []
      const sent = outcomes.filter(item => item.status === 'sent').length
      const reason = outcomes.find(item => item.reason)?.reason
      Taro.showToast({ title: sent ? `已提醒 ${sent} 人` : (reason || '今天已经提醒过了'), icon: 'none' })
    } catch (error) {
      showError(error)
    }
  }

  const review = async (memberId: string, approve: boolean) => {
    try {
      await request(`/groups/${id}/members/review`, { method: 'POST', data: { memberId, approve } })
      await load()
    } catch (error) {
      showError(error)
    }
  }

  const removeMember = async (member: MemberStatus) => {
    const confirm = await Taro.showModal({ title: `移除 ${member.nickname}？`, content: '移除后，对方需要通过邀请重新加入。', confirmColor: '#d53b2e' })
    if (!confirm.confirm) return
    try {
      await request(`/groups/${id}/members/${member.memberId}`, { method: 'DELETE' })
      await load()
    } catch (error) {
      showError(error)
    }
  }

  const report = async (checkinId: string) => {
    const modal = await Taro.showModal({
      title: '举报这条打卡',
      content: '',
      editable: true,
      placeholderText: '请说明原因',
      confirmText: '提交'
    } as any) as unknown as { confirm: boolean; content?: string }
    if (!modal.confirm || !modal.content?.trim()) return
    try {
      await request('/reports', { method: 'POST', data: { checkinId, reason: modal.content.trim() } })
      Taro.showToast({ title: '举报已提交', icon: 'success' })
    } catch (error) {
      showError(error)
    }
  }

  const leaveOrDissolve = async () => {
    if (!group) return
    const isAdmin = group.role === 'admin'
    const modal = await Taro.showModal({
      title: isAdmin ? '确认解散小组？' : '确认退出小组？',
      content: isAdmin ? '解散后成员将无法再查看该小组，邀请也会失效。' : '退出后需要通过邀请重新加入。',
      confirmColor: '#d53b2e'
    })
    if (!modal.confirm) return
    try {
      await request(isAdmin ? `/groups/${group.id}` : `/groups/${group.id}/members/me`, { method: 'DELETE' })
      Taro.switchTab({ url: '/pages/groups/index' })
    } catch (error) {
      showError(error)
    }
  }

  if (!group) return <View className='page empty'>小组正在集合…</View>
  if (group.membershipStatus === 'pending') {
    return (
      <View className='page pending-page'>
        <Text className='pending-icon'>···</Text>
        <Text className='pending-title'>等待管理员点头</Text>
        <Text className='pending-copy'>你的加入申请已经送达「{group.name}」，审核通过后就能看到今日进度。</Text>
      </View>
    )
  }

  return (
    <View className='page group-detail-page'>
      <View className='group-hero'>
        <View className='hero-top'>
          <Avatar file={group.avatar} name={group.name} className='hero-avatar' />
          <View className='hero-copy'>
            <Text className='hero-name'>{group.name}</Text>
            <Text className='hero-meta'>{group.memberCount} 位搭子 · 每周目标 {group.weeklyTarget} 天</Text>
          </View>
        </View>
        <Text className='hero-announcement'>{group.announcement || group.description || '一起练，比一个人更难鸽。'}</Text>
        <View className='hero-progress'>
          <View>
            <Text className='progress-number'>{group.checkedCount}</Text>
            <Text className='progress-total'> / {group.memberCount} 今日完成</Text>
          </View>
          <Text className='progress-status'>{group.currentChecked ? '你已打卡 ✓' : '你还没练'}</Text>
        </View>
        <View className='hero-track'>
          <View style={{ width: `${group.memberCount ? group.checkedCount / group.memberCount * 100 : 0}%` }} />
        </View>
        <View className='hero-actions'>
          {(group.role === 'admin' || invitation) && (
            <Button className='invite-button' onClick={group.role === 'admin' ? openInvitation : undefined} openType={group.role === 'admin' ? undefined : 'share'}>
              邀请搭子
            </Button>
          )}
          {!group.currentChecked && <Button className='checkin-button' onClick={() => Taro.navigateTo({ url: '/pages/checkin/index' })}>去打卡</Button>}
        </View>
      </View>

      {group.pendingMembers.length > 0 && group.role === 'admin' && (
        <>
          <Text className='section-title'>等待加入 · {group.pendingMembers.length}</Text>
          <View className='member-list card'>
            {group.pendingMembers.map(member => (
              <View className='member-row' key={member.memberId}>
                <Avatar file={member.avatar} name={member.nickname} className='member-avatar' />
                <Text className='member-name'>{member.nickname}</Text>
                <View className='review-actions'>
                  <Text onClick={() => void review(member.memberId, false)}>拒绝</Text>
                  <Text onClick={() => void review(member.memberId, true)}>通过</Text>
                </View>
              </View>
            ))}
          </View>
        </>
      )}

      <Text className='section-title'>今天没鸽 · {group.checkedMembers.length}</Text>
      <View className='checked-list'>
        {group.checkedMembers.length
          ? group.checkedMembers.map(member => (
              <View className='checked-card card' key={member.memberId}>
                <View className='checked-card-head'>
                  <Avatar file={member.avatar} name={member.nickname} className='member-avatar' />
                  <View className='checked-copy'>
                    <Text className='member-name'>{member.nickname}</Text>
                    <Text className='checked-time'>
                      {member.auditPending ? '已完成 · 内容审核中' : `${formatTime(member.checkinAt)} 完成 · 连续 ${member.currentStreak} 天`}
                    </Text>
                  </View>
                  {member.userId !== currentUser?.id && <Text className='more-action' onClick={() => member.checkinId && void report(member.checkinId)}>举报</Text>}
                </View>
                <View
                  className='workout-line'
                  onClick={() => member.checkinId && Taro.navigateTo({ url: `/pages/checkin/index?id=${member.checkinId}&view=1` })}
                >
                  {member.auditPending
                    ? <Text className='workout-duration'>审核通过后可查看打卡详情</Text>
                    : <>
                        <View>
                          <Text className='workout-type'>{exerciseLabels[member.exerciseType || 'other']}</Text>
                          <Text className='workout-duration'>{member.durationMinutes} 分钟</Text>
                        </View>
                        {member.image && <Image src={member.image.url} mode='aspectFill' />}
                        <Text className='workout-arrow'>→</Text>
                      </>}
                </View>
              </View>
            ))
          : <View className='empty card'>今天还没人打破沉默。</View>}
      </View>

      <View className='unchecked-heading'>
        <Text className='section-title'>正在挣扎 · {group.uncheckedMembers.length}</Text>
        {group.role === 'admin' && group.uncheckedMembers.some(member => member.userId !== currentUser?.id) && (
          <Text className='remind-all' onClick={() => void remind()}>提醒全部</Text>
        )}
      </View>
      <View className='member-list card'>
        {group.uncheckedMembers.length
          ? group.uncheckedMembers.map(member => (
              <View className='member-row' key={member.memberId}>
                <Avatar file={member.avatar} name={member.nickname} className='member-avatar grayscale' />
                <View className='member-copy'>
                  <Text className='member-name'>{member.nickname}</Text>
                  <Text className='unchecked-status'>今天还没有完成打卡</Text>
                </View>
                {member.userId !== currentUser?.id && <Text className='remind-one' onClick={() => void remind(member.userId)}>戳一下</Text>}
                {group.role === 'admin' && member.role !== 'admin' && <Text className='remove-one' onClick={() => void removeMember(member)}>移除</Text>}
              </View>
            ))
          : <View className='empty'>全员完成，今天没有鸽王！</View>}
      </View>

      {group.role === 'admin' && (
        <Button className='secondary-button settings-button' onClick={() => Taro.navigateTo({ url: `/pages/group-create/index?id=${group.id}` })}>编辑小组与规则</Button>
      )}
      <Button className='danger-button exit-button' onClick={leaveOrDissolve}>{group.role === 'admin' ? '解散小组' : '退出小组'}</Button>

      {showInvite && invitation && (
        <View className='invite-overlay' onClick={() => setShowInvite(false)}>
          <View className='invite-sheet' onClick={event => event.stopPropagation()}>
            <Text className='sheet-close' onClick={() => setShowInvite(false)}>×</Text>
            <Text className='sheet-eyebrow'>INVITE YOUR CREW</Text>
            <Text className='sheet-title'>叫人来一起{'\n'}取消鸽王资格</Text>
            <Image className='qr-code' src={invitation.qrCode.url} mode='aspectFit' showMenuByLongpress />
            <Text className='invite-code'>邀请码 · {invitation.code}</Text>
            <Button className='primary-button share-button' openType='share'>分享到微信群</Button>
            {group.role === 'admin' && <Text className='sheet-tip' onClick={() => void createInvitation()}>重置邀请（旧邀请将立即失效）</Text>}
            <Text className='sheet-tip'>也可以长按保存小程序码</Text>
          </View>
        </View>
      )}
    </View>
  )
}
