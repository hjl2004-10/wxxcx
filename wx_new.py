from flask import Flask, request, Response, stream_with_context, jsonify
import requests
import json
import os
import time\nimport re

app = Flask(__name__)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

AI_SERVICES = {
    "1": {
        "name": "YuegleAI",
        "url": "https://api.yuegle.com/v1/chat/completions",
        "api_key": "sk-Te1SD89Dj7e73z9n1b0b4c5c18Ac465596B8A21fD70b4089",
        "model": "gpt-4.1-mini-2025-04-14",
        "temperature": 0.7,
        "max_tokens": 2000,
        "access_key": "hjl2004"
    },
    "2": {
        "name": "YuegleAI",
        "url": "https://api.yuegle.com/v1/chat/completions",
        "api_key": "sk-Te1SD89Dj7e73z9n1b0b4c5c18Ac465596B8A21fD70b4089",
        "model": "gpt-4.1-mini-2025-04-14",
        "temperature": 0.7,
        "max_tokens": 2000,
        "access_key": "hjl2004"
    },
    "3": {
        "name": "YuegleAI",
        "url": "https://api.yuegle.com/v1/chat/completions",
        "api_key": "sk-Te1SD89Dj7e73z9n1b0b4c5c18Ac465596B8A21fD70b4089",
        "model": "gpt-4.1-mini-2025-04-14",
        "temperature": 0.7,
        "max_tokens": 2000,
        "access_key": "hjl2004"
    }
}

# 语音服务配置
SPEECH_SERVICES = {
    "1": {
        "name": "CosyVoice2",
        "url": "https://api.siliconflow.cn/v1/audio/speech",
        "api_key": "sk-rkzuttktbfjvjabtrtxmgszuejimomhcemndpmdiyxmyatjl",  # 请替换为实际的硅基云API密钥
        "model": "FunAudioLLM/CosyVoice2-0.5B",
        "voice": "FunAudioLLM/CosyVoice2-0.5B:alex",
        "response_format": "mp3",
        "sample_rate": 32000,
        "stream": True,
        "speed": 1,
        "gain": 0,
        "access_key": "hjl2004"
    }
}

# 图像生成服务配置
IMAGE_SERVICES = {
    "1": {
        "name": "NuwaAPI",
        "url": "https://api.nuwaapi.com/v1/chat/completions",
        "api_key": "sk-RzGa2h5oj54enTwZlAJVYisNEj18aazbEnP6ChslIFoTFLPQ",
        "model": "dall-e-3",
        "size": "1024x1024",
        "access_key": "hjl2004"
    }
}

def get_system_prompt(service_id):
    prompt_file = os.path.join(SCRIPT_DIR, f"{service_id}.txt")
    try:
        if os.path.exists(prompt_file):
            with open(prompt_file, 'r', encoding='utf-8') as f:
                return f.read()
    except Exception as e:
        print(f"读取预设文件出错: {e}")
    return "你是一个AI助手�?

