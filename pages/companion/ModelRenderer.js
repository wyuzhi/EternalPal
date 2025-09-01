// 抖音小程序AR-Three.js规范实现
// 实现ModelRenderer类，用于加载和渲染宠物3D模型
/**
 * ModelRenderer类 - 用于在抖音小程序中加载和渲染3D模型
 * 参考抖音开放平台官方文档中关于microapp-ar-three的实现规范
 */
class ModelRenderer {
  constructor() {
    // 基础属性初始化
    this.three = null;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.canvas = null;
    this.model = null;
    this.modelGroup = null;
    this.isRotating = false;
    this.rotationFrameId = null; // 替换interval，使用requestAnimationFrame的帧ID
    this.arThree = null;
  }

  /**
   * 初始化3D渲染器
   * @param {string} canvasId - canvas元素的ID
   * @returns {Promise<boolean>} - 初始化是否成功
   */
  async init(canvasId) {
    try {
      console.log('开始初始化3D渲染器');
      
      // 1. 获取canvas元素（抖音小程序官方节点查询方式）
      const canvasResult = await new Promise((resolve) => {
        const query = tt.createSelectorQuery();
        query.select(`#${canvasId}`)
          .node((res) => {
            resolve(res && res.node ? res.node : null);
          })
          .exec();
      });
      this.canvas = canvasResult;

      if (!this.canvas) {
        console.error('未找到canvas元素，请检查canvasId是否正确');
        return false;
      }

      // 2. 关键：提前重写事件方法（避免Three.js初始化时调用原生addEventListener）
      this.setupMiniProgramEventHandling();
      console.log('事件监听方法已提前重写，防止兼容性错误');

      // 3. 加载抖音官方AR-Three库（强制使用，不支持原生Three.js）
      try {
        const { getThree, ARThree } = require('../../miniprogram_npm/@douyin-microapp/microapp-ar-three/three');
        // 初始化ARThree实例（绑定canvas，确保环境适配）
        this.arThree = new ARThree({ canvas: this.canvas });
        // 通过AR实例获取适配后的Three对象
        this.three = await getThree(this.arThree);
        console.log('成功从microapp-ar-three获取适配版Three.js实例');
      } catch (error) {
        console.error('加载microapp-ar-three失败，请检查依赖安装:', error);
        console.error('解决方案：执行 npm install @douyin-microapp/microapp-ar-three --save');
        return false;
      }
      // 修正后的代码（替换上述块）
try {
  // 关键：从库的根目录index.js导入，而非three.js
  const arThreeLib = require('../../miniprogram_npm/@douyin-microapp/microapp-ar-three/index');
  // 1. 获取ARThree构造函数（最新版从index.js导出）
  const { ARThree } = arThreeLib;
  // 2. 获取getThree方法（部分版本中getThree在arThreeLib下，而非three.js）
  const getThree = arThreeLib.getThree || (() => Promise.resolve(arThreeLib.THREE));

  // 初始化ARThree实例（绑定canvas）
  this.arThree = new ARThree({ canvas: this.canvas });
  // 获取适配后的Three对象
  this.three = await getThree(this.arThree);
  
  console.log('成功从microapp-ar-three获取适配版Three.js实例');
} catch (error) {
  console.error('加载microapp-ar-three失败，详细错误:', error);
  console.error('排查步骤：1. 确认已安装最新版 2. 重新构建npm 3. 检查导入路径');
  return false;
}

      // 4. 检查THREE对象有效性
      if (!this.three || !this.three.Scene || !this.three.PerspectiveCamera || !this.three.WebGLRenderer) {
        console.error('获取的Three.js实例不完整，缺少核心构造函数');
        return false;
      }

      // 5. 创建场景
      this.scene = new this.three.Scene();
      console.log('场景创建成功');

      // 6. 创建相机（适配canvas尺寸）
      const canvasWidth = this.canvas.width || this.canvas.clientWidth;
      const canvasHeight = this.canvas.height || this.canvas.clientHeight;
      this.camera = new this.three.PerspectiveCamera(
        75, 
        canvasWidth / canvasHeight, 
        0.1, 
        1000
      );
      this.camera.position.z = 5; // 调整相机距离，确保模型可见
      console.log('透视相机创建成功，初始位置(z=5)');

      // 7. 创建WebGL渲染器（使用canvas上下文，避免自动事件绑定）
      try {
        // 获取小程序canvas的WebGL上下文
        const gl = this.canvas.getContext('webgl');
        if (!gl) {
          console.error('无法获取WebGL上下文，当前环境不支持3D渲染');
          return false;
        }

        // 精简配置：仅保留必要参数，减少事件触发点
        this.renderer = new this.three.WebGLRenderer({
          canvas: this.canvas,
          context: gl,        // 强制使用已有上下文，禁用Three.js自动创建
          alpha: true,        // 透明背景（适配小程序UI）
          antialias: false    // 关闭抗锯齿（小程序环境性能优化，如需可开启调试）
        });

        // 设置渲染尺寸（与canvas实际尺寸一致）
        this.renderer.setSize(canvasWidth, canvasHeight);
        // 设置透明背景（清除颜色alpha为0）
        this.renderer.setClearColor(0x000000, 0);
        console.log('WebGLRenderer创建成功，尺寸:', canvasWidth, 'x', canvasHeight);

        // 补充覆盖renderer.domElement的事件方法（防止Three.js后续操作）
        if (this.renderer.domElement && this.canvas.__overrideEventListener) {
          const override = this.canvas.__overrideEventListener;
          this.renderer.domElement.addEventListener = override.add;
          this.renderer.domElement.removeEventListener = override.remove;
          console.log('已覆盖renderer.domElement的事件监听');
        }

      } catch (rendererError) {
        console.error('创建WebGLRenderer失败:', rendererError);
        return false;
      }

      // 8. 创建模型组（统一管理模型，方便后续移除）
      this.modelGroup = new this.three.Group();
      this.scene.add(this.modelGroup);
      console.log('模型组创建成功，已添加到场景');

      // 9. 添加光源（确保模型可见）
      this.addLights();

      // 10. 初始渲染（绘制空场景，验证渲染器有效性）
      this.render();

      console.log('3D渲染器初始化完成，状态正常');
      return true;
    } catch (error) {
      console.error('初始化3D渲染器时发生全局错误:', error);
      return false;
    }
  }

