import sys
from PIL import Image

gif_path = "魔王_戦闘ドット.gif"
try:
    gif = Image.open(gif_path)
    print(f"Original size: {gif.size}")
    frames = 0
    try:
        while True:
            frames += 1
            gif.seek(frames)
    except EOFError:
        pass
    print(f"Total frames: {frames}")
except Exception as e:
    print(e)
