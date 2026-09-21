import sys
from PIL import Image

try:
    boss1 = Image.open('assets/images/boss1_muscle.png')
    print(f"boss1 size: {boss1.size}")
except Exception as e:
    print(f"boss1 error: {e}")

try:
    boss2 = Image.open('assets/images/boss2_combat.jpg')
    print(f"boss2 size: {boss2.size}")
except Exception as e:
    print(f"boss2 error: {e}")

try:
    doctor = Image.open('assets/images/doctor_face.jpg')
    print(f"doctor size: {doctor.size}")
except Exception as e:
    print(f"doctor error: {e}")
