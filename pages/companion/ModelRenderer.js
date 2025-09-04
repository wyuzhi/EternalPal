import { getThree } from "../../miniprogram_npm/@douyin-microapp/microapp-ar-three/three";

class ModelRenderer {
  constructor() {
    this.THREE = null;
    this.renderer = null; // 当前用于渲染的渲染器
    this.rendererA = null; // 双缓冲渲染器A
    this.rendererB = null; // 双缓冲渲染器B
    this.scene = null;
    this.camera = null;
    this.canvas = null; // 页面2D画布
    this.ctx2d = null;  // 2D上下文
    this.offscreenCanvas = null; // 当前用于渲染的离屏画布
    this.offscreenCanvasA = null; // 离屏缓冲A
    this.offscreenCanvasB = null; // 离屏缓冲B
    this.displayCanvas = null; // 当前用于拷贝到2D画布的离屏缓冲（上一帧）
    this.useAAsRender = true; // 标记当前是否使用A作为渲染源
    this.model = null;
    this.animationId = null;
    this.isInitialized = false;
    this.textureFlipY = true; // 纹理翻转开关（如仍有差异可切换）
    // 动画相关
    this.clock = null;
    this.animationEnabled = true;
    this.animationIntensity = 1.0; // 0-2 建议
    this.baseModelY = 0;
    this.baseModelScale = 1;
  }

  // 在抖音小程序环境中安全加载纹理（优先使用 canvas.createImage）
  loadTextureFromUrl(textureUrl) {
    return new Promise((resolve, reject) => {
      try {
        const creator = (this.offscreenCanvas && this.offscreenCanvas.createImage)
          || (this.canvas && this.canvas.createImage);
        if (creator) {
          const img = creator();
          img.onload = () => {
            try {
              const tex = new this.THREE.Texture(img);
              // 纹理质量与颜色空间配置（避免失真/偏灰）
              const isPOT = (n) => (n & (n - 1)) === 0;
              const pot = isPOT(img.width) && isPOT(img.height);
              tex.flipY = this.textureFlipY ? true : false;
              tex.generateMipmaps = !!pot;
              tex.minFilter = pot ? this.THREE.LinearMipmapLinearFilter : this.THREE.LinearFilter;
              tex.magFilter = this.THREE.LinearFilter;
              // 使用边缘夹取，避免UV超出时出现平铺花纹
              tex.wrapS = this.THREE.ClampToEdgeWrapping;
              tex.wrapT = this.THREE.ClampToEdgeWrapping;
              if (this.THREE.SRGBColorSpace) {
                tex.colorSpace = this.THREE.SRGBColorSpace;
              } else if (this.THREE.sRGBEncoding) {
                tex.encoding = this.THREE.sRGBEncoding;
              }
              const caps = this.renderer && this.renderer.capabilities;
              if (caps && caps.getMaxAnisotropy) {
                tex.anisotropy = Math.min(8, caps.getMaxAnisotropy());
              }
              tex.needsUpdate = true;
              resolve(tex);
            } catch (e) { reject(e); }
          };
          img.onerror = (e) => reject(e);
          img.src = textureUrl;
          return;
        }
        // 兜底：使用Three自带的TextureLoader
        const loader = new this.THREE.TextureLoader();
        loader.load(textureUrl, (tex) => {
          tex.flipY = this.textureFlipY ? true : false;
          tex.minFilter = this.THREE.LinearFilter;
          tex.magFilter = this.THREE.LinearFilter;
          tex.generateMipmaps = false;
          tex.wrapS = this.THREE.ClampToEdgeWrapping;
          tex.wrapT = this.THREE.ClampToEdgeWrapping;
          if (this.THREE.SRGBColorSpace) {
            tex.colorSpace = this.THREE.SRGBColorSpace;
          } else if (this.THREE.sRGBEncoding) {
            tex.encoding = this.THREE.sRGBEncoding;
          }
          resolve(tex);
        }, undefined, (err) => reject(err));
      } catch (e) {
        reject(e);
      }
    });
  }

