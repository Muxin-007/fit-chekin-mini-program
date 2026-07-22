import { Button, Image, Input, Switch, Text, Textarea, View } from '@tarojs/components'
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
  const [content, setContent] = useState('')
  const [calories, setCalories] = useState('')
  const [weight, setWeight] = useState('')
  const [weightPublic, setWeightPublic] = useState(false)
  const [mood, setMood] = useState('')
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
        setExerciseType(checkin.exerciseType)
        setDuration(String(checkin.durationMinutes))
        setContent(checkin.content)
        setCalories(checkin.calories == null ? '' : String(checkin.calories))
        setWeight(checkin.weight == null ? '' : String(checkin.weight))
        setWeightPublic(checkin.weightPublic)
        setMood(checkin.mood)
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
      content: '文字、图片和小组动态都会永久删除，无法恢复。',
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
          content: content.trim(),
          calories: calories ? Number(calories) : null,
          weight: weight ? Number(weight) : null,
          weightPublic,
          mood: mood.trim(),
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
          <Text className='read-type'>{exerciseLabels[exerciseType]}</Text>
          <Text className='read-duration'>{duration} 分钟</Text>
        </View>
        {images.length > 0 && <Image className='read-image' src={images[0].url} mode='aspectFill' />}
        <View className='read-copy card'>
          <Text className='read-mood'>{mood || '今天也认真完成了。'}</Text>
          <Text className='read-content'>{content || '这次打卡没有留下文字。'}</Text>
        </View>
        {canManage && <Button className='danger-button delete-checkin' onClick={deleteCheckin}>删除这条打卡</Button>}
      </View>
    )
  }

  return (
    <View className='page checkin-page'>
      <View className='checkin-heading'>
        <Text className='checkin-eyebrow'>{existingId ? 'EDIT TODAY' : 'CLOCK IN'}</Text>
        <Text className='checkin-title'>{existingId ? '今天还能练得\n更漂亮一点。' : '练了什么，\n大胆记下来。'}</Text>
      </View>
      {auditStatus === 'rejected' && (
        <View className='audit-warning card'>
          <Text className='audit-warning-title'>这条打卡未通过审核</Text>
          <Text>{auditDetail || '请调整文字或图片后重新提交。'}</Text>
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
        <View className='field two-column'>
          <View>
            <Text className='field-label'>运动时长（分钟）</Text>
            <Input className='input' type='number' value={duration} onInput={event => setDuration(event.detail.value)} />
          </View>
          <View>
            <Text className='field-label'>消耗热量（可选）</Text>
            <Input className='input' type='number' value={calories} placeholder='kcal' onInput={event => setCalories(event.detail.value)} />
          </View>
        </View>
        <View className='field'>
          <Text className='field-label'>今天练了什么</Text>
          <Textarea
            className='textarea'
            value={content}
            maxlength={500}
            placeholder='比如：腿部训练 4 组，最后一组差点想跑…'
            onInput={event => setContent(event.detail.value)}
          />
        </View>
        <View className='field'>
          <Text className='field-label'>一句话形容现在</Text>
          <Input className='input' value={mood} maxlength={100} placeholder='累，但很值。' onInput={event => setMood(event.detail.value)} />
        </View>
        <View className='field weight-row'>
          <View className='weight-input'>
            <Text className='field-label'>当前体重（可选）</Text>
            <Input className='input' type='digit' value={weight} placeholder='默认仅自己可见' onInput={event => setWeight(event.detail.value)} />
          </View>
          <View className='privacy-switch'>
            <Text className='field-label'>对组员公开</Text>
            <Switch checked={weightPublic} color='#17181c' onChange={event => setWeightPublic(event.detail.value)} />
          </View>
        </View>
      </View>

      <Text className='section-title'>打卡照片</Text>
      <View className='image-grid'>
        {images.map(image => (
          <View className='image-item' key={image.id}>
            <Image src={image.url} mode='aspectFill' />
            <Text className='image-remove' onClick={() => setImages(current => current.filter(item => item.id !== image.id))}>×</Text>
          </View>
        ))}
        {images.length < 9 && <View className='image-add' onClick={chooseImages}><Text>＋</Text><Text>照片</Text></View>}
      </View>

      <Text className='section-title'>发布到小组</Text>
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
