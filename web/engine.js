// v2 — движок данжен-кроулера (в духе Four Against Darkness).
(function (global) {
  function rnd(n) { return Math.floor(Math.random() * n); }
  function d(sides) { return rnd(sides) + 1; }

  // Взрывной d6: на 6 — переброс, значения складываются.
  function explodingD6() {
    let total = 0, faces = [], r;
    do { r = d(6); faces.push(r); total += r; } while (r === 6);
    return { total: total, faces: faces };
  }

  const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'];
  const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

  class Deck {
    constructor(withJokers) {
      if (withJokers === undefined) withJokers = true;
      this.cards = [];
      for (let i = 0; i < SUITS.length; i++) {
        for (let j = 0; j < RANKS.length; j++) this.cards.push({ suit: SUITS[i], rank: RANKS[j] });
      }
      if (withJokers) this.cards.push({ suit: 'joker', rank: 'B' }, { suit: 'joker', rank: 'R' });
      for (let k = this.cards.length - 1; k > 0; k--) {
        const m = rnd(k + 1);
        const t = this.cards[k]; this.cards[k] = this.cards[m]; this.cards[m] = t;
      }
    }
    draw() { return this.cards.shift() || null; }
  }

  function rollRoomContent() {
    const r = d(6);
    if (r <= 2) return 'monster';
    if (r === 3) return 'trap';
    if (r === 4) return 'treasure';
    if (r === 5) return 'empty';
    return 'fountain';
  }

  class Dungeon {
    constructor(size, rooms) {
      if (size === undefined) size = 7;
      if (rooms === undefined) rooms = 6;
      this.size = size;
      this.cells = [];
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          this.cells.push({ x: x, y: y, kind: 'corridor', content: null, explored: false, cleared: false });
        }
      }
      const sx = Math.floor(size / 2);
      this.start = { x: sx, y: size - 1 };
      this.set(sx, size - 1, { kind: 'entrance', explored: true });

      let cx = sx, cy = size - 2, made = 0;
      const dirs = [[-1, 0], [1, 0], [0, -1]];
      while (cy >= 0 && made < rooms) {
        this.set(cx, cy, { kind: 'room', content: rollRoomContent() });
        made++;
        const dd = dirs[rnd(dirs.length)];
        cx = Math.max(0, Math.min(size - 1, cx + dd[0]));
        cy = cy + dd[1];
      }
      const bx = cx, by = Math.max(0, cy);
      this.boss = { x: bx, y: by };
      this.set(bx, by, { kind: 'boss', content: 'boss' });
    }
    set(x, y, patch) {
      const c = this.cell(x, y);
      if (c) { for (const k in patch) c[k] = patch[k]; }
      return c;
    }
    cell(x, y) {
      for (let i = 0; i < this.cells.length; i++) {
        if (this.cells[i].x === x && this.cells[i].y === y) return this.cells[i];
      }
      return null;
    }
    neighbors(x, y) {
      return [[0, -1], [0, 1], [-1, 0], [1, 0]]
        .map(p => ({ x: x + p[0], y: y + p[1] }))
        .filter(p => p.x >= 0 && p.y >= 0 && p.x < this.size && p.y < this.size);
    }
  }

  const MONSTER_NAMES = ['Гнилая крыса', 'Утопленник', 'Культист', 'Глубинное отродье'];
  function makeMonster(level) {
    const life = level >= 4 ? 4 : 1;
    return { name: MONSTER_NAMES[Math.min(level - 1, MONSTER_NAMES.length - 1)], level: level, life: life, maxLife: life };
  }

  global.Game2 = { d: d, explodingD6: explodingD6, Deck: Deck, Dungeon: Dungeon, makeMonster: makeMonster, rollRoomContent: rollRoomContent };
})(window);
