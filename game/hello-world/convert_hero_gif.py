import sys
from PIL import Image
import base64
from io import BytesIO
import math

gif_path = "勇者_戦闘ドット.gif"
js_path = "src/hero_combat_sheet.js"

gif = Image.open(gif_path)
frames = []

try:
    while True:
        # Some gifs have transparency handling that requires converting to RGBA
        # For GIFs with disposal methods, we need to composite them
        frame = gif.convert('RGBA')
        frames.append(frame)
        gif.seek(len(frames))
except EOFError:
    pass

width, height = frames[0].size
total_frames = len(frames)

# Pack into a grid to avoid exceeding WebGL MAX_TEXTURE_SIZE (e.g., 8192 or 16384)
# Let's aim for a roughly square texture.
columns = int(math.ceil(math.sqrt(total_frames)))
rows = int(math.ceil(total_frames / columns))

sheet_width = width * columns
sheet_height = height * rows

sheet = Image.new('RGBA', (sheet_width, sheet_height))

for i, frame in enumerate(frames):
    col = i % columns
    row = i // columns
    sheet.paste(frame, (col * width, row * height))

# Save to bytes
buffered = BytesIO()
sheet.save(buffered, format="PNG")
img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")

# Write to JS
with open(js_path, "w", encoding="utf-8") as f:
    f.write(f"window.HERO_COMBAT_SHEET_B64 = 'data:image/png;base64,{img_str}';\n")
    f.write(f"window.HERO_COMBAT_FRAME_WIDTH = {width};\n")
    f.write(f"window.HERO_COMBAT_FRAME_HEIGHT = {height};\n")

print(f"Success! Frames: {total_frames}, Frame Size: {width}x{height}, Sheet Size: {sheet_width}x{sheet_height}")
