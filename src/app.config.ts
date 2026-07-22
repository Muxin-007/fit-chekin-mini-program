export default defineAppConfig({
  lazyCodeLoading: 'requiredComponents',
  pages: [
    'pages/index/index',
    'pages/groups/index',
    'pages/calendar/index',
    'pages/profile/index',
    'pages/checkin/index',
    'pages/group-create/index',
    'pages/group-detail/index',
    'pages/invite/index',
    'pages/legal/index'
  ],
  tabBar: {
    color: '#8b8c93',
    selectedColor: '#17181c',
    backgroundColor: '#ffffff',
    borderStyle: 'white',
    list: [
      { pagePath: 'pages/index/index', text: '今天' },
      { pagePath: 'pages/groups/index', text: '小组' },
      { pagePath: 'pages/calendar/index', text: '日历' },
      { pagePath: 'pages/profile/index', text: '我的' }
    ]
  },
  window: {
    backgroundTextStyle: 'dark',
    backgroundColor: '#f5f4ef',
    navigationBarBackgroundColor: '#f5f4ef',
    navigationBarTitleText: '再鸽一天',
    navigationBarTextStyle: 'black'
  }
})
