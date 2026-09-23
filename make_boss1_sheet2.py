from PIL import Image
import os

images = [
    '筋肉/脳筋_左振り上げ（通常）.png',
    '筋肉/脳筋_左振り上げ（通常）目閉じ.png',
    '筋肉/脳筋_右振り下ろし.png',
    '筋肉/脳筋_右振り下ろし目閉じ.png',
    '筋肉/脳筋_右振り上げ.png',
    '筋肉/脳筋_右振り上げ目閉じ.png',
    '筋肉/脳筋_左振り下ろし.png',
    '筋肉/脳筋_左振り下ろし目閉じ.jpg'
]

sheet_width = 100 * len(images)
sheet_height = 100
sheet = Image.new('RGBA', (sheet_width, sheet_height), (0, 0, 0, 0))

for i, filename in enumerate(images):
    if not os.path.exists(filename):
        continue
    with Image.open(filename) as img:
        img = img.convert('RGBA')
        
        # If it's the jpg, remove white background
        if filename.endswith('.jpg'):
            data = img.getdata()
            new_data = []
            for item in data:
                # If pixel is close to white, make transparent
                if item[0] > 240 and item[1] > 240 and item[2] > 240:
                    new_data.append((255, 255, 255, 0))
                else:
                    new_data.append(item)
            img.putdata(new_data)
            
        sheet.paste(img, (i * 100, 0))

out_path = 'assets/images/boss1_combat_sheet.png'
sheet.save(out_path)
print(f"Created {out_path} with transparent background for jpg.")
