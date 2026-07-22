import { Button, Input, Switch, Text, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { useState } from 'react'
import { request, showError } from '../../services/api'
import { FileInfo, GroupDetail } from '../../types'
import './index.scss'

const groupNames = ['日常运动小组', '跑步打卡小组', '健身训练小组', '步行打卡小组', '综合运动小组']

export default function GroupCreatePage() {
  const [id, setId] = useState('')
  const [name, setName] = useState(groupNames[0])
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
      setWeeklyTarget(group.weeklyTarget)
      setReminderTime(group.reminderTime)
      setRequireApproval(group.requireApproval)
      setMemberLimit(String(group.memberLimit))
    } catch (error) {
      showError(error)
    }
  })

  const save = async () => {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(reminderTime)) {
      Taro.showToast({ title: '提醒时间格式应为 20:00', icon: 'none' })
      return
    }
    setSaving(true)
    try {
      const payload = {
        name,
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
        <Text className='create-title'>{id ? '调整打卡规则，\n继续一起坚持。' : '找几个朋友，\n一起把鸽子关起来。'}</Text>
      </View>

      <View className='create-form card'>
        <View className='field'>
          <Text className='field-label'>选择小组类型</Text>
          <Text className='field-tip'>名称由平台预设，成员不能发布自定义文字。</Text>
          <View className='group-name-options'>
            {groupNames.map(item => (
              <Text
                key={item}
                className={`group-name-option ${name === item ? 'active' : ''}`}
                onClick={() => setName(item)}
              >
                {item}
              </Text>
            ))}
          </View>
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
