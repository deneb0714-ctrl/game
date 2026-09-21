from PIL import Image

gif_path = r"../../魔王_戦闘ドット.gif"
sheet_path = r"assets/images/demon_lord_sheet.png"

try:
    img = Image.open(gif_path)
    frames = []
    try:
        while True:
            # Convert frame to RGBA to preserve transparency
            frame = img.convert("RGBA")
            frames.append(frame)
            img.seek(img.tell() + 1)
    except EOFError:
        pass

    if frames:
        width, height = frames[0].size
        num_frames = len(frames)
        
        # Create spritesheet
        sheet = Image.new("RGBA", (width * num_frames, height), (0,0,0,0))
        for i, frame in enumerate(frames):
            sheet.paste(frame, (i * width, 0))
            
        sheet.save(sheet_path)
        print(f"Created spritesheet with {num_frames} frames, size {width}x{height}")
    else:
        print("No frames found.")

except Exception as e:
    print(f"Error: {e}")
