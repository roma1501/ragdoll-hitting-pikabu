// Fx.js — отклик на удары: звуки (Sfx), частицы (app.fx), тряска камеры, всплывающие
// надписи (Hud.popup). Пути звуков — литералами: сборщик берёт в архив только их.

/** @satisfies {Record<string, any>} */
const Sfx = {
    lib: {
        crack: ['assets/sounds/crack.wav', 'assets/sounds/crunch.wav'],
        shred: ['assets/sounds/shred.wav'],
        hit: ['assets/sounds/hit1.ogg', 'assets/sounds/hit2.ogg', 'assets/sounds/hit3.ogg'],
        soft: ['assets/sounds/soft.ogg'],
        metal: ['assets/sounds/metal1.ogg', 'assets/sounds/metal2.ogg'],
        wood: ['assets/sounds/wood.ogg'],
        plate: ['assets/sounds/plate.ogg'],
        glass: ['assets/sounds/glass.ogg'],
        boom: ['assets/sounds/boom.ogg'],
        thunder: ['assets/sounds/thunder.ogg'],
        zap: ['assets/sounds/zap.ogg', 'assets/sounds/zap2.ogg'],
        saw: ['assets/sounds/saw.wav'],
        drill: ['assets/sounds/drill.wav'],
        press: ['assets/sounds/press.wav'],
        fire: ['assets/sounds/fire.wav'],
        laser: ['assets/sounds/laser.ogg'],
        thruster: ['assets/sounds/thruster.ogg'],
        whoosh: ['assets/sounds/whoosh.wav'],
        boing: ['assets/sounds/boing.wav'],
        grab: ['assets/sounds/pop.wav'],
        click: ['assets/sounds/click.ogg'],
        win: ['assets/sounds/win.wav'],
        lose: ['assets/sounds/lose.wav'],
        star: ['assets/sounds/star.wav'],
    },
    MUSIC: 'assets/sounds/music.ogg',
    _last: {},
    _loops: {},

    // name — ключ lib; opts: { volume, rate, detune, gap (с) — не чаще }.
    play(name, opts) {
        const list = this.lib[name];
        if (!list) return null;
        const o = opts || {};
        const now = performance.now() / 1000;
        const gap = o.gap != null ? o.gap : 0.05;
        if (this._last[name] && now - this._last[name] < gap) return null;
        this._last[name] = now;
        const url = list[Math.floor(Math.random() * list.length)];
        return Sound.play(url, { volume: o.volume == null ? 1 : o.volume, rate: o.rate || 1, detune: o.detune == null ? 0.08 : o.detune });
    },

    // Звук, пока что-то длится (пила режет, дрель сверлит): повторяется не чаще len.
    hold(name, len, volume) {
        const now = performance.now() / 1000;
        const l = this._loops[name];
        if (l && now - l < len) return;
        this._loops[name] = now;
        const list = this.lib[name];
        if (list) Sound.play(list[0], { volume: volume == null ? 0.7 : volume, detune: 0.04 });
    },

    preload() { const all = []; for (const k in this.lib) all.push(...this.lib[k]); return Sound.preload(all); },
};

