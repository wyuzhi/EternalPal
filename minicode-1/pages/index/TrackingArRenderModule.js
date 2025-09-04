import { getThree } from "../../miniprogram_npm/@douyin-microapp/microapp-ar-three/three";

let THREE = null;
let renderer = null;
let mixedScene = null;
let mixedCamera = null;
let cameraTexture = null;

let trackingModel0 = null;
let trackingModel1 = null;
let trackingModelGroup = null;

function setMatrix(matrix, mat4) {
  matrix.set(...mat4);
}

const modelUrl = "https://lf3-developer.bytemastatic.com/obj/developer/misc/AI_AR_demo/logo.obj";

let lastModelId = null;

function loadOBJModel(modelUrl) {
  const loader = new THREE.OBJLoader();
  loader.load(
    modelUrl,
    function (loadedMesh) {
      tt.showToast({
        title: "模型加载成功",
        duration: 2000,
        success(res) {},
        fail(res) {
          console.log(`showToast failed`);
        },
      });
      trackingModel1 = loadedMesh;
      trackingModel1.matrixAutoUpdate = false;
      trackingModel1.visible = false;
      trackingModelGroup.add(trackingModel1);
      console.log("trackingModelGroup = ", trackingModelGroup);

      const cubeMaterial = new THREE.MeshLambertMaterial({ color: "white" });

      trackingModel1.children.forEach(function (child) {
        child.material = cubeMaterial;
      });

      mixedScene.add(trackingModelGroup);
    },
    undefined,
    function (e) {
      tt.showToast({
        title: "模型加载失败",
        duration: 2000,
        success(res) {
          console.log(`${res}`);
        },
        fail(res) {
          console.log(`showToast failed`);
        },
      });
      console.error("load model error :: ", e);
    }
  );
}

export function initModule(_canvas) {
  THREE = getThree(_canvas);
  cameraTexture = new THREE.DataTexture();

  mixedScene = new THREE.Scene();
  mixedScene.background = cameraTexture;

  // mixedCamera = new THREE.OrthographicCamera(
  //   _canvas.width / -2,
  //   _canvas.width / 2,
  //   _canvas.height / 2,
  //   _canvas.height / -2,
  //   1,
  //   1000
  // );
  mixedCamera = new THREE.PerspectiveCamera(60, _canvas.width / _canvas.height, 0.1, 10000);

  trackingModelGroup = new THREE.Group();

  const cubeGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
  const cubeMaterial = new THREE.MeshNormalMaterial({
    side: THREE.DoubleSide,
  });
  trackingModel0 = new THREE.Mesh(cubeGeometry, cubeMaterial);
  trackingModel0.matrixAutoUpdate = false;
  trackingModel0.visible = false;

  trackingModelGroup.add(trackingModel0);

  var modelLight = new THREE.HemisphereLight(0xffffff, 0x444444);
  modelLight.position.set(0, 20, 0);
  mixedScene.add(modelLight);

  loadOBJModel(modelUrl);

  renderer = new THREE.WebGLRenderer({
    canvas: _canvas,
    alpha: true,
    premultipliedAlpha: false,
    stencil: false,
    preserveDrawingBuffer: true,
  });
}

export function onAlgorithmResult(algorithmResult) {
  console.log("algorithmResult.objectId = ", algorithmResult.objectId);
  if (algorithmResult.objectId == -1) return;
  if (trackingModelGroup.children.length < algorithmResult.objectId) {
    console.error(
      `objectId = ${algorithmResult.objectId} not exist in model group!`
    );
    return;
  }

  if (lastModelId == null) {
    lastModelId = algorithmResult.objectId - 1;
    trackingModelGroup.children[lastModelId].visible = true;
  } else if (lastModelId != algorithmResult.objectId - 1) {
    trackingModelGroup.children[lastModelId].visible = false;
    lastModelId = algorithmResult.objectId - 1;
    trackingModelGroup.children[lastModelId].visible = true;
  }

  setMatrix(
    trackingModelGroup.children[lastModelId].matrix,
    algorithmResult.pose
  );
  setMatrix(mixedCamera.projectionMatrix, algorithmResult.projection);
}

export function onFrame(cameraData) {
  if (cameraTexture.image.data == null) {
    cameraTexture.copy(
      new THREE.DataTexture(
        cameraData.data,
        cameraData.width,
        cameraData.height,
        THREE.RGBAFormat
      )
    );
    cameraTexture.flipY = true;
  } else {
    cameraTexture.image.data = cameraData.data;
  }

  cameraTexture.needsUpdate = true;
  renderer.render(mixedScene, mixedCamera);
}
