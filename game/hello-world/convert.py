import os
import re
import base64

src_dir = 'src'
dest_dir = os.path.join('assets', 'images')

files = [
    'title_bg.js',
    'title_1x_hello_world.js',
    'title_1x_baria.js',
    'game_over_img.js',
    'title_1x_back.js',
    'title_1x_number.js',
    'title_bg_glitch.js',
    'hero_stand_blink.js'
]

for f in files:
    src_path = os.path.join(src_dir, f)
    if not os.path.exists(src_path):
        print(f"Skip {f}")
        continue
    with open(src_path, 'r', encoding='utf-8') as file:
        content = file.read()
    
    match = re.search(r'data:image/[^;]+;base64,([^"\']+)', content)
    if match:
        b64_data = match.group(1)
        img_data = base64.b64decode(b64_data)
        out_name = f.replace('.js', '.png')
        out_path = os.path.join(dest_dir, out_name)
        with open(out_path, 'wb') as out_file:
            out_file.write(img_data)
        print(f"Saved {out_name}")
    else:
        print(f"No match for {f}")
