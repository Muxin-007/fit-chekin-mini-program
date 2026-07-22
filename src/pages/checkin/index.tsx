import { Button, Image, Input, Text, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { useState } from 'react'
import { request, showError, uploadImage } from '../../services/api'
import { Checkin, FileInfo, GroupSummary } from '../../types'
import { exerciseLabels } from '../../utils/format'
import './index.scss'

const defaultExerciseTypes = Object.entries(exerciseLabels)

export default function CheckinPage() {
  const [exerciseType, setExerciseType] = useState('strength')
  const [duration, setDuration] = useState('30')
  const [checkinDate, setCheckinDate] = useState('')
  const [groups, setGroups] = useState<GroupSummary[]>([])
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [images, setImages] = useState<FileInfo[]>([])
  const [saving, setSaving] = useState(false)
  const [viewOnly, setViewOnly] = useState(false)
  const [existingId, setExistingId] = useState('')
  const [auditStatus, setAuditStatus] = useState('')
  const [auditDetail, setAuditDetail] = useState('')
  const [canManage, setCanManage] = useState(false)
  const [exerciseTypes, setExerciseTypes] = useState(defaultExerciseTypes)

  useLoad(async options => {
    try {
      const [groupList, config] = await Promise.all([
        request<GroupSummary[]>('/groups'),
        request<Record<string, string>>('/config')
      ])
      try {
        const configured = JSON.parse(config.exerciseTypes || '[]') as Array<{ value: string; label: string }>
        if (configured.length) setExerciseTypes(configured.map(item => [item.value, item.label] as [string, string]))
      } catch {
        // 后端保存时已经校验 JSON；保留内置中文标签保证旧配置升级可用。
      }
      const activeGroups = groupList.filter(item => item.membershipStatus === 'active')
      setGroups(activeGroups)
      const checkin = options.id
        ? await request<Checkin>(`/checkins/${options.id}`)
        : await request<Checkin | null>('/checkins/today')
      if (checkin) {
        setExistingId(checkin.id)
        setAuditStatus(checkin.auditStatus)
        setAuditDetail(checkin.auditDetail || '')
        setCanManage(checkin.canManage)
        setCheckinDate(checkin.date)
        setExerciseType(checkin.exerciseType)
        setDuration(String(checkin.durationMinutes))
        setImages(checkin.images)
        setSelectedGroups(checkin.groupIds)
      } else {
        setSelectedGroups(activeGroups.map(item => item.id))
      }
      setViewOnly(options.view === '1')
    } catch (error) {
      showError(error)
    }
  })

  const toggleGroup = (id: string) => {
    if (viewOnly) return
    setSelectedGroups(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id])
  }

  const chooseImages = async () => {
    try {
      const result = await Taro.chooseMedia({
        count: 9 - images.length,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        sizeType: ['compressed']
      })
      Taro.showLoading({ title: '上传并审核中' })
      const uploaded: FileInfo[] = []
      for (const item of result.tempFiles) {
        uploaded.push(await uploadImage(item.tempFilePath, 'checkin'))
      }
      setImages(current => [...current, ...uploaded])
    } catch (error) {
      const err = error as { errMsg?: string }
      if (!err.errMsg?.includes('cancel')) showError(error)
    } finally {
      Taro.hideLoading()
    }
  }

  const requestReminderPermission = async () => {
    try {
      const config = await request<Record<string, string>>('/config')
      const templateId = config.reminderTemplateId
      if (!templateId) return
      const result = await Taro.requestSubscribeMessage({ tmplIds: [templateId] } as any)
      await request('/subscriptions', {
        method: 'POST',
        data: { templateId, accepted: result[templateId] === 'accept' }
      })
    } catch {
      // 打卡主流程不因用户拒绝订阅而失败
    }
  }

  const deleteCheckin = async () => {
    const confirmed = await Taro.showModal({
      title: '删除这条打卡？',
      content: '运动记录和私密照片都会永久删除，无法恢复。',
      confirmText: '确认删除',
      confirmColor: '#d53b2e'
    })
    if (!confirmed.confirm) return
    try {
      await request(`/checkins/${existingId}`, { method: 'DELETE' })
      Taro.showToast({ title: '打卡已删除', icon: 'success' })
      setTimeout(() => Taro.navigateBack(), 700)
    } catch (error) {
      showError(error)
    }
  }

  const save = async () => {
    const minutes = Number(duration)
    if (!minutes || minutes < 1 || minutes > 1440) {
      Taro.showToast({ title: '请输入有效运动时长', icon: 'none' })
      return
    }
    setSaving(true)
    try {
      const saved = await request<Checkin>('/checkins/today', {
        method: 'PUT',
        data: {
          exerciseType,
          durationMinutes: minutes,
          groupIds: selectedGroups,
          imageFileIds: images.map(item => item.id)
        }
      })
      await Taro.showToast({
        title: saved.auditStatus === 'pending'
          ? '打卡已提交，正在审核'
          : (existingId ? '今日打卡已更新' : '今日鸽王资格已取消'),
        icon: 'success'
      })
      void requestReminderPermission()
      setTimeout(() => Taro.navigateBack(), 900)
    } catch (error) {
      showError(error)
    } finally {
      setSaving(false)
    }
  }

  if (viewOnly) {
    return (
      <View className='page checkin-page'>
        {auditStatus === 'rejected' && (
          <View className='audit-warning card'>
            <Text className='audit-warning-title'>这条打卡未通过审核</Text>
            <Text>{auditDetail || '你可以返回今日打卡页修改后重新提交。'}</Text>
          </View>
        )}
        <View className='checkin-read-hero'>
          <Text className='read-emoji'>MOVE</Text>
          <Text className='read-date'>{checkinDate}</Text>
          <Text className='read-type'>{exerciseLabels[exerciseType]}</Text>
          <Text className='read-duration'>{duration} 分钟</Text>
        </View>
        {images.length > 0 && <Image className='read-image' src={images[0].url} mode='aspectFill' />}
        <View className='privacy-note card'>照片和运动详情仅自己可见，小组成员只能看到今天是否完成。</View>
        {canManage && <Button className='danger-button delete-checkin' onClick={deleteCheckin}>删除这条打卡</Button>}
      </View>
    )
  }

  return (
    <View className='page checkin-page'>
      <View className='checkin-heading'>
        <Text className='checkin-eyebrow'>{existingId ? 'EDIT TODAY' : 'CLOCK IN'}</Text>
        <Text className='checkin-title'>{existingId ? '更新今天的\n运动记录。' : '记录运动，\n只给自己看。'}</Text>
      </View>
      {auditStatus === 'rejected' && (
        <View className='audit-warning card'>
          <Text className='audit-warning-title'>这条打卡未通过审核</Text>
          <Text>{auditDetail || '请调整私密照片后重新提交。'}</Text>
        </View>
      )}

      <Text className='field-label'>运动类型</Text>
      <View className='exercise-grid'>
        {exerciseTypes.map(([value, label]) => (
          <View
            key={value}
            className={`exercise-chip ${exerciseType === value ? 'active' : ''}`}
            onClick={() => setExerciseType(value)}
          >
            <Text>{label}</Text>
          </View>
        ))}
      </View>

      <View className='checkin-form card'>
        <View className='field'>
          <Text className='field-label'>记录日期</Text>
          <View className='readonly-date'>今天 · 自动记录</View>
        </View>
        <View className='field'>
          <Text className='field-label'>运动时长（分钟）</Text>
          <Input className='input' type='number' value={duration} onInput={event => setDuration(event.detail.value)} />
        </View>
      </View>

      <Text className='section-title'>私密运动照片</Text>
      <Text className='privacy-copy'>照片仅保存在你的个人记录中，不会向小组成员展示。</Text>
      <View className='image-grid'>
        {images.map(image => (
          <View className='image-item' key={image.id}>
            <Image src={image.url} mode='aspectFill' />
            <Text className='image-remove' onClick={() => setImages(current => current.filter(item => item.id !== image.id))}>×</Text>
          </View>
        ))}
        {images.length < 9 && <View className='image-add' onClick={chooseImages}><Text>＋</Text><Text>照片</Text></View>}
      </View>

      <Text className='section-title'>同步完成状态</Text>
      <Text className='privacy-copy'>小组只会看到“今天已完成”，不会看到运动类型、时长或照片。</Text>
      <View className='publish-groups card'>
        {groups.length
          ? groups.map(group => (
              <View className='publish-group' key={group.id} onClick={() => toggleGroup(group.id)}>
                <View className={`custom-check ${selectedGroups.includes(group.id) ? 'checked' : ''}`}>
                  {selectedGroups.includes(group.id) && '✓'}
                </View>
                <View className='publish-copy'>
                  <Text className='publish-name'>{group.name}</Text>
                  <Text className='publish-meta'>{group.memberCount} 人正在互相监督</Text>
                </View>
              </View>
            ))
          : <View className='empty'>暂未加入小组，本次打卡只保存到自己的日历。</View>}
      </View>

      <Button className='primary-button save-checkin' loading={saving} disabled={saving} onClick={save}>
        {existingId ? '保存今日修改' : '完成打卡，取消鸽王资格'}
      </Button>
    </View>
  )
}
