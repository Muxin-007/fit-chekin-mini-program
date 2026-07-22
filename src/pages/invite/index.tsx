import { Button, Text, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { useState } from 'react'
import Avatar from '../../components/Avatar'
import { request, showError } from '../../services/api'
import { Invitation } from '../../types'
import './index.scss'

export default function InvitePage() {
  const [invitation, setInvitation] = useState<Invitation>()
  const [code, setCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [invalid, setInvalid] = useState(false)

  useLoad(async options => {
    const inviteCode = decodeURIComponent(options.scene || options.code || '')
    setCode(inviteCode)
    if (!inviteCode) {
      setInvalid(true)
      return
    }
    try {
      setInvitation(await request<Invitation>(`/invitations/${inviteCode}`))
    } catch (error) {
      setInvalid(true)
      showError(error)
    }
  })

  const join = async () => {
    setJoining(true)
    try {
      const result = await request<{ groupId: string; status: string }>('/invitations/join', {
        method: 'POST',
        data: { code }
      })
      if (result.status === 'pending') {
        await Taro.showModal({ title: '申请已送达', content: '这个小组需要管理员审核，通过后就能看到大家的打卡进度。', showCancel: false })
      } else {
        Taro.showToast({ title: '加入成功，开始互相监督', icon: 'success' })
      }
      setTimeout(() => Taro.redirectTo({ url: `/pages/group-detail/index?id=${result.groupId}` }), 700)
    } catch (error) {
      showError(error)
    } finally {
      setJoining(false)
    }
  }

  if (invalid) {
    return (
      <View className='page invite-invalid'>
        <Text className='invalid-icon'>404</Text>
        <Text className='invalid-title'>这张邀请飞走了</Text>
        <Text className='invalid-copy'>邀请可能已经过期或被管理员重置，请让朋友重新发一张。</Text>
        <Button className='secondary-button' onClick={() => Taro.switchTab({ url: '/pages/index/index' })}>回到首页</Button>
      </View>
    )
  }

  if (!invitation) return <View className='page empty'>正在确认这是谁的局…</View>

  return (
    <View className='page invite-page'>
      <View className='invite-poster'>
        <Text className='poster-kicker'>YOU'RE INVITED</Text>
        <Text className='poster-title'>好友叫你来，{'\n'}一起少鸽一天。</Text>
        <View className='invite-group-card'>
          <Avatar file={invitation.groupAvatar} name={invitation.groupName} className='invite-avatar' />
          <Text className='invite-group-name'>{invitation.groupName}</Text>
          <Text className='invite-members'>已经有 {invitation.memberCount} 人加入</Text>
          <View className='invite-rule'>
            <View><Text>每周目标</Text><Text>{invitation.weeklyTarget} 天</Text></View>
            <View><Text>加入方式</Text><Text>{invitation.requireApproval ? '管理员审核' : '直接加入'}</Text></View>
          </View>
        </View>
        <Text className='poster-quote'>“一个人容易鸽，一群人不好意思鸽。”</Text>
      </View>
      <Button className='primary-button join-button' loading={joining} disabled={joining} onClick={join}>
        加入小组，接受监督
      </Button>
      <Text className='invite-agreement'>加入即表示同意遵守小组规则与平台用户协议</Text>
    </View>
  )
}
