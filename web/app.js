// UI и игровой цикл пилота. Движок — engine.js, контент — content/act1.json.
const ENG = window.GameEngine;

let engine;
let lang = 'ru';

const SUIT_SYMBOL = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣', joker: '🃏' };
const SUIT_LABEL = {
  ru: { spades: 'Пики — Угроза', hearts: 'Черви — Союз', diamonds: 'Бубны — Улика', clubs: 'Трефы — Тайна', joker: 'Джокер — Разлом' },
  en: { spades: 'Spades — Danger', hearts: 'Hearts — Ally', diamonds: 'Diamonds — Clue', clubs: 'Clubs — Secret', joker: 'Joker — Rupture' }
};

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function text(node) {
  return node[lang] || node.ru;
}

async function init() {
  const res = await fetch('content/act1.json');
  const data = await res.json();
  engine = new ENG.Engine(data).start();
  render();
}

function render() {
  const node = engine.node(engine.currentNode);
  const l = text(node);

  document.getElementById('title').textContent =
    lang === 'ru' ? engine.data.meta.title_ru : engine.data.meta.title_en;
  document.getElementById('story').innerHTML = esc(l.text).replace(/\n/g, '<br>');
  document.getElementById('art').textContent = l.image ? '[иллюстрация: ' + l.image + ']' : '';

  // статы
  const statsEl = document.getElementById('stats');
  statsEl.innerHTML = '';
  for (const [k, v] of Object.entries(engine.player.stats)) {
    const d = document.createElement('div');
    d.className = 'stat';
    d.innerHTML = '<span>' + esc(k) + '</span><b>' + v + '</b>';
    statsEl.appendChild(d);
  }

  // журнал
  const journalEl = document.getElementById('journal');
  journalEl.innerHTML = '';
  engine.player.journal.slice(-4).forEach((entry) => {
    const p = document.createElement('p');
    p.textContent = '· ' + entry;
    journalEl.appendChild(p);
  });

  // выборы
  const choicesEl = document.getElementById('choices');
  choicesEl.innerHTML = '';
  const choices = node.choices || [];
  if (!choices.length) {
    document.getElementById('result').textContent = lang === 'ru' ? '— конец пролога —' : '— end of prologue —';
    return;
  }
  choices.forEach((c, i) => {
    const b = document.createElement('button');
    b.className = 'choice';
    b.textContent = c[lang];
    b.onclick = () => choose(i);
    choicesEl.appendChild(b);
  });
}

function choose(i) {
  const r = engine.choose(i);
  let msg = '';
  if (r.check) {
    if (r.check.table) {
      msg = (lang === 'ru' ? 'Случайная встреча ' : 'Random event ') + r.check.expr + ' = ' + r.check.roll;
    } else {
      const okTxt = r.check.ok ? (lang === 'ru' ? 'успех' : 'success') : (lang === 'ru' ? 'провал' : 'failure');
      msg = (lang === 'ru' ? 'Бросок ' : 'Roll ') + r.check.expr + ' = ' + r.check.roll +
        ' (' + okTxt + ', ' + (lang === 'ru' ? 'нужно ≥' : 'need ≥') + ' ' + r.check.target + ')';
    }
  }
  if (r.draw) {
    const card = r.draw.card;
    if (card) {
      const sym = SUIT_SYMBOL[card.suit] || '';
      msg = (lang === 'ru' ? 'Вытянута карта: ' : 'Drew card: ') + sym + ' ' + card.rank + ' — ' + (SUIT_LABEL[lang][card.suit] || '');
      if (card.suit === 'joker') msg += ' (' + (lang === 'ru' ? 'поворот сюжета' : 'plot twist') + ')';
    }
  }
  if (msg) document.getElementById('result').textContent = msg;
  render();
}

function toggleLang() {
  lang = lang === 'ru' ? 'en' : 'ru';
  document.getElementById('lang').textContent = lang === 'ru' ? 'EN' : 'RU';
  render();
}

function restart() {
  engine.start();
  document.getElementById('result').textContent = '';
  render();
}

document.getElementById('lang').addEventListener('click', toggleLang);
document.getElementById('restart').addEventListener('click', restart);
init();
