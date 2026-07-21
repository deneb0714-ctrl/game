from PIL import Image

def process_pixel_slash(in_path, out_path):
    with Image.open(in_path) as img:
        img = img.convert('RGBA')
        data = img.getdata()
        new_data = []
        for r, g, b, a in data:
            luminance = max(r, g, b)
            if luminance < 30:
                new_data.append((r, g, b, 0)) # transparent background
            else:
                new_data.append((r, g, b, a))
                
        img.putdata(new_data)
        
        # Resize to something reasonable for a pixel art game, like 64x64 or 128x128
        img = img.resize((128, 128), Image.Resampling.NEAREST)
        img.save(out_path)
        print(f"Processed and saved {out_path}")

process_pixel_slash('C:/Users/deneb/.gemini/antigravity/brain/5d406c1e-d8ca-47e6-8478-e1e2a25b4252/boss1_wind_slash_pixel_1784638450782.png', 'assets/images/boss1_wind_slash.png')
