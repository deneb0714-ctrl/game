from PIL import Image

def analyze_image(path):
    with Image.open(path) as img:
        print(f"{path}: size={img.size}")

analyze_image('assets/images/boss1_wind_slash.png')
