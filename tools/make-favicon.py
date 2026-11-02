"""Pasto: favicon.ico (16, 32, 48) from assets/icons/favicon-48.png.  python3 tools/make-favicon.py (needs Pillow)."""
import os
from PIL import Image
root = os.path.join(os.path.dirname(__file__), "..")
Image.open(os.path.join(root, "assets/icons/favicon-48.png")).save(os.path.join(root, "favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48)])
print("favicon.ico written")
