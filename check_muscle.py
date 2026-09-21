from PIL import Image
import os
import glob

files = glob.glob('筋肉/*.*')
for f in files:
    with Image.open(f) as img:
        print(f, img.size)
