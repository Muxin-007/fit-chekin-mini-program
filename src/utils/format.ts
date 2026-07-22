export const exerciseLabels: Record<string, string> = {
  running: '跑步',
  walking: '走路',
  cycling: '骑行',
  strength: '力量训练',
  swimming: '游泳',
  yoga: '瑜伽',
  ball: '球类运动',
  rope: '跳绳',
  other: '其他'
}

export function formatTime(timestamp?: number) {
  if (!timestamp) return ''
  const date = new Date(timestamp * 1000)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}
