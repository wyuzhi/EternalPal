const app = getApp();

Page({
  data: {
    currentStep: 1, // 初始步骤
    totalSteps: 5,
    petType: '狗狗',
    petName: '',
    petGender: 'male',
    petPersonalities: [
      { id: 1, name: '活泼', icon: 'active', selected: false },
      { id: 2, name: '温柔', icon: 'gentle', selected: false },
      { id: 3, name: '独立', icon: 'independent', selected: false },
      { id: 4, name: '粘人', icon: 'sticky', selected: false },
      { id: 5, name: '聪明', icon: 'smart', selected: false },
      { id: 6, name: '调皮', icon: 'mischievous', selected: false },
      { id: 7, name: '凶猛', icon: 'fierce', selected: false },
      { id: 8, name: '安静', icon: 'quiet', selected: false },
      { id: 9, name: '随机', icon: 'random', selected: false }
    ],
    petHobbies: [
        { id: 1, name: '玩耍', icon: 'play', selected: false },
        { id: 2, name: '进食', icon: 'eat', selected: false },
        { id: 3, name: '睡觉', icon: 'sleep', selected: false },
        { id: 4, name: '拥抱', icon: 'cuddle', selected: false },
        { id: 5, name: '听音乐', icon: 'music', selected: false },
        { id: 6, name: '安静', icon: 'clean', selected: false }
      ],
    selectedPersonalities: [], // 只存储用户选择的性格名称
    selectedHobbies: [], // 只存储用户选择的爱好名称
    petStory: '',
    petPhotos: [],
    maxPhotos: 9,
    petDescription: '', // 宠物描述（没有照片时填写）
    generationProgress: 0,
    isGenerating: false,
    generatedPetImage: '', // 生成的宠物图片
    particles: [], // 粒子效果数据
    isLiked: false, // 是否喜欢
    modelLoaded: false, // 3D模型是否已加载
    modelUrl: '', // 3D模型URL
    supplementPersonality: '', // 补充性格描述
    supplementHobby: '', // 补充爱好描述
    checkInterval: null // 轮询定时器ID
  },
  
  // 从数据库查询指定用户的最新宠物信息
  queryLatestPetFromDatabase: function(userId) {
    const that = this;
    
    tt.showLoading({
      title: '正在获取灵伴信息...',
    });
    
    // 使用新的API获取用户的最新宠物信息
    tt.request({
      url: app.globalData.API_BASE_URL + '/users/' + userId + '/latest_pet',
      method: 'GET',
      success: function(res) {
        tt.hideLoading();
        console.log('获取用户最新宠物信息结果:', res);
        
        if (res.data && res.data.status === 'success' && res.data.data) {
          const latestPet = res.data.data;
          
          // 更新宠物信息并跳转到步骤5
          that.setData({
            generationProgress: 100,
            petId: latestPet.id,
            modelUrl: latestPet.model_url || '',
            modelLoaded: true,
            generatedPetImage: latestPet.generated_image || '/images/pet_sample.png',
            currentStep: 5
          });
          
          // 保存宠物信息到本地存储
          tt.setStorageSync('currentPet', latestPet);
          
          tt.showToast({
            title: '灵伴加载成功！',
            icon: 'success'
          });
        } else {
          // 没有获取到宠物信息，使用默认模型
          console.log('未获取到宠物信息，使用默认宠物');
          that.handleNoPetFound(userId);
        }
      },
      fail: function(error) {
        tt.hideLoading();
        console.error('获取用户最新宠物信息失败:', error);
        that.handleNoPetFound(userId);
      }
    });
  },
  
  // 当没有找到宠物时的处理方法
  handleNoPetFound: function(userId) {
    const that = this;
    
    // 创建包含基本宠物信息的对象
    const petInfo = {
      petName: that.data.petName || '我的萌宠',
      petType: that.data.petType || '猫咪',
      userId: userId
    };
    
    // 构建默认的模型URL
    const defaultModelUrl = '/models/' + (petInfo.petType === '狗狗' ? 'dog' : 'cat') + '.glb';
    
    // 直接创建宠物记录并跳转到步骤5
    that.createPetWithGeneratedModel(petInfo, defaultModelUrl);
  },

  
  onLoad: function() {
    console.log('宠物信息收集页面加载成功')
  },

  onReady: function() {
    // 页面渲染完成后，如果当前是步骤5，则加载3D模型
    if (this.data.currentStep === 5) {
      this.load3DModel()
    } else if (this.data.currentStep === 4) {
      // 如果当前是步骤4，则创建粒子效果
      this.createParticleEffect()
    }
  },

  // 监听步骤变化，当进入步骤5时加载3D模型，进入步骤4时创建粒子效果
  observers: {
    'currentStep': function(newStep) {
      if (newStep === 5 && !this.data.modelLoaded) {
        this.load3DModel()
      } else if (newStep === 4) {
        this.createParticleEffect()
      } else {
        // 离开步骤4时，清理粒子效果
        this.clearParticleEffect()
      }
    }
  },

  // 加载3D模型
  load3DModel: function() {
    // 模拟加载3D模型
    this.setData({
      modelUrl: '/models/' + this.data.petType + '.glb', // 假设的模型路径
      modelLoaded: true
    })

    // 在实际应用中，这里会初始化3D引擎并加载模型
    // 例如使用Three.js、Babylon.js等
    console.log('开始加载3D模型:', this.data.modelUrl)

    // 这里只是模拟，实际项目中需要根据使用的3D引擎进行相应的实现
    const modelContainer = tt.createSelectorQuery().select('#modelContainer')
    modelContainer.boundingClientRect((rect) => {
      if (rect) {
        console.log('3D模型容器尺寸:', rect.width, 'x', rect.height)
        // 在这里初始化3D引擎并加载模型到容器中
      }
    }).exec()
  },

  // 选择宠物类型
  selectPetType: function(e) {
    this.setData({
      petType: e.currentTarget.dataset.type,
      showCustomInput: false
    })
  },

  // 输入自定义宠物类型
  inputCustomPetType: function(e) {
    // 只有当输入不是默认的四个宠物类型时，才更新petType
    const inputValue = e.detail.value;
    const defaultTypes = ['狗狗', '猫咪', '小鸟', '兔兔'];
    
    if (!defaultTypes.includes(inputValue) && inputValue !== '自定义') {
      this.setData({
        petType: inputValue
      });
    }
  },

  // 宠物图标加载错误处理
  onPetIconError: function() {
    console.error('宠物图标加载失败，使用默认图标');
    // 这里可以设置一个默认图标或其他处理逻辑
  },

  // 自定义宠物类型输入框失去焦点时的处理
  onCustomPetTypeBlur: function(e) {
    const inputValue = e.detail.value.trim();
    
    // 如果输入不为空且不是默认类型，则设置为宠物类型
    const defaultTypes = ['狗狗', '猫咪', '小鸟', '兔兔'];
    if (inputValue && !defaultTypes.includes(inputValue) && inputValue !== '自定义') {
      this.setData({
        petType: inputValue
      });
      
      // 显示提示
      tt.showToast({
        title: '宠物类型已设置为' + inputValue,
        icon: 'none'
      });
    }
  },

  // 随机选择性格
  randomPersonality: function() {
    // 排除随机选项本身
    const nonRandomPersonalities = this.data.petPersonalities.filter(item => item.icon !== 'random');
    const randomIndex = Math.floor(Math.random() * nonRandomPersonalities.length);
    const randomPersonality = nonRandomPersonalities[randomIndex];
    
    // 更新随机选择的性格状态
    const updatedPersonalities = this.data.petPersonalities.map(item => {
      if (item.id === randomPersonality.id) {
        return { ...item, selected: !item.selected };
      }
      return item;
    });
    
    // 更新数据层 - 只存储名称
      const selectedPersonalities = updatedPersonalities
        .filter(item => item.selected && item.icon !== 'random')
        .map(item => item.name);
    
    this.setData({
      petPersonalities: updatedPersonalities,
      selectedPersonalities: selectedPersonalities
    });
    
    tt.showToast({
      title: '已随机选择：' + randomPersonality.name,
      icon: 'none'
    });
  },

  // 输入宠物名称
  inputPetName: function(e) {
    this.setData({
      petName: e.detail.value
    })
  },

  // 选择宠物性别
  selectPetGender: function(e) {
    this.setData({
      petGender: e.currentTarget.dataset.gender
    })
  },

  // 输入补充性格描述
  inputSupplementPersonality: function(e) {
    this.setData({
      supplementPersonality: e.detail.value
    })
  },

  // 输入补充爱好描述
  inputSupplementHobby: function(e) {
    this.setData({
      supplementHobby: e.detail.value
    })
  },

  // 选择宠物性格
  selectPersonality: function(e) {
    const personalityId = e.currentTarget.dataset.id
    
    // 更新展示层
    const updatedPersonalities = this.data.petPersonalities.map(item => {
      if (item.id === personalityId) {
        return { ...item, selected: !item.selected }
      }
      return item
    })
    
    // 更新数据层 - 只存储名称
    const selectedPersonalities = updatedPersonalities
      .filter(item => item.selected && item.icon !== 'random')
      .map(item => item.name);

    this.setData({
      petPersonalities: updatedPersonalities,
      selectedPersonalities: selectedPersonalities
    })
    
    // 获取当前操作的性格信息
    const personalityItem = updatedPersonalities.find(item => item.id === personalityId);
    if (personalityItem) {
      tt.showToast({
        title: personalityItem.selected ? `已选择${personalityItem.name}` : `已取消选择${personalityItem.name}`,
        icon: 'none',
        duration: 1500
      })
    }
  },

  // 选择宠物爱好
  selectHobby: function(e) {
    const hobbyId = e.currentTarget.dataset.id
    
    // 更新展示层
    const updatedHobbies = this.data.petHobbies.map(item => {
      if (item.id === hobbyId) {
        return { ...item, selected: !item.selected }
      }
      return item
    })
    
    // 更新数据层 - 只存储名称
    const selectedHobbies = updatedHobbies
      .filter(item => item.selected)
      .map(item => item.name);

    this.setData({
      petHobbies: updatedHobbies,
      selectedHobbies: selectedHobbies
    })
    
    // 获取当前操作的爱好信息
    const hobbyItem = updatedHobbies.find(item => item.id === hobbyId);
    if (hobbyItem) {
      tt.showToast({
        title: hobbyItem.selected ? `已选择${hobbyItem.name}` : `已取消选择${hobbyItem.name}`,
        icon: hobbyItem.selected ? 'success' : 'none',
        duration: 1500
      })
    }
  },

  // 输入宠物故事
  inputPetStory: function(e) {
    this.setData({
      petStory: e.detail.value
    })
  },

  // 输入宠物描述（没有照片时）
  inputPetDescription: function(e) {
    this.setData({
      petDescription: e.detail.value
    })
  },

  // 创建灵伴
  createPet: function() {
    // 验证当前步骤表单
    if (!this.validateCurrentStep()) return

    // 输出收集的所有数据作为调试信息
    console.log('收集的宠物信息数据:', JSON.stringify(this.data, null, 2))

    this.setData({
      currentStep: 4
    })

    this.startGenerating()
  },

  // 上传宠物照片
  uploadPetPhotos: function() {
    const that = this
    const remainingPhotos = this.data.maxPhotos - this.data.petPhotos.length

    if (remainingPhotos <= 0) {
      tt.showToast({
        title: '最多上传9张照片',
        icon: 'none'
      })
      return
    }

    // 直接调用 chooseImage
    tt.chooseImage({
      count: remainingPhotos,
      success: function(res) {
        // 显示上传进度提示
        tt.showLoading({
          title: '图片上传中...'
        })

        // 上传每张选中的图片
        const uploadPromises = res.tempFilePaths.map(tempFilePath => {
          return new Promise((resolve, reject) => {
            tt.uploadFile({
              url: app.globalData.API_BASE_URL + '/upload',
              filePath: tempFilePath,
              name: 'file',
              success: function(uploadRes) {
                try {
                  const data = JSON.parse(uploadRes.data)
                  if (data.status === 'success') {
                    resolve(data.file_url)
                  } else {
                    reject(new Error(data.message || '上传失败'))
                  }
                } catch (e) {
                  reject(new Error('上传响应解析失败'))
                }
              },
              fail: function(err) {
                reject(new Error('上传网络错误'))
              }
            })
          })
        })

        // 等待所有图片上传完成
        Promise.all(uploadPromises)
          .then(uploadedUrls => {
            const newPhotos = that.data.petPhotos.concat(uploadedUrls)
            that.setData({
              petPhotos: newPhotos
            })
            tt.hideLoading()
            tt.showToast({
              title: '图片上传成功',
              icon: 'success'
            })
          })
          .catch(error => {
            tt.hideLoading()
            tt.showToast({
              title: '部分图片上传失败',
              icon: 'none'
            })
            console.error('图片上传错误:', error)
          })
      },
      fail: function(err) {
        console.error('选择图片失败', err)
      }
    });
  },

  // 删除宠物照片
  deletePetPhoto: function(e) {
    const index = e.currentTarget.dataset.index
    const petPhotos = this.data.petPhotos
    petPhotos.splice(index, 1)
    this.setData({
      petPhotos: petPhotos
    })
  },

  // 下一步
  nextStep: function() {
    if (this.data.currentStep >= this.data.totalSteps) return

    // 验证当前步骤表单
    if (!this.validateCurrentStep()) return

    this.setData({
      currentStep: this.data.currentStep + 1
    })

    // 如果进入最后一步，开始生成宠物
    if (this.data.currentStep === this.data.totalSteps) {
      this.startGenerating()
    }
  },

  // 上一步
  prevStep: function() {
    if (this.data.currentStep <= 1) return

    this.setData({
      currentStep: this.data.currentStep - 1
    })
  },

  // 验证当前步骤表单
  validateCurrentStep: function() {
    switch (this.data.currentStep) {
      case 1:
        if (!this.data.petName.trim()) {
          tt.showToast({
            title: '请输入宠物名称',
            icon: 'none'
          })
          return false
        }
        if (this.data.selectedPersonalities.length === 0) {
          tt.showToast({
            title: '请选择宠物性格',
            icon: 'none'
          })
          return false
        }
        return true
      case 2:
        // 故事可以不填
        return true
      case 3:
        if (this.data.petPhotos.length === 0 && !this.data.petDescription.trim()) {
          tt.showToast({
            title: '请上传宠物照片或描述宠物特征',
            icon: 'none'
          })
          return false
        }
        return true
      default:
        return true
    }
  },

  // 喜欢宠物
  likePet: function() {
    if (!this.data.isLiked) {
      this.setData({
        isLiked: true
      })
      tt.showToast({
        title: '已添加到喜欢',
        icon: 'success'
      })
    }
  },

  // 不喜欢宠物，重新生成
  dislikePet: function() {
    this.setData({
      currentStep: 4,
      generationProgress: 0,
      isLiked: false
    })
    this.startGenerating()
  },

  // 切换喜欢状态（保留以兼容旧代码）
  toggleLike: function() {
    this.setData({
      isLiked: !this.data.isLiked
    })
  },

  // 重新生成宠物（保留以兼容旧代码）
  regeneratePet: function() {
    this.setData({
      currentStep: 4,
      generationProgress: 0
    })
    this.startGenerating()
  },

  // 保存宠物并跳转到 companion 页面
  savePet: function() {
    tt.navigateTo({
      url: '/pages/companion/companion',
      success: function(res) {
        console.log('跳转成功', res)
      },
      fail: function(err) {
        console.error('跳转失败', err)
        tt.showToast({
          title: '跳转失败',
          icon: 'none'
        })
      }
    })
  },

  // 创建粒子效果
  createParticleEffect: function() {
    // 先清理已有的粒子效果
    this.clearParticleEffect()

    // 在小程序中，我们使用数据绑定来创建粒子效果
    const particleCount = 20 // 粒子数量
    const particles = []

    // 生成粒子数据
    for (let i = 0; i < particleCount; i++) {
      // 随机粒子大小 (rpx)
      const size = Math.random() * 16 + 8
      // 随机初始位置 (rpx)
      const x = Math.random() * (300 - size)
      const y = Math.random() * (300 - size)
      // 随机速度 (rpx/frame)
      const vx = (Math.random() - 0.5) * 1
      const vy = (Math.random() - 0.5) * 1
      // 随机颜色
      const color = `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.random() * 0.8 + 0.2})`

      particles.push({
        id: i,
        size: size,
        x: x,
        y: y,
        vx: vx,
        vy: vy,
        color: color
      })
    }

    // 存储粒子数据到data
    this.setData({
      particles: particles
    })

    // 动画循环
    this.particleAnimation = setInterval(() => {
      const updatedParticles = this.data.particles.map(particle => {
        let x = particle.x + particle.vx
        let y = particle.y + particle.vy
        let vx = particle.vx
        let vy = particle.vy

        // 边界检测 (300rpx 是粒子区域的尺寸)
        if (x < 0 || x > 300 - particle.size) {
          vx = -vx
        }
        if (y < 0 || y > 300 - particle.size) {
          vy = -vy
        }

        return {
          ...particle,
          x: x,
          y: y,
          vx: vx,
          vy: vy
        }
      })

      // 更新粒子数据
      this.setData({
        particles: updatedParticles
      })
    }, 16)
  },

  // 清理粒子效果
  clearParticleEffect: function() {
    if (this.particleAnimation) {
      clearInterval(this.particleAnimation)
      this.particleAnimation = null
    }

    // 清空粒子数据
    this.setData({
      particles: []
    })
  },

 
  
  // 使用生成的模型创建宠物记录
  createPetWithGeneratedModel: function(taskInfo, modelUrl) {
    const that = this
    
    tt.showLoading({
      title: '正在创建灵伴...',
    })
    
    tt.request({
      url: app.globalData.API_BASE_URL + '/pets',
      method: 'POST',
      data: {
        name: taskInfo.petName || '我的萌宠',
        type: taskInfo.petType,
        gender: that.data.petGender,
        personality: that.data.selectedPersonalities.join(','),
        hobby: that.data.selectedHobbies.join(','),
        story: that.data.petDescription,
        generated_image: that.data.petPhotos && that.data.petPhotos.length > 0 ? that.data.petPhotos[0] : '',
        model_url: modelUrl,
        user_id: taskInfo.userId
      },
      success: function(res) {
        tt.hideLoading()
        
        if (res.statusCode === 201 || (res.data && res.data.status === 'success')) {
          // 保存宠物ID和模型URL到本地，并跳转到步骤5
          that.setData({
            generationProgress: 100,
            petId: res.data?.pet_id || 'unknown',
            modelUrl: modelUrl,
            modelLoaded: true,
            generatedPetImage: '/images/pet_sample.png',
            currentStep: 5
          })
          
          tt.showToast({
            title: '灵伴创建成功！',
            icon: 'success'
          })
        } else {
          tt.showToast({
            title: '创建灵伴失败：' + (res.data?.message || '未知错误'),
            icon: 'none'
          })
        }
      },
      fail: function(err) {
        tt.hideLoading()
        console.error('创建宠物失败', err)
        tt.showToast({
          title: '创建灵伴失败，请稍后重试',
          icon: 'none'
        })
      }
    })
  },
  
  // 开始生成宠物
  startGenerating: function() {
    const that = this
    this.setData({
      currentStep: 4,
      generationProgress: 0
    })


    // 从本地存储获取用户信息
    const userInfo = tt.getStorageSync('userInfo') || {}
    const userId = userInfo.id
    
    if (!userId) {
      tt.hideLoading()
      tt.showToast({
        title: '用户未登录，无法生成灵伴',
        icon: 'none'
      })
      return
    }

    // 模拟进度条更新
    const timer = setInterval(function() {
      let progress = that.data.generationProgress + 5
      if (progress >= 100) {
        progress = 100
      }
      that.setData({
        generationProgress: progress
      })
    }, 200)

 
    
    // 设置3分钟(180秒)后自动跳转至步骤5
    const autoRedirectTimer = setTimeout(function() {
      console.log('3分钟自动计时结束，尝试从数据库查询宠物信息并跳转到步骤5')
      
      // 清除进度条计时器
      clearInterval(timer)
      
      // 从数据库查询最新的宠物信息和模型URL
      that.queryLatestPetFromDatabase(userId)
      tt.navigateTo({
        url: '/pages/companion/companion'
      })
    }, 180000) // 180000毫秒 = 3分钟
    
    // 调用新的集成API，先创建3D模型再保存宠物
    // 增加超时时间到10分钟，因为3D模型生成可能需要较长时间
    tt.request({
        url: app.globalData.API_BASE_URL + '/pets/create-with-3d',
        method: 'POST',
        timeout: 600000, // 增加到10分钟超时时间
        data: {
          name: that.data.petName || '我的萌宠',
          type: that.data.petType,
          gender: that.data.petGender,
          personality: that.data.selectedPersonalities.join(','),
          hobby: that.data.selectedHobbies.join(','),
          story: that.data.petDescription,
          generated_image: that.data.petPhotos && that.data.petPhotos.length > 0 ? that.data.petPhotos[0] : '',
          user_id: userId,
        },
        success: function(res) {
          clearInterval(timer)
          // 清除5分钟自动跳转计时器
          clearTimeout(autoRedirectTimer)
          tt.hideLoading()
          console.log('宠物和3D模型生成响应:', res)
          
          // 增加更详细的日志
          if (res.data) {
            console.log('响应数据:', res.data)
            console.log('状态码:', res.statusCode)
          } else {
            console.error('响应数据为空')
          }
          
          // 处理响应
          if (res.statusCode === 202 && res.data && res.data.status === 'pending') {
            // 202状态码表示请求已接受但处理尚未完成（3D模型生成是异步的）
            // 保存宠物ID到本地，但不立即跳转到步骤5
            that.setData({
              generationProgress: 50, // 标记为处理中
              petId: res.data.pet_id,
              taskId: res.data.task_id,
              // 继续停留在步骤4，显示等待状态
              currentStep: 4
            })
            
            tt.showToast({
              title: '宠物创建成功，3D模型正在生成中...',
              icon: 'none',
              duration: 3000
            })
            
            // 开始轮询检查3D模型生成状态
            that.startCheckingModelStatus(res.data.pet_id, res.data.task_id)
          } else if (res.statusCode === 201 || (res.data && res.data.status === 'success')) {
            // 如果是同步生成成功（这种情况在当前实现中应该不会发生）
            that.setData({
              generationProgress: 100,
              petId: res.data?.pet_id || 'unknown',
              modelUrl: res.data?.model_url || res.data?.file_urls?.OBJ?.url || res.data?.file_urls?.GIF?.url || '',
              modelLoaded: true,
              generatedPetImage: '/images/pet_sample.png',
              //currentStep: 5
            })
            tt.navigateTo({
              url: '/pages/companion/companion'
            })
            tt.showToast({
              title: '灵伴和3D模型生成成功！',
              icon: 'success'
            })
          } else {
            // 生成失败，停留在步骤4并显示错误提示
            that.setData({
              generationProgress: 0
            })
            tt.showToast({
              title: '生成失败：' + (res.data?.message || '未知错误'),
              icon: 'none'
            })
          }
      },
   

    })
  },

  // 开始轮询检查3D模型生成状态
  startCheckingModelStatus: function(petId, taskId) {
    const that = this;
    let checkInterval = null;
    let checkCount = 0;
    const maxCheckCount = 60; // 最多检查60次（大约10分钟）
    const checkDelay = 10000; // 每10秒检查一次
    
    // 清除之前可能存在的轮询
    if (that.checkInterval) {
      clearInterval(that.checkInterval);
    }
    
    // 创建轮询
    checkInterval = setInterval(() => {
      checkCount++;
      console.log(`检查3D模型生成状态 (${checkCount}/${maxCheckCount}) - petId: ${petId}, taskId: ${taskId}`);
      
      // 调用API检查宠物状态和模型URL
      tt.request({
        url: app.globalData.API_BASE_URL + '/pets/' + petId,
        method: 'GET',
        success: function(res) {
          if (res.data && res.data.status === 'completed') {
            // 3D模型生成完成
            clearInterval(checkInterval);
            
            that.setData({
              generationProgress: 100,
              modelUrl: res.data.model_url || res.data.file_urls?.OBJ?.url || res.data.file_urls?.GIF?.url || '',
              modelLoaded: true,
              generatedPetImage: res.data.generated_image || '/images/pet_sample.png',
              //currentStep: 5
            })
            tt.navigateTo({
              url: '/pages/companion/companion'
            })
            
            tt.showToast({
              title: '3D模型生成成功！',
              icon: 'success'
            })
          } else if (res.data && res.data.status === 'failed') {
            // 3D模型生成失败
            clearInterval(checkInterval);
            
            that.setData({
              generationProgress: 0,
              currentStep: 4
            })
            
            tt.showToast({
              title: '3D模型生成失败，请重试',
              icon: 'none'
            })
          }
        },
        fail: function(err) {
          console.error('检查3D模型状态失败:', err);
        }
      });
      
      // 如果达到最大检查次数，停止轮询并提示用户
      if (checkCount >= maxCheckCount) {
        clearInterval(checkInterval);
        
        that.setData({
          generationProgress: 0,
          currentStep: 4
        })
        
        tt.showToast({
          title: '3D模型生成超时，请重试',
          icon: 'none'
        })
      }
    }, checkDelay);
    
    // 保存轮询ID，以便后续可能需要清除
    that.checkInterval = checkInterval;
  },

  choosePetImage: function() {
    const that = this;
    // 检查用户是否已同意隐私协议
    tt.getPrivacySetting({
      success: (res) => {
        if (res.needAuthorization) {
          tt.showModal({
            title: '提示',
            content: '请先同意隐私协议以使用图片上传功能',
            success: (modalRes) => {
              if (modalRes.confirm) {
                tt.openPrivacyContract();
              }
            }
          });
        } else {
          // 用户已同意，调用 chooseImage
          tt.chooseImage({
            count: 1,
            success: (res) => {
              that.setData({
                petImage: res.tempFilePaths[0]
              });
            },
            fail: (err) => {
              console.error('上传图片失败:', err);
            }
          });
        }
      },
      fail: (err) => {
        console.error('获取隐私协议状态失败:', err);
      }
    });
  }
})
