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

# We will create an 800x100 spritesheet
sheet_width = 100 * len(images)
sheet_height = 100

sheet = Image.new('RGBA', (sheet_width, sheet_height), (0, 0, 0, 0))

for i, filename in enumerate(images):
    if not os.path.exists(filename):
        print(f"File not found: {filename}")
        continue
    with Image.open(filename) as img:
        img = img.convert('RGBA')
        # Some images might have white background if they are jpg, let's just paste them.
        sheet.paste(img, (i * 100, 0))

out_path = 'assets/images/boss1_combat_sheet.png'
sheet.save(out_path)
print(f"Created {out_path} successfully.")
