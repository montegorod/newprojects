// v2 — данжен-кроулер. UI, анимации, игровой цикл.
(function () {
  var G = window.Game2;
  var FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
  var SUIT_SYM = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣', joker: '🃏' };
  var SUIT_NAME = { spades: 'Пики', hearts: 'Черви', diamonds: 'Бубны', clubs: 'Трефы', joker: 'Джокер' };

  var S = {
    screen: 'create',
    hero: null,
    dungeon: null,
    pos: null,
    deck: null,
    combat: null,        // { monster, cell }
    monsterAttacking: false,
    trapCell: null,
    log: []
  };

  function $(id) { return document.getElementById(id); }

  function log(msg) {
    S.log.unshift(msg);
    if (S.log.length > 40) S.log.pop();
    var el = $('log');
    if (el) el.innerHTML = S.log.map(function (e) { return '<div>' + e + '</div>'; }).join('');
  }

  function animateDice(el, finalText, onDone) {
    el.classList.add('rolling');
    var ticks = 0;
    var iv = setInterval(function () {
      el.textContent = FACES[G.d(6) - 1];
      ticks++;
      if (ticks >= 10) {
        clearInterval(iv);
        el.classList.remove('rolling');
        el.textContent = finalText;
        if (onDone) onDone();
      }
    }, 55);
  }

  // ===== СОЗДАНИЕ ГЕРОЯ =====
  var create = { attack: null, defence: null, life: null, sanity: null, raw: {}, fate: null, fateChoices: null };

  var STAT_DEFS = [
    { key: 'attack',  label: 'Атака',   derive: function (r) { return r <= 2 ? 0 : (r <= 4 ? 1 : 2); }, note: '1d6: 1-2→0, 3-4→1, 5-6→2' },
    { key: 'defence', label: 'Защита',  derive: function (r) { return r <= 2 ? 0 : (r <= 4 ? 1 : 2); }, note: '1d6: 1-2→0, 3-4→1, 5-6→2' },
    { key: 'life',    label: 'Жизнь',   derive: function (r) { return r + 3; }, note: '1d6 + 3' },
    { key: 'sanity',  label: 'Рассудок', derive: function (r) { return r + 3; }, note: '1d6 + 3' }
  ];

  var FATE_BONUS = {
    spades:   { label: '♠ Пики — +1 Защита',   short: '+1 Защита',   apply: function (h) { h.defence += 1; } },
    hearts:   { label: '♥ Черви — +1 Жизнь',   short: '+1 Жизнь',    apply: function (h) { h.life += 1; } },
    diamonds: { label: '♦ Бубны — +5 золота',  short: '+5 золота',   apply: function (h) { h.gold += 5; } },
    clubs:    { label: '♣ Трефы — +1 Атака',   short: '+1 Атака',    apply: function (h) { h.attack += 1; } },
    joker:    { label: '🃏 Джокер — +1 ко всему', short: '+1 ко всему', apply: function (h) { h.attack += 1; h.defence += 1; h.life += 1; h.sanity += 1; } }
  };

  function renderCreate() {
    var box = $('create-stats');
    box.innerHTML = '';
    STAT_DEFS.forEach(function (def) {
      var raw = create.raw[def.key];
      var val = create[def.key];
      var row = document.createElement('div');
      row.className = 'stat-row';
      row.innerHTML =
        '<div class="stat-name">' + def.label + '<span class="note">' + def.note + '</span></div>' +
        '<div class="dice" data-stat="' + def.key + '">' + (raw ? FACES[raw - 1] : '?') + '</div>' +
        '<button data-stat="' + def.key + '">Бросить</button>' +
        '<b class="val">' + (val == null ? '—' : val) + '</b>';
      box.appendChild(row);
    });
    renderFate();
    $('btn-start').disabled = !(create.attack != null && create.defence != null && create.life != null && create.sanity != null);
  }

  function rollStat(key) {
    if (create[key] != null) return;
    var def = STAT_DEFS.filter(function (d) { return d.key === key; })[0];
    var el = document.querySelector('.dice[data-stat="' + key + '"]');
    var raw = G.d(6);
    animateDice(el, FACES[raw - 1], function () {
      create.raw[key] = raw;
      create[key] = def.derive(raw);
      renderCreate();
    });
  }

  function drawFate() {
    if (create.fateChoices || create.fate) return;
    if (!S.deck) S.deck = new G.Deck(true);
    create.fateChoices = [S.deck.draw(), S.deck.draw(), S.deck.draw()];
    renderFate();
  }

  function pickFate(i) {
    var card = create.fateChoices[i];
    create.fate = card;
    log('Карта судьбы: ' + (FATE_BONUS[card.suit] ? FATE_BONUS[card.suit].label : ''));
    renderFate();
  }

  function renderFate() {
    var fc = $('fate-card');
    fc.innerHTML = '';
    if (create.fate) {
      fc.innerHTML = '<div class="fate-picked">✅ Выбрано: <b>' + FATE_BONUS[create.fate.suit].label + '</b></div>';
      return;
    }
    if (!create.fateChoices) {
      fc.textContent = '🎴 Тяни три карты судьбы и выбери одну — масть решает бонус.';
      return;
    }
    create.fateChoices.forEach(function (card, i) {
      var b = document.createElement('button');
      b.className = 'fate-choice';
      var sym = card.suit === 'joker' ? '🃏' : SUIT_SYM[card.suit];
      var name = SUIT_NAME[card.suit] || 'Джокер';
      b.innerHTML = '<b>' + sym + ' ' + card.rank + '</b><span>' + name + '</span><em>' + FATE_BONUS[card.suit].short + '</em>';
      b.onclick = function () { pickFate(i); };
      fc.appendChild(b);
    });
  }

  function startDungeon() {
    var h = { attack: create.attack, defence: create.defence, life: create.life, sanity: create.sanity, gold: 0 };
    if (create.fate && FATE_BONUS[create.fate.suit]) FATE_BONUS[create.fate.suit].apply(h);
    S.hero = h;
    S.dungeon = new G.Dungeon(7, 6);
    S.pos = { x: S.dungeon.start.x, y: S.dungeon.start.y };
    S.combat = null; S.monsterAttacking = false; S.trapCell = null;
    S.log = [];
    S.screen = 'dungeon';
    $('screen-create').hidden = true;
    $('screen-dungeon').hidden = false;
    log('Вы вошли в подземелье. Ищите босса 💀 — до него нужно дойти по карте.');
    renderDungeon();
  }

  // ===== ПОДЗЕМЕЛЬЕ =====
  function renderHeader() {
    $('hud-life').textContent = S.hero.life;
    $('hud-sanity').textContent = S.hero.sanity;
    $('hud-atk').textContent = S.hero.attack;
    $('hud-def').textContent = S.hero.defence;
    $('hud-gold').textContent = S.hero.gold;
  }

  function iconFor(cell) {
    if (cell.cleared) return '✓';
    if (cell.kind === 'entrance') return '🚪';
    if (cell.kind === 'boss') return '💀';
    if (cell.kind === 'room') {
      if (cell.content === 'monster') return '⚔';
      if (cell.content === 'trap') return '⚠';
      if (cell.content === 'treasure') return '💰';
      if (cell.content === 'fountain') return '⛲';
      return '·';
    }
    return '';
  }

  function renderMap() {
    var map = $('map');
    map.innerHTML = '';
    var n = S.dungeon.size;
    map.style.gridTemplateColumns = 'repeat(' + n + ', 1fr)';
    for (var y = 0; y < n; y++) {
      for (var x = 0; x < n; x++) {
        var cell = S.dungeon.cell(x, y);
        var d = document.createElement('div');
        d.className = 'cell';
        if (x === S.pos.x && y === S.pos.y) d.classList.add('hero');
        if (cell.explored) {
          d.classList.add('explored');
          d.classList.add('k-' + cell.kind);
          d.textContent = iconFor(cell);
        } else {
          d.classList.add('hidden');
        }
        (function (cx, cy) { d.addEventListener('click', function () { cellClick(cx, cy); }); })(x, y);
        map.appendChild(d);
      }
    }
  }

  function renderCombat() {
    var box = $('combat');
    if (!S.combat) { box.hidden = true; return; }
    box.hidden = false;
    var m = S.combat.monster;
    var hearts = '';
    for (var i = 0; i < m.maxLife; i++) hearts += (i < m.life ? '♥' : '♡');
    $('combat-info').innerHTML = '<b>' + m.name + '</b> · уровень ' + m.level + ' · <span class="hearts">' + hearts + '</span>';
    var bb = $('combat-buttons');
    bb.innerHTML = '';
    if (S.monsterAttacking) {
      var def = document.createElement('button');
      def.textContent = '🛡 Защититься';
      def.onclick = doDefend;
      bb.appendChild(def);
    } else {
      var atk = document.createElement('button');
      atk.textContent = '⚔ Атаковать';
      atk.onclick = doAttack;
      bb.appendChild(atk);
    }
  }

  function renderActions() {
    var el = $('actions');
    el.innerHTML = '';
    if (S.trapCell) {
      var b = document.createElement('button');
      b.textContent = '🎲 Бросок на ловушку';
      b.onclick = doTrapSave;
      el.appendChild(b);
    } else if (!S.combat) {
      var hint = document.createElement('div');
      hint.textContent = 'Двигайтесь: тап по соседней клетке.';
      hint.style.color = 'var(--dim)';
      hint.style.padding = '6px 0';
      el.appendChild(hint);
    }
  }

  function renderDungeon() {
    renderHeader();
    renderMap();
    renderCombat();
    renderActions();
  }

  function cellClick(x, y) {
    if (S.combat || S.trapCell) return;
    var adj = S.dungeon.neighbors(S.pos.x, S.pos.y).some(function (p) { return p.x === x && p.y === y; });
    if (!adj) { log('Туда нельзя — только на соседнюю клетку.'); return; }
    moveTo(x, y);
  }

  function moveTo(x, y) {
    var cell = S.dungeon.cell(x, y);
    var wasHidden = !cell.explored;
    cell.explored = true;
    S.pos = { x: x, y: y };

    // бродячий монстр: 1d6, на 6 — встреча
    if (G.d(6) === 6 && cell.kind !== 'boss') {
      var lvl = G.d(3);
      startCombat(lvl, cell);
      renderDungeon();
      return;
    }
    if (cell.kind === 'room' && wasHidden) enterRoom(cell);
    else if (cell.kind === 'boss' && !cell.cleared) startCombat(4, cell);
    renderDungeon();
  }

  function enterRoom(cell) {
    if (cell.cleared) return;
    if (cell.content === 'monster') { startCombat(G.d(3), cell); }
    else if (cell.content === 'trap') { S.trapCell = cell; log('⚠ Ловушка! Бросьте кубик на спасение.'); }
    else if (cell.content === 'treasure') { var g = G.d(6); S.hero.gold += g; cell.cleared = true; log('💰 Сокровище: +' + g + ' золота.'); }
    else if (cell.content === 'fountain') { S.hero.life += 2; cell.cleared = true; log('⛲ Фонтан: +2 жизни.'); }
    else { cell.cleared = true; log('Пустая комната.'); }
  }

  function startCombat(level, cell) {
    S.combat = { monster: G.makeMonster(level), cell: cell };
    S.monsterAttacking = false;
    log('⚔ Бой: ' + S.combat.monster.name + ' (уровень ' + level + ').');
    renderCombat();
    renderActions();
  }

  function doAttack() {
    if (!S.combat || S.monsterAttacking) return;
    var m = S.combat.monster;
    var r = G.explodingD6();
    var total = r.total + S.hero.attack;
    var hit = total >= m.level;
    animateDice($('combat-dice'), String(total), function () {
      var msg = '⚔ ' + r.faces.join('+') + ' (+' + S.hero.attack + ') = ' + total + ' → ' + (hit ? 'попадание, -1' : 'промах');
      if (hit) m.life -= 1;
      log(msg);
      if (m.life <= 0) { victory(); return; }
      S.monsterAttacking = true;
      log('Монстр атакует — жми «🛡 Защититься».');
      renderCombat();
    });
  }

  function doDefend() {
    if (!S.combat || !S.monsterAttacking) return;
    var m = S.combat.monster;
    var r = G.explodingD6();
    var total = r.total + S.hero.defence;
    var dodge = total >= m.level;
    animateDice($('combat-dice'), String(total), function () {
      var msg = '🛡 ' + r.faces.join('+') + ' (+' + S.hero.defence + ') = ' + total + ' → ' + (dodge ? 'уклонился' : 'получил урон');
      if (!dodge) {
        if (m.level >= 4) { S.hero.sanity -= 1; msg += ' (рассудок -1)'; }
        else { S.hero.life -= 1; msg += ' (жизнь -1)'; }
        if (S.hero.life <= 0 || S.hero.sanity <= 0) { log(msg); defeat(); return; }
      }
      log(msg);
      S.monsterAttacking = false;
      renderHeader();
      renderCombat();
    });
  }

  function victory() {
    var m = S.combat.monster;
    var gold = G.d(6) + m.level;
    S.hero.gold += gold;
    var wasBoss = m.level >= 4;
    var cell = S.combat.cell;
    cell.cleared = true;
    log('Победа! +' + gold + ' золота.');
    S.combat = null;
    if (wasBoss) {
      log('💀 Босс повержен — вы прошли подземелье!');
      var done = document.createElement('div');
      done.textContent = 'Победа! Золото: ' + S.hero.gold;
      done.style.cssText = 'color:var(--gold);text-align:center;padding:8px';
      $('actions').innerHTML = '';
      $('actions').appendChild(done);
    }
    renderHeader();
    renderMap();
    renderCombat();
    renderActions();
  }

  function doTrapSave() {
    var r = G.d(6) + S.hero.defence;
    var ok = r >= 2;
    if (ok) log('⚠ Ловушка: ' + r + ' — избежал.');
    else {
      S.hero.life -= 1;
      log('⚠ Ловушка: ' + r + ' — получил 1 урон.');
      if (S.hero.life <= 0) { defeat(); return; }
    }
    S.trapCell.cleared = true;
    S.trapCell = null;
    renderHeader();
    renderMap();
    renderActions();
  }

  function defeat() {
    log('☠ Вы погибли. Обновите страницу и попробуйте снова.');
    var el = document.createElement('div');
    el.textContent = '☠ Смерть.';
    el.style.cssText = 'color:var(--danger);text-align:center;padding:8px';
    $('actions').innerHTML = '';
    $('actions').appendChild(el);
    S.combat = null; S.trapCell = null;
    renderCombat();
  }

  // ===== WIRING =====
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t && t.hasAttribute && t.hasAttribute('data-stat') && t.tagName === 'BUTTON') rollStat(t.getAttribute('data-stat'));
  });
  $('btn-fate').addEventListener('click', drawFate);
  $('btn-start').addEventListener('click', startDungeon);

  renderCreate();
})();
