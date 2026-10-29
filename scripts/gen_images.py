#!/usr/bin/env python3
# Генерация иллюстраций через Hugging Face FLUX (без водяных знаков).
# Токен читается из secrets.env (в .gitignore). Модель — FLUX.1-dev (можно schnell через HF_MODEL).

import os
import re
import time
import requests

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG_DIR = os.path.join(ROOT, 'web', 'content', 'img')
os.makedirs(IMG_DIR, exist_ok=True)

MODEL = os.environ.get('HF_MODEL', 'black-forest-labs/FLUX.1-dev')
ENDPOINT = 'https://router.huggingface.co/hf-inference/models/' + MODEL

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


def read_token():
    p = os.path.join(ROOT, 'secrets.env')
    if not os.path.exists(p):
        return None
    with open(p, encoding='utf-8') as f:
        for line in f:
            m = re.match(r'\s*HF_TOKEN\s*=\s*(.+)', line.strip())
            if m:
                return m.group(1).strip()
    return None


def generate(prompt, out_path, token):
    h = {'Authorization': 'Bearer ' + token}
    for attempt in range(4):
        r = requests.post(ENDPOINT, headers={**h, 'Content-Type': 'application/json'}, json={'inputs': prompt}, timeout=240)
        ct = r.headers.get('content-type', '')
        if r.status_code == 200 and ct.startswith('image/'):
            with open(out_path, 'wb') as f:
                f.write(r.content)
            return len(r.content)
        print('  attempt', attempt + 1, '->', r.status_code, r.text[:140].replace('\n', ' '))
        if r.status_code == 403:
            print('  >>> 403: токен без прав на inference. Нужен Fine-grained токен с правом "Make calls to Inference Providers" и принятая лицензия модели.')
            return None
        time.sleep(20)
    return None


def main():
    token = read_token()
    if not token:
        print('HF_TOKEN не найден в secrets.env')
        return
    ok = 0
    for name, (scene, w, h) in SCENES.items():
        out = os.path.join(IMG_DIR, name + '.jpg')
        prompt = STYLE.format(scene=scene) + ', ' + str(w) + 'x' + str(h)
        size = generate(prompt, out, token)
        if size:
            print('ok ', name, size)
            ok += 1
        else:
            print('FAIL', name)
        time.sleep(2)
    print('готово:', ok, 'из', len(SCENES))


if __name__ == '__main__':
    main()
