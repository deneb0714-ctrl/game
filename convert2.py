import os
import re
import base64

src_dir = 'src'
dest_dir = os.path.join('assets', 'images')

file_map = {
    'title_bg.js': 'title_bg.png',
    'title_1x_hello_world.js': 'title_1x_hello_world.png',
    'title_1x_baria.js': 'title_1x_baria.png',
    'game_over_img.js': 'game_over_img.png',
    'title_1x_back.js': 'title_1x_back.png',
    'title_1x_number.js': 'title_1x_number.png',
    'title_bg_glitch.js': 'title_bg_glitch.png',
    'hero_stand_blink.js': 'hero_stand_blink.png',
    
    # Overwrite old existing images
    'boss1.js': 'boss1_muscle.png',
    'boss2.js': 'boss2_combat.jpg',
    'doctor.js': 'doctor_face.png',
    'doctor_stand.js': 'doctor_normal.png',
    'doctor_stand_open.js': 'doctor_open_eyes.png',
    'hero_stand.js': 'hero_stand.png',
    'hero_stand_combat.js': 'hero_combat_sheet.png'
}

for src_file, out_name in file_map.items():
    src_path = os.path.join(src_dir, src_file)
    if not os.path.exists(src_path):
        print(f"Skip {src_file}")
        continue
    with open(src_path, 'r', encoding='utf-8') as file:
        content = file.read()
    
    match = re.search(r'data:image/[^;]+;base64,([^"\']+)', content)
    if match:
        b64_data = match.group(1)
        img_data = base64.b64decode(b64_data)
        out_path = os.path.join(dest_dir, out_name)
        with open(out_path, 'wb') as out_file:
            out_file.write(img_data)
        print(f"Saved {out_name}")
    else:
        print(f"No match for {src_file}")
