import os
os.environ['AGNES_API_KEY'] = 'sk-trQlNGVo5XZe9EkMZ1WNUki8mESt2DFStGBK5V8nRNBmlpQ2'

import sys
sys.path.insert(0, 'E:/OH-workspace/antenna-tracker')
from scripts.lib.agnes_client import AgnesClient

client = AgnesClient()
try:
    result = client.generate(
        prompt="你好，请用一句话回答",
        system_prompt="你是一个助手",
        max_tokens=50
    )
    print("SUCCESS:", result)
except Exception as e:
    print("FAILED:", type(e).__name__, str(e)[:200])
