from PIL import Image

def resize_img(path, size):
    with Image.open(path) as img:
        # Use simple resize
        img = img.resize(size, Image.Resampling.LANCZOS)
        img.save(path)
        print(f"Resized {path} to {size}")

resize_img('assets/images/boss1_wind_slash.png', (150, 150))
resize_img('assets/images/boss2_bullet.png', (50, 50))
