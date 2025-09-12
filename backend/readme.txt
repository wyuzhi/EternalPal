
3d_gen 模块
1) 函数：nano_gen_3d(prompt_text: str, image_path: Optional[str] = None) -> Optional[str]
- 功能：
  先调用 utils/ge_router.py 的 generate_image 生成图片（支持仅文本或文本+本地图片路径）。
  将生成图片写入临时 .png 文件，再调用 utils/hunyuan_3d.py 的 hunyuan_submit_job 提交 3D 任务。
- 入参：
  - prompt_text：文本提示词（必填，若 image_path 为空时）。
  - image_path：本地图片路径（可选）。
- 返回：job_id（字符串）；失败返回 None。
- 用法示例：
  ```python
  from 3d_gen import nano_gen_3d
  job_id = nano_gen_3d("画一只可爱的小狗狗")
  print(job_id)
  # 或者
  job_id = nano_gen_3d("在这张图基础上加一只小狗狗", image_path="./example.png")
  print(job_id)
  ```



audio 模块
1) 函数：text_to_mp3(mp3_filename: str, text: str) -> str
- 功能：将文本合成为 MP3 文件。
- 入参：
  - mp3_filename：输出 MP3 文件名（含路径）。
  - text：要合成的文本。
- 返回："success"（成功）。
- 用法示例：
  ```python
  from audio import text_to_mp3
  state = text_to_mp3("output.mp3", "你今天过得开心吗？")
  print(state)
  ```

2) 函数：mp3_to_text(file_path: str) -> str
- 功能：将 MP3 语音转写为文本。
- 入参：
  - file_path：MP3 文件路径。
- 返回：识别出的文本（字符串）。
- 用法示例：
  ```python
  from audio import mp3_to_text
  text = mp3_to_text("./hi.mp3")
  print(text)
  ```



