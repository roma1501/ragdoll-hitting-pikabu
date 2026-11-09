// Game.js — игра «Сломай кости»: уровень (Level.js) на карте Maps.js, ввод пальцем,
// ход раунда (цель — число сломанных костей, время), экраны (Hud.js), прогресс,
// монеты и магазин косметики (Cosmetics.js, Shop.js), реклама и рекорды (Platform.js),
// звук (Sfx).

// Тесты (?autotest, ?headless): в скрытой вкладке браузер не даёт кадров (rAF стоит), и
// игра не догрузилась бы. Кадры тогда идут через MessageChannel (~60 в секунду).
if (/[?&](autotest|headless)(&|=|$)/.test(location.search)) {
    const raf = window.requestAnimationFrame.bind(window);
    const queue = [];
    const ch = new MessageChannel();
    let last = 0, pending = false;
    ch.port1.onmessage = () => {
        pending = false;
        const now = performance.now();
        if (now - last < 16) { pending = true; ch.port2.postMessage(0); return; }
        last = now;
        const run = queue.splice(0);
        for (const cb of run) { try { cb(now); } catch (e) { console.error(e); } }
    };
    window.requestAnimationFrame = (cb) => {
        if (!document.hidden) return raf(cb);
        queue.push(cb);
        if (!pending) { pending = true; ch.port2.postMessage(0); }
        return 0;
    };
}

