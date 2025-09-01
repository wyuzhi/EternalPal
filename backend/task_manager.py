import os
import uuid
import time
import logging
import threading
from queue import Queue
import sys
from datetime import datetime

# 确保能导入app模块以访问数据库
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
sys.path.append(project_root)

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('TaskManager')

# 任务状态常量
STATUS_PENDING = 'pending'
STATUS_PROCESSING = 'processing'
STATUS_COMPLETED = 'completed'
STATUS_FAILED = 'failed'
STATUS_TIMEOUT = 'timeout'

# 单例模式装饰器
def singleton(cls):
    instances = {}
    def get_instance():
        if cls not in instances:
            instances[cls] = cls()
        return instances[cls]
    return get_instance()

@singleton
class TaskManager:
    """任务管理器 - 单例类，用于处理异步任务队列"""
    
    def __init__(self):
        self.task_queue = Queue()
        self.tasks = {}
        self.lock = threading.Lock()
        self.worker_thread = threading.Thread(target=self._process_queue, daemon=True)
        self.worker_thread.start()
        logger.info("任务管理器已初始化")
    
    def _process_queue(self):
        """处理任务队列的工作线程"""
        while True:
            try:
                task = self.task_queue.get()
                task_id = task['task_id']
                task_type = task['task_type']
                task_params = task['params']
                
                logger.info(f"开始处理任务 - ID: {task_id}, 类型: {task_type}")
                
                # 更新任务状态为处理中
                with self.lock:
                    if task_id in self.tasks:
                        self.tasks[task_id]['status'] = STATUS_PROCESSING
                        self.tasks[task_id]['start_time'] = datetime.utcnow().isoformat()
                
                # 根据任务类型处理不同的任务
                try:
                    if task_type == '3d_model_generation':
                        # 导入3D模型生成模块
                        from backend.combined_3d_generator import generate_3d_model
                        
                        # 调用3D模型生成函数
                        result = generate_3d_model(
                            image_url=task_params.get('image_url'),
                            prompt=task_params.get('prompt'),
                            pet_id=task_params.get('pet_id')
                        )
                        
                        # 更新任务状态为完成
                        with self.lock:
                            if task_id in self.tasks:
                                self.tasks[task_id]['status'] = STATUS_COMPLETED
                                self.tasks[task_id]['end_time'] = datetime.utcnow().isoformat()
                                self.tasks[task_id]['result'] = result
                                self.tasks[task_id]['progress'] = 100
                        
                    else:
                        logger.error(f"未知的任务类型: {task_type}")
                        # 更新任务状态为失败
                        with self.lock:
                            if task_id in self.tasks:
                                self.tasks[task_id]['status'] = STATUS_FAILED
                                self.tasks[task_id]['error'] = f"未知的任务类型: {task_type}"
                except Exception as e:
                    logger.error(f"处理任务时出错 - ID: {task_id}, 错误: {str(e)}")
                    # 更新任务状态为失败
                    with self.lock:
                        if task_id in self.tasks:
                            self.tasks[task_id]['status'] = STATUS_FAILED
                            self.tasks[task_id]['error'] = str(e)
                
                # 标记任务完成
                self.task_queue.task_done()
                
            except Exception as e:
                logger.error(f"任务队列处理异常: {str(e)}")
                # 防止工作线程崩溃
                time.sleep(1)
    
    def submit_task(self, task_type, params):
        """提交新任务到队列
        
        Args:
            task_type (str): 任务类型
            params (dict): 任务参数
            
        Returns:
            str: 任务ID
        """
        task_id = str(uuid.uuid4())
        
        with self.lock:
            # 创建任务记录
            self.tasks[task_id] = {
                'task_id': task_id,
                'task_type': task_type,
                'params': params,
                'status': STATUS_PENDING,
                'created_time': datetime.utcnow().isoformat(),
                'progress': 0
            }
            
            # 将任务添加到队列
            self.task_queue.put({
                'task_id': task_id,
                'task_type': task_type,
                'params': params
            })
            
        logger.info(f"新任务已提交 - ID: {task_id}, 类型: {task_type}")
        return task_id
    
    def get_task(self, task_id):
        """获取任务信息
        
        Args:
            task_id (str): 任务ID
            
        Returns:
            dict or None: 任务信息，如果任务不存在则返回None
        """
        with self.lock:
            return self.tasks.get(task_id)
    
    def update_task_progress(self, task_id, progress, details=None):
        """更新任务进度
        
        Args:
            task_id (str): 任务ID
            progress (int): 进度百分比 (0-100)
            details (dict, optional): 额外的详细信息
        """
        with self.lock:
            if task_id in self.tasks:
                self.tasks[task_id]['progress'] = progress
                if details:
                    self.tasks[task_id]['details'] = details
    
    def clean_old_tasks(self, days=7):
        """清理旧任务记录
        
        Args:
            days (int): 保留天数，超过这个天数的任务将被清理
        """
        cutoff_time = datetime.utcnow().timestamp() - (days * 24 * 60 * 60)
        
        with self.lock:
            tasks_to_remove = []
            for task_id, task in self.tasks.items():
                created_time = datetime.fromisoformat(task['created_time']).timestamp()
                if created_time < cutoff_time:
                    tasks_to_remove.append(task_id)
                    
            for task_id in tasks_to_remove:
                del self.tasks[task_id]
                logger.info(f"已清理旧任务 - ID: {task_id}")

