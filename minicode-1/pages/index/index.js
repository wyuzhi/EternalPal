const app = getApp();

Page({
  data: {},
  onLoad: function () {
    this.cameraContext = tt.createCameraContext();
  },
  initCanvasConfig() {
    tt.createSelectorQuery()
      .select("#canvas_type_webgl")
      .node()
      .exec((res) => {
        this.canvas = res[0].node;
        this.data.canvas2d = this.canvas;
        this.ctx = this.canvas.getContext("webgl");
        this.ctx.canvas.width = 480;
        this.ctx.canvas.height = 640;
        this.cameraContext = tt.createCameraContext();
        this.cameraListener = this.cameraContext.onCameraFrame((frame) => {
          this.canvas.requestAnimationFrame(() => {
            this.onFrame(frame);
          });
        });
        this.cameraListener.start();
      });
  },
  initModules() {
    if (this.trackingArRenderModule == null) {
      this.trackingArRenderModule = require("./TrackingArRenderModule");
      this.trackingArRenderModule.initModule(this.ctx.canvas);
    }

    if (this.trackingArAlgorithmModule == null) {
      this.trackingArAlgorithmModule = require("./TrackingArAlgorithmModule");
      this.trackingArAlgorithmModule.initTrackingArAlgorithm(
        this.ctx.canvas.width,
        this.ctx.canvas.height,
        this.trackingArRenderModule.onAlgorithmResult
      );
    }
  },
  onFrame(cameraFrame) {
    if (this.trackingArAlgorithmModule != null) {
      this.trackingArAlgorithmModule.onFrame(cameraFrame.data);
    }

    if (this.trackingArRenderModule != null) {
      this.trackingArRenderModule.onFrame(cameraFrame);
    }
  },
  onError(e) {
    tt.showModal({
      content: "相机出错了：" + e.detail.errMsg,
    });
  },
});