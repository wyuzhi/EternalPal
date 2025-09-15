const app = getApp();

Page({
  data: {
    appInfo: {
      name: 'Linki Eternal Pal',
      version: 'v 0.1.0',
      description: 'Linki（Eternal Pal/E Pal）是一款AI原生的数字宠物情感陪伴应用，通过AI技术重现用户的宠物形象，实现对话互动与情感链接，Linki让逝去或缺席的陪伴得以延续，为用户带来真实而温暖的情感链接。',
      logo: '/images/logo.svg',
      features: [
        {
          name: '宠物形象重建',
          backgroundImage: '/images/settings/il3.svg'
        },
        {
          name: '情感陪伴',
          backgroundImage: '/images/settings/il1.svg'
        },
        {
          name: '互动对话',
          backgroundImage: '/images/settings/il2.svg'
        },
      ]
    },
    timeline: [
      {
        date: '2025-09-08',
        title: '核心功能开发',
        description: '完成宠物创建、AI对话、基础交互功能',
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
