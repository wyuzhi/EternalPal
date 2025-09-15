Component({
    properties: {
      show: {
        type: Boolean,
        value: false
      },
      position: {
        type: String,
        value: 'bottom' // 'bottom' 或 'center'
      },
      zindex: {
        type: Number,
        value: 999999
      }
    },
    
    methods: {
      // 供外部调用的hide方法，触发close事件
      hide() {
        console.log('popup hide method called');
        // 触发close事件，让外部组件可以设置show=false
        this.triggerEvent('close');
      },
      // mask关闭事件处理
      onMaskClose() {
        console.log('popup onMaskClose method called');
        this.triggerEvent('close');
      },
      // 容器点击事件处理
      onContainerTap(e) {
        console.log('popup onContainerTap called');
        // 阻止事件冒泡到mask，但不阻止内部按钮的点击
        e.stopPropagation();
      },
      // 阻止滑动穿透
      catchTouchMove() {
        return false;
      }
    }
  });