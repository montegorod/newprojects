#!/usr/bin/env python3
# Генерация иллюстраций-гравюр для «Прилив в Грейхэвене».
# Сервис: Pollinations.ai — бесплатно, без API-ключа (есть rate-limit, поэтому с бэкоффом).
# Результат: web/content/img/*.jpg  (уже готовые файлы пропускаются)

import os
import time
import urllib.parse
import requests

IMG_DIR = os.path.join(os.path.dirname(__file__), '..', 'web', 'content', 'img')
os.makedirs(IMG_DIR, exist_ok=True)

STYLE = (
    "Dark woodcut engraving, {scene}, Lovecraftian coastal horror, "
    "black and white with a single deep teal accent, heavy crosshatching, "
    "dense shadows, atmospheric, cinematic framing, no text, no watermark, no signature"
)

SCENES = {
    "cover":       ("old house above a black bay, thick fog, distant lights", 512, 768),
    "prologue":    ("empty train platform at dusk, fog rolling in from the sea", 768, 512),
    "port":        ("docks with empty boats, an old fisherman mending his net", 768, 512),
    "nightfall":   ("a road through thick fog toward an old house on the edge of town", 768, 512),
    "house":       ("an old house behind a rusted gate, a single candle in one window", 768, 512),
    "hall":        ("a dark hallway lined with old portraits whose eyes seem to follow", 768, 512),
    "study":       ("a study buried in papers, a diary open on the desk, candlelight", 768, 512),
    "upstairs":    ("a child's room with an overturned cradle and a music box", 768, 512),
    "cellar":      ("a dark cellar, a stone door set in the far wall", 768, 512),
    "cellar_door": ("a cavern sloping down to black water, a stone doorway behind", 768, 512),
    "descend":     ("black water with something vast stirring in the depths", 768, 512),
    "retreat":     ("fleeing through thick fog at night, a candle moving in a window behind", 768, 512),
}


def fetch(name, scene, width, height):
    prompt = STYLE.format(scene=scene)
    url = "https://image.pollinations.ai/prompt/" + urllib.parse.quote(prompt)
    params = {"width": width, "height": height, "nologo": "true", "model": "flux"}
    r = requests.get(url, params=params, timeout=180)
    r.raise_for_status()
    path = os.path.join(IMG_DIR, name + ".jpg")
    with open(path, "wb") as f:
        f.write(r.content)
    return path, len(r.content)


def main():
    for name, (scene, w, h) in SCENES.items():
        path = os.path.join(IMG_DIR, name + ".jpg")
        if os.path.exists(path) and os.path.getsize(path) > 5000:
            print("skip", name)
            continue
        done = False
        for attempt in range(6):
            try:
                p, size = fetch(name, scene, w, h)
                print("ok  ", name, size)
                done = True
                break
            except Exception as e:
                code = getattr(getattr(e, 'response', None), 'status_code', None)
                print("fail", name, "attempt", attempt + 1, "http", code)
                time.sleep(30)
        if not done:
            print("GIVEUP", name)
        time.sleep(12)


if __name__ == "__main__":
    main()
