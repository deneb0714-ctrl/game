import sys
import json
from PIL import Image

def main():
    gif_path = "4-1.gif"
    try:
        im = Image.open(gif_path)
    except Exception as e:
        print(f"Error opening GIF: {e}")
        return

    frames = []
    duration = im.info.get('duration', 100) # Default to 100ms
    try:
        while True:
            frame_img = im.convert("RGBA")
            # Resize frame to fit in a reasonable sprite sheet
            frame_img = frame_img.resize((960, 540), Image.Resampling.LANCZOS)
            frames.append(frame_img)
            im.seek(len(frames))
    except EOFError:
        pass

    num_frames = len(frames)
    if num_frames == 0:
        print("No frames found")
        return
        
    width, height = 960, 540
    
    # Calculate grid size (e.g., 6 columns)
    cols = 6
    rows = (num_frames + cols - 1) // cols
    
    sheet_w = cols * width
    sheet_h = rows * height
    
    # Create the sprite sheet
    sheet = Image.new('RGBA', (sheet_w, sheet_h))
    for i, frame in enumerate(frames):
        row = i // cols
        col = i % cols
        sheet.paste(frame, (col * width, row * height))
        
    sheet_path = "hero_title_sheet.png"
    sheet.save(sheet_path)
    
    meta = {
        "frameWidth": width,
        "frameHeight": height,
        "numFrames": num_frames,
        "durationMs": duration
    }
    
    with open("gif_meta.json", "w") as f:
        json.dump(meta, f)
        
    print(f"Converted {num_frames} frames. Frame size: {width}x{height}. Sheet size: {sheet_w}x{sheet_h}. Saved to {sheet_path}")

if __name__ == '__main__':
    main()
