import { Text, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { useState } from 'react'
import { request, showError } from '../../services/api'
import './index.scss'

export default function LegalPage() {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  useLoad(async options => {
    const type = options.type === 'privacyPolicy' ? 'privacyPolicy' : 'userAgreement'
    setTitle(type === 'privacyPolicy' ? '隐私政策' : '用户协议')
    Taro.setNavigationBarTitle({ title: type === 'privacyPolicy' ? '隐私政策' : '用户协议' })
    try {
      const config = await request<Record<string, string>>('/config')
      setContent(config[type] || '内容暂未配置。')
    } catch (error) {
      showError(error)
    }
  })

  return (
    <View className='page legal-page'>
      <Text className='legal-kicker'>再鸽一天</Text>
      <Text className='legal-title'>{title}</Text>
      <View className='legal-content card'>{content}</View>
      <Text className='legal-note'>本产品用于运动记录和熟人小组监督，不提供医疗诊断、治疗或康复建议。</Text>
    </View>
  )
}