  async init(canvasId) {
    try {
      console.log('[ModelRenderer] 开始初始化，canvasId:', canvasId);
      
      // 获取canvas节点与布局信息（使用真实节点渲染，而非离屏）
      const query = tt.createSelectorQuery();
      console.log('[ModelRenderer] 创建选择器查询');
      const { canvasNode, rect } = await new Promise((resolve, reject) => {
        query
          .select(`#${canvasId}`)
          .node()
          .select(`#${canvasId}`)
          .boundingClientRect()
          .exec((res) => {
            const nodeRes = res && res[0];
            const rectRes = res && res[1];
            if (nodeRes && nodeRes.node && rectRes) {
              resolve({ canvasNode: nodeRes.node, rect: rectRes });
            } else {
              reject(new Error('Canvas node or rect not found'));
            }
          });
      });

      // 页面2D画布
      this.canvas = canvasNode;
      this.ctx2d = this.canvas.getContext('2d');
      const dpr = tt.getSystemInfoSync ? tt.getSystemInfoSync().pixelRatio : 1;
      // 将逻辑尺寸转换为物理像素，避免清晰度与渲染区域错位
      this.canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      this.canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      // 2D 画布绘制优化，避免闪烁
      if (this.ctx2d && typeof this.ctx2d.imageSmoothingEnabled === 'boolean') {
        this.ctx2d.imageSmoothingEnabled = true;
      }
      if (this.ctx2d) {
        this.ctx2d.globalCompositeOperation = 'copy';
      }
      console.log('[ModelRenderer] 获取到Canvas节点(2D)，逻辑尺寸:', rect.width, 'x', rect.height, 'DPR:', dpr, '物理尺寸:', this.canvas.width, 'x', this.canvas.height);

      // 创建离屏WebGL画布（A/B）
      this.offscreenCanvasA = tt.createOffscreenCanvas({ type: 'webgl', width: this.canvas.width, height: this.canvas.height });
      this.offscreenCanvasB = tt.createOffscreenCanvas({ type: 'webgl', width: this.canvas.width, height: this.canvas.height });
      console.log('[ModelRenderer] 创建离屏WebGL Canvas A/B 成功');

      // 获取Three.js实例（基于A初始化）
      this.THREE = getThree(this.offscreenCanvasA);
      console.log('[ModelRenderer] 获取Three.js实例成功');
      this.clock = new this.THREE.Clock();

      // 初始化两个渲染器
      this.rendererA = new this.THREE.WebGLRenderer({
        canvas: this.offscreenCanvasA,
        alpha: true,
        premultipliedAlpha: false,
        stencil: false,
        preserveDrawingBuffer: true,
        antialias: true,
      });
      this.rendererB = new this.THREE.WebGLRenderer({
        canvas: this.offscreenCanvasB,
        alpha: true,
        premultipliedAlpha: false,
        stencil: false,
        preserveDrawingBuffer: true,
        antialias: true,
      });
      [this.rendererA, this.rendererB].forEach((r) => {
        r.setPixelRatio(dpr);
        r.setSize(this.canvas.width, this.canvas.height, false);
        // 背景透明，交由页面背景渲染
        r.setClearColor(0x000000, 0);
        r.autoClear = true;
        if (this.THREE.SRGBColorSpace && r.outputColorSpace !== undefined) {
          r.outputColorSpace = this.THREE.SRGBColorSpace;
        } else if (this.THREE.sRGBEncoding && r.outputEncoding !== undefined) {
          r.outputEncoding = this.THREE.sRGBEncoding;
        }
      });

      // 初始选择A渲染，B显示
      this.renderer = this.rendererA;
      this.offscreenCanvas = this.offscreenCanvasA;
      this.displayCanvas = this.offscreenCanvasB;
      this.useAAsRender = true;
      console.log('[ModelRenderer] 双渲染器尺寸设置完成:', this.canvas.width, 'x', this.canvas.height);
      
      // 初始化场景
      this.scene = new this.THREE.Scene();
      console.log('[ModelRenderer] 场景创建成功');
      
      // 初始化相机
      this.camera = new this.THREE.PerspectiveCamera(
        75,
        this.offscreenCanvas.width / this.offscreenCanvas.height,
        0.1,
        1000
      );
      this.camera.position.set(0, 0, 5);
      console.log('[ModelRenderer] 相机创建成功，位置:', this.camera.position);
      
      // 添加更强的环境光
      const ambientLight = new this.THREE.AmbientLight(0x404040, 0.6);
      this.scene.add(ambientLight);
      console.log('[ModelRenderer] 环境光添加成功');
      
      // 添加主方向光
      const directionalLight = new this.THREE.DirectionalLight(0xffffff, 1.0);
      directionalLight.position.set(1, 1, 1);
      this.scene.add(directionalLight);
      console.log('[ModelRenderer] 主方向光添加成功');
      
      // 添加补充光源
      const fillLight = new this.THREE.DirectionalLight(0xffffff, 0.5);
      fillLight.position.set(-1, 0, 1);
      this.scene.add(fillLight);
      console.log('[ModelRenderer] 补充光源添加成功');
      
      // 测试立方体已移除，直接使用真实模型
      
      this.isInitialized = true;
      console.log('[ModelRenderer] 初始化完成');
      
      return true;
    } catch (error) {
      console.error('[ModelRenderer] 初始化失败:', error);
      return false;
    }
  }

