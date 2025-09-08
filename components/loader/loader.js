// d:\OneDrive\Codes\repo\EternalPal\components\loader\loader.js
Component({
  data: {
    // 组件内部数据
  },
  properties: {
    // 组件对外属性
    size: {
      type: String,
      value: '35px'
    },
    color: {
      type: String,
      value: '#333'
    },
    speed: {
      type: String,
      value: '0.8s'
    }
  },
  observers: {
    // 监听属性变化
    'size, color, speed': function(size, color, speed) {
      // 属性变化时会自动更新模板中的样式绑定
    }
  },
  methods: {
    // 组件方法
  }
})