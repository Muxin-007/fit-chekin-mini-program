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
      {
        pagePath: 'pages/index/index',
        text: '今天',
        iconPath: 'assets/tabbar/today.png',
        selectedIconPath: 'assets/tabbar/today-active.png'
      },
      {
        pagePath: 'pages/groups/index',
        text: '小组',
        iconPath: 'assets/tabbar/groups.png',
        selectedIconPath: 'assets/tabbar/groups-active.png'
      },
      {
        pagePath: 'pages/calendar/index',
        text: '日历',
        iconPath: 'assets/tabbar/calendar.png',
        selectedIconPath: 'assets/tabbar/calendar-active.png'
      },
      {
        pagePath: 'pages/profile/index',
        text: '我的',
        iconPath: 'assets/tabbar/profile.png',
        selectedIconPath: 'assets/tabbar/profile-active.png'
      }
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
