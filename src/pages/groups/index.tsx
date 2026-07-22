import { Button, Text, View } from '@tarojs/components'
import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro'
import { useCallback, useState } from 'react'
import Avatar from '../../components/Avatar'
import { request, showError } from '../../services/api'
import { GroupSummary } from '../../types'
import './index.scss'

export default function Groups() {
  const [groups, setGroups] = useState<GroupSummary[]>([])
  const [loaded, setLoaded] = useState(false)

  const load = useCallback(async () => {
    try {
      setGroups(await request<GroupSummary[]>('/groups'))
    } catch (error) {
      showError(error)
    } finally {
      setLoaded(true)
      Taro.stopPullDownRefresh()
    }
  }, [])

  useDidShow(() => { void load() })
  usePullDownRefresh(() => { void load() })

  return (
    <View className='page groups-page'>
      <View className='groups-intro'>
        <View>
          <Text className='eyebrow'>ACCOUNTABILITY CLUB</Text>
          <Text className='groups-title'>一群人，{'\n'}谁也别想鸽。</Text>
        </View>
        <Button className='create-fab' onClick={() => Taro.navigateTo({ url: '/pages/group-create/index' })}>＋</Button>
      </View>

      {loaded && !groups.length
        ? <View className='groups-empty'>
            <Text className='empty-illustration'>+1</Text>
            <Text className='empty-title'>暂时没人盯你</Text>
            <Text className='empty-desc'>创建一个小组，把邀请卡片发给最会监督你的朋友。</Text>
            <Button className='primary-button' onClick={() => Taro.navigateTo({ url: '/pages/group-create/index' })}>
              创建健身小组
            </Button>
          </View>
        : <View className='groups-list'>
            {groups.map((group, index) => (
              <View
                className={`group-row card tone-${index % 3}`}
                key={group.id}
                onClick={() => Taro.navigateTo({ url: `/pages/group-detail/index?id=${group.id}` })}
              >
                <View className='group-row-head'>
                  <Avatar file={group.avatar} name={group.name} className='group-avatar' />
                  <View className='group-row-copy'>
                    <View className='group-name-line'>
                      <Text className='group-row-name'>{group.name}</Text>
                      {group.role === 'admin' && <Text className='admin-tag'>管理员</Text>}
                      {group.membershipStatus === 'pending' && <Text className='pending-tag'>待审核</Text>}
                    </View>
                    <Text className='group-row-desc'>{group.description || '一起练，比一个人更难鸽。'}</Text>
                  </View>
                  <Text className='arrow'>→</Text>
                </View>
                <View className='group-metrics'>
                  <View>
                    <Text className='metric-strong'>{group.checkedCount}/{group.memberCount}</Text>
                    <Text className='metric-label'>今日完成</Text>
                  </View>
                  <View className='group-progress-large'>
                    <View
                      className='group-progress-fill'
                      style={{ width: `${group.memberCount ? group.checkedCount / group.memberCount * 100 : 0}%` }}
                    />
                  </View>
                  <Text className={group.currentChecked ? 'self-done' : 'self-waiting'}>
                    {group.currentChecked ? '我已打卡 ✓' : '我还在挣扎'}
                  </Text>
                </View>
              </View>
            ))}
          </View>}
    </View>
  )
}
