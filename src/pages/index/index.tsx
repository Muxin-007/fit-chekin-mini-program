import { Button, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro'
import { useCallback, useState } from 'react'
import Avatar from '../../components/Avatar'
import { request, showError } from '../../services/api'
import { HomeData } from '../../types'
import { exerciseLabels, formatTime } from '../../utils/format'
import './index.scss'

export default function Index() {
  const [data, setData] = useState<HomeData>()
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      setData(await request<HomeData>('/home'))
    } catch (error) {
      showError(error)
    } finally {
      setLoading(false)
      Taro.stopPullDownRefresh()
    }
  }, [])

  useDidShow(() => { void load() })
  usePullDownRefresh(() => { void load() })

  const goCheckin = () => Taro.navigateTo({ url: '/pages/checkin/index' })

  if (loading && !data) {
    return <View className='page home-loading'>正在叫醒你的运动搭子…</View>
  }

  return (
    <View className='page home'>
      <View className='home-header'>
        <View>
          <Text className='eyebrow'>TODAY · 今天不鸽</Text>
          <Text className='home-title'>再鸽一天？{'\n'}不如现在练。</Text>
        </View>
        <View className='streak-pill'>
          <Text className='streak-fire'>↗</Text>
          <Text>{data?.stats.currentStreak || 0} 天</Text>
        </View>
      </View>

      <View className={`hero-card ${data?.todayChecked ? 'is-done' : ''}`}>
        <Text className='hero-kicker'>{data?.todayChecked ? '今日任务完成' : '今天还没练'}</Text>
        <Text className='hero-main'>
          {data?.todayChecked ? '鸽王资格\n已取消' : '别等状态，\n先动起来。'}
        </Text>
        <Text className='hero-note'>
          {data?.todayChecked
            ? `已连续打卡 ${data.stats.currentStreak} 天，明天继续盯你。`
            : '哪怕只有 10 分钟，也算今天赢了一次。'}
        </Text>
        <Button className='hero-action' onClick={goCheckin}>
          {data?.todayChecked ? '修改今日打卡  →' : '立即打卡  →'}
        </Button>
        <Text className='hero-mark'>{data?.todayChecked ? '✓' : 'GO'}</Text>
      </View>

      <View className='stats-row'>
        <View className='stat-card'>
          <Text className='stat-value'>{data?.stats.monthCount || 0}</Text>
          <Text className='stat-label'>本月打卡</Text>
        </View>
        <View className='stat-card dark'>
          <Text className='stat-value'>{data?.stats.totalMinutes || 0}</Text>
          <Text className='stat-label'>累计分钟</Text>
        </View>
        <View className='stat-card'>
          <Text className='stat-value'>{data?.stats.longestStreak || 0}</Text>
          <Text className='stat-label'>最长连续</Text>
        </View>
      </View>

      <View className='section-heading'>
        <Text className='section-title'>我的小组</Text>
        <Text className='section-link' onClick={() => Taro.switchTab({ url: '/pages/groups/index' })}>全部 →</Text>
      </View>
      {data?.groups.length
        ? <ScrollView scrollX className='group-strip' enhanced showScrollbar={false}>
            <View className='group-strip-inner'>
              {data.groups.map(group => (
                <View
                  key={group.id}
                  className='home-group-card card'
                  onClick={() => Taro.navigateTo({ url: `/pages/group-detail/index?id=${group.id}` })}
                >
                  <View className='group-card-top'>
                    <Avatar file={group.avatar} name={group.name} />
                    <Text className={`status-dot ${group.currentChecked ? 'done' : ''}`} />
                  </View>
                  <Text className='group-name'>{group.name}</Text>
                  <Text className='group-progress'>今天 {group.checkedCount} / {group.memberCount} 人</Text>
                  <View className='progress-track'>
                    <View
                      className='progress-value'
                      style={{ width: `${group.memberCount ? group.checkedCount / group.memberCount * 100 : 0}%` }}
                    />
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        : <View className='empty card' onClick={() => Taro.navigateTo({ url: '/pages/group-create/index' })}>
            还没有监督你的搭子。<Text className='empty-link'>创建第一个小组 →</Text>
          </View>}

      <Text className='section-title'>刚刚有人没鸽</Text>
      <View className='activity-list card'>
        {data?.activities.length
          ? data.activities.map(activity => (
              <View
                className='activity-item'
                key={activity.checkinId}
                onClick={() => Taro.navigateTo({ url: `/pages/checkin/index?id=${activity.checkinId}&view=1` })}
              >
                <Avatar file={activity.avatar} name={activity.nickname} className='activity-avatar' />
                <View className='activity-copy'>
                  <Text className='activity-name'>{activity.nickname}</Text>
                  <Text className='activity-desc'>
                    {exerciseLabels[activity.exerciseType]} · {activity.durationMinutes} 分钟
                  </Text>
                </View>
                <Text className='activity-time'>{formatTime(activity.checkinAt)}</Text>
              </View>
            ))
          : <View className='empty'>今天还很安静，你来打破僵局吧。</View>}
      </View>
    </View>
  )
}