  /**
   * 添加光源到场景（基础光照配置，适配大多数模型）
   */
  addLights() {
    try {
      // 环境光：照亮整个场景，无阴影
      const ambientLight = new this.three.AmbientLight(0xffffff, 0.6);
      this.scene.add(ambientLight);
      console.log('环境光添加成功，强度:0.6');

      // 方向光：模拟太阳光，产生阴影（增强立体感）
      const directionalLight = new this.three.DirectionalLight(0xffffff, 0.9);
      directionalLight.position.set(5, 10, 7.5); // 调整光源位置
      this.scene.add(directionalLight);
      console.log('方向光添加成功，位置:(5,10,7.5)，强度:0.9');
    } catch (error) {
      console.error('添加光源失败:', error);
    }
  }

  /**
   * 加载3D模型（仅支持OBJ格式，适配抖音小程序）
   * @param {string} modelUrl - 模型文件URL（本地路径或CDN，需配置白名单）
   * @returns {Promise<boolean>} - 加载是否成功
   */
  async loadModel(modelUrl) {
    try {
      console.log(`开始加载3D模型，URL: ${modelUrl}`);
      
      // 前置检查：渲染器必须已初始化
      if (!this.three || !this.scene || !this.renderer || !this.modelGroup) {
        console.error('加载模型失败：渲染器尚未初始化');
        return false;
      }

      // 检查模型URL有效性
      if (!modelUrl || typeof modelUrl !== 'string') {
        console.error('加载模型失败：模型URL为空或格式错误');
        return false;
      }

      // 移除旧模型（避免重复加载）
      this.removeModel();

      // 加载OBJ模型（使用抖音适配版加载器）
      return new Promise((resolve) => {
        try {
          // 从microapp-ar-three获取适配版OBJLoader
          const { OBJLoader } = require('../../miniprogram_npm/@douyin-microapp/microapp-ar-three/index');
          const loader = new OBJLoader(this.three); // 传入适配的Three实例

          // 提取模型基础路径（处理OBJ引用的材质文件）
          const basePathIndex = modelUrl.lastIndexOf('/');
          if (basePathIndex > 0) {
            const basePath = modelUrl.substring(0, basePathIndex + 1);
            loader.setPath(basePath);
            console.log('模型基础路径设置:', basePath);
          }

          // 执行加载
          loader.load(
            // 模型文件（相对路径，基于setPath的结果）
            modelUrl.substring(basePathIndex + 1),
            // 加载成功回调
            (object) => {
              try {
                this.model = object;
                // 调整模型缩放（根据实际模型大小调整，避免过大/过小）
                this.model.scale.set(0.5, 0.5, 0.5);
                // 调整模型位置（确保在相机视野内）
                this.model.position.y = -1; // 向下偏移，避免底部超出视野
                // 添加到模型组
                this.modelGroup.add(this.model);

                console.log('模型加载成功，已添加到场景');
                // 初始渲染（显示模型）
                this.render();
                // 开始自动旋转（增强交互体验）
                this.startRotation();
                resolve(true);
              } catch (processError) {
                console.error('处理加载的模型失败:', processError);
                // 加载失败时使用默认模型
                this.loadDefaultModel();
                resolve(true);
              }
            },
            // 加载进度回调
            (xhr) => {
              const percent = Math.round((xhr.loaded / xhr.total) * 100);
              console.log(`模型加载进度: ${percent}%`);
              // 可在此处添加进度条逻辑
            },
            // 加载失败回调
            (error) => {
              console.error('模型加载失败:', error);
              console.error('错误URL:', modelUrl);
              // 加载失败时使用默认立方体模型
              this.loadDefaultModel();
              resolve(true);
            }
          );
        } catch (loaderError) {
          console.error('创建OBJLoader失败:', loaderError);
          // 加载器创建失败时使用默认模型
          this.loadDefaultModel();
          resolve(true);
        }
      });
    } catch (error) {
      console.error('loadModel方法全局错误:', error);
      this.loadDefaultModel();
      return true;
    }
  }

