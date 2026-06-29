import sys
from PIL import Image
import base64
from io import BytesIO
import math

gif_path = "魔王_戦闘ドット.gif"
js_path = "src/demon_combat_sheet.js"

gif = Image.open(gif_path)
frames = []

try:
    while True:
        frame = gif.convert('RGBA')
        frame = frame.resize((63, 112), Image.NEAREST)
        frames.append(frame)
        gif.seek(len(frames))
except EOFError:
    pass

width, height = frames[0].size  # 63, 112
total_frames = len(frames)

columns = int(math.ceil(math.sqrt(total_frames)))
rows = int(math.ceil(total_frames / columns))

sheet_width = width * columns
sheet_height = height * rows

sheet = Image.new('RGBA', (sheet_width, sheet_height))

for i, frame in enumerate(frames):
    col = i % columns
    row = i // columns
    sheet.paste(frame, (col * width, row * height))

buffered = BytesIO()
sheet.save(buffered, format="PNG")
img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")

with open(js_path, "w", encoding="utf-8") as f:
    f.write(f"window.DEMON_COMBAT_SHEET_B64 = 'data:image/png;base64,{img_str}';\n")
    f.write(f"window.DEMON_COMBAT_FRAME_WIDTH = {width};\n")
    f.write(f"window.DEMON_COMBAT_FRAME_HEIGHT = {height};\n")

print(f"Success! Frames: {total_frames}, Frame Size: {width}x{height}, Sheet Size: {sheet_width}x{sheet_height}")
