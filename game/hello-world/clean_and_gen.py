from PIL import Image

def clean_white_bg(filepath):
    try:
        img = Image.open(filepath).convert("RGBA")
        datas = img.getdata()

        newData = []
        for item in datas:
            # Change all white (also shades of white)
            # if r > 240 and g > 240 and b > 240:
            if item[0] > 240 and item[1] > 240 and item[2] > 240:
                newData.append((255, 255, 255, 0))
            else:
                newData.append(item)

        img.putdata(newData)
        img.save(filepath, "PNG")
        print(f"Cleaned {filepath}")
    except Exception as e:
        print(f"Error on {filepath}: {e}")

images = [
    r"c:\Users\deneb\projects\game\hello-world\assets\images\demon_lord_normal.png",
    r"c:\Users\deneb\projects\game\hello-world\assets\images\demon_lord_silent.png",
    r"c:\Users\deneb\projects\game\hello-world\assets\images\demon_lord_dying.png",
    r"c:\Users\deneb\projects\game\hello-world\assets\images\demon_lord_shock.png"
]

# Note: We need to recover the original images since we already overwrote them with rembg!
# Wait! Can we get them from git?
import subprocess
import os

repo_dir = r"c:\Users\deneb\projects\game\hello-world"
os.chdir(repo_dir)

# Revert to the commit before rembg (the rembg commit was adfc20a, previous was 5082564)
# Let's just checkout the specific files from the older commit
for img in images:
    rel_path = os.path.relpath(img, repo_dir).replace('\\', '/')
    subprocess.run(["git", "checkout", "5082564", "--", rel_path])

# Now apply the exact white filter
for img in images:
    clean_white_bg(img)

# Generate icons
from PIL import ImageDraw

person = Image.new('RGBA', (32, 64), (0, 0, 0, 0))
draw = ImageDraw.Draw(person)
# head: fillCircle(16, 8, 8) -> bbox: 8, 0, 24, 16
draw.ellipse((8, 0, 23, 15), fill=(255, 255, 255, 255))
# body: fillRect(8, 18, 16, 20)
draw.rectangle((8, 18, 23, 37), fill=(255, 255, 255, 255))
# left arm: fillRect(2, 18, 4, 18)
draw.rectangle((2, 18, 5, 35), fill=(255, 255, 255, 255))
# right arm: fillRect(26, 18, 4, 18) -> 26, 18, 29, 35
draw.rectangle((26, 18, 29, 35), fill=(255, 255, 255, 255))
# left leg: fillRect(10, 40, 4, 20)
draw.rectangle((10, 40, 13, 59), fill=(255, 255, 255, 255))
# right leg: fillRect(18, 40, 4, 20)
draw.rectangle((18, 40, 21, 59), fill=(255, 255, 255, 255))
person.save(r"assets\images\icon_person.png")

battery = Image.new('RGBA', (32, 64), (0, 0, 0, 0))
draw = ImageDraw.Draw(battery)
# lineStyle(4, 0xFFFFFF) strokeRect(4, 8, 24, 48)
draw.rectangle((4, 8, 27, 55), outline=(255, 255, 255, 255), width=4)
# fillRect(10, 2, 12, 6)
draw.rectangle((10, 2, 21, 7), fill=(255, 255, 255, 255))
battery.save(r"assets\images\icon_battery.png")

print("Done generating and cleaning.")
