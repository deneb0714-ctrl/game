from PIL import Image

def colorize(path, r_target, g_target, b_target):
    with Image.open(path) as img:
        img = img.convert('RGBA')
        data = img.getdata()
        new_data = []
        for r, g, b, a in data:
            if a == 0:
                new_data.append((0,0,0,0))
                continue
            
            # Use brightness to scale the target color
            brightness = max(r, g, b) / 255.0
            
            # If it's very bright (core), keep it white
            if brightness > 0.8:
                new_data.append((255, 255, 255, a))
            else:
                new_data.append((int(r_target * brightness), int(g_target * brightness), int(b_target * brightness), a))
                
        img.putdata(new_data)
        img.save(path)
        print(f"Colorized {path}")

# Boss 1: orange-yellow (255, 200, 0)
colorize('assets/images/boss1_wind_slash.png', 255, 200, 0)
