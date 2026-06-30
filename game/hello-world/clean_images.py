import os
from rembg import remove
from PIL import Image

images_dir = r"c:\Users\deneb\projects\game\hello-world\assets\images"
files = [
    "demon_lord_normal.png",
    "demon_lord_silent.png",
    "demon_lord_dying.png",
    "demon_lord_shock.png"
]

for filename in files:
    input_path = os.path.join(images_dir, filename)
    output_path = os.path.join(images_dir, filename)
    
    print(f"Processing {filename}...")
    try:
        input_image = Image.open(input_path)
        output_image = remove(input_image)
        output_image.save(output_path)
        print(f"Successfully cleaned {filename}")
    except Exception as e:
        print(f"Error processing {filename}: {e}")