/** @satisfies {Record<string, any>} */
const Fx = {
    _t: {},
    // Спрайты частиц (ImageGen, прозрачный PNG); нет файла — мягкая маска ParticleFX.
    TEX: { spark: 'assets/fx/spark.png', burst: 'assets/fx/burst.png', flame: 'assets/fx/flame.png', puff: 'assets/fx/puff.png' },
    ok(key, gap) {
        const now = performance.now() / 1000;
        if (this._t[key] && now - this._t[key] < gap) return false;
        this._t[key] = now;
        return true;
    },

    fx(L) { return L && L.app ? L.app.fx : null; },

    burst(L, p, recipe) {
        const fx = this.fx(L);
        if (!fx || !p) return;
        try { fx.create(Object.assign({ position: [p.x, p.y, p.z] }, recipe)); } catch (e) { /* бюджет частиц */ }
    },

    impact(L, dmg, p, other) {
        if (!p) return;
        const od = (other && other.data) || {};
        const loud = Math.min(1, dmg / 90);
        if (this.ok('impact', 0.06)) {
            const snd = od.sound || (other && other.type === 'static' ? 'soft' : 'hit');
            Sfx.play(snd, { volume: 0.35 + loud * 0.65, gap: 0.05 });
            if (dmg > 40) Sfx.play('hit', { volume: 0.5 + loud * 0.5, gap: 0.08 });
        }
        if (dmg > 25) this.burst(L, p, Object.assign({ burst: Math.round(8 + loud * 18), capacity: 30, life: [0.25, 0.55], size: [6, 14], speed: [60, 220], color: '#fff3c4', color2: '#ffffff', gravity: [0, -400, 0], texture: this.TEX.spark, spin: [-6, 6] }, this._hitStyle()));
        if (dmg > 60) {
            L.shake(4 + loud * 10, 0.22);
            if (this.ok('ouch', 0.9)) Hud.popup(L.screen(p), Hud.pick(['pow', 'bam', 'ouch', 'bonk']), 'hit');
        }
    },

    hazard(L, part, kind, p, item) {
        if (!p) p = part.body.pos;
        if (kind === 'cut' || kind === 'pierce') {
            if (this.ok('spark', 0.05)) this.burst(L, p, { burst: 10, capacity: 16, life: [0.15, 0.4], size: [4, 9], speed: [120, 380], color: '#ffd35a', color2: '#ffffff', gravity: [0, -900, 0], texture: this.TEX.spark });
            const drill = item && item.kind === 'drill';
            Sfx.hold(drill ? 'drill' : 'saw', drill ? 0.9 : 0.6, 0.55);
            if (this.ok('cutshake', 0.1)) L.shake(3, 0.1);
        } else if (kind === 'burn') {
            if (this.ok('burn', 0.06)) this.burst(L, p, { burst: 6, capacity: 12, life: [0.3, 0.7], size: [12, 24], speed: [20, 70], direction: [[-0.3, 1, -0.3], [0.3, 1, 0.3]], color: '#ffffff', color2: '#ffb050', gravity: [0, 200, 0], texture: this.TEX.flame, sizeGradient: [[0, 0.6], [0.3, 1], [1, 0.3]] });
            if (this.ok('smoke', 0.18)) this.burst(L, p, { burst: 3, capacity: 6, life: [0.8, 1.6], size: [14, 30], speed: [15, 40], direction: [[-0.2, 1, -0.2], [0.2, 1, 0.2]], color: '#555a60', blend: 'standard', alpha: 0.6, gravity: [0, 60, 0], texture: this.TEX.puff, spin: [-1, 1] });
            Sfx.hold(item && item.kind === 'laser' ? 'laser' : 'fire', item && item.kind === 'laser' ? 0.25 : 0.9, 0.5);
        } else if (kind === 'shock') {
            if (this.ok('shock', 0.08)) this.burst(L, p, { burst: 8, capacity: 12, life: [0.1, 0.3], size: [5, 11], speed: [150, 420], color: '#8ff4ff', color2: '#ffffff', gravity: [0, 0, 0], texture: this.TEX.spark });
            Sfx.hold('zap', 0.35, 0.5);
        } else if (kind === 'crush' || kind === 'shred') {
            if (this.ok('crush', 0.07)) this.burst(L, p, { burst: 8, capacity: 14, life: [0.3, 0.7], size: [5, 12], speed: [80, 260], color: '#f2b928', color2: '#8a4a26', blend: 'standard', gravity: [0, -900, 0] });
            if (kind === 'shred') Sfx.hold('shred', 0.8, 0.6);
            if (this.ok('crushshake', 0.12)) L.shake(6, 0.15);
        }
    },

    boneBreak(L, part, kind) {
        const p = part.body.pos;
        Sfx.play('crack', { volume: 1, gap: 0.04, detune: 0.12 });
        this.burst(L, p, Object.assign({ burst: 22, capacity: 30, life: [0.3, 0.8], size: [7, 15], speed: [120, 320], color: '#ffffff', color2: '#ffe28a', gravity: [0, -700, 0], texture: this.TEX.spark, spin: [-6, 6] }, this._hitStyle()));
        this.burst(L, p, { burst: 1, capacity: 2, life: [0.14, 0.22], size: [70, 100], speed: [0, 5], color: '#ffffff', texture: this.TEX.burst, spin: [-3, 3], sizeGradient: [[0, 0.4], [0.4, 1], [1, 0.1]] });
        L.shake(7, 0.2);
        Hud.popup(L.screen(p), Hud.pick(['crack', 'snap', 'crunch']), 'crack');
    },

    explode(L, p, r) {
        const fx = this.fx(L);
        if (fx) { try { fx.play('explosion', new BABYLON.Vector3(p.x, p.y, p.z), {}); } catch (e) { /* бюджет */ } }
        this.burst(L, p, { burst: 2, capacity: 4, life: [0.15, 0.3], size: [r * 0.9, r * 1.4], speed: [0, 4], color: '#fff2a8', texture: this.TEX.burst, spin: [-2, 2], sizeGradient: [[0, 0.3], [0.3, 1], [1, 0.2]] });
        this.burst(L, p, { burst: 10, capacity: 12, life: [0.6, 1.2], size: [r * 0.25, r * 0.5], speed: [60, 180], color: '#8a8f96', blend: 'standard', alpha: 0.75, gravity: [0, 80, 0], texture: this.TEX.puff, spin: [-1, 1] });
        Sfx.play('boom', { volume: 1, gap: 0.03 });
        L.shake(16, 0.45);
        Hud.flash('#fff6c8', 0.35);
        Hud.popup(L.screen(p), 'boom', 'boom');
    },

    lightning(L, p, hit) {
        Sfx.play('thunder', { volume: 1, gap: 0.2 });
        Sfx.play('zap', { volume: 0.7, gap: 0.1 });
        Hud.flash('#d9fbff', 0.28);
        L.shake(hit ? 12 : 6, 0.3);
        this.burst(L, p, { burst: 26, capacity: 34, life: [0.15, 0.45], size: [3, 8], speed: [160, 460], direction: [[-1, 0.2, -1], [1, 1, 1]], color: '#aef6ff', color2: '#ffffff', gravity: [0, -800, 0] });
    },

    fuse(L, p) {
        if (this.ok('fuse', 0.05)) this.burst(L, p, { burst: 4, capacity: 8, life: [0.15, 0.35], size: [2, 5], speed: [60, 160], color: '#ffd35a', color2: '#ff7a2e', gravity: [0, -300, 0] });
    },

    // Эффект ударов из магазина (Cosmetics): цвета и полёт искр; стандартный — без изменений.
    _hitStyle(it) {
        if (typeof Cosmetics === 'undefined' || !Cosmetics.game) return {};
        const h = it || Cosmetics.equipped('hit');
        return h && !h.free ? Cosmetics.hitRecipe(h) : {};
    },

    // Показ эффекта ударов в магазине.
    hitPreview(L, p, it) {
        this.burst(L, p, Object.assign({ burst: 22, capacity: 30, life: [0.3, 0.8], size: [7, 15], speed: [120, 320], color: '#ffffff', color2: '#ffe28a', gravity: [0, -700, 0], texture: this.TEX.spark, spin: [-6, 6] }, it.free ? {} : Cosmetics.hitRecipe(it)));
        Sfx.play('hit', { volume: 0.35, gap: 0.2 });
        Hud.popup(L.screen(p), Hud.pick(['crack', 'snap', 'crunch']), 'crack', it.pop);
    },

    poof(L, p) {
        this.burst(L, p, { burst: 12, capacity: 16, life: [0.4, 0.9], size: [20, 40], speed: [40, 120], color: '#ffffff', blend: 'standard', alpha: 0.9, gravity: [0, 30, 0], texture: this.TEX.puff, spin: [-1.5, 1.5] });
        Sfx.play('whoosh', { volume: 0.7 });
    },
};
