const app = getApp();

Page({
  data: {
    appInfo: {
      name: 'Linki',
      version: 'v 0.1.0',
      description: 'Linki 以 AI 打造专属数字伙伴——灵仔，既能带来线上情感治愈，又能通过 NFC 3D 手办延伸到线下社交，实现虚拟与现实的双重陪伴。',
      logo: '/images/logo.svg',
      logo_name: '/images/logo_name.svg',
      // features: [
      //   {
      //     name: '宠物形象重建',
      //     backgroundImage: '/images/settings/il3.svg'
      //   },
      //   {
      //     name: '情感陪伴',
      //     backgroundImage: '/images/settings/il1.svg'
      //   },
      //   {
      //     name: '互动对话',
      //     backgroundImage: '/images/settings/il2.svg'
      //   },
      // ]
    },
    timeline: [
      {
        date: '2025-09-08',
        title: '核心功能开发',
        description: '完成灵仔创建、AI对话、基础交互功能',
        status: 'completed'
      },
      {
        date: '2025-08-18',
        title: '产品定位',
        description: '确定产品定位，开始技术调研和UI设计',
        status: 'completed'
      }
    ]
  },

  onLoad: function(options) {
    console.log('[Info] 关于页面加载');
    // 可以在这里加载更多动态信息
  },
});
