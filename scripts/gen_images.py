#!/usr/bin/env python3
# Генерация иллюстраций через Replicate FLUX.1-dev (без водяных знаков).
# Токен читается из secrets.env (в .gitignore).

import os
import re
import time
import requests

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG_DIR = os.path.join(ROOT, 'web', 'content', 'img')
os.makedirs(IMG_DIR, exist_ok=True)

MODEL = 'black-forest-labs/flux-dev'
API = 'https://api.replicate.com/v1/models/' + MODEL + '/predictions'

STYLE = (
    "Dark woodcut engraving, {scene}, Lovecraftian coastal horror, "
    "black and white with a single deep teal accent, heavy crosshatching, "
    "dense shadows, atmospheric, cinematic framing, no text, no watermark, no signature"
)

# имя: (описание сцены, ширина, высота) — под данжен-кроулер v2
SCENES = {
    "cover":     ("an old town above a black bay, thick fog, distant lights", 512, 768),
    "rat":       ("a giant rotting rat in a dark stone dungeon", 768, 512),
    "drowned":   ("a drowned man rising from black water, seaweed", 768, 512),
    "cultist":   ("a hooded cultist holding a ritual dagger, candlelight", 768, 512),
    "boss":      ("a vast eldritch horror rising from the depths", 768, 512),
    "treasure":  ("an old treasure chest in a stone dungeon", 768, 512),
    "trap":      ("a spiked floor trap in a stone dungeon", 768, 512),
    "fountain":  ("a healing fountain in a stone dungeon", 768, 512),
    "corridor":  ("a dark stone dungeon corridor with torches", 768, 512),
}


def read_token():
    p = os.path.join(ROOT, 'secrets.env')
    with open(p, encoding='utf-8') as f:
        for line in f:
            m = re.match(r'\s*REPLICATE_API_TOKEN\s*=\s*(.+)', line.strip())
            if m:
                return m.group(1).strip()
    return None


def generate(prompt, w, h, token):
    headers = {'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json', 'Prefer': 'wait'}
    body = {'input': {'prompt': prompt, 'width': w, 'height': h, 'num_outputs': 1, 'output_format': 'jpg'}}
    for attempt in range(3):
        r = requests.post(API, headers=headers, json=body, timeout=300)
        if r.status_code in (200, 201):
            d = r.json()
            if d.get('status') == 'succeeded' and d.get('output'):
                return d['output'][0]
            print('  status', d.get('status'), str(d.get('error'))[:120])
        else:
            print('  http', r.status_code, r.text[:160])
        time.sleep(5)
    return None


def download(url, path):
    r = requests.get(url, timeout=120)
    r.raise_for_status()
    with open(path, 'wb') as f:
        f.write(r.content)
    return len(r.content)


def main():
    token = read_token()
    if not token:
        print('REPLICATE_API_TOKEN не найден в secrets.env')
        return
    ok = 0
    for name, (scene, w, h) in SCENES.items():
        prompt = STYLE.format(scene=scene)
        url = generate(prompt, w, h, token)
        if url:
            out = os.path.join(IMG_DIR, name + '.jpg')
            try:
                size = download(url, out)
                print('ok  ', name, size)
                ok += 1
            except Exception as e:
                print('dl-fail', name, str(e)[:80])
        else:
            print('FAIL', name)
        time.sleep(1)
    print('готово:', ok, 'из', len(SCENES))


if __name__ == '__main__':
    main()
