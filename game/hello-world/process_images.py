from PIL import Image
import os

def glow_to_alpha(img_path, out_path):
    if not os.path.exists(img_path):
        print(f"File not found: {img_path}")
        return
    with Image.open(img_path) as img:
        img = img.convert('RGBA')
        data = img.getdata()
        new_data = []
        for item in data:
            # item is (R, G, B, A)
            # Use average of RGB as alpha (or max of RGB) to make black transparent
            # but keep the original colors
            luminance = max(item[0], item[1], item[2])
            
            if luminance < 30:
                new_data.append((item[0], item[1], item[2], 0))
            else:
                # We can also map luminance to alpha smoothly
                alpha = int(min(255, max(0, luminance * 1.5)))
                new_data.append((item[0], item[1], item[2], alpha))
        
        img.putdata(new_data)
        img.save(out_path)
        print(f"Saved {out_path}")

glow_to_alpha('C:/Users/deneb/.gemini/antigravity/brain/5d406c1e-d8ca-47e6-8478-e1e2a25b4252/boss1_wind_slash_1784637163364.png', 'assets/images/boss1_wind_slash.png')
glow_to_alpha('C:/Users/deneb/.gemini/antigravity/brain/5d406c1e-d8ca-47e6-8478-e1e2a25b4252/boss2_bullet_1784637179593.png', 'assets/images/boss2_bullet.png')
