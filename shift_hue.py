from PIL import Image
import colorsys
import os

def shift_hue(img_path, target_hue, out_path):
    if not os.path.exists(img_path):
        print(f"File not found: {img_path}")
        return
    with Image.open(img_path) as img:
        img = img.convert('RGBA')
        data = img.getdata()
        new_data = []
        for item in data:
            r, g, b, a = item
            if a == 0:
                new_data.append(item)
                continue
            
            # Convert RGB to HSV
            h, s, v = colorsys.rgb_to_hsv(r/255.0, g/255.0, b/255.0)
            
            # If it's mostly white (low saturation, high value), keep it somewhat white
            if s < 0.1 and v > 0.9:
                new_data.append(item)
                continue
                
            # Set new hue but keep original saturation and value
            r_new, g_new, b_new = colorsys.hsv_to_rgb(target_hue, s, v)
            new_data.append((int(r_new*255), int(g_new*255), int(b_new*255), a))
            
        img.putdata(new_data)
        img.save(out_path)
        print(f"Saved {out_path} with hue {target_hue}")

# Boss 1: Orange-ish yellow (hue around 0.12)
shift_hue('assets/images/boss1_wind_slash.png', 0.12, 'assets/images/boss1_wind_slash.png')

# Boss 2: Red (hue 0.0)
shift_hue('assets/images/boss2_bullet.png', 0.0, 'assets/images/boss2_bullet.png')
