// Hud.js — интерфейс игры поверх канваса (DOM): главное меню (монеты, магазин), выбор
// уровней, HUD уровня (заголовок, полоса костей, время, мини-скелет, подпись), пауза,
// экраны победы (монеты, ×3 за рекламу) и поражения, рекорды, награды за рекламу,
// всплывающие надписи, рука-подсказка и линия перетаскивания в стиле следа из магазина
// (канвас #drag-layer). Экран магазина — Shop.js. Тексты — Lang, иконки — assets/ui.

// Кости мини-скелета: [часть манекена, x1, y1, x2, y2, толщина] в координатах viewBox 0 0 100 190.
const HUD_SKELETON = [
    ['head', 50, 14, 50, 14, 22], ['chest', 36, 54, 64, 54, 20], ['belly', 50, 72, 50, 84, 12], ['pelvis', 38, 96, 62, 96, 14],
    ['armL', 70, 48, 76, 76, 7], ['foreL', 76, 80, 80, 104, 6], ['handL', 81, 110, 82, 118, 7],
    ['armR', 30, 48, 24, 76, 7], ['foreR', 24, 80, 20, 104, 6], ['handR', 19, 110, 18, 118, 7],
    ['thighL', 58, 106, 60, 136, 9], ['shinL', 60, 142, 61, 170, 8], ['footL', 61, 178, 70, 180, 7],
    ['thighR', 42, 106, 40, 136, 9], ['shinR', 40, 142, 39, 170, 8], ['footR', 39, 178, 30, 180, 7],
];

