import requests

story_id = 16
for i in range(3):
    response = requests.put(f'http://localhost:5000/api/stories/{story_id}/pat')
    result = response.json()
    print(f'第{i+1}次拍拍 - 拍拍數: {result["pat_count"]}, 解鎖聊天: {result.get("match_unlocked", False)}')