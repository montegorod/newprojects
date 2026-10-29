// Игровой движок (детерминированный): статы, кубики, колода, ветвление.
// Нарратив лежит отдельно в content/*.json — движок его не сочиняет.

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

class Dice {
  static roll(sides) {
    return Math.floor(Math.random() * sides) + 1;
  }
  // Формат: "d20", "2d6", "1d8+2"
  static rollExpr(expr) {
    const m = /^(\d*)d(\d+)([+-]\d+)?$/.exec(String(expr).replace(/\s/g, ''));
    if (!m) throw new Error('Неверный формат кубика: ' + expr);
    const count = m[1] ? parseInt(m[1], 10) : 1;
    const sides = parseInt(m[2], 10);
    const mod = m[3] ? parseInt(m[3], 10) : 0;
    let total = 0;
    for (let i = 0; i < count; i++) total += Dice.roll(sides);
    return total + mod;
  }
}

const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

class Deck {
  constructor(withJokers = true) {
    this.cards = [];
    for (const suit of SUITS) for (const rank of RANKS) this.cards.push({ suit, rank });
    if (withJokers) this.cards.push({ suit: 'joker', rank: 'B' }, { suit: 'joker', rank: 'R' });
    this.cards = shuffle(this.cards);
  }
  draw() { return this.cards.shift() ?? null; }
  drawN(n) { const out = []; for (let i = 0; i < n; i++) { const c = this.draw(); if (c) out.push(c); } return out; }
  get remaining() { return this.cards.length; }
}

class Player {
  constructor(statsDef, initial) {
    this.stats = {};
    for (const s of statsDef) this.stats[s] = initial && initial[s] != null ? initial[s] : 0;
    this.flags = new Set();
    this.inventory = [];
    this.journal = [];
    this.hand = [];
  }
  get(name) { return this.stats[name] ?? 0; }
  apply(effects) {
    if (!effects) return;
    if (effects.add) for (const [k, v] of Object.entries(effects.add)) this.stats[k] = (this.stats[k] ?? 0) + v;
    if (effects.set) for (const [k, v] of Object.entries(effects.set)) this.stats[k] = v;
    if (effects.flags) for (const f of effects.flags) this.flags.add(f);
    if (effects.items) for (const it of effects.items) this.inventory.push(it);
    if (effects.journal) this.journal.push(effects.journal);
  }
}

class Engine {
  constructor(gameData) {
    this.data = gameData;
    this.player = null;
    this.deck = null;
    this.currentNode = null;
  }
  start() {
    this.player = new Player(this.data.stats, this.data.initial);
    this.deck = new Deck(true);
    this.currentNode = this.data.start;
    return this;
  }
  node(id) { return this.data.nodes[id]; }
  // Выбор по индексу. Возвращает { node, check?, draw? }.
  choose(index) {
    const node = this.data.nodes[this.currentNode];
    const choice = node.choices[index];
    if (!choice) return null;
    this.player.apply(choice.effects);

    let checkResult = null;
    let drawResult = null;

    if (choice.check) {
      const c = choice.check;
      const expr = c.expr || ('d' + c.die);
      const roll = Dice.rollExpr(expr);
      const ok = roll >= c.target;
      checkResult = { expr, roll, target: c.target, ok };
      if (!ok && c.failNext) {
        this.currentNode = c.failNext;
        return { check: checkResult, node: c.failNext };
      }
    }

    if (choice.table) {
      const t = choice.table;
      const roll = Dice.rollExpr(t.expr);
      let target = t.default;
      for (const row of t.rows) {
        if (roll >= row.min && roll <= row.max) { target = row.node; break; }
      }
      checkResult = { expr: t.expr, roll, table: true };
      this.currentNode = target;
      return { check: checkResult, node: target };
    }

    if (choice.drawCard) {
      const card = this.deck.draw();
      drawResult = { card, remaining: this.deck.remaining };
    }

    this.currentNode = choice.next;
    return { check: checkResult, draw: drawResult, node: choice.next };
  }
}

if (typeof window !== 'undefined') window.GameEngine = { Dice, Deck, Player, Engine, SUITS, RANKS };
if (typeof module !== 'undefined') module.exports = { Dice, Deck, Player, Engine, SUITS, RANKS };
