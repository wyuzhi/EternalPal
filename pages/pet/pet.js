const app = getApp();

Page({
  data: {
    currentStep: 1, // 初始步骤
    totalSteps: 5,
    petType: '猫咪',
    petName: '',
    petGender: 'male',
    petBirthday: '',
    tipsAnimationCount: 0, // 小贴士动画计数器,
    petTypeOptions: [
      { type: '狗狗', name: '狗狗', icon: '/images/petTypes/dog.svg' },
      { type: '猫咪', name: '猫咪', icon: '/images/petTypes/cat.svg' },
      { type: '鸭鸭', name: '鸭鸭', icon: '/images/petTypes/duck.svg' },
      { type: 'custom', name: '自定义', icon: '', isCustom: true }
    ],
    allPetTypes: [], // 包含自定义选项的完整列表
    currentIndex: 0, // 当前选中的索引
    petPersonalities: [
      { id: 1, name: '活力满满', icon: 'cheerful', selected: false },   // 开朗
      { id: 2, name: '黏人撒娇', icon: 'passionate', selected: false }, // 热情
      { id: 3, name: '好动调皮', icon: 'lively', selected: false },     // 活泼
      { id: 4, name: '安静观察', icon: 'rational', selected: false },   // 理性
      { id: 5, name: '温顺乖巧', icon: 'kind', selected: false },       // 善良
      { id: 6, name: '耐心守候', icon: 'patient', selected: false },    // 耐心
      { id: 7, name: '细致敏锐', icon: 'careful', selected: false },    // 细心
      { id: 8, name: '勇敢探险', icon: 'brave', selected: false },      // 勇敢
      { id: 9, name: '神秘随机', icon: 'random', selected: false }      // 随机
    ],
    petHobbies: [
      { id: 1, name: '安静发呆', icon: 'reading', selected: false },   // 阅读 → 换成宠物常见活动
      { id: 2, name: '到处探险', icon: 'travel', selected: false },    // 旅行
      { id: 3, name: '喜欢音乐', icon: 'music', selected: false },     // 音乐
      { id: 4, name: '看窗外风景', icon: 'movie', selected: false },   // 电影 → 看风景
      { id: 5, name: '跑跳玩耍', icon: 'sports', selected: false },    // 运动
      { id: 6, name: '馋嘴吃货', icon: 'food', selected: false }       // 美食
    ],
    selectedPersonalities: [], // 只存储用户选择的性格名称
    selectedHobbies: [], // 只存储用户选择的爱好名称
    petStory: '',
    petPhotos: [],
    maxPhotos: 1,
    petDescription: '', // 宠物描述（没有照片时填写）
    generationProgress: 0,
    isGenerating: false,
    generatedPetImage: '', // 生成的宠物图片
    particles: [], // 粒子效果数据
    generationStepText: '正在分析宠物特征...', // 生成步骤提示文字
    estimatedTimeRemaining: '约3分钟', // 预计剩余时间
    currentTip: '每个灵伴都有独特的性格和爱好，就像真实的宠物一样', // 当前显示的小贴士
    petTips: [
      '您的灵伴正在生成中，请稍后再回来看吧~',
      '每个灵伴都有独特的性格和爱好，就像真实的宠物一样',
      '和灵伴进行日常对话，它会根据您设定的性格特点回应',
      '灵伴的3D模型是根据您提供的照片或描述生成的',
      '生成过程需要一些时间，请耐心等待',
      '您可以与灵伴一起聊天或者分享日常生活',
      '灵伴会记录与您的互动，并随着时间变得更加了解您',
      '我们会不断更新灵伴的功能，让它变得更加智能'
    ],
    generationSteps: [
      '正在分析宠物特征...',
      '构建基础模型中...',
      '添加个性细节...',
      '优化3D模型...',
      '还有一点点细节...'
    ],
    isLiked: false, // 是否喜欢
    isDisliked: false, // 是否不喜欢
    likeBtnAnimating: false, // 点赞状态
    dislikeBtnAnimating: false, // 点踩状态
    petId: null, // 宠物ID
    previewUrl: '', // 宠物预览图片URL
    supplementPersonality: '', // 补充性格描述
    supplementHobby: '', // 补充爱好描述
    showRegenerateModal: false, // 是否显示重新生成弹窗
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
            previewUrl: latestPet.preview_url || '',
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
    // 创建宠物记录并跳转到步骤5
      that.createPetWithGeneratedModel(petInfo, '');
  },

  
  onLoad: function() {
    console.log('宠物信息收集页面加载成功')
    this.initCarousel()
  },

  // 初始化轮播数据
  initCarousel: function() {
    // 直接使用 petTypeOptions，自定义选项已经包含在内
    const allPetTypes = this.data.petTypeOptions
    
    // 找到当前选中项的索引
    const currentIndex = allPetTypes.findIndex(item => item.type === this.data.petType)
    
    this.setData({
      allPetTypes: allPetTypes,
      currentIndex: currentIndex >= 0 ? currentIndex : 0
    })
    
    // 设置初始位置
    this.updateCarouselPosition(currentIndex >= 0 ? currentIndex : 0)
  },

  // 更新轮播位置
  updateCarouselPosition: function(index) {
    // 直接设置当前索引，触发视图更新
    this.setData({
      currentIndex: index,
      petType: this.data.allPetTypes[index].type
    })
    
    console.log('更新轮播位置:', index, '类型:', this.data.allPetTypes[index].type)
  },
  
  // 更新生成步骤文字 toDo: 接上真实的生成进度
  updateGenerationSteps: function() {
    const that = this
    let stepIndex = 0
    
    // 清除可能存在的旧定时器
    if (this.stepsInterval) {
      clearInterval(this.stepsInterval)
    }
    
    // 每15秒更新一次生成步骤文字
    this.stepsInterval = setInterval(() => {
      stepIndex = (stepIndex + 1) % that.data.generationSteps.length
      that.setData({
        generationStepText: that.data.generationSteps[stepIndex]
      })
    }, 15000)
  },
  
  // 启动小贴士轮播
  startTipsRotation: function() {
    console.log('startTipsRotation 函数被调用')
    const that = this
    let tipIndex = 0
    let animationCount = 0
    
    // 清除可能存在的旧定时器
    if (this.tipsInterval) {
      clearInterval(this.tipsInterval)
    }
    
    // 立即显示第一条小贴士
    console.log('初始化小贴士，内容:', that.data.petTips[0])
    that.setData({
      currentTip: that.data.petTips[0],
      tipsAnimationCount: animationCount
    })
    
    // 每5秒切换一条小贴士
    this.tipsInterval = setInterval(() => {
      tipIndex = (tipIndex + 1) % that.data.petTips.length
      animationCount++
      
      console.log('切换小贴士，索引:', tipIndex, '内容:', that.data.petTips[tipIndex])
      
      that.setData({
        currentTip: that.data.petTips[tipIndex],
        tipsAnimationCount: animationCount
      })
    }, 5000)
    
    // 立即启动第一次切换（3秒后）
    setTimeout(() => {
      tipIndex = 1
      animationCount++
      console.log('第一次切换小贴士，索引:', tipIndex, '内容:', that.data.petTips[tipIndex])
      that.setData({
        currentTip: that.data.petTips[tipIndex],
        tipsAnimationCount: animationCount
      })
    }, 3000)
  },

  onReady: function() {
    // 页面渲染完成后，如果当前是步骤4，则创建粒子效果
    if (this.data.currentStep === 4) {
      this.createParticleEffect()
    }
  },

  // 监听步骤变化，当进入步骤4时创建粒子效果
  observers: {
    'currentStep': function(newStep) {
      if (newStep === 4) {
        this.createParticleEffect()
      } else {
        // 离开步骤4时，清理粒子效果
        this.clearParticleEffect()
      }
    }
  },



  // 选择宠物类型
  selectPetType: function(e) {
    const selectedType = e.currentTarget.dataset.type;
    const selectedIndex = parseInt(e.currentTarget.dataset.index);
    
    // 更新选中状态和位置（包括自定义类型）
    this.setData({
      petType: selectedType,
      currentIndex: selectedIndex
    })
    
    // 更新轮播位置
    this.updateCarouselPosition(selectedIndex)
    
    // 如果是自定义类型，显示输入框让用户输入自定义类型名称
    if (selectedType === 'custom') {
      this.showCustomInput(selectedIndex);
    }
    
    console.log('选择宠物类型:', selectedType, '索引:', selectedIndex);
  },

  // 自定义输入框
  showCustomInput: function(index) {
    const that = this;
    
    // 让用户输入自定义宠物类型
    tt.showModal({
      title: '自定义宠物类型',
      editable: true,
      placeholderText: '请输入宠物类型',
      success: function(res) {
        if (res.confirm && res.content && res.content.trim()) {
          const inputValue = res.content.trim();
          
          // 只有当输入不是默认的宠物类型时，才更新petType
          const defaultTypes = this.data.petTypeOptions.filter(option => !option.isCustom).map(option => option.type);
          
          if (!defaultTypes.includes(inputValue) && inputValue !== '自定义') {
            // 更新自定义类型名称和类型
            const allPetTypes = that.data.allPetTypes;
            allPetTypes[index].name = inputValue;
            allPetTypes[index].displayName = inputValue;
            
            that.setData({
              petType: inputValue,
              allPetTypes: allPetTypes
            });
            
            console.log('设置自定义宠物类型:', inputValue);
          } else {
            // 如果输入的是默认类型或"自定义"，提示用户
            tt.showToast({
              title: '请输入其他宠物类型名称',
              icon: 'none'
            });
          }
        }
      },
      fail: function(error) {
        console.error('显示输入框失败:', error);
        tt.showToast({
          title: '输入功能暂不可用',
          icon: 'none'
        });
      }
    });
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
      icon: 'none',
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
      petGender: e.detail.value
    })
  },

  // 选择宠物生日
  selectPetBirthday: function(e) {
    this.setData({
      petBirthday: e.detail.value
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
    
    tt.showToast({
      title: '照片已删除',
      icon: 'success'
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
        if (!this.data.petBirthday) {
          tt.showToast({
            title: '请选择宠物生日',
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
    const that = this;
    
    // 触发动画
    this.setData({
      likeBtnAnimating: true
    });
    
    // 如果已经喜欢，再次点击则取消喜欢
    if (this.data.isLiked) {
      this.setData({
        isLiked: false
      })
      // TODO: 取消点赞时需要删除或更新用户反馈记录
      // 建议在数据库中记录用户对每个宠物模型的反馈状态
      // 数据结构: { user_id, pet_id, feedback_type: null/like/dislike, created_at, updated_at }
    } else {
      // 如果还没喜欢，则设置为喜欢并取消不喜欢
      this.setData({
        isLiked: true,
        isDisliked: false
      })
      // TODO: 记录用户点赞行为
      // 需要调用后端API保存用户对当前宠物模型的点赞记录
      // 用于数据分析：统计模型受欢迎程度、用户偏好等
    }
    
    // 动画结束后移除
    setTimeout(() => {
      that.setData({
        likeBtnAnimating: false
      });
    }, 600);
  },
  // 不喜欢宠物
  dislikePet: function() {
    const that = this;
    
    // 触发动画
    this.setData({
      dislikeBtnAnimating: true
    });
    
    // 如果已经不喜欢，再次点击则取消不喜欢
    if (this.data.isDisliked) {
      this.setData({
        isDisliked: false
      })
      // TODO: 取消点踩时需要删除或更新用户反馈记录
    } else {
      // 如果还没不喜欢，则设置为不喜欢并取消喜欢
      this.setData({
        isLiked: false,
        isDisliked: true
      })
      // TODO: 记录用户点踩行为
      // 需要调用后端API保存用户对当前宠物模型的点踩记录
      // 用于数据分析：了解哪些模型需要优化、用户不满意的原因等
    }
    
    // 动画结束后移除
    setTimeout(() => {
      that.setData({
        dislikeBtnAnimating: false
      });
    }, 600);
  },

  // 不满意，重新生成
  unsatisfied: function() {
    this.setData({
      showRegenerateModal: true
    });
  },

  // 关闭重新生成弹窗
  closeRegenerateModal: function() {
    this.setData({
      showRegenerateModal: false
    });
  },

  // 确认重新生成
  confirmRegenerate: function() {
    this.setData({
      showRegenerateModal: false
    });
    this.deletePetAndRegenerate();
  },

  // 删除宠物并重新生成
  deletePetAndRegenerate: function() {
    const that = this;
    const petId = that.data.petId;
    
    if (!petId) {
      // 如果没有petId，直接重新生成
      that.resetToStep1();
      return;
    }
    
    tt.showLoading({
      title: '正在删除...',
    });
    
    // 调用删除宠物API
    tt.request({
      url: app.globalData.API_BASE_URL + '/pets/' + petId,
      method: 'DELETE',
      success: function(res) {
        tt.hideLoading();
        console.log('删除宠物成功:', res);
        
        if (res.data && res.data.status === 'success') {
          // 删除成功，重置到步骤4并开始重新生成
          that.resetToStep1();
          
          tt.showToast({
            title: '开始重新生成',
            icon: 'success'
          });
        } else {
          tt.showToast({
            title: '删除失败，请重试',
            icon: 'none'
          });
        }
      },
      fail: function(error) {
        tt.hideLoading();
        console.error('删除宠物失败:', error);
        
        tt.showToast({
          title: '删除失败，请重试',
          icon: 'none'
        });
      }
    });
  },

  // 重置到步骤1让用户重新填写宠物信息
  resetToStep1: function() {
    this.setData({
      currentStep: 1,
      generationProgress: 0,
      isLiked: false,
      isDisliked: false,
      likeBtnAnimating: false,
      dislikeBtnAnimating: false,
      petId: '', // 清空petId
      previewUrl: '',
      // 清空用户填写的宠物信息，让用户重新填写
      petName: '',
      petGender: 'male',
      petBirthday: '',
      selectedPersonalities: [],
      selectedHobbies: [],
      petStory: '',
      petPhotos: [],
      petDescription: '',
      supplementPersonality: '',
      supplementHobby: ''
    });
    // 不再自动开始生成，让用户重新填写信息
    // this.startGenerating();
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
      generationProgress: 0,
      isLiked: false,
      isDisliked: false,
      likeBtnAnimating: false,
      dislikeBtnAnimating: false
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
  createPetWithGeneratedModel: function(taskInfo, unusedParam) {
    const that = this
    
    tt.showLoading({
      title: '正在创建灵伴...',
    })
    
    // TODO: 需要在宠物记录中添加反馈统计字段
    // 建议数据库加: total_likes, total_dislikes, feedback_score 等字段
    // TODO：创建独立的用户反馈表记录用户对宠物的具体反馈
    tt.request({
      url: app.globalData.API_BASE_URL + '/pets',
      method: 'POST',
      data: {
        name: taskInfo.petName || '我的萌宠',
        type: taskInfo.petType,
        gender: that.data.petGender,
        birthday: that.data.petBirthday,
        personality: that.data.selectedPersonalities.join(','),
        hobby: that.data.selectedHobbies.join(','),
        story: that.data.petDescription,
        generated_image: that.data.petPhotos && that.data.petPhotos.length > 0 ? that.data.petPhotos[0] : '',
        // 移除model_url字段
        user_id: taskInfo.userId
        // TODO: 初始化反馈相关字段
        // total_likes: 0,
        // total_dislikes: 0,
        // feedback_score: 0.0
      },
      success: function(res) {
        tt.hideLoading()
        
        if (res.statusCode === 201 || (res.data && res.data.status === 'success')) {
          // 保存宠物ID和模型URL到本地，并跳转到步骤5
          that.setData({
            generationProgress: 100,
            petId: res.data?.pet_id || 'unknown',
            // 移除3D模型相关字段
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
    console.log('startGenerating 函数被调用')
    const that = this
    console.log('重置进度条为0%')
    this.setData({
      currentStep: 4,
      generationProgress: 0
    })
    console.log('进度条重置完成，当前进度:', this.data.generationProgress)
    
    // 启动生成步骤文字更新
    this.updateGenerationSteps()
    
    // 启动小贴士轮播
    console.log('准备调用 startTipsRotation')
    this.startTipsRotation()

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

    // 清除之前的定时器（如果存在）
    if (that.progressTimer) {
      clearInterval(that.progressTimer)
    }
    
    // 模拟进度条更新，3分钟内只到99%
    const timer = setInterval(function() {
      let progress = that.data.generationProgress + 0.55 // 调整增长速度，3分钟(180秒)内到99%
      if (progress >= 99) {
        progress = 99 // 最多只到99%，等待轮询成功后才到100%
        clearInterval(timer) // 到达99%后停止进度条更新
        that.progressTimer = null // 清除定时器引用
      }
      console.log('进度条更新:', progress.toFixed(2) + '%')
      that.setData({
        generationProgress: parseFloat(progress.toFixed(2))
      })
      
      // 更新预计剩余时间
      let remainingTime
      if (progress < 30) {
        remainingTime = '约3分钟'
      } else if (progress < 60) {
        remainingTime = '约2分钟'
      } else if (progress < 90) {
        remainingTime = '约1分钟'
      } else {
        remainingTime = '即将完成'
      }
      
      that.setData({
        estimatedTimeRemaining: remainingTime
      })
    }, 1000) // 改为每秒更新一次

 
    
    // 保存定时器引用，用于后续清理
    that.progressTimer = timer
    
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
          birthday: that.data.petBirthday,
          personality: that.data.selectedPersonalities.join(','),
          hobby: that.data.selectedHobbies.join(','),
          story: that.data.petDescription,
          generated_image: that.data.petPhotos && that.data.petPhotos.length > 0 ? that.data.petPhotos[0] : '',
          user_id: userId,
        },
        success: function(res) {
          // 不要在这里清除进度条定时器，让进度条继续运行到99%
          // 进度条定时器会在到达99%时自动清除，或者在轮询成功时清除
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
              currentStep: 5
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
      fail: function(err) {
        // API请求失败时，清除进度条定时器并显示错误
        if (that.progressTimer) {
          clearInterval(that.progressTimer)
          that.progressTimer = null
        }
        tt.hideLoading()
        console.error('创建宠物失败', err)
        tt.showToast({
          title: '创建灵伴失败，请稍后重试',
          icon: 'none'
        })
        // 重置到步骤3让用户重试
        that.setData({
          currentStep: 3,
          generationProgress: 0
        })
      }
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
      
      // 轮询过程中不再更新进度条，让startGenerating中的定时器继续工作
      
      // 调用API检查宠物状态和模型URL
      tt.request({
        url: app.globalData.API_BASE_URL + '/pets/' + petId,
        method: 'GET',
        success: function(res) {
          if (res.data && res.data.status === 'completed') {
            // 3D模型生成完成
            clearInterval(checkInterval);
            
            // 清除进度条定时器
            if (that.progressTimer) {
              clearInterval(that.progressTimer)
              that.progressTimer = null
            }
            
            // 先将进度条设为100%
            that.setData({
              generationProgress: 100,
              previewUrl: res.data.preview_url || '',
              generatedPetImage: res.data.generated_image || '/images/pet_sample.png',
            })
            
            // 延迟一下让用户看到100%的进度条，然后跳转
            setTimeout(() => {
              that.setData({
                currentStep: 5
              })
            }, 1000)
            
            tt.showToast({
              title: '3D模型生成成功！',
              icon: 'success'
            })
          } else if (res.data && res.data.status === 'failed') {
            // 3D模型生成失败
            clearInterval(checkInterval);
            
            // 清除进度条定时器
            if (that.progressTimer) {
              clearInterval(that.progressTimer)
              that.progressTimer = null
            }
            
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
        
        // 清除进度条定时器
        if (that.progressTimer) {
          clearInterval(that.progressTimer)
          that.progressTimer = null
        }
        
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
  },
  
  // 页面卸载时清理资源
  onUnload: function() {
    console.log('页面卸载，清理资源')
    
    // 清除所有定时器
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
    }
    
    if (this.progressTimer) {
      clearInterval(this.progressTimer)
    }
    
    if (this.stepsInterval) {
      clearInterval(this.stepsInterval)
    }
    
    if (this.tipsInterval) {
      clearInterval(this.tipsInterval)
    }
  }
})