  /**
   * 加载默认模型（立方体）- 当自定义模型加载失败时使用
   */
  loadDefaultModel() {
    try {
      console.log('开始加载默认立方体模型');
      
      // 创建立方体几何
      const geometry = new this.three.BoxGeometry(1, 1, 1);
      // 创建基础材质（绿色线框，便于区分默认模型）
      const material = new this.three.MeshBasicMaterial({
        color: 0x2ecc71, // 绿色
        wireframe: true  // 线框模式
      });
      // 创建立方体网格
      this.model = new this.three.Mesh(geometry, material);
      // 调整位置（与自定义模型一致）
      this.model.position.y = -1;
      // 添加到模型组
      this.modelGroup.add(this.model);

      console.log('默认立方体模型加载成功');
      // 渲染默认模型
      this.render();
      // 开始自动旋转
      this.startRotation();
    } catch (error) {
      console.error('加载默认模型失败:', error);
    }
  }

  /**
   * 开始模型自动旋转（使用requestAnimationFrame，适配小程序性能）
   */
  startRotation() {
    try {
      if (this.isRotating || !this.model) {
        console.log('跳过旋转启动：已在旋转或模型不存在');
        return;
      }

      this.isRotating = true;
      console.log('模型开始自动旋转（Y轴）');

      // 旋转逻辑（使用小程序requestAnimationFrame）
      const rotate = () => {
        // 检查旋转状态和模型有效性
        if (!this.isRotating || !this.model || !this.renderer) {
          this.stopRotation();
          return;
        }

        // 控制旋转速度（Y轴旋转，0.01弧度/帧）
        this.model.rotation.y += 0.01;
        // 执行渲染
        this.render();
        // 继续下一帧
        this.rotationFrameId = tt.requestAnimationFrame(rotate);
      };

      // 启动第一帧
      this.rotationFrameId = tt.requestAnimationFrame(rotate);

      // 监听页面隐藏事件（停止旋转，避免后台耗电）
      tt.onHide(() => {
        this.stopRotation();
      });

    } catch (error) {
      console.error('启动模型旋转失败:', error);
      this.isRotating = false;
    }
  }

  /**
   * 停止模型自动旋转
   */
  stopRotation() {
    try {
      if (!this.isRotating) return;

      // 取消动画帧
      if (this.rotationFrameId) {
        tt.cancelAnimationFrame(this.rotationFrameId);
        this.rotationFrameId = null;
      }

      this.isRotating = false;
      console.log('模型已停止旋转');
    } catch (error) {
      console.error('停止模型旋转失败:', error);
    }
  }

