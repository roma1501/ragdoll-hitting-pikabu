// Shop.js — магазин косметики (данные и внешний вид — Cosmetics.js). Открывается из
// главного меню и с экрана победы: витринный манекен (стоит в стороне от уровня и
// поворачивается) крупно сбоку от панели, выбранный предмет сразу примеряется на нём
// (след пальца и удары — показом рядом). Монеты — за уровни (Game._win); предметы за
// рекламу копят просмотры в сохранении (adp).

/** @satisfies {Record<string, any>} */
const Shop = {
    /** @type {any} */
    game: null,
    el: {},
    cat: 'skin',
    /** @type {any} */
    sel: null,
    open: false,
    t: 0,
    _hitT: 0,
    _busy: false,
    /** @type {Dummy | null} */
    model: null,
    TABS: [['skin', 'assets/ui/skin.png', 'tabSkin'], ['hat', 'assets/ui/hat.png', 'tabHat'], ['face', 'assets/ui/face.png', 'tabFace'],
        ['trail', 'assets/ui/trail.png', 'tabTrail'], ['hit', 'assets/ui/hit.png', 'tabHit']],

    init(game) {
        this.game = game;
        for (const id of ['shop-screen', 'shop-coins', 'shop-tabs', 'shop-grid', 'shop-action', 'shop-close', 'shop-name']) this.el[id] = /** @type {HTMLElement} */ (document.getElementById(id));
        const tabs = this.el['shop-tabs'];
        for (const [cat, icon, key] of this.TABS) {
            const b = document.createElement('button');
            b.className = 'tab';
            b.dataset.cat = cat;
            b.innerHTML = '<img src="' + icon + '" alt=""><span data-t="' + key + '"></span>';
            b.addEventListener('click', (e) => { e.stopPropagation(); Sfx.play('click', { volume: 0.6 }); this.tab(cat); });
            tabs.appendChild(b);
        }
        Lang.apply(tabs);
        this.el['shop-close'].addEventListener('click', (e) => { e.stopPropagation(); Sfx.play('click', { volume: 0.6 }); this.close(); });
        this.el['shop-action'].addEventListener('click', (e) => { e.stopPropagation(); this.action(); });
    },

    show() {
        Hud.hideAll();
        Hud.el['hud'].classList.remove('on');
        this.open = true;
        this.t = 0;
        this._makeModel();
        this.tab(this.cat || 'skin');
        Hud.show('shop-screen');
        const L = this.game.level;
        if (L) { this._focus(L); L.cam.cur = null; }   // камера сразу у витрины
    },

    close() {
        if (!this.open) return;
        this.open = false;
        this._dropModel();
        const L = this.game.level;
        if (L) {
            L.focus = null; L.cam.cur = null;
            if (L.dummy && L.dummy.visual) Cosmetics.apply(L.dummy.visual);   // надетое — на манекен уровня
        }
        Hud.hide('shop-screen');
        Hud.syncCoins();
        Hud._back();
    },

    tab(cat) {
        this.cat = cat;
        this.sel = Cosmetics.equipped(cat);
        this._preview(null);
        this.render();
    },

    // Витрина: свой манекен в позе «стоит» далеко справа от уровня (там только пол).
    _makeModel() {
        const L = this.game.level;
        if (!L || this.model) return;
        const d = new Dummy(L.world, { pose: 'stand', pos: new V3(L.cam.base.x + 5200, 0, L.depth), heading: 90 });
        d.visual = new DummyVisual(d, L.view);
        d.visual.glow = L.dummy && L.dummy.visual ? L.dummy.visual.glow : 0.05;
        this.model = d;
    },

    _dropModel() {
        if (this.model) { this.model.dispose(); this.model = null; }
    },

    // Примерка на витрине: скин, шапка, лицо (null — то, что надето).
    _preview(it) {
        const vis = this.model && this.model.visual;
        if (!vis) return;
        const look = Cosmetics.look();
        if (it && (it.cat === 'skin' || it.cat === 'hat' || it.cat === 'face')) look[it.cat] = it;
        Cosmetics.apply(vis, look);
    },

    select(it) {
        this.sel = it;
        this._preview(it);
        this._hitT = 0.3;
        this.render();
    },

    render() {
        const s = Cosmetics.save();
        this.el['shop-coins'].textContent = String(s.coins);
        for (const b of /** @type {NodeListOf<HTMLElement>} */ (this.el['shop-tabs'].querySelectorAll('.tab'))) b.classList.toggle('on', b.dataset.cat === this.cat);
        const grid = this.el['shop-grid'];
        const top = grid.scrollTop;
        grid.innerHTML = '';
        const eq = Cosmetics.equipped(this.cat);
        for (const it of Cosmetics.list(this.cat)) {
            const own = Cosmetics.owned(it);
            const b = document.createElement('button');
            b.className = 'card' + (it === this.sel ? ' sel' : '') + (it === eq ? ' eq' : '') + (own ? ' own' : '');
            let badge = '';
            if (it === eq) badge = '<span class="pr ok"><img src="assets/ui/check.png" alt=""></span>';
            else if (!own && it.price) badge = '<span class="pr"><img src="assets/ui/coin.png" alt="">' + it.price + '</span>';
            else if (!own && it.ads) badge = '<span class="pr ad"><img src="assets/ui/ad.png" alt="">' + (s.adp[Cosmetics.key(it)] || 0) + '/' + it.ads + '</span>';
            b.innerHTML = '<img class="ic" src="' + Cosmetics.icon(it) + '" alt="">' + badge;
            b.title = Cosmetics.name(it);
            b.addEventListener('click', (e) => { e.stopPropagation(); Sfx.play('click', { volume: 0.5 }); this.select(it); });
            grid.appendChild(b);
        }
        grid.scrollTop = top;
        this._renderAction();
    },

    _renderAction() {
        const it = this.sel, s = Cosmetics.save(), btn = this.el['shop-action'];
        this.el['shop-name'].textContent = Cosmetics.name(it);
        const eq = Cosmetics.equipped(this.cat) === it;
        btn.className = 'btn';
        /** @type {HTMLButtonElement} */ (btn).disabled = false;
        if (eq) {
            btn.classList.add('ghost');
            /** @type {HTMLButtonElement} */ (btn).disabled = true;
            btn.innerHTML = '<img src="assets/ui/check.png" alt=""><span>' + Lang.t('equipped') + '</span>';
        } else if (Cosmetics.owned(it)) {
            btn.classList.add('green');
            btn.innerHTML = '<img src="assets/ui/check.png" alt=""><span>' + Lang.t('equip') + '</span>';
        } else if (it.price) {
            btn.classList.add(s.coins >= it.price ? 'gold' : 'ghost');
            btn.innerHTML = '<img src="assets/ui/coin.png" alt=""><span><b>' + Lang.t('buy') + '</b><small>' + it.price + '</small></span>';
        } else {
            btn.classList.add('red');
            btn.innerHTML = '<img src="assets/ui/ad.png" alt=""><span><b>' + Lang.t('watchAd') + '</b><small>' + Lang.t('adsProgress', { n: s.adp[Cosmetics.key(it)] || 0, t: it.ads }) + '</small></span>';
        }
    },

    _commit() {
        const g = this.game;
        if (!g.dev) Platform.save(g.save);
    },

    _unlock(it) {
        const s = Cosmetics.save();
        if (s.own.indexOf(Cosmetics.key(it)) < 0) s.own.push(Cosmetics.key(it));
        delete s.adp[Cosmetics.key(it)];
        s.eq[it.cat] = it.id;
        this._commit();
        Sfx.play('star', { volume: 0.8 });
        Hud.toast(Lang.t('unlocked', { name: Cosmetics.name(it) }));
        this._celebrate();
    },

    async action() {
        const it = this.sel, s = Cosmetics.save();
        if (!it || this._busy) return;
        if (Cosmetics.owned(it)) {
            if (Cosmetics.equipped(it.cat) === it) return;
            Sfx.play('click', { volume: 0.6 });
            s.eq[it.cat] = it.id;
            this._commit();
            this._preview(null);
            this.render();
            return;
        }
        if (it.price) {
            if (s.coins < it.price) {
                Sfx.play('click', { volume: 0.4, rate: 0.7 });
                Hud.toast(Lang.t('notEnough', { n: it.price - s.coins }));
                const c = this.el['shop-coins'].parentElement;
                c.classList.remove('shake'); void c.offsetWidth; c.classList.add('shake');
                return;
            }
            s.coins -= it.price;
            this._unlock(it);
            this._preview(null);
            this.render();
            return;
        }
        this._busy = true;
        let ok = false;
        try { ok = await this.game._reward('shop'); } finally { this._busy = false; }
        if (!ok) return;
        const k = Cosmetics.key(it);
        s.adp[k] = (s.adp[k] || 0) + 1;
        if (s.adp[k] >= it.ads) this._unlock(it);
        else { this._commit(); Hud.toast(Lang.t('adsLeft', { n: it.ads - s.adp[k] })); }
        this._preview(null);
        if (!Cosmetics.owned(it)) this._preview(it);
        this.render();
    },

    // Хлопок конфетти у манекена при покупке.
    _celebrate() {
        const L = this.game.level;
        if (!L || !this.model) return;
        const p = this.model.byId.head.body.pos;
        Fx.burst(L, p, { burst: 40, capacity: 50, life: [0.5, 1.1], size: [5, 11], speed: [180, 420], color: '#ffd24a', color2: '#ff5a8a', blend: 'standard', gravity: [0, -700, 0] });
    },

    // Кадр: витрина поворачивается, камера на ней; превью следа и удара.
    frame(ctx, dt) {
        if (!this.open) return;
        const L = this.game.level, d = this.model;
        if (!L || !d) return;
        this.t += dt || 0;
        d.spawn.heading = 90 + Math.sin(this.t * 0.7) * 32;
        d.update(dt || 0);
        d.visual.sync(dt || 0);
        this._focus(L);
        const it = this.sel;
        if (!it || !ctx) return;
        if (it.cat === 'trail') {
            // Палец водит восьмёркой в свободной от панели части экрана, линия — от груди.
            const c = L.screen(d.byId.chest.body.pos);
            if (!c || c.behind) return;
            const panel = /** @type {HTMLElement} */ (this.el['shop-screen'].querySelector('.shop-panel'));
            const W = window.innerWidth, H = window.innerHeight, portrait = H > W;
            const fw = portrait ? W : W - panel.offsetWidth, fh = portrait ? H - panel.offsetHeight : H;
            const a = this.t * 1.6;
            const x = fw * (0.5 + Math.sin(a) * 0.36), y = fh * (0.5 + Math.sin(a * 2) * 0.2);
            Cosmetics.drawTrail(ctx, c.x, c.y, x, y, it, this.t);
        } else if (it.cat === 'hit') {
            this._hitT -= dt || 0;
            if (this._hitT <= 0) {
                this._hitT = 0.9;
                const parts = d.parts;
                const part = parts[Math.floor(Math.random() * parts.length)];
                Fx.hitPreview(L, part.body.pos, it);
            }
        }
    },

    // Манекен крупно в свободной от панели части экрана (портрет — сверху, ландшафт — слева).
    _focus(L) {
        const d = this.model;
        if (!d) return;
        let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, z = 0;
        for (const p of d.parts) {
            const q = p.body.pos;
            x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); z += q.z / d.parts.length;
        }
        const bw = x1 - x0 + 70, bh = y1 - y0 + 90;
        const W = window.innerWidth, H = window.innerHeight, aspect = W / Math.max(1, H), portrait = H > W;
        let viewH, ox = 0, oy = 0;
        if (portrait) {
            viewH = Math.max(bh / 0.37, bw / 0.8 / aspect);
            oy = -0.27;
        } else {
            viewH = Math.max(bh / 0.62, bw / 0.38 / aspect);
            ox = 0.25;
        }
        L.focus = { x: (x0 + x1) / 2, y: (y0 + y1) / 2, z, w: 1, h: viewH * (portrait ? 0.66 : 0.74), ox, oy };
    },
};