@app.route('/<service_id>', methods=['POST'])
def proxy_request(service_id):
    if service_id not in AI_SERVICES:
        return {"error": "服务不存�?}, 404

    service_config = AI_SERVICES[service_id]
    # 获取客户端访问密�?
    client_key = request.headers.get('X-Access-Key', '')
    client_data = {}
    try:
        client_data = request.get_json(force=True)
    except:
        pass
    if not client_key:
        client_key = client_data.get('key', '')

    if client_key != service_config['access_key']:
        return {"error": "访问密钥无效"}, 401

    user_text = client_data.get('text', '')
    if not user_text:
        return {"error": "未提供文本内�?}, 400

    # 判断是否流式输出 - 增加检查请求头中的X-Stream参数
    stream = True  # 默认�?
    if 'stream' in client_data:
        stream = bool(client_data['stream'])
    elif 'stream' in request.args:
        stream = request.args.get('stream', 'true').lower() == 'true'
    
    # 检查请求头中的X-Stream参数
    if request.headers.get('X-Stream'):
        stream = request.headers.get('X-Stream').lower() == 'true'
    
    # 添加一些调试输�?
    print(f"请求参数: service_id={service_id}, stream={stream}")
    print(f"请求头X-Stream: {request.headers.get('X-Stream')}")
    print(f"请求数据stream: {client_data.get('stream')}")

    system_prompt = get_system_prompt(service_id)

    ai_request = {
        "model": service_config['model'],
        "temperature": service_config['temperature'],
        "max_tokens": service_config['max_tokens'],
        "stream": stream,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_text}
        ]
    }

    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {service_config["api_key"]}'
    }

    if stream:
        def generate():
            response = requests.post(
                service_config['url'],
                headers=headers,
                json=ai_request,
                stream=True
            )
            if response.status_code != 200:
                yield f"data: {json.dumps({'error': f'AI服务返回错误: {response.status_code}'})}\n\n"
                return
            for chunk in response.iter_lines():
                if chunk:
                    processed_chunk = process_stream_chunk(chunk)
                    if processed_chunk:
                        yield f"data: {processed_chunk}\n\n"
            yield "data: [DONE]\n\n"

        return Response(stream_with_context(generate()), content_type='text/event-stream')

    else:
        # 非流式，返回完整JSON（抽取用户常用的content�?
        resp = requests.post(
            service_config['url'],
            headers=headers,
            json=ai_request
        )
        if resp.status_code != 200:
            return jsonify({"error": f"AI服务返回错误: {resp.status_code}", "detail": resp.text}), resp.status_code

        try:
            data = resp.json()
        except Exception as e:
            return jsonify({"error": "响应内容不是json", "raw": resp.text})

        # 尝试从choices里提取内�?
        content = ""
        if data and 'choices' in data and len(data['choices']) > 0:
            choice = data['choices'][0]
            if "message" in choice and "content" in choice["message"]:
                content = choice["message"]["content"]
                
                # 美化和格式化内容
                enhanced_content = enhance_content(content)
                
                # 返回增强后的内容
                return jsonify({
                    "content": enhanced_content,
                    "raw": data       # 全部响应也返回，方便调试
                })

        return jsonify({
            "content": content,
            "raw": data       # 全部响应也返回，方便调试
        })

def process_stream_chunk(chunk):
    try:
        decoded_chunk = chunk.decode('utf-8')
        if not decoded_chunk or decoded_chunk == '[DONE]':
            return None
        if decoded_chunk.startswith('data: '):
            decoded_chunk = decoded_chunk[6:]

        try:
            json_data = json.loads(decoded_chunk)
            if 'choices' in json_data and json_data['choices']:
                choice = json_data['choices'][0]
                if 'delta' in choice and 'content' in choice['delta']:
                    content = choice['delta']['content']
                    if content:
                        return content
        except json.JSONDecodeError:
            return decoded_chunk
        return None
    except Exception as e:
        try:
            return f"Error: {str(e)}"
        except:
            return None

