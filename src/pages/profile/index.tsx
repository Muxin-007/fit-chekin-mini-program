import { Button, Input, Switch, Text, View } from '@tarojs/components'
import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro'
import { useCallback, useState } from 'react'
import Avatar from '../../components/Avatar'
import { request, showError, uploadImage } from '../../services/api'
import { Stats, User } from '../../types'
import './index.scss'

interface ProfileData { user: User; stats: Stats }

export default function ProfilePage() {
  const [data, setData] = useState<ProfileData>()
  const [editing, setEditing] = useState(false)
  const [nickname, setNickname] = useState('')

  const load = useCallback(async () => {
    try {
      const result = await request<ProfileData>('/profile')
      setData(result)
      setNickname(result.user.nickname)
    } catch (error) {
      showError(error)
    } finally {
      Taro.stopPullDownRefresh()
    }
  }, [])

  useDidShow(() => { void load() })
  usePullDownRefresh(() => { void load() })

  const changeAvatar = async () => {
    try {
      const chosen = await Taro.chooseMedia({ count: 1, mediaType: ['image'], sourceType: ['album', 'camera'], sizeType: ['compressed'] })
      Taro.showLoading({ title: '上传并审核中' })
      const avatar = await uploadImage(chosen.tempFiles[0].tempFilePath, 'avatar')
      await request('/profile', { method: 'PUT', data: { avatarFileId: avatar.id } })
      await load()
    } catch (error) {
      const err = error as { errMsg?: string }
      if (!err.errMsg?.includes('cancel')) showError(error)
    } finally {
      Taro.hideLoading()
    }
  }

  const saveNickname = async () => {
    if (!nickname.trim()) return
    try {
      await request('/profile', { method: 'PUT', data: { nickname: nickname.trim() } })
      setEditing(false)
      await load()
    } catch (error) {
      showError(error)
    }
  }

  const updateSetting = async (key: 'reminderEnabled' | 'weightPublic', value: boolean) => {
    try {
      if (key === 'reminderEnabled' && value) {
        const config = await request<Record<string, string>>('/config')
        const templateId = config.reminderTemplateId
        if (templateId) {
          const result = await Taro.requestSubscribeMessage({ tmplIds: [templateId] } as any)
          await request('/subscriptions', {
            method: 'POST',
            data: { templateId, accepted: result[templateId] === 'accept' }
          })
          if (result[templateId] !== 'accept') value = false
        }
      }
      await request('/profile/settings', { method: 'PUT', data: { [key]: value } })
      await load()
    } catch (error) {
      showError(error)
    }
  }

  const cancelAccount = async () => {
    const result = await Taro.showModal({
      title: '确认注销账号？',
      content: '注销后将退出所有小组，且无法继续使用当前账号。你管理的小组需要先解散。',
      confirmText: '确认注销',
      confirmColor: '#d53b2e'
    })
    if (!result.confirm) return
    try {
      await request('/profile', { method: 'DELETE' })
      Taro.clearStorageSync()
      Taro.reLaunch({ url: '/pages/index/index' })
    } catch (error) {
      showError(error)
    }
  }

  return (
    <View className='page profile-page'>
      <View className='profile-card'>
        <View className='profile-avatar-wrap' onClick={changeAvatar}>
          <Avatar file={data?.user.avatar} name={data?.user.nickname || '鸽'} className='profile-avatar' />
          <Text className='camera-badge'>相机</Text>
        </View>
        {editing
          ? <View className='nickname-edit'>
              <Input className='nickname-input' value={nickname} maxlength={30} focus onInput={event => setNickname(event.detail.value)} />
              <Text onClick={saveNickname}>保存</Text>
            </View>
          : <Text className='profile-name' onClick={() => setEditing(true)}>{data?.user.nickname || '微信用户'} ✎</Text>}
        <Text className='profile-slogan'>一个人容易鸽，一群人不好意思鸽。</Text>
      </View>

      <View className='profile-stats'>
        <View><Text>{data?.stats.totalCount || 0}</Text><Text>累计打卡</Text></View>
        <View><Text>{data?.stats.longestStreak || 0}</Text><Text>最长连续</Text></View>
        <View><Text>{data?.stats.totalMinutes || 0}</Text><Text>运动分钟</Text></View>
      </View>

      <Text className='section-title'>偏好设置</Text>
      <View className='settings-card card'>
        <View className='setting-row'>
          <View><Text className='setting-name'>未打卡提醒</Text><Text className='setting-desc'>需要微信订阅消息授权</Text></View>
          <Switch
            checked={data?.user.reminderEnabled}
            color='#17181c'
            onChange={event => void updateSetting('reminderEnabled', event.detail.value)}
          />
        </View>
        <View className='setting-row'>
          <View><Text className='setting-name'>体重默认公开</Text><Text className='setting-desc'>默认关闭，每次打卡仍可单独调整</Text></View>
          <Switch
            checked={data?.user.weightPublic}
            color='#17181c'
            onChange={event => void updateSetting('weightPublic', event.detail.value)}
          />
        </View>
      </View>

      <Text className='section-title'>关于与隐私</Text>
      <View className='menu-card card'>
        <View className='menu-row' onClick={() => Taro.navigateTo({ url: '/pages/legal/index?type=userAgreement' })}>
          <Text>用户协议</Text><Text>→</Text>
        </View>
        <View className='menu-row' onClick={() => Taro.navigateTo({ url: '/pages/legal/index?type=privacyPolicy' })}>
          <Text>隐私政策</Text><Text>→</Text>
        </View>
      </View>

      <Button className='danger-button cancel-button' onClick={cancelAccount}>注销账号</Button>
      <Text className='version'>再鸽一天 · MVP 1.0</Text>
    </View>
  )
}