  /**
   * 渲染场景（核心渲染方法，安全检查避免崩溃）
   */
  render() {
    try {
      // 安全检查：确保渲染器、场景、相机均有效
      if (!this.renderer || !this.renderer.render || !this.scene || !this.camera) {
        console.warn('跳过渲染：核心组件不完整');
        return;
      }

      // 执行渲染（场景 → 相机 → canvas）
      this.renderer.render(this.scene, this.camera);
    } catch (error) {
      console.error('渲染场景失败:', error);
      // 若渲染失败，尝试重新初始化渲染器（容错处理）
      if (this.canvas && this.three) {
        try {
          const gl = this.canvas.getContext('webgl');
          if (gl) {
            this.renderer = new this.three.WebGLRenderer({ canvas: this.canvas, context: gl });
            console.log('渲染器已重新初始化，尝试恢复渲染');
            this.render();
          }
        } catch (recoverError) {
          console.error('恢复渲染器失败:', recoverError);
        }
      }
    }
  }

  /**
   * 重写事件监听方法（核心兼容性处理，避免addEventListener错误）
   */
  setupMiniProgramEventHandling() {
    try {
      if (!this.canvas) {
        console.warn('无法设置事件处理：canvas不存在');
        return;
      }

      // 定义空实现的事件方法（阻止Three.js调用原生方法）
      const emptyAddEventListener = function(type, listener, options) {
        console.warn(`已阻止Three.js添加[${type}]事件（小程序不兼容）`);
        // 空实现：不执行任何原生事件绑定
      };
      const emptyRemoveEventListener = function() {
        // 空实现：不执行任何原生事件移除
      };

      // 保存重写的方法，供后续renderer.domElement使用
      this.canvas.__overrideEventListener = {
        add: emptyAddEventListener,
        remove: emptyRemoveEventListener
      };

      // 重写canvas的addEventListener（使用defineProperty确保不可被覆盖）
      Object.defineProperty(this.canvas, 'addEventListener', {
        value: emptyAddEventListener,
        writable: true,   // 允许后续修改（如需恢复）
        configurable: true// 允许后续删除
      });

      // 重写canvas的removeEventListener
      Object.defineProperty(this.canvas, 'removeEventListener', {
        value: emptyRemoveEventListener,
        writable: true,
        configurable: true
      });

      console.log('canvas事件监听方法已重写，避免原生API冲突');
    } catch (error) {
      console.error('设置事件处理失败:', error);
      // 降级方案：直接赋值（当defineProperty失败时）
      this.canvas.addEventListener = () => console.warn('Three.js事件已禁用');
      this.canvas.removeEventListener = () => {};
      console.log('已使用降级方案禁用事件监听');
    }
  }

  /**
   * 移除当前模型（清理资源，避免内存泄漏）
   */
  removeModel() {
    try {
      // 先停止旋转
      this.stopRotation();

      // 移除模型引用
      if (this.model && this.modelGroup) {
        this.modelGroup.remove(this.model);
        this.model = null;
        console.log('旧模型已从场景中移除');
      }

      // 重新渲染空场景
      this.render();
    } catch (error) {
      console.error('移除模型失败:', error);
    }
  }

  /**
   * 销毁渲染器（页面卸载时调用，释放所有资源）
   */
  destroy() {
    try {
      console.log('开始销毁3D渲染器，释放资源');

      // 1. 停止旋转
      this.stopRotation();

      // 2. 移除模型
      this.removeModel();

      // 3. 清理场景（移除所有子元素）
      if (this.scene) {
        while (this.scene.children.length > 0) {
          this.scene.remove(this.scene.children[0]);
        }
      }

      // 4. 销毁渲染器（释放WebGL上下文）
      if (this.renderer) {
        if (this.renderer.dispose) {
          this.renderer.dispose();
        }
        this.renderer = null;
      }

      // 5. 清理AR实例
      if (this.arThree) {
        this.arThree = null;
      }

      // 6. 清空所有引用（帮助GC回收）
      this.three = null;
      this.scene = null;
      this.camera = null;
      this.canvas = null;
      this.modelGroup = null;

      console.log('3D渲染器销毁完成，资源已释放');
    } catch (error) {
      console.error('销毁渲染器失败:', error);
    }
  }
}

module.exports = ModelRenderer;