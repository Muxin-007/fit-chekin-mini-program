import { Text, View } from '@tarojs/components'
import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro'
import { useCallback, useMemo, useState } from 'react'
import { request, showError } from '../../services/api'
import { CalendarData, Checkin } from '../../types'
import { exerciseLabels } from '../../utils/format'
import './index.scss'

function monthString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function calendarCells(month: string) {
  const [year, monthNumber] = month.split('-').map(Number)
  const first = new Date(year, monthNumber - 1, 1)
  const days = new Date(year, monthNumber, 0).getDate()
  const mondayOffset = (first.getDay() + 6) % 7
  return [
    ...Array.from({ length: mondayOffset }, () => 0),
    ...Array.from({ length: days }, (_, index) => index + 1)
  ]
}

export default function CalendarPage() {
  const [month, setMonth] = useState(monthString(new Date()))
  const [data, setData] = useState<CalendarData>()
  const [selected, setSelected] = useState<Checkin>()

  const load = useCallback(async (targetMonth = month) => {
    try {
      const result = await request<CalendarData>(`/checkins/calendar?month=${targetMonth}`)
      setData(result)
      setSelected(undefined)
    } catch (error) {
      showError(error)
    } finally {
      Taro.stopPullDownRefresh()
    }
  }, [month])

  useDidShow(() => { void load() })
  usePullDownRefresh(() => { void load() })

  const records = useMemo(() => new Map(data?.items.map(item => [Number(item.date.slice(-2)), item]) || []), [data])
  const cells = useMemo(() => calendarCells(month), [month])

  const moveMonth = (offset: number) => {
    const [year, monthNumber] = month.split('-').map(Number)
    const next = monthString(new Date(year, monthNumber - 1 + offset, 1))
    setMonth(next)
    void load(next)
  }

  return (
    <View className='page calendar-page'>
      <View className='calendar-hero'>
        <Text className='calendar-eyebrow'>CONSISTENCY BEATS MOTIVATION</Text>
        <Text className='calendar-title'>坚持这件事，{'\n'}日历最诚实。</Text>
      </View>

      <View className='calendar-stats'>
        <View><Text className='calendar-stat-value'>{data?.stats.currentStreak || 0}</Text><Text className='calendar-stat-label'>当前连续</Text></View>
        <View><Text className='calendar-stat-value'>{data?.stats.monthCount || 0}</Text><Text className='calendar-stat-label'>本月打卡</Text></View>
        <View><Text className='calendar-stat-value'>{data?.stats.longestStreak || 0}</Text><Text className='calendar-stat-label'>最长连续</Text></View>
      </View>

      <View className='calendar-card card'>
        <View className='month-nav'>
          <Text className='month-arrow' onClick={() => moveMonth(-1)}>←</Text>
          <Text className='month-label'>{month.replace('-', ' / ')}</Text>
          <Text className='month-arrow' onClick={() => moveMonth(1)}>→</Text>
        </View>
        <View className='weekday-row'>
          {['一', '二', '三', '四', '五', '六', '日'].map(day => <Text key={day}>{day}</Text>)}
        </View>
        <View className='calendar-grid'>
          {cells.map((day, index) => {
            const record = records.get(day)
            return (
              <View
                key={`${day}-${index}`}
                className={`day-cell ${record ? 'checked' : ''} ${selected?.id === record?.id ? 'selected' : ''}`}
                onClick={() => record && setSelected(record)}
              >
                {day > 0 && <Text>{day}</Text>}
                {record && <Text className='day-dot'>✓</Text>}
              </View>
            )
          })}
        </View>
      </View>

      {selected
        ? <View className='selected-record card' onClick={() => Taro.navigateTo({ url: `/pages/checkin/index?id=${selected.id}&view=1` })}>
            <View>
              <Text className='record-date'>{selected.date}</Text>
              <Text className='record-title'>{exerciseLabels[selected.exerciseType]} · {selected.durationMinutes} 分钟</Text>
              <Text className='record-copy'>个人运动记录 · 仅自己可见</Text>
            </View>
            <Text className='record-arrow'>→</Text>
          </View>
        : <View className='calendar-hint'>点击有 ✓ 的日期，看看那天为什么没鸽。</View>}

      <View className='total-minutes'>
        <Text className='total-number'>{data?.stats.totalMinutes || 0}</Text>
        <Text className='total-label'>累计运动分钟{'\n'}每一分钟都算数</Text>
      </View>
    </View>
  )
}
