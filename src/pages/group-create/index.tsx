import { Button, Image, Input, Switch, Text, Textarea, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { useState } from 'react'
import { request, showError, uploadImage } from '../../services/api'
import { FileInfo, GroupDetail } from '../../types'
import './index.scss'

export default function GroupCreatePage() {
  const [id, setId] = useState('')
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState<FileInfo>()
  const [description, setDescription] = useState('')
  const [announcement, setAnnouncement] = useState('')
  const [weeklyTarget, setWeeklyTarget] = useState(3)
  const [reminderTime, setReminderTime] = useState('20:00')
  const [requireApproval, setRequireApproval] = useState(false)
  const [memberLimit, setMemberLimit] = useState('50')
  const [saving, setSaving] = useState(false)

  useLoad(async options => {
    if (!options.id) {
      try {
        const config = await request<Record<string, string>>('/config')
        if (/^([01]\d|2[0-3]):[0-5]\d$/.test(config.defaultReminderTime || '')) {
          setReminderTime(config.defaultReminderTime)
        }
      } catch (error) {
        showError(error)
      }
      return
    }
    setId(options.id)
    Taro.setNavigationBarTitle({ title: '编辑小组' })
    try {
      const group = await request<GroupDetail>(`/groups/${options.id}`)
      setName(group.name)
      setAvatar(group.avatar)
      setDescription(group.description)
      setAnnouncement(group.announcement)
      setWeeklyTarget(group.weeklyTarget)
      setReminderTime(group.reminderTime)
      setRequireApproval(group.requireApproval)
      setMemberLimit(String(group.memberLimit))
    } catch (error) {
      showError(error)
    }
  })

  const chooseAvatar = async () => {
    try {
      const result = await Taro.chooseMedia({ count: 1, mediaType: ['image'], sourceType: ['album', 'camera'], sizeType: ['compressed'] })
      Taro.showLoading({ title: '上传并审核中' })
      setAvatar(await uploadImage(result.tempFiles[0].tempFilePath, 'group_avatar'))
    } catch (error) {
      const err = error as { errMsg?: string }
      if (!err.errMsg?.includes('cancel')) showError(error)
    } finally {
      Taro.hideLoading()
    }
  }

  const save = async () => {
    if (!name.trim()) {
      Taro.showToast({ title: '给小组起个名字', icon: 'none' })
      return
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(reminderTime)) {
      Taro.showToast({ title: '提醒时间格式应为 20:00', icon: 'none' })
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        avatarFileId: avatar?.id || '',
        description: description.trim(),
        announcement: announcement.trim(),
        weeklyTarget,
        reminderTime,
        requireApproval,
        memberLimit: Number(memberLimit)
      }
      if (id) {
        await request(`/groups/${id}`, { method: 'PUT', data: payload })
        Taro.showToast({ title: '小组已更新', icon: 'success' })
        setTimeout(() => Taro.navigateBack(), 700)
      } else {
        Taro.showLoading({ title: '生成邀请中' })
        const result = await request<{ id: string; invitationCode: string; qrCode: FileInfo }>('/groups', { method: 'POST', data: payload })
        Taro.hideLoading()
        Taro.setStorageSync(`group-invitation-${result.id}`, {
          code: result.invitationCode,
          qrCode: result.qrCode
        })
        Taro.redirectTo({ url: `/pages/group-detail/index?id=${result.id}&created=1` })
      }
    } catch (error) {
      Taro.hideLoading()
      showError(error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <View className='page group-create-page'>
      <View className='create-heading'>
        <Text className='create-eyebrow'>{id ? 'TUNE THE CLUB' : 'START A CLUB'}</Text>
        <Text className='create-title'>{id ? '把规则说清楚，\n大家更难装忘。' : '找几个朋友，\n一起把鸽子关起来。'}</Text>
      </View>

      <View className='avatar-picker' onClick={chooseAvatar}>
        {avatar
          ? <Image src={avatar.url} mode='aspectFill' />
          : <View className='avatar-placeholder'><Text>＋</Text><Text>小组头像</Text></View>}
        <Text className='avatar-tip'>点击更换</Text>
      </View>

      <View className='create-form card'>
        <View className='field'>
          <Text className='field-label'>小组名称</Text>
          <Input className='input' value={name} maxlength={30} placeholder='比如：夏天之前瘦十斤' onInput={event => setName(event.detail.value)} />
        </View>
        <View className='field'>
          <Text className='field-label'>小组简介</Text>
          <Textarea className='textarea short' value={description} maxlength={200} placeholder='我们为什么聚在这里？' onInput={event => setDescription(event.detail.value)} />
        </View>
        <View className='field'>
          <Text className='field-label'>小组公告</Text>
          <Textarea className='textarea short' value={announcement} maxlength={300} placeholder='规则、约定或一句狠话' onInput={event => setAnnouncement(event.detail.value)} />
        </View>
      </View>

      <Text className='section-title'>打卡规则</Text>
      <View className='rules-card card'>
        <View className='rule-row'>
          <View><Text className='rule-name'>每周目标</Text><Text className='rule-desc'>建议从可坚持的频率开始</Text></View>
          <View className='stepper'>
            <Text onClick={() => setWeeklyTarget(value => Math.max(1, value - 1))}>−</Text>
            <Text>{weeklyTarget} 天</Text>
            <Text onClick={() => setWeeklyTarget(value => Math.min(7, value + 1))}>＋</Text>
          </View>
        </View>
        <View className='rule-row'>
          <View><Text className='rule-name'>每日提醒时间</Text><Text className='rule-desc'>未打卡成员将在此时收到提醒</Text></View>
          <Input className='compact-input' value={reminderTime} maxlength={5} onInput={event => setReminderTime(event.detail.value)} />
        </View>
        <View className='rule-row'>
          <View><Text className='rule-name'>管理员审核加入</Text><Text className='rule-desc'>开启后，新成员需要你确认</Text></View>
          <Switch checked={requireApproval} color='#17181c' onChange={event => setRequireApproval(event.detail.value)} />
        </View>
        <View className='rule-row'>
          <View><Text className='rule-name'>人数上限</Text><Text className='rule-desc'>2—200 人</Text></View>
          <Input className='compact-input' type='number' value={memberLimit} onInput={event => setMemberLimit(event.detail.value)} />
        </View>
      </View>

      <Button className='primary-button create-submit' loading={saving} disabled={saving} onClick={save}>
        {id ? '保存小组设置' : '创建小组并生成邀请'}
      </Button>
    </View>
  )
}