# 提交3D模型生成任务的辅助函数
def submit_3d_model_task(image_url=None, prompt=None, pet_id=None):
    """
    提交3D模型生成任务
    
    Args:
        image_url (str, optional): 图片URL
        prompt (str, optional): 提示词
        pet_id (int, optional): 宠物ID
        
    Returns:
        str: 任务ID
    """
    # 由于TaskManager被singleton装饰，直接调用TaskManager()获取单例实例
    task_manager = TaskManager
    
    task_id = task_manager.submit_task(
        task_type='3d_model_generation',
        params={
            'image_url': image_url,
            'prompt': prompt,
            'pet_id': pet_id
        }
    )
    
    logger.info(f"3D模型生成任务已提交 - 宠物ID: {pet_id}, 任务ID: {task_id}")
    return task_id

# 获取任务状态的辅助函数
def get_task_status(task_id):
    """获取任务状态
    
    Args:
        task_id (str): 任务ID
        
    Returns:
        dict: 任务状态信息
    """
    task_manager = TaskManager()
    task = task_manager.get_task(task_id)
    
    if not task:
        return {
            'status': 'error',
            'message': '任务不存在'
        }
    
    # 构建状态响应
    status_response = {
        'status': task['status'],
        'progress': task.get('progress', 0),
        'created_time': task['created_time'],
        'details': task.get('details', {})
    }
    
    # 添加开始和结束时间（如果有）
    if 'start_time' in task:
        status_response['start_time'] = task['start_time']
    if 'end_time' in task:
        status_response['end_time'] = task['end_time']
    
    # 添加错误信息（如果有）
    if task['status'] == STATUS_FAILED and 'error' in task:
        status_response['error'] = task['error']
    
    # 添加结果信息（如果有）
    if task['status'] == STATUS_COMPLETED and 'result' in task:
        status_response['result'] = task['result']
    
    return status_response

# 清理旧任务的辅助函数
def clean_old_tasks(days=7):
    """清理旧任务记录
    
    Args:
        days (int): 保留天数
    """
    task_manager = TaskManager()
    task_manager.clean_old_tasks(days)

# 示例使用
def main():
    # 提交任务示例
    task_id = submit_3d_model_task(
        prompt="一只可爱的小狗，白色毛发，活泼开朗",
        pet_id=1
    )
    print(f"提交的任务ID: {task_id}")
    
    # 查询任务状态示例
    import time
    for _ in range(5):
        status = get_task_status(task_id)
        print(f"任务状态: {status}")
        time.sleep(2)
    
    # 清理旧任务示例
    clean_old_tasks(1)

if __name__ == '__main__':
    main()