/** @satisfies {Record<string, any>} */
const Game = {
    /** @type {LoryApp | null} */
    app: null,
    /** @type {Level | null} */
    level: null,
    levelIndex: 1,
    state: 'menu',          // 'menu' | 'play' | 'win' | 'lose' | 'pause'
    timeLeft: 0,
    timerOn: false,
    broken: 0,
    target: 5,
    // coins — монеты; own — купленная косметика ('cat:id'); adp — просмотренные рекламы
    // за предмет; eq — надетое по категориям.
    save: { level: 1, stars: {}, bones: 0, unlocked: 1, skipAds: 0, coins: 0, own: [], adp: {}, eq: {} },
    lastCoins: 0,
    coinsTripled: false,
    _busy: false,
    _adBusy: false,
    _frameDt: 0,
    dev: false,             // ?dev / ?autotest — прогресс не сохраняется
    speed: 1,               // шагов игры за кадр (автотест)
    external: false,        // автотест ведёт свой цикл
    _driving: false,
    /** @type {any} */
    bot: null,
    /** @type {HTMLCanvasElement | null} */
    canvas: null,

    async init(app) {
        this.app = app;
        document.title = Lang.t('title');
        const lt = document.getElementById('loading-title');
        if (lt) lt.textContent = Lang.t('title');
        if (app.camera) app.camera.detach();
        const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('world3d'));
        this.canvas = canvas;
        const loaded = await Platform.load();
        if (loaded && typeof loaded === 'object') Object.assign(this.save, loaded);
        Cosmetics.init(this);
        Cosmetics.save();
        // Настройка «без toon-шейдера» — у игрока в браузере (Store).
        World3D.toonOff = this.save.toon != null ? this.save.toon === 0 : Store.get(GAME_ID + '.toon') === '0';
        if (World3D.toonOff) World3D.applyRenderConstants(app.location.view);
        const params = new URLSearchParams(location.search);
        // ?dev — без сохранения прогресса; ?autotest — бот проходит уровни (tests/autotest.js).
        this.dev = params.has('dev') || params.has('autotest');
        if (params.has('autotest')) {
            const s = document.createElement('script');
            s.src = 'tests/autotest.js';
            document.head.appendChild(s);
        }
        const dev = params.get('level');
        let idx = Math.max(1, Math.min(LEVEL_COUNT, Number(this.save.level) || 1));
        if (dev) idx = Math.max(1, Math.min(LEVEL_COUNT, Number(dev) || 1));
        this.levelIndex = idx;
        this._bindInput(canvas);
        app.location.view.onBeforeFrame(() => { if (this.level) this.level.sync(this._frameDt || 0); });
        app.onFrame((dt) => { this._frameDt = dt; Hud.frame(dt); });
        Hud.init(this);
        // Стартовая карта уже загружена (первая в GAME_MAPS); другой сохранённый уровень —
        // под тем же экраном загрузки.
        const id = Game.mapId(idx);
        if (app.location.map.id !== id) {
            const src = GAME_MAPS.find(m => m.id === id);
            if (src) { await app.location.loadMap(Location3D.copyMap(src)); }
        }
        await this._buildLevel();
    },

    async ready() {
        Sfx.preload();
        Sound.music(Sfx.MUSIC, { volume: 0.55 });
        Hud.showMenu();
    },

    update(dt) {
        // Автотест со своим циклом (external) шагает сам — кадр игры его не двигает.
        if (this.external && !this._driving) return;
        // speed > 1 — автотест: несколько шагов игры за кадр.
        const n = this.speed || 1;
        for (let k = 0; k < n; k++) {
            const L = this.level;
            if (!L) return;
            const step = n > 1 ? 1 / 60 : dt;
            if (this.bot) this.bot.step(step);
            L.update(step);
            if (this.state === 'play' && this.timerOn) {
                this.timeLeft -= step;
                if (this.timeLeft <= 0) { this.timeLeft = 0; this._lose(); }
            }
        }
    },

    mapId(i) { return 'level-' + i; },

    // --- Уровень -----------------------------------------------------------------------

    async _buildLevel() {
        if (this.level) { this.level.dispose(); this.level = null; }
        const id = this.app.location.map.id;
        const rules = levelRules(id);
        this.target = rules.target;
        this.timeLeft = rules.time;
        this.timerOn = false;
        this.broken = 0;
        const L = new Level(this.app, rules, {
            onBreak: (part, kind) => this._onBreak(part, kind),
            onImpact: (dmg, p, other) => Fx.impact(L, dmg, p, other),
            onHazard: (part, kind, p, item) => Fx.hazard(L, part, kind, p, item),
            onExplode: (p, r) => Fx.explode(L, p, r),
            onLightning: (p, hit) => Fx.lightning(L, p, hit),
            onFuse: (p) => Fx.fuse(L, p),
            onGrab: () => { this._startTimer(); Hud.hideHint(); },
            onActivate: () => this._startTimer(),
            onRespawn: () => Fx.poof(L, L.dummy.center),
            onRespawnItem: (p) => Fx.poof(L, p),
            onCut: () => { Sfx.play('whoosh'); this._startTimer(); Hud.hideHint(); },
            onBump: (p) => { Sfx.play('boing', { gap: 0.1 }); Fx.burst(L, p, { burst: 12, capacity: 16, life: [0.2, 0.4], size: [4, 9], speed: [120, 300], color: '#ffe28a', color2: '#ffffff' }); },
        });
        this.level = L;
        await L.build();
        Hud.levelStart(this.levelIndex, rules);
    },

    _startTimer() {
        if (this.state === 'play' && !this.timerOn) this.timerOn = true;
    },

    // Начать уровень (кнопка «Играть» / «Далее» / «Заново»).
    play() {
        this.state = 'play';
        Platform.gameplay(true);
        Platform.message('level_started', this.levelIndex);
        Hud.showHud();
    },

    async loadLevel(i) {
        if (this._busy) return;
        this._busy = true;
        this.levelIndex = Math.max(1, Math.min(LEVEL_COUNT, i));
        try {
            await this.app.loadMap(Game.mapId(this.levelIndex), { prepare: async () => { await this._buildLevel(); }, gameplay: true });
            this.play();
        } catch (e) { console.error(e); }
        this._busy = false;
    },

    _onBreak(part, kind) {
        if (!this.level) return;
        this.broken = this.level.dummy.brokenCount;
        Fx.boneBreak(this.level, part, kind);
        Hud.bone(part, this.broken, this.target);
        if (this.state === 'play' && this.broken >= this.target) this._win();
    },

    _win() {
        if (this.state !== 'play') return;
        this.state = 'win';
        const i = this.levelIndex, rules = levelRules(Game.mapId(i));
        const frac = this.timerOn ? this.timeLeft / rules.time : 1;
        const stars = frac > 0.5 ? 3 : (frac > 0.2 ? 2 : 1);
        // Монеты: больше на дальних уровнях и за звёзды; повтор пройденного — треть.
        const again = (this.save.stars[i] || 0) > 0;
        const coins = Math.round((15 + i * 2 + stars * 5) * (again ? 0.35 : 1));
        this.save.coins = (this.save.coins || 0) + coins;
        this.lastCoins = coins;
        this.coinsTripled = false;
        this.save.stars[i] = Math.max(this.save.stars[i] || 0, stars);
        this.save.unlocked = Math.max(this.save.unlocked || 1, Math.min(LEVEL_COUNT, i + 1));
        this.save.level = Math.min(LEVEL_COUNT, i + 1);
        this.save.bones = (this.save.bones || 0) + this.broken;
        if (!this.dev) { Platform.save(this.save); Platform.submitScore(this.save.bones); }
        Platform.ads.roundEnded();
        Platform.gameplay(false);
        Platform.message('level_completed', i);
        if (this.level) { this.level.slow = 0.35; setTimeout(() => { if (this.level) this.level.slow = 1; }, 900); if (this.level.dummy.visual) this.level.dummy.visual.knockOut(); }
        Sfx.play('win');
        setTimeout(() => Hud.showWin(stars, this.broken, coins), 700);
    },

    _lose() {
        if (this.state !== 'play') return;
        this.state = 'lose';
        Platform.message('level_failed', this.levelIndex);
        Platform.ads.roundEnded();
        Platform.gameplay(false);
        Sfx.play('lose');
        Hud.showLose(this.broken, this.target);
    },

    // Продолжить после проигрыша (награда за рекламу): +15 секунд.
    continueTime(sec) {
        this.timeLeft = sec;
        this.state = 'play';
        Platform.gameplay(true);
        Hud.showHud();
    },

    next() {
        if (this.levelIndex >= LEVEL_COUNT) Hud.toast(Lang.t('allDone'));
        Platform.ads.next(() => this.loadLevel(this.levelIndex >= LEVEL_COUNT ? 1 : this.levelIndex + 1));
    },
    retry() { Pause.set('manual', false); Platform.ads.next(() => this.loadLevel(this.levelIndex)); },
    pick(i) { Pause.set('manual', false); Platform.ads.next(() => this.loadLevel(i)); },

    toggleToon() {
        World3D.toonOff = !World3D.toonOff;
        this.save.toon = World3D.toonOff ? 0 : 1;
        if (!this.dev) Platform.save(this.save);
        if (this.app && this.app.location) World3D.applyRenderConstants(this.app.location.view);
        Hud.syncToon();
    },

    // Из паузы в главное меню: текущий уровень заново (манекен цел), экран меню.
    async toMenu() {
        if (this._busy) return;
        this._busy = true;
        Pause.set('manual', false);
        if (this.level) this.level.releaseGrab();
        this.state = 'menu';
        Platform.gameplay(false);
        try {
            await this.app.loadMap(Game.mapId(this.levelIndex), { prepare: async () => { await this._buildLevel(); }, gameplay: false });
        } catch (e) { console.error(e); }
        this.state = 'menu';
        this._busy = false;
        Hud.showMenu();
    },

    // Из главного меню: уровень уже на сцене.
    start() {
        Sound.music(Sfx.MUSIC, { volume: 0.55 });
        this.play();
    },

    pause(on) {
        if (on && this.state !== 'play') return;
        if (!on && this.state !== 'pause') return;
        this.state = on ? 'pause' : 'play';
        Platform.message(on ? 'level_paused' : 'level_resumed', this.levelIndex);
        Pause.set('manual', on);
        if (this.level) this.level.releaseGrab();
        Hud.showPause(on);
    },

    // --- Награды за рекламу ------------------------------------------------------------

    async _reward(id) {
        if (this._adBusy) return false;
        this._adBusy = true;
        let ok = false;
        try { ok = await Platform.rewarded(id); } catch (e) { ok = false; }
        this._adBusy = false;
        if (!ok) Hud.toast(Lang.t('adFail'));
        return ok;
    },

    async rewardTime() {
        if (this.state !== 'lose') return;
        if (await this._reward('time')) this.continueTime(15);
    },

    // Пропуск уровня стоит 2 рекламы; каждая просмотренная сразу сохраняется и не пропадает.
    async rewardSkip() {
        if (this.state !== 'lose' && this.state !== 'pause') return;
        if (!(await this._reward('skip'))) return;
        this.save.skipAds = (this.save.skipAds || 0) + 1;
        if (this.save.skipAds < 2) {
            if (!this.dev) Platform.save(this.save);
            Hud.syncSkip();
            Hud.toast(Lang.t('skipOne'));
            return;
        }
        this.save.skipAds -= 2;
        Pause.set('manual', false);
        const i = this.levelIndex;
        this.save.unlocked = Math.max(this.save.unlocked || 1, Math.min(LEVEL_COUNT, i + 1));
        this.save.level = Math.min(LEVEL_COUNT, i + 1);
        if (!this.dev) Platform.save(this.save);
        this.loadLevel(i >= LEVEL_COUNT ? 1 : i + 1);
    },

    // Экран победы: монеты за уровень ×3 (ещё две награды сверху) — за рекламу.
    async rewardCoins() {
        if (this.state !== 'win' || this.coinsTripled || this.lastCoins <= 0) return;
        if (!(await this._reward('coins'))) return;
        this.coinsTripled = true;
        this.save.coins = (this.save.coins || 0) + this.lastCoins * 2;
        if (!this.dev) Platform.save(this.save);
        Sfx.play('star', { volume: 0.8 });
        Hud.syncWinCoins(this.lastCoins * 3, true);
    },

    async rewardPower() {
        if (this.state !== 'play' || !this.level || !this.level.dummy || this.level.dummy.power > 1) return;
        if (!(await this._reward('power'))) return;
        if (this.level && this.level.dummy) {
            this.level.dummy.power = 2;
            Hud.el['boost'].classList.add('used');
            Hud.toast(Lang.t('powerOn'));
        }
    },

    // --- Ввод ------------------------------------------------------------------------

    _bindInput(canvas) {
        let active = null;
        const local = (e) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
        canvas.addEventListener('pointerdown', (e) => {
            if (active !== null || !this.level) return;
            if (this.state !== 'play' && this.state !== 'win') return;
            const p = local(e);
            Hud.swipeStart(p);
            if (this.level.pointerDown(p.x, p.y)) {
                active = e.pointerId;
                try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* синтетика */ }
                Sfx.play('grab');
            } else {
                active = e.pointerId;
            }
            e.preventDefault();
        });
        canvas.addEventListener('pointermove', (e) => {
            if (!this.level) return;
            const p = local(e);
            Hud.pointer = p;
            if (e.pointerId !== active) return;
            this.level.pointerMove(p.x, p.y);
            Hud.swipeMove(p);
        });
        const up = (e) => {
            if (e.pointerId !== active) return;
            active = null;
            if (this.level) this.level.pointerUp();
            Hud.swipeEnd();
        };
        canvas.addEventListener('pointerup', up);
        canvas.addEventListener('pointercancel', up);
        window.addEventListener('lory-release-input', () => { active = null; if (this.level) this.level.pointerUp(); Hud.swipeEnd(); });
    },
};