/** @satisfies {Record<string, any>} */
const Hud = {
    game: null,
    el: {},
    pointer: null,
    screen: '',
    hint: null,
    swipe: null,
    page: 0,
    _flash: 0,
    _loadedFont: false,
    _lineT: 0,
    TEMPLATE: '',             // разметка (ниже)

    init(game) {
        this.game = game;
        // Шрифт интерфейса (Rubik: кириллица и латиница, OFL).
        try {
            const face = new FontFace('Rubik', "url('assets/fonts/rubik.ttf')", { weight: '300 900' });
            face.load().then(f => { document.fonts.add(f); this._loadedFont = true; }).catch(() => {});
        } catch (e) { /* без FontFace — системный шрифт */ }
        const root = document.createElement('div');
        root.id = 'ui';
        root.innerHTML = Hud.TEMPLATE;
        document.body.appendChild(root);
        const $ = (id) => /** @type {HTMLElement} */ (document.getElementById(id));
        for (const id of ['hud', 'hud-level', 'bone-fill', 'bone-count', 'time-fill', 'time-text', 'caption', 'skeleton', 'btn-home', 'btn-restart',
            'drag-layer', 'popups', 'flash', 'menu-screen', 'levels-screen', 'pause-screen', 'win-screen', 'lose-screen', 'records-screen',
            'menu-play', 'menu-level', 'menu-levels', 'menu-records', 'menu-sound', 'levels-grid', 'levels-prev', 'levels-next', 'levels-page', 'levels-back',
            'pause-resume', 'pause-restart', 'pause-levels', 'pause-sound', 'win-stars', 'win-bones', 'win-next', 'win-levels', 'lose-bones', 'lose-retry',
            'lose-time', 'lose-skip', 'records-list', 'records-back', 'boost', 'toast', 'menu-total', 'hint-hand', 'menu-toon', 'pause-toon', 'pause-skip',
            'menu-shop', 'menu-coins', 'win-coins', 'win-x3', 'win-shop', 'shop-screen', 'pause-menu']) this.el[id] = $(id);
        this._buildSkeleton();
        const tap = (id, fn) => this.el[id].addEventListener('click', (e) => { e.stopPropagation(); Sfx.play('click', { volume: 0.6 }); fn(); });
        tap('menu-play', () => { this.hide('menu-screen'); this.game.start(); });
        tap('menu-levels', () => this.showLevels());
        tap('menu-records', () => this.showRecords());
        tap('menu-sound', () => { Sound.toggleMuted(); this._syncSound(); });
        tap('menu-toon', () => this.game.toggleToon());
        tap('pause-toon', () => this.game.toggleToon());
        tap('pause-skip', () => this.game.rewardSkip());
        tap('levels-prev', () => { this.page = Math.max(0, this.page - 1); this._renderLevels(); });
        tap('levels-next', () => { this.page = Math.min(4, this.page + 1); this._renderLevels(); });
        tap('levels-back', () => { this.hide('levels-screen'); this._back(); });
        tap('btn-home', () => this.game.pause(true));
        tap('btn-restart', () => this.game.retry());
        tap('pause-resume', () => this.game.pause(false));
        tap('pause-restart', () => { this.hide('pause-screen'); this.game.retry(); });
        tap('pause-levels', () => this.showLevels(true));
        tap('pause-menu', () => { this.hide('pause-screen'); this.game.toMenu(); });
        tap('pause-sound', () => { Sound.toggleMuted(); this._syncSound(); });
        tap('win-next', () => this.game.next());
        tap('win-levels', () => this.showLevels(true));
        tap('lose-retry', () => this.game.retry());
        tap('lose-time', () => this.game.rewardTime());
        tap('lose-skip', () => this.game.rewardSkip());
        tap('records-back', () => { this.hide('records-screen'); this._back(); });
        tap('boost', () => this.game.rewardPower());
        tap('menu-shop', () => Shop.show());
        tap('win-shop', () => Shop.show());
        tap('win-x3', () => this.game.rewardCoins());
        Shop.init(this.game);
        Lang.apply(root);
        this._syncSound();
        this.syncToon();
        this.syncSkip();
        const resize = () => this._resize();
        window.addEventListener('resize', resize);
        resize();
    },

    // --- Экраны ---------------------------------------------------------------------

    show(id) { this.el[id].classList.add('on'); this.screen = id; },
    hide(id) { this.el[id].classList.remove('on'); if (this.screen === id) this.screen = ''; },
    hideAll() { for (const id of ['menu-screen', 'levels-screen', 'pause-screen', 'win-screen', 'lose-screen', 'records-screen', 'shop-screen']) this.hide(id); },
    _back() {
        if (this.game.state === 'pause') this.show('pause-screen');
        else if (this.game.state === 'menu') this.show('menu-screen');
        else if (this.game.state === 'win') this.show('win-screen');
        else if (this.game.state === 'lose') this.show('lose-screen');
    },

    showMenu() {
        this.hideAll();
        this.el['hud'].classList.remove('on');
        this.el['menu-level'].textContent = Lang.t('level', { n: this.game.levelIndex });
        const total = this.game.save.bones || 0;
        this.el['menu-total'].textContent = total ? Lang.t('total', { n: total }) : Lang.t('subtitle');
        this.el['menu-records'].style.display = Platform.hasLeaderboard() ? '' : 'none';
        this.syncCoins();
        this.show('menu-screen');
    },

    // Монеты в меню.
    syncCoins() {
        const n = (this.game.save && this.game.save.coins) || 0;
        this.el['menu-coins'].querySelector('span').textContent = String(n);
    },

    showHud() {
        this.hideAll();
        this.el['hud'].classList.add('on');
    },

    showLevels(fromGame) {
        if (fromGame) { this.hide('pause-screen'); this.hide('win-screen'); }
        this.hide('menu-screen');
        this.page = Math.floor((this.game.levelIndex - 1) / 20);
        this._renderLevels();
        this.show('levels-screen');
    },

    _renderLevels() {
        const grid = this.el['levels-grid'];
        grid.innerHTML = '';
        const save = this.game.save, unlocked = Math.max(1, save.unlocked || 1);
        for (let i = this.page * 20 + 1; i <= Math.min(LEVEL_COUNT, this.page * 20 + 20); i++) {
            const b = document.createElement('button');
            b.className = 'lvl' + (i > unlocked ? ' locked' : '') + (i === this.game.levelIndex ? ' current' : '');
            const st = save.stars[i] || 0;
            b.innerHTML = i > unlocked
                ? '<img src="assets/ui/lock.png" alt="">'
                : '<span class="n">' + i + '</span><span class="st">' + [1, 2, 3].map(k => '<img src="assets/ui/star.png" alt="" class="' + (k <= st ? 'got' : '') + '">').join('') + '</span>';
            b.addEventListener('click', (e) => {
                e.stopPropagation();
                if (i > unlocked) { this.toast(Lang.t('locked')); return; }
                Sfx.play('click', { volume: 0.6 });
                this.hide('levels-screen');
                this.game.pick(i);
            });
            grid.appendChild(b);
        }
        this.el['levels-page'].textContent = (this.page * 20 + 1) + '–' + Math.min(LEVEL_COUNT, this.page * 20 + 20);
        /** @type {HTMLButtonElement} */ (this.el['levels-prev']).disabled = this.page === 0;
        /** @type {HTMLButtonElement} */ (this.el['levels-next']).disabled = this.page >= 4;
    },

    async showRecords() {
        this.hide('menu-screen');
        const list = this.el['records-list'];
        list.innerHTML = '<div class="rec-empty">…</div>';
        this.show('records-screen');
        let rows = null;
        try { rows = await Platform.leaderboard(); } catch (e) { rows = null; }
        if (!rows) { list.innerHTML = '<div class="rec-empty">' + Lang.t('recordsFail') + '</div>'; return; }
        if (!rows.length) { list.innerHTML = '<div class="rec-empty">' + Lang.t('recordsEmpty') + '</div>'; return; }
        list.innerHTML = '';
        for (const r of rows.slice(0, 20)) {
            const d = document.createElement('div');
            d.className = 'rec' + (r.me ? ' me' : '');
            const name = document.createElement('span'); name.className = 'rn'; name.textContent = (r.name || '—') + (r.me ? ' (' + Lang.t('you') + ')' : '');
            d.innerHTML = '<span class="rr">' + r.rank + '</span>';
            d.appendChild(name);
            const sc = document.createElement('span'); sc.className = 'rs'; sc.innerHTML = '<img src="assets/ui/bone.png" alt="">' + r.score;
            d.appendChild(sc);
            list.appendChild(d);
        }
    },

    showPause(on) {
        if (on) { this.show('pause-screen'); this._syncSound(); this.syncToon(); this.syncSkip(); } else this.hide('pause-screen');
    },

    syncToon() {
        const off = World3D.toonOff;
        for (const id of ['menu-toon', 'pause-toon']) this.el[id].querySelector('span').textContent = Lang.t(off ? 'toonOff' : 'toonOn');
    },

    // Пропуск уровня — за 2 рекламы; просмотренные копятся в сохранении.
    syncSkip() {
        const n = Math.min(1, (this.game.save && this.game.save.skipAds) || 0);
        for (const el of document.querySelectorAll('#ui .skip-n')) el.textContent = Lang.t('skipAds', { n });
    },

    showWin(stars, broken, coins) {
        this.el['hud'].classList.remove('on');
        const box = this.el['win-stars'];
        box.innerHTML = '';
        for (let k = 1; k <= 3; k++) {
            const img = document.createElement('img');
            img.src = 'assets/ui/star.png'; img.alt = '';
            img.className = k <= stars ? 'got' : '';
            img.style.animationDelay = (0.25 + k * 0.22) + 's';
            box.appendChild(img);
            if (k <= stars) setTimeout(() => Sfx.play('star', { volume: 0.6, rate: 0.9 + k * 0.12, detune: 0 }), 250 + k * 220);
        }
        this.el['win-bones'].textContent = Lang.t('brokenCount', { n: broken });
        this.syncWinCoins(coins || 0, false);
        this.show('win-screen');
    },

    // Награда за уровень; x3 — за рекламу, один раз.
    syncWinCoins(coins, tripled) {
        const w = this.el['win-coins'];
        w.querySelector('span').textContent = '+' + coins;
        w.style.display = coins > 0 ? '' : 'none';
        w.classList.remove('pulse'); void w.offsetWidth; w.classList.add('pulse');
        this.el['win-x3'].style.display = coins > 0 && !tripled ? '' : 'none';
    },

    showLose(broken, target) {
        this.el['hud'].classList.remove('on');
        this.el['lose-bones'].textContent = Lang.t('brokenOf', { n: broken, t: target });
        this.el['lose-time'].style.display = '';
        this.syncSkip();
        this.show('lose-screen');
    },

    toast(text) {
        const t = this.el['toast'];
        t.textContent = text;
        t.classList.remove('on'); void t.offsetWidth; t.classList.add('on');
    },

    _syncSound() {
        const m = Sound.muted;
        for (const id of ['menu-sound', 'pause-sound']) {
            const b = this.el[id];
            b.querySelector('img').setAttribute('src', m ? 'assets/ui/mute.png' : 'assets/ui/sound.png');
            const s = b.querySelector('span'); if (s) s.textContent = Lang.t(m ? 'soundOff' : 'soundOn');
        }
    },

    // --- HUD уровня ------------------------------------------------------------------

    levelStart(index, rules) {
        this.el['hud-level'].textContent = Lang.t('level', { n: index });
        this.el['caption'].textContent = Lang.t(rules.caption || 'capBreak');
        this.el['caption'].classList.remove('dim');
        this.target = rules.target;
        this.timeMax = rules.time;
        this.bone(null, 0, rules.target);
        for (const b of this.el['skeleton'].querySelectorAll('.b')) b.classList.remove('broken', 'hit');
        this.el['boost'].classList.remove('used');
        this.el['boost'].style.display = '';
        this.hintT = 0;
        this.hint = { show: true };
    },

    bone(part, n, target) {
        this.el['bone-count'].textContent = Math.min(n, target) + '/' + target;
        this.el['bone-fill'].style.width = Math.min(100, n / target * 100) + '%';
        if (part) {
            const b = this.el['skeleton'].querySelector('[data-p="' + part.id + '"]');
            if (b) { b.classList.add('broken'); }
            const bar = this.el['bone-fill'].parentElement;
            bar.classList.remove('pulse'); void bar.offsetWidth; bar.classList.add('pulse');
        }
    },

    hideHint() {
        if (this.hint) this.hint.show = false;
        this.el['caption'].classList.add('dim');
    },

    _buildSkeleton() {
        const svg = this.el['skeleton'];
        let s = '';
        for (const [id, x1, y1, x2, y2, w] of HUD_SKELETON) {
            if (id === 'head') s += '<circle class="b" data-p="head" cx="' + x1 + '" cy="' + y1 + '" r="' + (Number(w) / 2) + '"/>';
            else s += '<line class="b" data-p="' + id + '" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke-width="' + w + '"/>';
        }
        svg.innerHTML = s;
    },

    popup(sp, key, kind, color) {
        if (!sp || sp.behind) return;
        const d = document.createElement('div');
        d.className = 'pop ' + (kind || '');
        d.textContent = Lang.t(key);
        // Цвет «ХРУСТЬ!» — из эффекта ударов в магазине.
        const c = color || (kind === 'crack' && typeof Cosmetics !== 'undefined' && Cosmetics.game ? Cosmetics.popColor() : '');
        if (c) d.style.color = c;
        d.style.left = Math.round(sp.x) + 'px';
        d.style.top = Math.round(sp.y) + 'px';
        d.style.setProperty('--rot', ((Math.random() - 0.5) * 24).toFixed(1) + 'deg');
        this.el['popups'].appendChild(d);
        setTimeout(() => d.remove(), 1000);
    },

    pick(list) { return list[Math.floor(Math.random() * list.length)]; },

    flash(color, a) {
        const f = this.el['flash'];
        f.style.background = color;
        this._flash = Math.max(this._flash, a);
    },

    // --- Жест «перерезать верёвку» -----------------------------------------------------

    swipeStart(p) { this.swipe = { last: p }; },
    swipeMove(p) {
        const s = this.swipe;
        if (!s) return;
        const L = this.game.level;
        if (L && !L.grab) L.cutAlong(s.last, p);
        s.last = p;
    },
    swipeEnd() { this.swipe = null; },

    // --- Кадр: линия, рука, время, вспышка ------------------------------------------------

    _resize() {
        const c = /** @type {HTMLCanvasElement} */ (this.el['drag-layer']);
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        c.width = Math.round(window.innerWidth * dpr);
        c.height = Math.round(window.innerHeight * dpr);
        this.dpr = dpr;
        document.body.classList.toggle('portrait', window.innerHeight > window.innerWidth);
    },

    frame(dt) {
        const g = this.game;
        const c = /** @type {HTMLCanvasElement} */ (this.el['drag-layer']);
        const ctx = c.getContext('2d');
        // Очистка — в пикселях холста, до масштаба: при плотности пикселей меньше 1
        // (масштаб страницы < 100%) очистка в масштабированных координатах стирала бы
        // только часть холста, и линии пальца оставляли полосы.
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, c.width, c.height);
        ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        const L = g.level;
        const hand = this.el['hint-hand'];
        let handAt = null;
        if (L && L.grab && this.pointer) {
            const a = L.grabScreen();
            if (a && !a.behind) {
                this._line(ctx, a.x, a.y, this.pointer.x, this.pointer.y);
                handAt = this.pointer;
            }
        } else if (L && this.hint && this.hint.show && !Shop.open && (g.state === 'play' || g.state === 'menu')) {
            // Подсказка: рука тянет от предмета к цели и обратно.
            const h = L.hintPath();
            if (h) {
                this.hintT = (this.hintT || 0) + dt;
                const t = this.hintT % 2.2;
                const k = t < 0.35 ? 0 : (t < 1.5 ? (t - 0.35) / 1.15 : 1);
                const e = k * k * (3 - 2 * k);
                const x = h.from.x + (h.to.x - h.from.x) * e, y = h.from.y + (h.to.y - h.from.y) * e;
                if (t > 0.35 && t < 1.9) this._line(ctx, h.from.x, h.from.y, x, y);
                handAt = { x, y, press: t > 0.2 && t < 1.9 };
            }
        }
        if (Shop.open) Shop.frame(ctx, dt);
        if (handAt) {
            hand.style.display = 'block';
            hand.style.transform = 'translate(' + (handAt.x - 12) + 'px,' + (handAt.y - 6) + 'px) scale(' + (handAt.press === false ? 1.08 : 1) + ')';
        } else hand.style.display = 'none';
        // Время.
        if (g.state === 'play' || g.state === 'lose') {
            const f = Math.max(0, g.timeLeft / Math.max(1, this.timeMax || 30));
            this.el['time-fill'].style.width = (f * 100) + '%';
            this.el['time-fill'].classList.toggle('low', f < 0.25);
            this.el['time-text'].textContent = Math.ceil(g.timeLeft) + '';
        }
        if (this._flash > 0) {
            this._flash = Math.max(0, this._flash - dt * 1.6);
            this.el['flash'].style.opacity = String(this._flash);
        }
    },

    // Линия пальца — стиль следа из магазина (Cosmetics).
    _line(ctx, x1, y1, x2, y2) {
        this._lineT = (this._lineT || 0) + 1 / 60;
        Cosmetics.drawTrail(ctx, x1, y1, x2, y2, Cosmetics.game ? Cosmetics.equipped('trail') : null, this._lineT);
    },
};

