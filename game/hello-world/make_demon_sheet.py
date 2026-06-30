import os
from PIL import Image

folder = 'temp_demon_zip'
files = sorted(os.listdir(folder))

# 40 frames total
cols = 8
rows = 5
frame_w = 659
frame_h = 1090

# create blank transparent canvas
sheet = Image.new('RGBA', (cols * frame_w, rows * frame_h), (0, 0, 0, 0))

for idx, f in enumerate(files):
    img = Image.open(os.path.join(folder, f)).convert('RGBA')
    # crop bounding box
    cropped = img.crop((68, 52, 727, 1142))
    
    # make white transparent
    data = cropped.getdata()
    new_data = []
    for item in data:
        # replace pure white
        if item[0] == 255 and item[1] == 255 and item[2] == 255:
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append(item)
    cropped.putdata(new_data)
    
    # paste into sheet
    c = idx % cols
    r = idx // cols
    sheet.paste(cropped, (c * frame_w, r * frame_h))

sheet.save('assets/demon_combat_sheet.png')
print("Successfully generated assets/demon_combat_sheet.png")
