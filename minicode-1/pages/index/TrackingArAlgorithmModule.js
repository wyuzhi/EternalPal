let algorithmManager = null;
let width,
  height = null;
let cb = null;
let loadModelSuccess = false;
export function initTrackingArAlgorithm(_width, _height, onResultFallback) {
  cb = onResultFallback;
  width = _width;
  height = _height;

  const algModelPath = "https://lf3-developer.bytemastatic.com/obj/developer/misc/AI_AR_demo/recognition_model.dat"

  tt.downloadFile({
    url: algModelPath,
    success(res) {
      const options = {
        trackingAr: {
          modelPath: res.tempFilePath
        },
      };

      tt.getAlgorithmManager({
        width: _width,
        height: _height,
        useSyncMode: true,
        requirements: ["trackingAr"],
        options: options,
        success: (algMgr) => {
          console.log("get algorithm Manager ~");
          console.log(algMgr);
          algorithmManager = algMgr.algorithmManager;
        },
        fail: (errMsg) => {
          console.log(errMsg);
        },
        complete: () => {
          console.log("get alg mgr complete");
        },
      });
    },
    fail(res) {
      console.log(`downloadFile调用失败`);
    },
  });
}

export function onFrame(cameraData) {
  if (algorithmManager != null) {
    algorithmManager.doExecute({
      input: cameraData,
      width: width,
      height: height,
      timeStamp: Date.now() / 1e9,
      success: (algMgr) => {
        cb(algMgr);
      },
      fail: (errMsg) => {
        console.log(errMsg);
      },
    });
  }
}