Hud.TEMPLATE = `
<canvas id="drag-layer"></canvas>
<img id="hint-hand" src="assets/ui/hand.png" alt="">
<div id="popups"></div>
<div id="flash"></div>
<div id="hud">
  <div class="hud-top">
    <button id="btn-home" class="ibtn" aria-label="menu"><img src="assets/ui/pause.png" alt=""></button>
    <div class="hud-center">
      <div id="hud-level" class="h-level"></div>
      <div class="bone-bar"><img src="assets/ui/bone.png" alt=""><div class="bar"><div id="bone-fill"></div></div><span id="bone-count"></span></div>
      <div class="time-bar"><img src="assets/ui/clock.png" alt=""><div class="bar"><div id="time-fill"></div></div><span id="time-text"></span></div>
    </div>
    <button id="btn-restart" class="ibtn" aria-label="restart"><img src="assets/ui/restart.png" alt=""></button>
  </div>
  <svg id="skeleton" viewBox="0 0 100 190" aria-hidden="true"></svg>
  <button id="boost" class="chip"><img src="assets/ui/power.png" alt=""><span><b data-t="power"></b><small><img src="assets/ui/ad.png" alt=""><i data-t="forAd"></i></small></span></button>
  <div id="caption"></div>
</div>
<div id="menu-screen" class="screen menu">
  <div id="menu-coins" class="coin-chip"><img src="assets/ui/coin.png" alt=""><span>0</span></div>
  <div class="logo"><img src="assets/ui/bone.png" alt=""><h1 data-t="title"></h1><img src="assets/ui/bone.png" alt="" class="flip"></div>
  <div id="menu-total" class="sub"></div>
  <button id="menu-play" class="btn big green"><img src="assets/ui/play.png" alt=""><span><b data-t="play"></b><small id="menu-level"></small></span></button>
  <div class="row">
    <button id="menu-levels" class="btn blue"><img src="assets/ui/levels.png" alt=""><span data-t="levels"></span></button>
    <button id="menu-shop" class="btn red"><img src="assets/ui/shop.png" alt=""><span data-t="shop"></span></button>
    <button id="menu-records" class="btn gold"><img src="assets/ui/trophy.png" alt=""><span data-t="records"></span></button>
  </div>
  <div class="row">
    <button id="menu-sound" class="btn ghost small"><img src="assets/ui/sound.png" alt=""><span></span></button>
    <button id="menu-toon" class="btn ghost small"><span></span></button>
  </div>
</div>
<div id="levels-screen" class="screen">
  <div class="panel wide">
    <h2 data-t="levels"></h2>
    <div id="levels-grid"></div>
    <div class="pager"><button id="levels-prev" class="btn blue small">‹</button><span id="levels-page"></span><button id="levels-next" class="btn blue small">›</button></div>
    <button id="levels-back" class="btn ghost small"><img src="assets/ui/home.png" alt=""><span data-t="back"></span></button>
  </div>
</div>
<div id="pause-screen" class="screen">
  <div class="panel">
    <h2 data-t="pause"></h2>
    <button id="pause-resume" class="btn green"><img src="assets/ui/play.png" alt=""><span data-t="resume"></span></button>
    <button id="pause-restart" class="btn blue"><img src="assets/ui/restart.png" alt=""><span data-t="restart"></span></button>
    <button id="pause-levels" class="btn blue"><img src="assets/ui/levels.png" alt=""><span data-t="levels"></span></button>
    <button id="pause-menu" class="btn blue"><img src="assets/ui/home.png" alt=""><span data-t="menu"></span></button>
    <button id="pause-skip" class="btn gold"><img src="assets/ui/skip.png" alt=""><span><b data-t="skip"></b><small><img src="assets/ui/ad.png" alt=""><i class="skip-n"></i></small></span></button>
    <div class="row">
      <button id="pause-sound" class="btn ghost small"><img src="assets/ui/sound.png" alt=""><span></span></button>
      <button id="pause-toon" class="btn ghost small"><span></span></button>
    </div>
  </div>
</div>
<div id="win-screen" class="screen">
  <div class="panel">
    <h2 class="win" data-t="win"></h2>
    <div id="win-stars" class="stars"></div>
    <div id="win-bones" class="sub"></div>
    <div id="win-coins" class="coins-won"><img src="assets/ui/coin.png" alt=""><span></span></div>
    <button id="win-x3" class="btn gold"><img src="assets/ui/coins.png" alt=""><span><b data-t="x3"></b><small><img src="assets/ui/ad.png" alt=""><i data-t="forAd"></i></small></span></button>
    <button id="win-next" class="btn big green"><img src="assets/ui/play.png" alt=""><span><b data-t="next"></b></span></button>
    <div class="row">
      <button id="win-levels" class="btn ghost small"><img src="assets/ui/levels.png" alt=""><span data-t="levels"></span></button>
      <button id="win-shop" class="btn ghost small"><img src="assets/ui/shop.png" alt=""><span data-t="shop"></span></button>
    </div>
  </div>
</div>
<div id="lose-screen" class="screen">
  <div class="panel">
    <h2 class="lose" data-t="lose"></h2>
    <div id="lose-bones" class="sub"></div>
    <button id="lose-time" class="btn gold"><img src="assets/ui/clock.png" alt=""><span><b data-t="moreTime"></b><small><img src="assets/ui/ad.png" alt=""><i data-t="forAd"></i></small></span></button>
    <button id="lose-retry" class="btn big green"><img src="assets/ui/restart.png" alt=""><span><b data-t="retry"></b></span></button>
    <button id="lose-skip" class="btn ghost small"><img src="assets/ui/skip.png" alt=""><span><b data-t="skip"></b><small><img src="assets/ui/ad.png" alt=""><i class="skip-n"></i></small></span></button>
  </div>
</div>
<div id="records-screen" class="screen">
  <div class="panel">
    <h2 data-t="records"></h2>
    <div id="records-list"></div>
    <button id="records-back" class="btn ghost small"><img src="assets/ui/home.png" alt=""><span data-t="back"></span></button>
  </div>
</div>
<div id="shop-screen" class="screen shop">
  <div class="shop-panel">
    <div class="shop-head">
      <h2 data-t="shop"></h2>
      <div class="coin-chip"><img src="assets/ui/coin.png" alt=""><span id="shop-coins">0</span></div>
      <button id="shop-close" class="btn ghost small"><img src="assets/ui/home.png" alt=""><span data-t="back"></span></button>
    </div>
    <div id="shop-tabs"></div>
    <div id="shop-grid"></div>
    <div class="shop-foot"><div id="shop-name"></div><button id="shop-action" class="btn green"></button></div>
  </div>
</div>
<div id="toast"></div>
`;