# 增强和美化内容的函数
def enhance_content(content):
    """添加一些修饰和格式�?""
    # 这里可以添加各种增强逻辑，如:
    # - 添加表情符号
    # - 格式化文�?
    # - 高亮关键内容
    # - 添加分隔符或标记
    
    # 示例: 简单地添加一些修�?
    enhanced = content
    
    # 尝试识别标题并添加格�?
    lines = enhanced.split('\n')
    for i, line in enumerate(lines):
        # 处理标题
        if line.startswith('#'):
            # 标题加粗并增加表情符�?
            title_level = line.count('#')
            if title_level == 1:
                lines[i] = "🌟 " + line.replace('# ', '')
            elif title_level == 2:
                lines[i] = "�?" + line.replace('## ', '')
            elif title_level == 3:
                lines[i] = "🔍 " + line.replace('### ', '')
        
        # 处理列表�?
        if line.strip().startswith('- '):
            lines[i] = "�?" + line.strip()[2:]
        elif line.strip().startswith('* '):
            lines[i] = "�?" + line.strip()[2:]
        
        # 数字列表项处�?
        if line.strip().startswith('1.') or line.strip().startswith('2.') or line.strip().startswith('3.'):
            number = line.strip().split('.')[0]
            rest = '.'.join(line.strip().split('.')[1:])
            if number == '1':
                lines[i] = "1️⃣ " + rest.strip()
            elif number == '2':
                lines[i] = "2️⃣ " + rest.strip()
            elif number == '3':
                lines[i] = "3️⃣ " + rest.strip()

    # 重新拼接处理后的文本
    enhanced = '\n'.join(lines)
    
    # 替换一些常见词汇以增强视觉效果
    replacements = {
        "重要": "⚠️ 重要",
        "注意": "📝 注意",
        "提示": "💡 提示",
        "技�?: "🔧 技�?,
        "建议": "🌈 建议",
        "活动": "🎮 活动",
        "学习": "📚 学习",
        "目标": "🎯 目标",
        "任务": "�?任务"
    }
    
    for word, replacement in replacements.items():
        # 只替换行首的关键词，避免过度替换
        enhanced = enhanced.replace("\n" + word, "\n" + replacement)
        # 替换开头的关键�?
        if enhanced.startswith(word):
            enhanced = replacement + enhanced[len(word):]
    
    return enhanced

# 语音合成接口
@app.route('/spk/<service_id>', methods=['POST'])
def text_to_speech(service_id):
    if service_id not in SPEECH_SERVICES:
        return {"error": "语音服务不存�?}, 404

    service_config = SPEECH_SERVICES[service_id]
    # 获取客户端访问密�?
    client_key = request.headers.get('X-Access-Key', '')
    client_data = {}
    try:
        client_data = request.get_json(force=True)
    except:
        pass
    if not client_key:
        client_key = client_data.get('key', '')

    if client_key != service_config['access_key']:
        return {"error": "访问密钥无效"}, 401

    # 获取要转换为语音的文�?
    text = client_data.get('text', '')
    if not text:
        return {"error": "未提供文本内�?}, 400
    
    # 可选参�?
    voice = client_data.get('voice', service_config['voice'])
    speed = client_data.get('speed', service_config['speed'])
    
    # 构建请求参数
    tts_request = {
        "model": service_config['model'],
        "input": text,
        "voice": voice,
        "response_format": service_config['response_format'],
        "sample_rate": service_config['sample_rate'],
        "stream": service_config['stream'],
        "speed": speed,
        "gain": service_config['gain']
    }
    
    # 添加一些调试输�?
    print(f"语音请求参数: service_id={service_id}, voice={voice}, text_length={len(text)}")
    
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {service_config["api_key"]}'
    }
    
    # 发送请求到硅基云API
    response = requests.post(
        service_config['url'],
        headers=headers,
        json=tts_request,
        stream=True
    )
    
    if response.status_code != 200:
        return jsonify({"error": f"语音服务返回错误: {response.status_code}", "detail": response.text}), response.status_code
    
    # 直接将二进制音频数据返回给客户端
    return Response(
        response.iter_content(chunk_size=1024),
        content_type=f'audio/{service_config["response_format"]}'
    )

# 图像生成接口 - 改为使用完整响应内容作为URL
@app.route('/pic/<service_id>', methods=['POST'])
def generate_image(service_id):
    if service_id not in IMAGE_SERVICES:
        return {"error": "图像服务不存�?}, 404

    service_config = IMAGE_SERVICES[service_id]
    # 获取客户端访问密�?
    client_key = request.headers.get('X-Access-Key', '')
    client_data = {}
    try:
        client_data = request.get_json(force=True)
    except:
        pass
    if not client_key:
        client_key = client_data.get('key', '')

    if client_key != service_config['access_key']:
        return {"error": "访问密钥无效"}, 401

    # 获取图像生成提示文本
    prompt = client_data.get('text', '')
    if not prompt:
        return {"error": "未提供提示文�?}, 400
    
    # 限制提示文本长度以避免错�?
    if len(prompt) > 150:
        print(f"提示文本过长({len(prompt)}字符)，截断到150字符")
        prompt = prompt[:150]
    
    # 添加调试输出
    print(f"图像生成请求参数: service_id={service_id}, prompt_length={len(prompt)}")
    print(f"开始生成图片，请求时间: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"提示词内�? {prompt}")
    
    # 构建请求参数 - 使用与其他AI服务完全相同的格�?
    system_prompt = "你是一个图像生成AI。你将收到一个图像描述，你需要生成该图像并返回图像的URL链接。只返回图像URL，不要有其他内容�?
    
    ai_request = {
        "model": service_config['model'],
        "temperature": 0.7,
        "max_tokens": 500,  # 增加token数量以确保完整URL
        "stream": True,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"生成这张图片: {prompt}. 只返回图片URL，无需其他内容�?}
        ]
    }
    
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {service_config["api_key"]}'
    }
    
    # 发送流式请�?
    try:
        response = requests.post(
            service_config['url'],
            headers=headers,
            json=ai_request,
            stream=True,
            timeout=300
        )
        
        if response.status_code != 200:
            return jsonify({
                "error": f"图像服务返回错误: {response.status_code}",
                "detail": response.text
            }), response.status_code
        
        # 处理流式响应
        full_content = ""
        for chunk in response.iter_lines():
            if chunk:
                try:
                    # 去除SSE前缀 "data: "
                    if chunk.startswith(b'data: '):
                        chunk = chunk[6:]
                    
                    # 跳过[DONE]消息
                    if chunk == b'[DONE]':
                        continue
                    
                    # 解析JSON
                    chunk_data = json.loads(chunk)
                    
                    # 提取内容
                    if 'choices' in chunk_data and chunk_data['choices'] and 'delta' in chunk_data['choices'][0]:
                        delta = chunk_data['choices'][0]['delta']
                        if 'content' in delta:
                            content = delta['content']
                            full_content += content
                except Exception as e:
                    print(f"处理块数据错�? {e}, �? {chunk}")
        
        print(f"完整响应内容: {full_content}")
        
        # 直接使用完整响应作为URL，因为AI只返回一个URL
        image_url = full_content.strip()
        
        # 简单验证URL - 确保它是一个HTTPS URL
        if image_url.startswith('https://'):
            print(f"成功提取图像URL: {image_url}")
            return jsonify({"url": image_url})
        else:
            print(f"响应内容不是有效URL: {image_url}")
            return jsonify({"error": "AI未返回有效的图像URL", "content": image_url}), 500
            
    except Exception as e:
        print(f"图像生成异常: {str(e)}, 时间: {time.strftime('%Y-%m-%d %H:%M:%S')}")
        return jsonify({"error": f"请求图像生成服务时发生错�? {str(e)}"}), 500

# 其它管理函数同你的原始代�?..

if __name__ == '__main__':
    print(f"当前工作目录: {os.getcwd()}")
    print(f"脚本所在目�? {SCRIPT_DIR}")

    host = os.environ.get('HOST', '0.0.0.0')
    port = int(os.environ.get('PORT', 5000))

    print("可用的AI服务:")
    for id, service in AI_SERVICES.items():
        print(f"ID: {id}, 名称: {service['name']}, 访问密钥: {service['access_key']}")
        prompt_file = os.path.join(SCRIPT_DIR, f"{id}.txt")
        if os.path.exists(prompt_file):
            size = os.path.getsize(prompt_file)
            print(f"  预设文件: {id}.txt (已存�? 大小: {size} 字节)")
            print(f"  完整路径: {prompt_file}")
            try:
                with open(prompt_file, 'r', encoding='utf-8') as f:
                    preview = f.read(100)
                    print(f"  内容预览: {preview[:50]}{'...' if len(preview) > 50 else ''}")
            except Exception as e:
                print(f"  读取预览时出�? {e}")
        else:
            print(f"  预设文件: {id}.txt (缺失)")
            print(f"  完整路径: {prompt_file}")

    print("\n可用的语音服�?")
    for id, service in SPEECH_SERVICES.items():
        print(f"ID: {id}, 名称: {service['name']}, 模型: {service['model']}")

    print("\n可用的图像服�?")
    for id, service in IMAGE_SERVICES.items():
        print(f"ID: {id}, 名称: {service['name']}, 模型: {service['model']}")

    app.run(host=host, port=port, debug=True)
