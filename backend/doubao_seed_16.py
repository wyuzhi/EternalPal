import os
from openai import OpenAI


def query_doubao_seed_16(prompt, api_key=None, base_url="https://ark.cn-beijing.volces.com/api/v3"):
    """
    使用豆包 Seed 1.6 模型进行对话查询
    
    Args:
        prompt (str): 用户输入的文本提示
        api_key (str, optional): API密钥，如果不提供则使用默认值
        base_url (str, optional): API基础URL，默认为豆包官方地址
    
    Returns:
        dict: API响应结果，如果出错则返回错误信息
    """
    try:
        # 使用提供的API密钥或默认密钥
        if api_key is None:
            api_key = 'a8713c43-079c-4971-89db-b0ba6b41343f'
        
        # 初始化Ark客户端
        client = OpenAI(
            base_url=base_url,
            api_key=api_key,
        )
        
        # 构建提示词模板
        system_prompt = """1. 你是一名腾讯混元3D生成-v2.5模型 文生3D提示词大师。你现在需要将用户关于动物的回忆、描述扩写成详细动物 3D 模型生成提示词的任务，用于腾讯混元 3D 生成 - v2.5 模型。扩写时需遵循以下要求：
        - 精准还原核心信息：紧扣用户描述中动物的种类、关键特征（如毛色、体型、特殊标记等）、相关场景元素，确保不偏离用户原始回忆。
        - 丰富细节维度：从动物的体态（如站姿、卧姿、动态趋势）、毛发质感（长短、疏密、光泽度）、五官细节（眼睛颜色、形状，耳朵形态等）、皮肤纹理（若适用）等方面补充细节，让 3D 模型生成更具画面感。
        - 风格适配性：根据用户描述的情感倾向（如温馨、活泼、写实等），调整提示词的风格表述，明确渲染风格，使生成的 3D 模型符合预期氛围。
        请基于以上要求，将用户提供的动物回忆、描述扩写成适用的 3D 模型生成提示词，字符数控制在150以内。以下我将根据这个规则，每一轮都将单独给你一些用户的回忆与描述
        2. 请根据之前确定的规则，将用户提供的动物回忆、描述进行扩写【{}】，字符数控制在150以内""".format(prompt)
        
        # 创建聊天完成请求
        response = client.chat.completions.create(
            model="doubao-seed-1-6-250615",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": system_prompt},
                    ],
                }
            ],
        )
        
        return response.choices[0]
        
    except Exception as e:
        return {"error": f"请求失败: {str(e)}"}


if __name__ == "__main__":
    # 仅文本输入，文---->文

    user_prompt = """那年夏天总飘着槐花香，我家老黄狗总爱把下巴搁在门槛上打盹。它右耳缺了个三角口，是三年前跟偷鸡贼搏斗时被镰刀划的，从此那只耳朵总耷拉着，像片脱水的枫叶。
    有回我发高烧，迷迷糊糊听见爪子刨地的声响。后来娘说，老黄硬是把村医的裤腿拽到了我家炕头，舌头上的血泡蹭得人裤脚都是红点子。它救我的那天，尾巴摇得像面破蒲扇，把地上的槐花瓣都扫成了小堆。
    """
    result = query_doubao_seed_16(user_prompt)
    print(result)

    # 只展示文升文后的结果
    print(result.message.content)
    
    ''' result.message.content 示例
    老黄狗，黄毛带岁月粗糙光泽，右耳缺三角口耷拉如脱水枫叶，下巴搁门槛打盹，
    尾巴摇似破蒲扇扫起槐花瓣堆，舌上血泡蹭红裤脚，暖调温馨写实渲染，槐花香萦绕场景。
    '''