  loadOBJModel(modelUrl, materialUrl, textureUrl) {
    if (!this.isInitialized) {
      console.error('[ModelRenderer] 渲染器未初始化');
      return Promise.reject(new Error('ModelRenderer not initialized'));
    }

    console.log('[ModelRenderer] 开始加载OBJ模型:', modelUrl, '材质:', materialUrl || '无', '纹理:', textureUrl || '无');
    
    return new Promise((resolve, reject) => {
      const objLoader = new this.THREE.OBJLoader();
      console.log('[ModelRenderer] OBJLoader创建成功');

      const onObjectLoaded = (object) => {
        console.log('[ModelRenderer] 模型加载成功，对象:', object);
        if (this.model) {
          this.scene.remove(this.model);
        }
        if (textureUrl) {
          this.loadTextureFromUrl(textureUrl).then((texture) => {
            object.traverse((child) => {
              if (child.isMesh) {
                const material = child.material ? child.material.clone() : new this.THREE.MeshStandardMaterial();
                material.map = texture;
                material.needsUpdate = true;
                // 统一使用物理或标准材质，启用金属和粗糙度默认值，贴图以 sRGB 显示
                material.metalness = material.metalness != null ? material.metalness : 0.1;
                material.roughness = material.roughness != null ? material.roughness : 0.6;
                child.material = material;
              }
            });
          }).catch((e) => {
            console.warn('[ModelRenderer] 纹理加载失败，继续默认材质:', e);
          });
          // OBJ 的 UV 有时需要翻转V轴，提供快速测试开关
          if (this.textureFlipY) {
            object.traverse((child) => {
              if (child.isMesh && child.material && child.material.map) {
                child.material.map.center = new this.THREE.Vector2(0.5, 0.5);
                child.material.map.rotation = Math.PI; // 180度旋转等价于U/V翻转
                child.material.map.needsUpdate = true;
              }
            });
          }
        } else {
          let applied = 0;
          object.traverse((child) => {
            if (child.isMesh && !child.material) {
              applied++;
              child.material = new this.THREE.MeshLambertMaterial({ color: 0xffffff });
            }
          });
          console.log('[ModelRenderer] 默认材质应用数量:', applied);
        }

        const box = new this.THREE.Box3().setFromObject(object);
        const center = box.getCenter(new this.THREE.Vector3());
        const size = box.getSize(new this.THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 3.8 / maxDim; // 再放大一些
        object.scale.setScalar(scale);
        object.position.sub(center.multiplyScalar(scale));
        this.camera.position.set(0, 1, 4);
        this.camera.lookAt(0, 0, 0);

        this.model = object;
        this.scene.add(this.model);
        // 记录基础位置/缩放，供动画偏移使用
        this.baseModelY = this.model.position.y;
        this.baseModelScale = this.model.scale.x;
        this.renderer.render(this.scene, this.camera);
        if (this.ctx2d) {
          this.ctx2d.drawImage(this.displayCanvas, 0, 0, this.canvas.width, this.canvas.height);
        }
        resolve(object);
      };

      const loadObjWithOptionalMtl = () => {
        objLoader.load(
          modelUrl,
          (object) => onObjectLoaded(object),
          (progress) => { console.log('[ModelRenderer] 加载进度:', progress); },
          (error) => { console.error('[ModelRenderer] 模型加载失败:', error); reject(error); }
        );
      };

      if (materialUrl && this.THREE.MTLLoader) {
        try {
          const mtlLoader = new this.THREE.MTLLoader();
          mtlLoader.load(materialUrl, (materials) => {
            try { materials.preload(); objLoader.setMaterials(materials); } catch (e) { console.warn('[ModelRenderer] 材质预处理失败:', e); }
            loadObjWithOptionalMtl();
          }, undefined, (err) => { console.warn('[ModelRenderer] 材质加载失败:', err); loadObjWithOptionalMtl(); });
        } catch (e) {
          console.warn('[ModelRenderer] 创建MTLLoader失败:', e);
          loadObjWithOptionalMtl();
        }
      } else {
        loadObjWithOptionalMtl();
      }
    });
  }

  startAnimation() {
    if (!this.isInitialized) {
      console.log('[ModelRenderer] 渲染器未初始化，无法启动动画');
      return;
    }

    console.log('[ModelRenderer] 启动动画循环');
    let frameCount = 0;
    
    const animate = () => {
      const raf = (this.canvas && this.canvas.requestAnimationFrame) || requestAnimationFrame;
      this.animationId = raf(animate);
      
      // 程序化Idle动画：轻微左右摆动 + 上下浮动 + 呼吸缩放
      if (this.model && this.animationEnabled) {
        const delta = this.clock ? this.clock.getDelta() : 1/60;
        const t = (this._idleT || 0) + delta;
        this._idleT = t;
        const intensity = this.animationIntensity;
        // 缓慢自转（可读性强）
        this.model.rotation.y += 0.3 * delta * intensity;
        // 上下浮动
        const bob = Math.sin(t * 2.0) * 0.06 * intensity; // 约6%单位
        this.model.position.y = this.baseModelY + bob;
        // 轻微呼吸缩放
        const breathe = 1.0 + Math.sin(t * 1.6) * 0.02 * intensity;
        const s = this.baseModelScale * breathe;
        this.model.scale.setScalar(s);
      }
      
      // 无测试立方体
      
      // 每120帧输出一次调试信息，降低日志干扰
      if (frameCount % 120 === 0) {
        console.log('[ModelRenderer] 渲染帧:', frameCount, '场景对象数:', this.scene.children.length);
        if (this.model) {
          console.log('[ModelRenderer] 模型旋转:', this.model.rotation.y, '位置:', this.model.position, '缩放:', this.model.scale);
          console.log('[ModelRenderer] 模型可见性:', this.model.visible, '子对象数:', this.model.children.length);
        }
        // 无测试立方体日志
        console.log('[ModelRenderer] 相机位置:', this.camera.position, '目标:', this.camera.getWorldDirection(new this.THREE.Vector3()));
      }
      
      // 渲染到当前渲染缓冲
      this.renderer.render(this.scene, this.camera);

      // 交换缓冲：当前渲染缓冲 <-> 显示缓冲
      if (this.useAAsRender) {
        this.renderer = this.rendererB;
        this.offscreenCanvas = this.offscreenCanvasB;
        this.displayCanvas = this.offscreenCanvasA;
      } else {
        this.renderer = this.rendererA;
        this.offscreenCanvas = this.offscreenCanvasA;
        this.displayCanvas = this.offscreenCanvasB;
      }
      this.useAAsRender = !this.useAAsRender;

      // 将上一帧（显示缓冲）拷贝到2D画布
      if (this.ctx2d) {
        this.ctx2d.drawImage(this.displayCanvas, 0, 0, this.canvas.width, this.canvas.height);
      }
      frameCount++;
    };
    
    animate();
    console.log('[ModelRenderer] 动画循环已启动');
    
    // 立即渲染一帧并镜像
    this.renderer.render(this.scene, this.camera);
    if (this.ctx2d) {
      this.ctx2d.drawImage(this.displayCanvas, 0, 0, this.canvas.width, this.canvas.height);
    }
    console.log('[ModelRenderer] 立即渲染第一帧完成并镜像(双缓冲)');
  }

  stopAnimation() {
    console.log('[ModelRenderer] 停止动画循环');
    if (this.animationId) {
      const caf = (this.canvas && this.canvas.cancelAnimationFrame) || cancelAnimationFrame;
      caf(this.animationId);
      this.animationId = null;
      console.log('[ModelRenderer] 动画循环已停止');
    } else {
      console.log('[ModelRenderer] 没有运行中的动画需要停止');
    }
  }

  resetModelScale() {
    console.log('[ModelRenderer] 重置模型缩放');
    if (this.model) {
      // 重新计算模型的原始大小和位置
      const box = new this.THREE.Box3().setFromObject(this.model);
      const center = box.getCenter(new this.THREE.Vector3());
      const size = box.getSize(new this.THREE.Vector3());
      
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 2 / maxDim;
      this.model.scale.setScalar(scale);
      
      this.model.position.copy(center).multiplyScalar(-scale);
      console.log('[ModelRenderer] 模型缩放已重置');
    } else {
      console.log('[ModelRenderer] 没有模型可以重置');
    }
  }

  dispose() {
    console.log('[ModelRenderer] 开始销毁渲染器');
    this.stopAnimation();
    
    if (this.model) {
      console.log('[ModelRenderer] 移除模型');
      this.scene.remove(this.model);
      this.model = null;
    }
    
    if (this.renderer) {
      console.log('[ModelRenderer] 销毁WebGL渲染器');
      this.renderer.dispose();
      this.renderer = null;
    }
    
    this.scene = null;
    this.camera = null;
    this.canvas = null;
    this.ctx2d = null;
    this.offscreenCanvas = null;
    this.THREE = null;
    this.isInitialized = false;
    console.log('[ModelRenderer] 渲染器销毁完成');
  }
}

export default ModelRenderer;