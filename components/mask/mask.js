Component({
  properties: {
    show: {
      type: Boolean,
      value: false
    },
    zindex: {
      type: Number
    }
  },
  methods: {
    hide: function() {
      console.log('mask hide method called');
      this.triggerEvent('close');
    },
    onMaskTap: function() {
      console.log('mask onMaskTap method called');
      this.triggerEvent('close');
    },
    catchTouchMove: function() {
      // 阻止滑动穿透，不执行任何操作，仅捕获事件
      return false;
    }
  }
});