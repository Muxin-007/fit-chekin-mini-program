import { Image, Text, View } from '@tarojs/components'
import { FileInfo } from '../types'

export default function Avatar({ file, name, className = '' }: { file?: FileInfo; name: string; className?: string }) {
  return (
    <View className={`avatar ${className}`}>
      {file?.url
        ? <Image src={file.url} mode='aspectFill' style={{ width: '100%', height: '100%' }} />
        : <Text className='avatar-fallback'>{name.slice(0, 1) || '鸽'}</Text>}
    </View>
  )
}
