Component({
  properties: {
    show: {
      type: Boolean,
      value: false
    },
    position: {
      type: String,
      value: 'center' // 'bottom' 或 'center'
    },
    zindex: {
      type: Number,
      value: 999999
    },
    maskClosable: {
      type: Boolean,
      value: true
    }
  },
  
  methods: {
    // 遮罩点击事件
    onMaskTap() {
      if (this.data.maskClosable) {
        this.triggerEvent('close');
      }
    },
    
    // 容器点击事件 - 阻止冒泡
    onContainerTap() {
      // 什么都不做，只是阻止事件冒泡
    },
    
    // 阻止滑动穿透
    onTouchMove() {
      return false;
    }
  }
});