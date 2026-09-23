import base64
import os

def convert(filename, varname, outname):
    with open(f"1x/{filename}", "rb") as f:
        data = base64.b64encode(f.read()).decode()
    with open(f"src/{outname}", "w", encoding="utf-8") as f:
        f.write(f"window.{varname} = 'data:image/png;base64,{data}';\n")
    print(f"Generated {outname}")

convert("hello world.png", "TITLE_1X_HELLO_WORLD_B64", "title_1x_hello_world.js")
convert("baria.png", "TITLE_1X_BARIA_B64", "title_1x_baria.js")
if os.path.exists("1x/game_over.png"):
    convert("game_over.png", "GAME_OVER_IMG_B64", "game_over_img.js")
if os.path.exists("1x/doctor_stand.png"):
    convert("doctor_stand.png", "DOCTOR_STAND_B64", "doctor_stand.js")
if os.path.exists("1x/doctor_stand_open.png"):
    convert("doctor_stand_open.png", "DOCTOR_STAND_OPEN_B64", "doctor_stand_open.js")
