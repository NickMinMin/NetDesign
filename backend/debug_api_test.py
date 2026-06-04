import sys
import importlib

sys.path.append(r'c:\Users\jypya\Desktop\NetDesign')
mod = importlib.import_module('backend.app')
app = mod.app
client = app.test_client()

resp = client.post('/api/stories', json={'content': 'test story'})
print('create story', resp.status_code, resp.get_json())
story = resp.get_json()
story_id = story['id']
print('story_id', story_id)

last = None
for i in range(3):
    r = client.put(f'/api/stories/{story_id}/pat')
    print('pat', i+1, r.status_code, r.get_json())
    last = r.get_json()

chat_room_id = last.get('chat_room_id')
print('chat_room_id', chat_room_id)

r = client.post(
    f'/api/chat-rooms/{chat_room_id}/messages',
    json={'sender_story_id': story_id, 'content': 'hey'}
)
print('send without auth', r.status_code, r.get_json())

headers = {'Authorization': 'Bearer wrongtoken'}
r = client.post(
    f'/api/chat-rooms/{chat_room_id}/messages',
    json={'sender_story_id': story_id, 'content': 'hey'},
    headers=headers
)
print('send wrong auth', r.status_code, r.get_json())
