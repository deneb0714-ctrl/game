from PIL import Image

try:
    img = Image.open('勇者_戦闘ドット.gif')
    frames = 0
    while True:
        frames += 1
        img.seek(img.tell() + 1)
except EOFError:
    pass

print(f"Total frames: {frames}")
