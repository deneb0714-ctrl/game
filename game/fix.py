import re

with open('hello-world/index.html', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('v246', 'v247')

text = text.replace('<button class="warning-btn" style="border-color: #4FD1FF; color: #4FD1FF; font-size: 14px; padding: 8px 16px;" onclick="window.forceClearCache()">[ 🔄 キャッシュ消去＆最新版へ更新 ]</button>\n', '')
text = text.replace('<button onclick="window.forceClearCache()" style="background: rgba(5,8,20,0.85); color: #4FD1FF; border: 1px solid #4FD1FF; border-radius: 4px; padding: 6px 10px; font-family: \'DotGothic16\', sans-serif; font-size: 13px; cursor: pointer;">🔄 キャッシュ消去</button>\n', '')

text = text.replace('<div id="floating-update-btn" style="', '<div id="floating-update-btn" class="mobile-only" style="')

text = re.sub(r'    // Unregister Service Worker & Clear Cache Storage to force fresh load.*?window\.forceClearCache = function\(\) \{.*?\};\n', '', text, flags=re.DOTALL)

with open('hello-world/index.html', 'w', encoding='utf-8') as f:
    f.write(text)
