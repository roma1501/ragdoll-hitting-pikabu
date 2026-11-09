// Props2.js — вторая часть предметов уровней (см. шапку Props.js): бита, сковорода,
// сейф, пианино, валун, бревно, газовый баллон, ракета, сосулька, мусорный бак,
// маятники на цепи, инструменты в руке (бензопила, огнемёт, шокер, отбойник,
// воздуходувка), опасности (огонь, лава, кислота, электрозабор, катушка Теслы,
// лазерная сетка, поршень-перчатка, конвейер, вентилятор, мельница, вертушка,
// маятник-топор, молот-рука, бампер, качели, пушка, дождь из предметов, стены-
// давилки, блендер, торнадо, мины, лифт, кактус).

// Временный предмет (снаряд, падающий объект): исчезает через life секунд.
function propsTemp(L, item, life) {
    item.life = life;
    item.tmp = true;
    const upd = item.update;
    item.update = (dt) => {
        if (upd) upd(dt);
        item.life -= dt;
        if (item.life <= 0 && !item.gone) propsDrop(L, item);
    };
    L.items.push(item);
    return item;
}

// Убрать предмет из мира и сцены.
function propsDrop(L, item) {
    item.gone = true;
    if (item.body) {
        L.world.remove(item.body);
        L.draggable.delete(item.body);
        if (L.grab && L.grab.body === item.body) L.releaseGrab();
        L.syncs = L.syncs.filter(s => s.body !== item.body);
    }
    if (item.root) { try { World3D.removeObject(L.view, item.root); } catch (e) { /* уже снесён */ } }
    const i = L.items.indexOf(item);
    if (i >= 0) L.items.splice(i, 1);
}

// Маркер «на лету» (для снарядов и падающих предметов).
function propsFake(name, pos, rotY) {
    return Level.parse({ name, x: pos.x, y: pos.z, h: pos.y, rot: [0, rotY || 0, 0], scale: [1, 1, 1] });
}

// Маятник: угол во времени t (рад).
function swingAngle(t, amp, period, phase) { return Math.sin((t / period + (phase || 0)) * Math.PI * 2) * amp; }

// Поворот вокруг оси Z (плоскость экрана).
function rotZ(a) { return Quat.fromAxisAngle(PHYS_AXES.Z, a); }

// --- Бросаемые ---------------------------------------------------------------------------

Props.def('bat', {
    build(L, m) {
        return Props.dyn(L, { name: 'bat', pos: m.pos.clone().add(new V3(0, m.rot[2] ? 7 : 50, 0)), q: m.q, mass: 3, angDamp: 0.5, data: { power: 3, sound: 'wood' },
            shapes: b => b.addCapsule(new V3(0, -44, 0), new V3(0, 40, 0), 5.5),
            visual: n => {
                Props.cyl(L, n, 13, 7, 74, 0xc98a4b, 0, 8, 0);
                Props.sph(L, n, 13, 0xc98a4b, 0, 45, 0);
                Props.cyl(L, n, 8, 8, 22, 0x2a2c31, 0, -38, 0);
                Props.cyl(L, n, 12, 12, 4, 0x2a2c31, 0, -50, 0);
            } });
    },
});

Props.def('pan', {
    build(L, m) {
        return Props.dyn(L, { name: 'pan', pos: m.pos.clone().add(new V3(0, 6, 0)), q: m.q, mass: 2.2, data: { power: 3.4, sound: 'metal' },
            shapes: b => { b.addBox(new V3(0, 0, 0), new V3(23, 3.5, 23)); b.addCapsule(new V3(24, 1, 0), new V3(66, 5, 0), 3.5); },
            visual: n => {
                Props.cyl(L, n, 48, 42, 6, 0x2b2d33, 0, 0, 0, 0, 0, 0, 24);
                Props.torus(L, n, 46, 3, 0x3a3d44, 0, 3, 0);
                Props.cyl(L, n, 6, 6, 44, 0x6b3b1f, 46, 3, 0, 0, 0, Math.PI / 2 - 0.1);
            } });
    },
});

Props.def('safe', {
    build(L, m) {
        const it = Props.dyn(L, { name: 'safe', pos: m.pos.clone().add(new V3(0, 36, 0)), q: m.q, mass: m.num('kg', 180), restitution: 0.03, data: { power: 2.2, crush: 150, sound: 'metal' },
            shapes: b => b.addBox(new V3(), new V3(32, 36, 30)),
            visual: n => {
                Props.box(L, n, 64, 72, 60, 0x3f5a4e);
                Props.box(L, n, 52, 60, 4, 0x4f6d60, 0, 0, 30);
                Props.cyl(L, n, 18, 18, 5, 0xc9ced6, 6, 6, 32, Math.PI / 2, 0, 0, 16);
                Props.box(L, n, 5, 22, 5, 0xc9ced6, -16, 0, 33);
                for (const s of [-1, 1]) Props.box(L, n, 10, 6, 60, 0x2a2c31, s * 22, -38, 0);
            } });
        if (m.flags.some(f => f.startsWith('rope'))) hangOnRope(L, it, m, new V3(0, 36, 0));
        return it;
    },
});

Props.def('piano', {
    build(L, m) {
        const it = Props.dyn(L, { name: 'piano', pos: m.pos.clone().add(new V3(0, 55, 0)), q: m.q, mass: m.num('kg', 230), restitution: 0.03, data: { power: 3, crush: 150, sound: 'wood' },
            shapes: b => { b.addBox(new V3(0, 8, -6), new V3(62, 47, 22)); b.addBox(new V3(0, -8, 22), new V3(60, 6, 12)); },
            visual: n => {
                const K = 0x1d1e23;
                Props.box(L, n, 124, 94, 44, K, 0, 8, -6);
                Props.box(L, n, 120, 12, 24, K, 0, -8, 22);
                Props.box(L, n, 110, 4, 16, 0xf5f5f0, 0, -1.5, 26);
                for (let i = 0; i < 14; i++) Props.box(L, n, 3, 3, 9, 0x111111, -52 + i * 8, 1, 22);
                for (const s of [-1, 1]) Props.box(L, n, 8, 40, 8, K, s * 54, -34, 26);
                Props.box(L, n, 60, 16, 2, 0xd9c7a0, 0, 36, 16);
            } });
        if (m.flags.some(f => f.startsWith('rope'))) hangOnRope(L, it, m, new V3(0, 55, -6));
        return it;
    },
});

function rockMesh(L, parent, r, hex, seed) {
    const s = BABYLON.MeshBuilder.CreateIcoSphere('rock', { radius: r, subdivisions: 1, flat: true, updatable: true }, L.scene);
    const pos = s.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    let k = seed || 3;
    const rnd = () => { k = (k * 16807) % 2147483647; return k / 2147483647; };
    const seen = new Map();
    for (let i = 0; i < pos.length; i += 3) {
        const key = pos[i].toFixed(2) + ',' + pos[i + 1].toFixed(2) + ',' + pos[i + 2].toFixed(2);
        let f = seen.get(key);
        if (f == null) { f = 0.82 + rnd() * 0.3; seen.set(key, f); }
        pos[i] *= f; pos[i + 1] *= f; pos[i + 2] *= f;
    }
    s.updateVerticesData(BABYLON.VertexBuffer.PositionKind, pos);
    const nrm = [];
    BABYLON.VertexData.ComputeNormals(pos, s.getIndices(), nrm);
    s.updateVerticesData(BABYLON.VertexBuffer.NormalKind, nrm);
    s.material = L.mat(hex);
    s.parent = parent;
    return s;
}

Props.def('boulder', {
    build(L, m) {
        const R = 38 * m.scale[0];
        return Props.dyn(L, { name: 'boulder', pos: m.pos.clone().add(new V3(0, R, 0)), q: m.q, mass: m.num('kg', 150) * m.scale[0], friction: 0.9, restitution: 0.08,
            data: { power: 1.6, crush: 120, sound: 'plate' }, draggable: !m.has('fixed'),
            shapes: b => b.addSphere(new V3(), R * 0.93),
            visual: n => rockMesh(L, n, R, m.has('space') ? 0x7a6f8e : 0x8b8f96, 7) });
    },
});

Props.def('snowball', {
    build(L, m) {
        const R = 42 * m.scale[0];
        return Props.dyn(L, { name: 'snowball', pos: m.pos.clone().add(new V3(0, R, 0)), q: m.q, mass: 60 * m.scale[0], friction: 0.7, restitution: 0.05, data: { power: 1.2, sound: 'soft' },
            shapes: b => b.addSphere(new V3(), R),
            visual: n => Props.sph(L, n, R * 2, 0xf4f8fb, 0, 0, 0, 1, 1, 1, 16) });
    },
});

Props.def('cannonball', {
    build(L, m) {
        return Props.dyn(L, { name: 'cannonball', pos: m.pos.clone().add(new V3(0, 14, 0)), q: m.q, mass: 25, restitution: 0.1, data: { power: 1.5, sound: 'metal' },
            shapes: b => b.addSphere(new V3(), 14),
            visual: n => Props.sph(L, n, 28, 0x24262c, 0, 0, 0, 1, 1, 1, 14) });
    },
});

Props.def('coconut', {
    build(L, m) {
        const it = Props.dyn(L, { name: 'coconut', pos: m.pos.clone().add(new V3(0, m.has('hang') ? -14 : 11, 0)), q: m.q, mass: 4, restitution: 0.3, data: { power: 5, sound: 'wood' },
            shapes: b => b.addSphere(new V3(), 11),
            visual: n => { Props.sph(L, n, 22, 0x6b4426, 0, 0, 0, 1, 1.08, 1, 12); for (const [x, y] of [[-3, 4], [3, 4], [0, -1]]) Props.sph(L, n, 3.5, 0x2a1a10, x, y, 9.8); } });
        // hang — висит в кроне: взмах пальцем срывает, через 4 с вырастает новый.
        if (m.has('hang')) hangRegrow(L, it, 3);
        return it;
    },
});

Props.def('log', {
    build(L, m) {
        return Props.dyn(L, { name: 'log', pos: m.pos.clone().add(new V3(0, 18, 0)), q: m.q, mass: 60, friction: 0.8, data: { power: 1.2, sound: 'wood' },
            shapes: b => b.addCapsule(new V3(-70, 0, 0), new V3(70, 0, 0), 17),
            visual: n => {
                Props.cyl(L, n, 34, 34, 150, 0x8a5a33, 0, 0, 0, 0, 0, Math.PI / 2, 16);
                for (const s of [-1, 1]) Props.cyl(L, n, 30, 30, 2, 0xd8b27a, s * 75.5, 0, 0, 0, 0, Math.PI / 2, 16);
            } });
    },
});

Props.def('gas', {
    build(L, m) {
        const it = Props.dyn(L, { name: 'gas', pos: m.pos.clone().add(new V3(0, 40, 0)), q: m.q, mass: 14, data: { power: 1, explosive: { r: 260, power: 1.1, threshold: 430 }, sound: 'metal' },
            shapes: b => b.addCapsule(new V3(0, -26, 0), new V3(0, 22, 0), 14),
            visual: n => {
                Props.cap(L, n, 76, 14, 0xd8342b, 0, -2, 0);
                Props.cyl(L, n, 8, 10, 10, 0xc9ced6, 0, 38, 0);
                Props.box(L, n, 14, 3, 3, 0x2a2c31, 0, 43, 0);
                Props.cyl(L, n, 29, 29, 4, 0xf2f2f2, 0, 6, 0);
            } });
        it.update = (dt) => { const ex = it.body.data.explosive; if (ex.fuse > 0 && !ex.done) { ex.fuse -= dt; if (ex.fuse <= 0) Props.detonate(L, it.body); } };
        return it;
    },
});

// Ракета-фейерверк: брошена — летит по направлению броска и взрывается.
Props.def('rocket', {
    build(L, m) {
        const it = Props.dyn(L, { name: 'rocket', pos: m.pos.clone().add(new V3(0, 12, 0)), q: m.q, mass: 4, data: { power: 1, explosive: { r: 230, power: 1, threshold: 99999 }, sound: 'wood' },
            shapes: b => b.addCapsule(new V3(-30, 0, 0), new V3(26, 0, 0), 9),
            visual: n => {
                Props.cyl(L, n, 18, 18, 56, 0xe0412f, -2, 0, 0, 0, 0, Math.PI / 2, 14);
                Props.cyl(L, n, 0, 18, 18, 0xf2c230, 34, 0, 0, 0, 0, -Math.PI / 2, 14);
                for (let i = 0; i < 3; i++) Props.box(L, n, 14, 2, 12, 0x3a7be0, -26, Math.cos(i * 2.1) * 10, Math.sin(i * 2.1) * 10, i * 2.1, 0, 0);
                Props.cyl(L, n, 2, 2, 14, 0xd8c79a, -38, 0, 0, 0, 0, Math.PI / 2);
            } });
        let fly = 0, dir = null;
        it.onRelease = () => {
            const v = it.body.vel.clone();
            if (v.len() < 120 || fly > 0) return;
            dir = v.normalize();
            fly = 1.9;
            it.body.data.explosive.threshold = 120;
            Sfx.play('thruster', { volume: 0.6 });
        };
        it.onRespawn = () => { fly = 0; dir = null; it.body.data.explosive.threshold = 99999; };
        it.update = (dt) => {
            const ex = it.body.data.explosive;
            if (ex.done) return;
            if (fly > 0 && dir) {
                fly -= dt;
                const b = it.body;
                b.q.copy(Quat.fromTo(PHYS_AXES.X, dir)); b.omega.set(0, 0, 0);
                b.vel.copy(dir.clone().scale(Math.min(1500, b.vel.len() + 2600 * dt)));
                if (L.hooks.onFuse) L.hooks.onFuse(b.toWorld(new V3(-40, 0, 0)));
                if (fly <= 0) Props.detonate(L, b);
            }
        };
        return it;
    },
});

// Висит на короткой невидимой верёвке (сосулька, кокос): взмах пальцем по ней или рывок —
// падает; через 4 с на прежнем месте вырастает новый.
function hangRegrow(L, it, top) {
    const rope = new PRope({ b0: it.body, p0: new V3(0, top, 0), p1: it.body.toWorld(new V3(0, top + 4, 0)), len: 4, rope: true });
    L.world.addJoint(rope);
    it.rope = { joint: rope, anchor: rope.p1.clone(), line: null, cut: true };
    L.cuttable.push(it);
    const home = { pos: it.body.pos.clone(), q: it.body.q.clone() };
    let fallen = 0;
    const prev = it.update;
    it.update = (dt) => {
        if (prev) prev(dt);
        if (rope.enabled && L.grab && L.grab.body === it.body) { rope.enabled = false; L.world.removeJoint(rope); }
        if (!rope.enabled && !(L.grab && L.grab.body === it.body)) {
            fallen += dt;
            if (fallen > 4) { fallen = 0; it.body.teleport(home.pos, home.q); rope.enabled = true; L.world.addJoint(rope); }
        } else fallen = 0;
    };
}

// Сосулька: висит под потолком; взмах пальца (или рывок) — падает остриём вниз.
Props.def('icicle', {
    build(L, m) {
        const it = Props.dyn(L, { name: 'icicle', pos: m.pos.clone().add(new V3(0, -40, 0)), q: new Quat(), mass: 8, angDamp: 2, data: { power: 5, sound: 'glass', hazard: { dps: 160, kind: 'pierce' }, hazardTag: 'tip' },
            shapes: b => { b.addCapsule(new V3(0, -10, 0), new V3(0, 26, 0), 10); b.addSphere(new V3(0, -30, 0), 7, 'tip'); },
            visual: n => {
                Props.cyl(L, n, 26, 0, 80, L.mat(0xbfe9ff, { spec: 0.7 }), 0, -2, 0, 0, 0, 0, 7);
            } });
        hangRegrow(L, it, 36);
        return it;
    },
});

Props.def('trashbin', {
    build(L, m) {
        const col = propColor(m, PROP_COLORS.purple);
        return Props.dyn(L, { name: 'trashbin', pos: m.pos.clone().add(new V3(0, 46, 0)), q: m.q, mass: 22, data: { power: 1.2, sound: 'plate' },
            shapes: b => b.addBox(new V3(0, 0, 0), new V3(28, 46, 30)),
            visual: n => {
                Props.box(L, n, 54, 86, 58, col, 0, -2, 0);
                Props.box(L, n, 60, 8, 64, 0x1f2126, 0, 45, -1, -0.08, 0, 0);
                Props.box(L, n, 20, 6, 8, 0x1f2126, 0, 36, -32);
                for (const s of [-1, 1]) Props.cyl(L, n, 16, 16, 8, 0x1f2126, s * 22, -44, -24, 0, 0, Math.PI / 2, 12);
            } });
    },
});

// Шипастый шар на цепи, шар-баба, таран на двух верёвках.
Props.def('mace', {
    build(L, m) {
        const it = Props.dyn(L, { name: 'mace', pos: m.pos.clone(), q: m.q, mass: 30, angDamp: 0.6,
            data: { power: 4.5, hazard: { dps: 60, kind: 'pierce' }, sound: 'metal' },
            shapes: b => b.addSphere(new V3(), 24),
            visual: n => {
                Props.sph(L, n, 40, 0x3b3f47, 0, 0, 0, 1, 1, 1, 14);
                const dirs = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1], [.7, .7, 0], [-.7, .7, 0], [.7, -.7, 0], [-.7, -.7, 0], [0, .7, .7], [0, -.7, .7], [.7, 0, .7], [-.7, 0, .7]];
                for (const d of dirs) {
                    const c = BABYLON.MeshBuilder.CreateCylinder('spk', { diameterTop: 0, diameterBottom: 9, height: 14, tessellation: 6 }, L.scene);
                    c.material = L.mat(0xc9ced6, { spec: 0.5 });
                    c.parent = n; c.position.set(d[0] * 22, d[1] * 22, d[2] * 22);
                    const q = BABYLON.Quaternion.FromUnitVectorsToRef(BABYLON.Axis.Y, new BABYLON.Vector3(d[0], d[1], d[2]).normalize(), new BABYLON.Quaternion());
                    c.rotationQuaternion = q;
                }
            } });
        hangOnRope(L, it, m, new V3(0, 24, 0));
        it.rope.line.material = L.mat(0x3a3d44); it.rope.line.scaling.x = 2;
        return it;
    },
});

Props.def('wreckingball', {
    build(L, m) {
        const it = Props.dyn(L, { name: 'wreckingball', pos: m.pos.clone(), q: m.q, mass: 420, angDamp: 0.4, restitution: 0.05, data: { power: 3, crush: 150, sound: 'metal' },
            shapes: b => b.addSphere(new V3(), 46),
            visual: n => { Props.sph(L, n, 92, 0x2b2d33, 0, 0, 0, 1, 1, 1, 18); Props.cyl(L, n, 20, 26, 16, 0x3b3f47, 0, 48, 0); } });
        hangOnRope(L, it, m, new V3(0, 54, 0));
        it.rope.line.material = L.mat(0x3a3d44); it.rope.line.scaling.x = 3;
        return it;
    },
});

Props.def('ram', {
    build(L, m) {
        const len = m.num('rope', 0) || 220;
        const it = Props.dyn(L, { name: 'ram', pos: m.pos.clone(), q: m.q, mass: 110, angDamp: 0.8, data: { power: 4, sound: 'wood' },
            shapes: b => b.addCapsule(new V3(-80, 0, 0), new V3(80, 0, 0), 21),
            visual: n => {
                Props.cyl(L, n, 42, 42, 170, 0x8a5a33, 0, 0, 0, 0, 0, Math.PI / 2, 16);
                Props.cyl(L, n, 46, 30, 22, 0x3b3f47, 94, 0, 0, 0, 0, -Math.PI / 2, 16);
            } });
        const lines = [];
        for (const x of [-55, 55]) {
            const at = it.body.toWorld(new V3(x, 20, 0));
            const rope = new PRope({ b0: it.body, p0: new V3(x, 20, 0), p1: new V3(at.x, at.y + len, at.z), len, rope: true });
            L.world.addJoint(rope);
            const line = Props.cyl(L, null, 4, 4, 1, 0x5b4630); L.nodes.push(line);
            lines.push({ rope, line, x });
        }
        Props.box(L, null, 200, 12, 30, 0x555a63, it.body.pos.x, it.body.pos.y + len + 26, it.body.pos.z);
        it.rope = { joint: lines[0].rope, anchor: new V3(it.body.pos.x, it.body.pos.y + 20 + len, it.body.pos.z), line: null, cut: false };
        it.sync = () => {
            for (const l of lines) {
                const a = it.body.toWorld(new V3(l.x, 20, 0)), z = l.rope.p1;
                const dx = z.x - a.x, dy = z.y - a.y, dz = z.z - a.z, ll = Math.sqrt(dx * dx + dy * dy + dz * dz);
                l.line.position.set((a.x + z.x) / 2, (a.y + z.y) / 2, (a.z + z.z) / 2);
                l.line.scaling.set(1, ll, 1);
                l.line.rotation.set(0, 0, Math.atan2(-dx, dy));
            }
        };
        return it;
    },
});

// --- Инструменты в руке ------------------------------------------------------------------

function heldTool(L, m, spec) {
    const q = m.q.clone();
    const it = Props.dyn(L, Object.assign({ pos: m.pos.clone(), q, linDamp: 3, angDamp: 4, gravityScale: 0 }, spec));
    it.q0 = q;
    const extra = spec.update;
    it.update = (dt) => { Props.hover(it.body, it.q0, dt); if (extra) extra(dt, it); };
    return it;
}

Props.def('chainsaw', {
    build(L, m) {
        let chain = null;
        const it = heldTool(L, m, { name: 'chainsaw', mass: 7, data: { power: 0.6, hazard: { dps: 130, kind: 'cut' }, hazardTag: 'blade', sound: 'metal' },
            shapes: b => { b.addBox(new V3(30, 0, 0), new V3(32, 24, 18)); const s = b.addBox(new V3(-62, -4, 0), new V3(58, 10, 4), 'blade'); s.soft = 0.00003; },
            visual: n => {
                Props.box(L, n, 64, 48, 36, 0xf08a24, 30, 0, 0);
                Props.box(L, n, 30, 10, 38, 0x2a2c31, 30, 28, 0);
                Props.torus(L, n, 34, 6, 0x2a2c31, 40, 34, 0, 0, 0, 0);
                Props.box(L, n, 116, 20, 5, 0xb9c0c9, -62, -4, 0);
                chain = Props.box(L, n, 120, 24, 3, L.mat(0x3b3f47), -62, -4, 0);
            } });
        it.sync = () => { if (chain) chain.position.x = -62 + Math.sin(L.time * 90) * 1.5; };
        return it;
    },
});

Props.def('flamethrower', {
    build(L, m) {
        const it = heldTool(L, m, { name: 'flamethrower', mass: 8, data: { power: 0.5 },
            shapes: b => { b.addBox(new V3(26, 0, 0), new V3(30, 16, 14)); b.addCapsule(new V3(-60, 0, 0), new V3(0, 0, 0), 7); },
            visual: n => {
                Props.box(L, n, 60, 32, 28, 0x5a6b3a, 26, 0, 0);
                Props.cap(L, n, 60, 13, 0xd8342b, 30, 24, 0, 0, 0, Math.PI / 2);
                Props.cyl(L, n, 12, 14, 64, 0x3b3f47, -32, 0, 0, 0, 0, Math.PI / 2);
                Props.cyl(L, n, 18, 14, 10, 0x2a2c31, -66, 0, 0, 0, 0, Math.PI / 2);
            },
            update: (dt, self) => {
                const b = self.body;
                const nozzle = b.toWorld(new V3(-72, 0, 0)), dir = b.q.rotate(new V3(-1, 0, 0));
                self.nozzle = nozzle; self.dir = dir;
                const d = L.dummy;
                if (d) for (const p of d.parts) {
                    const v = V3.sub(p.body.pos, nozzle), along = v.dot(dir);
                    if (along < 0 || along > 270) continue;
                    const perp = v.clone().addScaled(dir, -along).len();
                    if (perp < 22 + along * 0.28) {
                        d.activate();
                        if (p.hazard < 60) { p.hazard = 60; p.hazardKind = 'burn'; p.hazardPoint = p.body.pos.clone(); p.hazardItem = self; }
                    }
                }
                for (const o of L.world.bodies) {
                    const ex = o.data && o.data.explosive;
                    if (!ex || ex.done || ex.fuse) continue;
                    const v = V3.sub(o.pos, nozzle), along = v.dot(dir);
                    if (along > 0 && along < 260 && v.clone().addScaled(dir, -along).len() < 30 + along * 0.28) ex.fuse = 0.5;
                }
            } });
        const fx = L.app.fx;
        it.flame = fx ? fx.create({ rate: 140, capacity: 170, life: [0.25, 0.45], size: [10, 26], speed: [480, 620], color: '#ffb23a', color2: '#ff5a1a',
            position: [0, 0, 0], direction: [[-1, -0.12, -0.12], [-1, 0.12, 0.12]], sizeGradient: [[0, 0.4], [0.5, 1.3], [1, 0.5]], gravity: [0, 160, 0] }) : null;
        it.sync = () => {
            if (!it.flame || !it.nozzle) return;
            it.flame.setPosition(new BABYLON.Vector3(it.nozzle.x, it.nozzle.y, it.nozzle.z));
            const d = it.dir, s = it.flame.system;
            s.direction1.set(d.x - 0.12, d.y - 0.12, d.z - 0.12); s.direction2.set(d.x + 0.12, d.y + 0.12, d.z + 0.12);
        };
        it.dispose = () => { if (it.flame) it.flame.dispose(); };
        return it;
    },
});

Props.def('taser', {
    build(L, m) {
        return heldTool(L, m, { name: 'taser', mass: 3, data: { power: 0.5, hazard: { dps: 95, kind: 'shock' }, hazardTag: 'tip' },
            shapes: b => { b.addBox(new V3(10, 0, 0), new V3(34, 12, 12)); b.addBox(new V3(-32, 0, 0), new V3(8, 10, 10), 'tip'); },
            visual: n => {
                Props.box(L, n, 68, 24, 24, 0xf2c230, 10, 0, 0);
                Props.box(L, n, 26, 34, 20, 0x2a2c31, 30, -22, 0, 0, 0, 0.2);
                for (const s of [-1, 1]) Props.box(L, n, 16, 3, 3, 0xc9ced6, -30, s * 6, 0);
                Props.sph(L, n, 10, L.mat(0x8ff4ff, { emissive: 0x2a6f80 }), -24, 12, 0);
            } });
    },
});

Props.def('jackhammer', {
    build(L, m) {
        let bit = null;
        const it = heldTool(L, m, { name: 'jackhammer', mass: 12, data: { power: 0.7, hazard: { dps: 95, kind: 'pierce' }, hazardTag: 'bit', sound: 'metal' },
            shapes: b => { b.addBox(new V3(0, 20, 0), new V3(20, 38, 18)); const s = b.addCapsule(new V3(0, -30, 0), new V3(0, -84, 0), 6, 'bit'); s.soft = 0.00002; },
            visual: n => {
                Props.box(L, n, 40, 76, 36, 0xf2c230, 0, 20, 0);
                Props.box(L, n, 110, 10, 12, 0x2a2c31, 0, 64, 0);
                for (const s of [-1, 1]) Props.box(L, n, 14, 22, 14, 0x2a2c31, s * 52, 64, 0);
                bit = Props.cyl(L, n, 12, 4, 60, 0x8d939c, 0, -56, 0, 0, 0, 0, 8);
            } });
        it.sync = () => { if (bit) bit.position.y = -56 + Math.sin(L.time * 70) * 5; };
        return it;
    },
});

// Воздуходувка: толкает всё впереди себя (без урона) — сдувать манекен в опасность.
Props.def('blower', {
    build(L, m) {
        const it = heldTool(L, m, { name: 'blower', mass: 5, data: { power: 0.5 },
            shapes: b => { b.addBox(new V3(20, 0, 0), new V3(26, 20, 18)); b.addCapsule(new V3(-70, 0, 0), new V3(-6, 0, 0), 10); },
            visual: n => {
                Props.box(L, n, 52, 40, 36, 0x3fbf4f, 20, 0, 0);
                Props.box(L, n, 30, 10, 40, 0x2a2c31, 22, 24, 0);
                Props.cyl(L, n, 22, 26, 70, 0xf2f2f2, -40, 0, 0, 0, 0, Math.PI / 2);
                Props.cyl(L, n, 30, 22, 10, 0x2a2c31, -78, 0, 0, 0, 0, Math.PI / 2);
            },
            update: (dt, self) => {
                const b = self.body;
                const nozzle = b.toWorld(new V3(-84, 0, 0)), dir = b.q.rotate(new V3(-1, 0, 0));
                self.nozzle = nozzle; self.dir = dir;
                for (const o of L.world.bodies) {
                    if (o.type !== 'dynamic' || o === b) continue;
                    const v = V3.sub(o.pos, nozzle), along = v.dot(dir);
                    if (along < 0 || along > 420) continue;
                    const perp = v.clone().addScaled(dir, -along).len();
                    if (perp > 40 + along * 0.35) continue;
                    const dm = o.data && o.data.dummy;
                    if (dm) dm.activate();
                    const k = (1 - along / 420) * (dm ? 950 : 700 / Math.max(1, o.mass / 5));
                    o.vel.addScaled(dir, k * dt);
                }
            } });
        const fx = L.app.fx;
        it.air = fx ? fx.create({ rate: 60, capacity: 80, life: [0.3, 0.6], size: [4, 10], speed: [500, 700], color: '#ffffff', alpha: 0.5, blend: 'standard', position: [0, 0, 0], direction: [[-1, -0.15, -0.15], [-1, 0.15, 0.15]] }) : null;
        it.sync = () => {
            if (!it.air || !it.nozzle) return;
            it.air.setPosition(new BABYLON.Vector3(it.nozzle.x, it.nozzle.y, it.nozzle.z));
            const d = it.dir, s = it.air.system;
            s.direction1.set(d.x - 0.15, d.y - 0.15, d.z - 0.15); s.direction2.set(d.x + 0.15, d.y + 0.15, d.z + 0.15);
        };
        it.dispose = () => { if (it.air) it.air.dispose(); };
        return it;
    },
});

// --- Зоны и опасности ---------------------------------------------------------------------

Props.def('fire', {
    build(L, m) {
        const W = 120 * m.scale[0];
        const barrel = m.has('barrel');
        const base = Props.solid(L, { name: 'fire-base', pos: m.pos.clone(), friction: 0.7,
            shapes: b => b.addBox(new V3(0, barrel ? 40 : 10, 0), new V3(W / 2, barrel ? 40 : 10, 40)),
            visual: n => {
                if (barrel) { Props.cyl(L, n, W, W * 0.92, 80, 0x3b3f47, 0, 40, 0, 0, 0, 0, 18); Props.torus(L, n, W, 5, 0x2a2c31, 0, 60, 0); }
                else for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; Props.sph(L, n, 26, 0x6f757e, Math.cos(a) * W * 0.45, 8, Math.sin(a) * 36, 1, 0.7, 1, 8); }
                Props.box(L, n, W * 0.7, 6, 40, 0x2a1a10, 0, barrel ? 74 : 10, 0);
            } }, 'static');
        const top = barrel ? 80 : 20;
        Props.solid(L, { name: 'fire-zone', pos: m.pos.clone().add(new V3(0, top + 60, 0)), sensor: true, group: PHYS_GROUP.ZONE,
            data: { hazard: { dps: 70, kind: 'burn' } }, shapes: b => b.addBox(new V3(), new V3(W / 2, 60, 45)) }, 'static');
        const fx = L.app.fx;
        const p = m.pos;
        const flames = fx ? [
            fx.create({ rate: 70, capacity: 90, life: [0.4, 0.9], size: [22, 46], speed: [40, 120], color: '#ffb23a', color2: '#ff4a1a',
                position: [p.x, p.y + top, p.z], box: [[-W * 0.35, 0, -20], [W * 0.35, 6, 20]], direction: [[-0.2, 1, -0.2], [0.2, 1, 0.2]], sizeGradient: [[0, 0.5], [0.4, 1], [1, 0.1]], gravity: [0, 90, 0] }),
            fx.create({ rate: 12, capacity: 30, life: [1, 2], size: [20, 40], speed: [30, 70], color: '#4a4a50', blend: 'standard', alpha: 0.5,
                position: [p.x, p.y + top + 90, p.z], box: [[-W * 0.2, 0, -10], [W * 0.2, 10, 10]], direction: [[-0.2, 1, -0.2], [0.2, 1, 0.2]], sizeGradient: [[0, 0.5], [1, 1.8]] }),
        ] : [];
        return { body: base.body, dispose: () => flames.forEach(f => f && f.dispose()) };
    },
});

// Лава/кислота: яма с «жидкостью» — жжёт и выталкивает вверх.
Props.def('lava', {
    hole(m) { const W = 240 * m.scale[0], D = 170 * m.scale[2]; return { x0: m.pos.x - W / 2, x1: m.pos.x + W / 2, z0: m.pos.z - D / 2, z1: m.pos.z + D / 2, depth: 140, wall: 0x3a2622, floor: 0x1a0e0a }; },
    build(L, m) {
        const W = 240 * m.scale[0], D = 170 * m.scale[2];
        const acid = m.has('acid');
        const col = acid ? 0x7dff4a : 0xff6a1a;
        const surf = BABYLON.MeshBuilder.CreateBox('lava', { width: W, height: 4, depth: D }, L.scene);
        surf.position.set(m.pos.x, -34, m.pos.z);
        surf.material = L.mat(col, { unlit: true });
        L.nodes.push(surf);
        const glow = BABYLON.MeshBuilder.CreateBox('lava-glow', { width: W, height: 2, depth: D }, L.scene);
        glow.position.set(m.pos.x, -30, m.pos.z);
        glow.material = L.mat(acid ? 0xd8ff9a : 0xffd24a, { unlit: true, alpha: 0.45 });
        L.nodes.push(glow);
        Props.solid(L, { name: 'lava-zone', pos: new V3(m.pos.x, -70, m.pos.z), sensor: true, group: PHYS_GROUP.ZONE,
            data: { hazard: { dps: acid ? 120 : 105, kind: 'burn' } }, shapes: b => b.addBox(new V3(), new V3(W / 2, 46, D / 2)) }, 'static');
        const fx = L.app.fx;
        const bub = fx ? fx.create({ rate: 18, capacity: 40, life: [0.5, 1.2], size: [8, 20], speed: [20, 60], color: acid ? '#b8ff6a' : '#ffcc4a', color2: col === 0x7dff4a ? '#4aff2a' : '#ff5a1a',
            position: [m.pos.x, -30, m.pos.z], box: [[-W / 2, 0, -D / 2], [W / 2, 2, D / 2]], direction: [[-0.1, 1, -0.1], [0.1, 1, 0.1]] }) : null;
        const it = {
            update: (dt) => {
                glow.material.alpha = 0.35 + Math.sin(L.time * 3) * 0.12;
                for (const b of L.world.bodies) {
                    if (b.type !== 'dynamic') continue;
                    const p = b.pos;
                    if (p.x > m.pos.x - W / 2 && p.x < m.pos.x + W / 2 && p.z > m.pos.z - D / 2 && p.z < m.pos.z + D / 2 && p.y < -20) {
                        b.vel.y += 2600 * dt; b.vel.x *= 1 - 2 * dt; b.vel.z *= 1 - 2 * dt;
                    }
                }
            },
            dispose: () => { if (bub) bub.dispose(); },
        };
        return it;
    },
});

Props.def('electric', {
    build(L, m) {
        const W = 160 * m.scale[0], H = 150 * m.scale[1];
        const wires = [H * 0.35, H * 0.62, H * 0.9];
        const it = Props.solid(L, { name: 'fence', pos: m.pos.clone(), q: m.q, friction: 0.5,
            data: { hazard: { dps: 100, kind: 'shock' }, hazardTag: 'wire', impactFactor: 1 },
            shapes: b => {
                for (const s of [-1, 1]) b.addBox(new V3(s * W / 2, H / 2, 0), new V3(7, H / 2, 7));
                for (const y of wires) b.addBox(new V3(0, y, 0), new V3(W / 2, 4, 4), 'wire');
            },
            visual: n => {
                for (const s of [-1, 1]) { Props.box(L, n, 14, H, 14, 0x6b4a2a, s * W / 2, H / 2, 0); Props.box(L, n, 10, 12, 10, 0xf2c230, s * W / 2, H + 6, 0); }
                for (const y of wires) Props.cyl(L, n, 3, 3, W, L.mat(0x9ad8ff, { emissive: 0x2a5a80 }), 0, y, 0, 0, 0, Math.PI / 2, 6);
                Props.box(L, n, 34, 26, 4, 0xf2c230, 0, H * 0.5, 7);
            } }, 'static');
        it.update = () => {
            if (Math.random() < 0.05 && L.app.fx) {
                const y = wires[Math.floor(Math.random() * 3)];
                Fx.burst(L, new V3(m.pos.x + (Math.random() - 0.5) * W, m.pos.y + y, m.pos.z), { burst: 5, capacity: 8, life: [0.08, 0.2], size: [2, 5], speed: [80, 200], color: '#aef6ff', color2: '#ffffff' });
            }
        };
        return it;
    },
});

Props.def('tesla', {
    build(L, m) {
        const H = 190 * m.scale[1], R = 230 * m.scale[0];
        const base = Props.solid(L, { name: 'tesla', pos: m.pos.clone(), friction: 0.6,
            shapes: b => { b.addBox(new V3(0, 15, 0), new V3(34, 15, 34)); b.addCapsule(new V3(0, 30, 0), new V3(0, H - 20, 0), 14); b.addSphere(new V3(0, H, 0), 30); },
            visual: n => {
                Props.box(L, n, 68, 30, 68, 0x3b3f47, 0, 15, 0);
                Props.cyl(L, n, 26, 34, H - 40, 0xb87333, 0, H / 2, 0, 0, 0, 0, 16);
                for (let i = 0; i < 6; i++) Props.torus(L, n, 40, 4, 0x6f757e, 0, 50 + i * (H - 90) / 6, 0);
                Props.torus(L, n, 70, 14, 0xc9ced6, 0, H, 0);
            } }, 'static');
        const top = m.pos.clone().add(new V3(0, H, 0));
        let t = 0.4;
        const arc = Props.node(L, 'arc');
        const arcMat = L.mat(0xbff8ff, { unlit: true });
        const it = { body: base.body };
        it.update = (dt) => {
            t -= dt;
            if (t > 0.9 - 0.12 && t < 0.9) arc.setEnabled(true); else if (t < 0.78) arc.setEnabled(false);
            if (t > 0) return;
            t = 0.9;
            const d = L.dummy;
            let best = null, bd = R;
            if (d) for (const p of d.parts) { const dd = V3.dist(p.body.pos, top); if (dd < bd) { bd = dd; best = p; } }
            const to = best ? best.body.pos.clone() : top.clone().add(new V3((Math.random() - 0.5) * 160, -H + 5, 0));
            for (const c of arc.getChildMeshes()) c.dispose();
            const pts = [];
            for (let i = 0; i <= 8; i++) { const p = V3.lerp(top, to, i / 8); if (i > 0 && i < 8) { p.x += (Math.random() - 0.5) * 30; p.y += (Math.random() - 0.5) * 30; } pts.push(new BABYLON.Vector3(p.x, p.y, p.z)); }
            const tube = BABYLON.MeshBuilder.CreateTube('arc', { path: pts, radius: 2.5, tessellation: 4 }, L.scene);
            tube.material = arcMat; tube.parent = arc;
            arc.setEnabled(true);
            if (best) { d.activate(); d.damage(best, 60, 'shock'); best.shock = 1.2; best.burn = Math.min(1, best.burn + 0.15); best.body.vel.add(V3.sub(best.body.pos, top).normalize().scale(260)); }
            Sfx.play('zap', { volume: best ? 0.8 : 0.35, gap: 0.1 });
            if (best) Fx.burst(L, to, { burst: 10, capacity: 14, life: [0.1, 0.3], size: [3, 7], speed: [120, 320], color: '#aef6ff', color2: '#ffffff' });
        };
        return it;
    },
});

Props.def('lasergrid', {
    build(L, m) {
        const W = 150 * m.scale[0], H = 190 * m.scale[1];
        const N = Math.max(2, Math.round(m.num('n', 4)));
        const ys = []; for (let i = 0; i < N; i++) ys.push(18 + i * (H - 30) / (N - 1));
        Props.solid(L, { name: 'grid-posts', pos: m.pos.clone(), q: m.q, shapes: b => { for (const s of [-1, 1]) b.addBox(new V3(s * W / 2, H / 2, 0), new V3(9, H / 2, 9)); },
            visual: n => { for (const s of [-1, 1]) { Props.box(L, n, 18, H, 18, 0x2a2c31, s * W / 2, H / 2, 0); for (const y of ys) Props.sph(L, n, 10, L.mat(0xff3b30, { unlit: true }), s * (W / 2 - 9), y, 0); } } }, 'static');
        const zone = Props.solid(L, { name: 'grid-beams', pos: m.pos.clone(), q: m.q, sensor: true, group: PHYS_GROUP.ZONE, data: { hazard: { dps: 120, kind: 'burn' } },
            shapes: b => { for (const y of ys) b.addBox(new V3(0, y, 0), new V3(W / 2 - 9, 3, 6)); },
            visual: n => { for (const y of ys) Props.cyl(L, n, 3, 3, W - 18, L.mat(0xff4a3a, { unlit: true }), 0, y, 0, 0, 0, Math.PI / 2, 6); } }, 'static');
        const blink = m.has('blink');
        return { update: () => { if (blink) { const on = Math.sin(L.time * 2.4) > -0.3; zone.body.enabled = on; zone.root.setEnabled(on); } } };
    },
});

// Поршень с боксёрской перчаткой: бьёт по курсу маркера.
Props.def('piston', {
    build(L, m) {
        const dir = m.q.rotate(new V3(1, 0, 0));
        const reach = 150 * m.scale[0], period = m.num('p', 18) / 10;
        const home = m.pos.clone();
        Props.solid(L, { name: 'piston-base', pos: home.clone(), q: m.q, shapes: b => b.addBox(new V3(-30, 0, 0), new V3(20, 40, 40)),
            visual: n => { Props.box(L, n, 40, 80, 80, 0x3b3f47, -30, 0, 0); Props.box(L, n, 44, 12, 84, 0xf2c230, -30, 0, 0); } }, 'static');
        const glove = Props.solid(L, { name: 'glove', pos: home.clone(), q: m.q, friction: 0.6, data: { impactFactor: 2.6, power: 1.2, sound: 'hit' }, kind: 'actor',
            shapes: b => b.addSphere(new V3(30, 0, 0), 30),
            visual: n => {
                Props.sph(L, n, 62, 0xd8322e, 30, 0, 0, 1.1, 1, 1, 16);
                Props.sph(L, n, 26, 0xd8322e, 26, 20, 16, 1, 1, 1, 10);
                Props.cyl(L, n, 40, 40, 16, 0xf2f2f2, -2, 0, 0, 0, 0, Math.PI / 2, 16);
                Props.cyl(L, n, 10, 10, reach + 20, 0xb9c0c9, -reach / 2 - 10, 0, 0, 0, 0, Math.PI / 2, 10);
            } });
        let t = m.num('o', 0) / 10;
        return { body: glove.body, update: (dt) => {
            t = (t + dt) % period;
            const hit = period * 0.6;
            let k = 0;
            if (t > hit && t < hit + 0.1) k = (t - hit) / 0.1;
            else if (t >= hit + 0.1 && t < hit + 0.3) k = 1;
            else if (t >= hit + 0.3) k = Math.max(0, 1 - (t - hit - 0.3) / (period - hit - 0.3));
            glove.body.kinPos.copy(home.clone().addScaled(dir, k * reach));
        } };
    },
});

Props.def('conveyor', {
    build(L, m) {
        const W = 100 * m.scale[0], H = 30;
        const dir = m.q.rotate(new V3(1, 0, 0)); dir.y = 0; dir.normalize();
        const speed = m.num('s', 170);
        const it = Props.solid(L, { name: 'conveyor', pos: m.pos.clone(), q: m.q, friction: 1.1, data: { conveyor: true },
            shapes: b => b.addBox(new V3(0, H / 2, 0), new V3(W / 2, H / 2, 55)),
            visual: n => {
                Props.box(L, n, W, H - 6, 110, 0x3b3f47, 0, H / 2 - 3, 0);
                for (let x = -W / 2 + 20; x < W / 2; x += 40) Props.cyl(L, n, 22, 22, 112, 0x8d939c, x, H / 2, 0, Math.PI / 2, 0, 0, 10);
                for (const s of [-1, 1]) Props.box(L, n, W, 8, 6, 0xf2c230, 0, H + 1, s * 57);
            } }, 'static');
        it.body.surfaceVel = dir.clone().scale(speed);
        // Лента: полоски, бегущие по курсу.
        const belt = Props.node(L, 'belt');
        const bars = [];
        for (let x = -W / 2; x < W / 2; x += 30) bars.push(Props.box(L, belt, 8, 3, 100, 0x2a2c31, x, 0, 0));
        belt.position.set(m.pos.x, m.pos.y + H + 1, m.pos.z);
        belt.rotationQuaternion = new BABYLON.Quaternion(m.q.x, m.q.y, m.q.z, m.q.w);
        let off = 0;
        it.update = (dt) => { off = (off + speed * dt) % 30; bars.forEach((b, i) => { b.position.x = -W / 2 + ((i * 30 + off) % W); }); };
        return it;
    },
});

// Вентилятор: крутятся лопасти (режут), дует вперёд по курсу.
Props.def('fan', {
    build(L, m) {
        const R = 70 * m.scale[0];
        const dir = m.q.rotate(new V3(1, 0, 0));
        const c = m.pos.clone().add(new V3(0, R + 30, 0));
        Props.solid(L, { name: 'fan-stand', pos: m.pos.clone(), q: m.q,
            shapes: b => { b.addBox(new V3(-12, (R + 30) / 2, 0), new V3(10, (R + 30) / 2, 10)); b.addBox(new V3(-12, 6, 0), new V3(40, 6, 40)); },
            visual: n => { Props.box(L, n, 20, R + 30, 20, 0x3b3f47, -12, (R + 30) / 2, 0); Props.box(L, n, 80, 12, 80, 0x3b3f47, -12, 6, 0);
                Props.torus(L, n, R * 2 + 16, 8, 0x6f757e, 0, R + 30, 0, 0, 0, Math.PI / 2); Props.cyl(L, n, 40, 40, 30, 0x2a2c31, -18, R + 30, 0, 0, 0, Math.PI / 2); } }, 'static');
        const blades = Props.solid(L, { name: 'fan-blades', pos: c.clone(), q: m.q, friction: 0.8, data: { hazard: { dps: 120, kind: 'cut' }, impactFactor: 1.5, sound: 'metal' }, kind: 'actor',
            shapes: b => { for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; b.addCapsule(new V3(6, 0, 0), new V3(6, Math.cos(a) * R * 0.9, Math.sin(a) * R * 0.9), 10); } },
            visual: n => {
                for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; Props.box(L, n, 4, R * 0.9, 34, 0xb9c0c9, 6, Math.cos(a) * R * 0.45, Math.sin(a) * R * 0.45, a, 0, 0); }
                Props.sph(L, n, 26, 0xd8342b, 8, 0, 0);
            } });
        let ang = 0;
        const fx = L.app.fx;
        const air = fx ? fx.create({ rate: 30, capacity: 50, life: [0.5, 0.9], size: [3, 8], speed: [400, 550], color: '#ffffff', alpha: 0.45, blend: 'standard', position: [c.x, c.y, c.z],
            box: [[0, -R * 0.7, -R * 0.4], [0, R * 0.7, R * 0.4]], direction: [[dir.x, -0.08, -0.08], [dir.x, 0.08, 0.08]] }) : null;
        return { body: blades.body, update: (dt) => {
            ang += dt * 16;
            blades.body.kinQ.copy(Quat.mul(m.q, Quat.fromAxisAngle(PHYS_AXES.X, ang)));
            for (const o of L.world.bodies) {
                if (o.type !== 'dynamic') continue;
                const v = V3.sub(o.pos, c), along = v.dot(dir);
                if (along < 0 || along > 520) continue;
                if (v.clone().addScaled(dir, -along).len() > R * 1.2 + along * 0.25) continue;
                const dm = o.data && o.data.dummy;
                o.vel.addScaled(dir, (1 - along / 520) * (dm ? 1500 : 900) * dt);
            }
        }, dispose: () => { if (air) air.dispose(); } };
    },
});

Props.def('windmill', {
    build(L, m) {
        const H = 260 * m.scale[1], R = 200 * m.scale[0];
        const hub = m.pos.clone().add(new V3(0, H, 30));
        Props.solid(L, { name: 'mill-tower', pos: m.pos.clone(), shapes: b => b.addBox(new V3(0, H / 2, -20), new V3(40, H / 2, 40)),
            visual: n => { Props.cyl(L, n, 60, 100, H, 0xf1ece2, 0, H / 2, -20, 0, 0, 0, 12); Props.cyl(L, n, 0, 90, 60, 0xb5533c, 0, H + 20, -20, 0, 0, 0, 12); } }, 'static');
        const rotor = Props.solid(L, { name: 'mill-rotor', pos: hub.clone(), friction: 0.5, data: { impactFactor: 2.6, power: 1.3, sound: 'wood' }, kind: 'actor',
            shapes: b => { for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2; b.addCapsule(new V3(Math.cos(a) * 30, Math.sin(a) * 30, 0), new V3(Math.cos(a) * R, Math.sin(a) * R, 0), 13); } },
            visual: n => {
                for (let i = 0; i < 4; i++) {
                    const a = i / 4 * Math.PI * 2;
                    const bl = Props.box(L, n, R - 20, 36, 6, 0xd8c79a, Math.cos(a) * (R / 2 + 10), Math.sin(a) * (R / 2 + 10), 0, 0, 0, a);
                    bl.receiveShadows = true;
                    Props.box(L, n, R, 6, 8, 0x8a5a33, Math.cos(a) * R / 2, Math.sin(a) * R / 2, 3, 0, 0, a);
                }
                Props.cyl(L, n, 30, 30, 20, 0x8a5a33, 0, 0, 0, Math.PI / 2, 0, 0, 12);
            } });
        let ang = 0;
        const speed = m.num('s', 36) / 10;
        return { body: rotor.body, update: (dt) => { ang -= dt * speed; rotor.body.kinQ.copy(rotZ(ang)); } };
    },
});

// Вертушка: стойка, рука с шипастым шаром крутится в плоскости экрана.
Props.def('spinner', {
    build(L, m) {
        const H = 150 * m.scale[1], R = 150 * m.scale[0];
        const hub = m.pos.clone().add(new V3(0, H, 20));
        Props.solid(L, { name: 'spin-post', pos: m.pos.clone(), shapes: b => b.addBox(new V3(0, H / 2, -10), new V3(14, H / 2, 14)),
            visual: n => { Props.box(L, n, 28, H, 28, 0x3b3f47, 0, H / 2, -10); Props.box(L, n, 90, 12, 90, 0x3b3f47, 0, 6, -10); } }, 'static');
        const arm = Props.solid(L, { name: 'spin-arm', pos: hub.clone(), friction: 0.6, data: { impactFactor: 2.4, power: 1.4, hazard: { dps: 90, kind: 'pierce' }, hazardTag: 'ball', sound: 'metal' }, kind: 'actor',
            shapes: b => { b.addCapsule(new V3(0, 0, 0), new V3(R - 20, 0, 0), 7); b.addSphere(new V3(R, 0, 0), 26, 'ball'); if (m.has('double')) b.addSphere(new V3(-R, 0, 0), 26, 'ball'); if (m.has('double')) b.addCapsule(new V3(0, 0, 0), new V3(-R + 20, 0, 0), 7); },
            visual: n => {
                const ends = m.has('double') ? [1, -1] : [1];
                for (const s of ends) {
                    Props.box(L, n, R, 12, 12, 0x6f757e, s * R / 2, 0, 0);
                    Props.sph(L, n, 46, 0x3b3f47, s * R, 0, 0, 1, 1, 1, 12);
                    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const c = Props.cyl(L, n, 0, 10, 16, 0xc9ced6, s * R + Math.cos(a) * 26, Math.sin(a) * 26, 0, 0, 0, a - Math.PI / 2, 6); c.receiveShadows = false; }
                }
                Props.cyl(L, n, 30, 30, 16, 0xd8342b, 0, 0, 0, Math.PI / 2, 0, 0, 12);
            } });
        let ang = 0;
        const speed = m.num('s', 30) / 10 * (m.has('ccw') ? 1 : -1);
        return { body: arm.body, update: (dt) => { ang += dt * speed; arm.body.kinQ.copy(rotZ(ang)); } };
    },
});

// Маятник-топор: качается на оси над маркером (h — высота оси).
Props.def('pendulum', {
    build(L, m) {
        const len = 200 * m.scale[1], pivot = m.pos.clone();
        const period = m.num('p', 22) / 10, phase = m.num('o', 0) / 10;
        Props.solid(L, { name: 'pend-mount', pos: pivot.clone(), shapes: b => b.addBox(new V3(0, 10, -20), new V3(60, 10, 30)),
            visual: n => { Props.box(L, n, 120, 20, 60, 0x3b3f47, 0, 10, -20); Props.cyl(L, n, 20, 20, 50, 0x8d939c, 0, 0, 0, Math.PI / 2, 0, 0, 12); } }, 'static');
        const arm = Props.solid(L, { name: 'pend-axe', pos: pivot.clone(), friction: 0.6, data: { hazard: { dps: 160, kind: 'cut' }, hazardTag: 'blade', impactFactor: 2, power: 1.2, sound: 'metal' }, kind: 'actor',
            shapes: b => { b.addCapsule(new V3(0, 0, 0), new V3(0, -len + 40, 0), 6); b.addBox(new V3(0, -len, 0), new V3(46, 30, 6), 'blade'); },
            visual: n => {
                Props.box(L, n, 12, len, 12, 0x6b4a2a, 0, -len / 2, 0);
                const blade = BABYLON.MeshBuilder.CreateCylinder('blade', { diameter: 110, height: 8, tessellation: 24, arc: 0.5 }, L.scene);
                blade.material = L.mat(0xc9ced6, { spec: 0.6 }); blade.parent = n; blade.position.set(0, -len - 8, 0); blade.rotation.set(Math.PI / 2, 0, Math.PI / 2 + Math.PI);
                Props.box(L, n, 26, 36, 12, 0x3b3f47, 0, -len + 10, 0);
            } });
        return { body: arm.body, update: () => { arm.body.kinQ.copy(rotZ(swingAngle(L.time, m.num('a', 60) * Math.PI / 180, period, phase))); } };
    },
});

// Молот на механической руке: резкий удар вниз и медленный подъём.
Props.def('hammerarm', {
    build(L, m) {
        const len = 190 * m.scale[0], pivot = m.pos.clone();
        const sgn = m.heading > 90 && m.heading < 270 ? -1 : 1;
        Props.solid(L, { name: 'arm-base', pos: new V3(pivot.x, 0, pivot.z - 40), shapes: b => b.addBox(new V3(0, pivot.y / 2, 0), new V3(26, pivot.y / 2, 26)),
            visual: n => { Props.box(L, n, 52, pivot.y, 52, 0xf08a24, 0, pivot.y / 2, 0); Props.box(L, n, 90, 16, 90, 0x3b3f47, 0, 8, 0); } }, 'static');
        const arm = Props.solid(L, { name: 'arm', pos: pivot.clone(), friction: 0.6, data: { impactFactor: 3, power: 1.4, sound: 'metal' }, kind: 'actor',
            shapes: b => { b.addCapsule(new V3(0, 0, 0), new V3(sgn * (len - 30), 0, 0), 12); b.addBox(new V3(sgn * len, -10, 0), new V3(26, 40, 30)); },
            visual: n => { Props.box(L, n, len, 24, 24, 0xf08a24, sgn * len / 2, 0, 0); Props.box(L, n, 52, 80, 60, 0x3b3f47, sgn * len, -10, 0); Props.cyl(L, n, 36, 36, 60, 0x2a2c31, 0, 0, 0, Math.PI / 2, 0, 0, 14); } });
        const period = m.num('p', 26) / 10;
        let t = m.num('o', 0) / 10;
        return { body: arm.body, update: (dt) => {
            t = (t + dt) % period;
            const up = 1.25, down = -0.42;
            let a;
            if (t < period * 0.55) a = up;
            else if (t < period * 0.55 + 0.14) { const k = (t - period * 0.55) / 0.14; a = up + (down - up) * k * k; }
            else if (t < period * 0.55 + 0.5) a = down;
            else { const k = (t - period * 0.55 - 0.5) / (period * 0.45 - 0.5); a = down + (up - down) * Math.min(1, k); }
            arm.body.kinQ.copy(rotZ(a * sgn));
        } };
    },
});

Props.def('bumper', {
    build(L, m) {
        const R = 34 * m.scale[0];
        const it = Props.solid(L, { name: 'bumper', pos: m.pos.clone(), restitution: 1.2, friction: 0.2, data: { bumper: 900, sound: 'boing' },
            shapes: b => b.addCapsule(new V3(0, 0, -30), new V3(0, 0, 30), R),
            visual: n => {
                Props.cyl(L, n, R * 2, R * 2, 60, 0xf06bc4, 0, 0, 0, Math.PI / 2, 0, 0, 24);
                Props.cyl(L, n, R * 1.3, R * 1.3, 62, L.mat(0xffe28a, { emissive: 0x806020 }), 0, 0, 0, Math.PI / 2, 0, 0, 24);
                Props.torus(L, n, R * 2, 6, 0xffffff, 0, 0, 31, Math.PI / 2, 0, 0);
            } }, 'static');
        if (m.pos.y > 40) { const pole = Props.box(L, null, 14, m.pos.y - R, 14, 0x3b3f47, m.pos.x, (m.pos.y - R) / 2, m.pos.z - 20); L.nodes.push(pole); }
        return it;
    },
});

// Качели-доска на опоре: груз на один конец — манекен с другого улетает.
Props.def('seesaw', {
    build(L, m) {
        const W = 340 * m.scale[0], H = 60;
        const pivot = m.pos.clone().add(new V3(0, H, 0));
        const base = Props.solid(L, { name: 'seesaw-base', pos: m.pos.clone(), shapes: b => b.addBox(new V3(0, H / 2 - 6, 0), new V3(20, H / 2 - 6, 40)),
            visual: n => { const tri = Props.cyl(L, n, 0, 80, H, 0x3b3f47, 0, H / 2, 0, 0, 0, 0, 3); tri.rotation.y = Math.PI / 6; } }, 'static');
        const plank = Props.dyn(L, { name: 'plank', pos: pivot.clone().add(new V3(0, 8, 0)), q: new Quat(), mass: 18, friction: 0.9, draggable: false, angDamp: 0.2, data: { power: 1.2, sound: 'wood' },
            shapes: b => b.addBox(new V3(), new V3(W / 2, 7, 45)),
            visual: n => { Props.box(L, n, W, 14, 90, 0xc98a4b); for (const s of [-1, 1]) Props.box(L, n, 14, 20, 90, 0x8a5a33, s * (W / 2 - 10), 10, 0); } });
        const r = Quat.fromTo(PHYS_AXES.X, PHYS_AXES.Z);
        const j = new PJoint({ b0: plank.body, b1: base.body, type: 'hinge', p0: new V3(0, -8, 0), p1: base.body.toLocal(pivot), r0: r, r1: r, hingeMin: -0.5, hingeMax: 0.5 });
        L.world.addJoint(j);
        plank.body.ignore = new Set([base.body]);
        return plank;
    },
});

// Пушка: стреляет ядрами по курсу маркера (rot z — угол подъёма ствола).
Props.def('cannon', {
    build(L, m) {
        const yawQ = Quat.fromEulerDeg(0, -m.heading, 0);
        const elev = (m.rot[2] || 8) * Math.PI / 180;
        const dir = yawQ.rotate(new V3(Math.cos(elev), Math.sin(elev), 0));
        const muzzleLocal = new V3(Math.cos(elev) * 96, 58 + Math.sin(elev) * 96, 0);
        const muzzle = yawQ.rotate(muzzleLocal).add(m.pos);
        Props.solid(L, { name: 'cannon', pos: m.pos.clone(), q: yawQ, shapes: b => { b.addBox(new V3(0, 30, 0), new V3(50, 30, 40)); },
            visual: n => {
                Props.box(L, n, 100, 30, 70, 0x6b4a2a, 0, 24, 0);
                for (const s of [-1, 1]) for (const x of [-32, 32]) Props.cyl(L, n, 46, 46, 12, 0x3b2616, x, 22, s * 40, Math.PI / 2, 0, 0, 14);
                const barrel = Props.cyl(L, n, 36, 46, 130, 0x2b2d33, Math.cos(elev) * 30, 58 + Math.sin(elev) * 30, 0, 0, 0, elev - Math.PI / 2, 18);
                barrel.receiveShadows = true;
                Props.torus(L, n, 40, 8, 0x3b3f47, Math.cos(elev) * 92, 58 + Math.sin(elev) * 92, 0, 0, 0, elev - Math.PI / 2);
            } }, 'static');
        const period = m.num('p', 18) / 10, speed = m.num('s', 1800);
        let t = period * 0.5 + m.num('o', 0) / 10;
        return { update: (dt) => {
            t -= dt;
            if (t > 0) return;
            t = period;
            const ball = /** @type {any} */ (Props.kinds).cannonball.build(L, propsFake('cannonball', muzzle.clone().add(new V3(0, -14, 0))));
            L.draggable.delete(ball.body);
            ball.body.vel.copy(dir.clone().scale(speed));
            ball.body.data.power = 2.6;
            propsTemp(L, ball, 4);
            Sfx.play('boom', { volume: 0.55, rate: 1.4 });
            Fx.burst(L, muzzle, { burst: 14, capacity: 18, life: [0.4, 0.9], size: [14, 30], speed: [60, 160], direction: [[dir.x - 0.3, dir.y - 0.3, -0.3], [dir.x + 0.3, dir.y + 0.3, 0.3]], color: '#dddddd', blend: 'standard', alpha: 0.8 });
            Fx.burst(L, muzzle, { burst: 1, capacity: 2, life: [0.08, 0.12], size: [70, 90], speed: [0, 1], color: '#ffd35a' });
        } };
    },
});

// Дождь из предметов над полосой шириной scale x × 100: anvil, brick, meteor, hail, safe, rock, bowling.
Props.def('spawner', {
    build(L, m) {
        const kind = ['anvil', 'brick', 'meteor', 'hail', 'safe', 'rock', 'bowling', 'piano', 'tnt'].find(k => m.has(k)) || 'brick';
        const W = 100 * m.scale[0], period = m.num('i', 14) / 10;
        let t = 0.6;
        const top = Math.max(420, m.pos.y);
        return { update: (dt) => {
            t -= dt;
            if (t > 0) return;
            t = period * (0.7 + Math.random() * 0.6);
            let x = m.pos.x + (Math.random() - 0.5) * W;
            // Чаще — над манекеном, если он в полосе.
            if (L.dummy && Math.random() < 0.55) { const dx = L.dummy.center.x; if (Math.abs(dx - m.pos.x) < W / 2 + 40) x = dx + (Math.random() - 0.5) * 60; }
            const p = new V3(x, top, m.pos.z + (Math.random() - 0.5) * 30);
            let it;
            if (kind === 'meteor' || kind === 'rock' || kind === 'hail') {
                const R = kind === 'hail' ? 11 + Math.random() * 8 : (kind === 'meteor' ? 28 : 22 + Math.random() * 14);
                it = Props.dyn(L, { name: kind, pos: p, q: new Quat(), mass: kind === 'hail' ? 4 : 50, draggable: false, restitution: 0.1,
                    data: { power: kind === 'hail' ? 2.5 : 1.4, sound: kind === 'hail' ? 'glass' : 'plate', explosive: kind === 'meteor' ? { r: 190, power: 0.8, threshold: 200 } : null },
                    shapes: b => b.addSphere(new V3(), R * 0.9),
                    visual: n => { if (kind === 'hail') Props.sph(L, n, R * 2, L.mat(0xd8f4ff, { spec: 0.7 }), 0, 0, 0, 1, 0.8, 1, 6); else rockMesh(L, n, R, kind === 'meteor' ? 0x5a3a2a : 0x8b8f96, Math.floor(Math.random() * 99) + 1); } });
                it.body.vel.set((Math.random() - 0.5) * 80, kind === 'meteor' ? -900 : -200, 0);
                if (kind === 'meteor') {
                    const fx = L.app.fx;
                    const trail = fx ? fx.create({ rate: 60, capacity: 60, life: [0.2, 0.5], size: [14, 30], speed: [10, 40], color: '#ffb23a', color2: '#ff4a1a', position: [p.x, p.y, p.z], follow: it.root }) : null;
                    it.dispose = () => { if (trail) trail.dispose(); };
                    const up = it.update;
                    it.update = (d) => { if (up) up(d); if (it.body.data.explosive.done && trail) trail.stop(); };
                }
            } else {
                it = Props.kinds[kind].build(L, propsFake(kind, p, Math.random() * 360));
                L.draggable.delete(it.body);
                it.body.vel.set(0, -150, 0);
                it.body.omega.set((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3);
            }
            propsTemp(L, it, 6);
            const all = L.items.filter(x => x.tmp && !x.gone);
            if (all.length > 9) propsDrop(L, all[0]);
        } };
    },
});

// Стены-давилки: две плиты сходятся к маркеру и расходятся.
Props.def('crusher', {
    build(L, m) {
        const gap = 130 * m.scale[0], H = 180 * m.scale[1], period = m.num('p', 30) / 10;
        const walls = [-1, 1].map(s => Props.solid(L, { name: 'crusher', pos: m.pos.clone().add(new V3(s * gap, 0, 0)), friction: 0.7, data: { crush: 900, impactFactor: 2.2, sound: 'metal' }, kind: 'actor',
            shapes: b => b.addBox(new V3(s * 30, H / 2, 0), new V3(30, H / 2, 70)),
            visual: n => { Props.box(L, n, 60, H, 140, 0x3b3f47, s * 30, H / 2, 0); for (let i = 0; i < 4; i++) Props.box(L, n, 62, 16, 142, 0xf2c230, s * 30, 20 + i * (H - 30) / 3, 0); } }));
        let t = 0;
        return { update: (dt) => {
            t = (t + dt) % period;
            const k = t < period * 0.45 ? 0 : (t < period * 0.45 + 0.35 ? (t - period * 0.45) / 0.35 : Math.max(0, 1 - (t - period * 0.45 - 0.35 - 0.4) / (period * 0.55 - 0.75)));
            const e = Math.min(1, Math.max(0, k));
            walls.forEach((w, i) => { const s = i ? 1 : -1; w.body.kinPos.set(m.pos.x + s * (gap - e * (gap - 22)), m.pos.y, m.pos.z); });
        } };
    },
});

// Блендер: стеклянная банка, внизу вращается нож.
Props.def('blender', {
    build(L, m) {
        const R = 110 * m.scale[0], H = 230 * m.scale[1];
        const base = 60;
        const glass = L.mat(0xcff3ff, { alpha: 0.22, spec: 0.8 });
        Props.solid(L, { name: 'blender-base', pos: m.pos.clone(), shapes: b => b.addBox(new V3(0, base / 2, 0), new V3(R + 20, base / 2, R * 0.6 + 20)),
            visual: n => { Props.box(L, n, 2 * R + 40, base, 1.2 * R + 40, 0x2a2c31, 0, base / 2, 0); Props.cyl(L, n, 24, 24, 6, 0xd8342b, R * 0.6, base / 2, R * 0.6 + 21, Math.PI / 2, 0, 0, 12); } }, 'static');
        const walls = Props.solid(L, { name: 'blender-jar', pos: m.pos.clone().add(new V3(0, base, 0)), friction: 0.3,
            shapes: b => {
                b.addBox(new V3(-R - 6, H / 2, 0), new V3(6, H / 2, R * 0.6)); b.addBox(new V3(R + 6, H / 2, 0), new V3(6, H / 2, R * 0.6));
                b.addBox(new V3(0, H / 2, -R * 0.6 - 6), new V3(R, H / 2, 6)); b.addBox(new V3(0, H / 2, R * 0.6 + 6), new V3(R, H / 2, 6));
                b.addBox(new V3(0, -3, 0), new V3(R, 6, R * 0.6));
            },
            visual: n => {
                for (const [x, z, w, d] of [[-R - 6, 0, 12, 1.2 * R], [R + 6, 0, 12, 1.2 * R], [0, -R * 0.6 - 6, 2 * R + 24, 12], [0, R * 0.6 + 6, 2 * R + 24, 12]]) {
                    const g = Props.box(L, n, w, H, d, glass, x, H / 2, z); g.receiveShadows = false;
                }
                Props.box(L, n, 2 * R + 24, 10, 1.2 * R + 24, 0xb9c0c9, 0, H, 0);
            }, addOpts: { castShadow: false } }, 'static');
        void walls;
        const blade = Props.solid(L, { name: 'blender-blade', pos: m.pos.clone().add(new V3(0, base + 22, 0)), friction: 1, data: { hazard: { dps: 220, kind: 'cut' }, impactFactor: 1.2, sound: 'metal' }, kind: 'actor',
            shapes: b => { b.addCapsule(new V3(-R * 0.85, 0, 0), new V3(R * 0.85, 0, 0), 12); b.addCapsule(new V3(0, 0, -R * 0.5), new V3(0, 0, R * 0.5), 12); },
            visual: n => { Props.box(L, n, R * 1.8, 5, 22, 0xc9ced6, 0, 0, 0, 0, 0, 0.2); Props.box(L, n, 22, 5, R * 1.1, 0xc9ced6, 0, 0, 0, 0.2, 0, 0); Props.cyl(L, n, 22, 22, 16, 0x2a2c31, 0, -6, 0, 0, 0, 0, 12); } });
        let ang = 0;
        return { body: blade.body, update: (dt) => {
            ang += dt * 24;
            blade.body.kinQ.copy(Quat.fromAxisAngle(PHYS_AXES.Y, ang));
            // Внутри банки всё крутит и подбрасывает.
            for (const b of L.world.bodies) {
                if (b.type !== 'dynamic') continue;
                const p = b.pos;
                if (Math.abs(p.x - m.pos.x) < R && Math.abs(p.z - m.pos.z) < R * 0.6 && p.y > base && p.y < base + H * 0.7) {
                    b.vel.x += (Math.random() - 0.5) * 1800 * dt; b.vel.y += (Math.random() * 1200 - 300) * dt;
                    if (b.data && b.data.part && L.hooks.onHazard && Math.random() < 0.1) L.hooks.onHazard(b.data.part, 'cut', p, null);
                }
            }
        } };
    },
});

// Торнадо: поднимает и крутит всё, что попало внутрь.
Props.def('tornado', {
    build(L, m) {
        const R = 120 * m.scale[0], H = 520 * m.scale[1];
        const root = Props.node(L, 'tornado');
        const mat = L.mat(0xd9dde2, { alpha: 0.28 });
        const rings = [];
        for (let i = 0; i < 8; i++) {
            const k = i / 7;
            const t = Props.torus(L, root, R * (0.35 + k * 1.3) * 2, 10 + k * 14, mat, 0, 20 + k * H * 0.9, 0);
            t.receiveShadows = false;
            rings.push(t);
        }
        root.position.set(m.pos.x, 0, m.pos.z);
        const fx = L.app.fx;
        const dust = fx ? fx.create({ rate: 40, capacity: 90, life: [0.8, 1.6], size: [16, 40], speed: [60, 160], color: '#bfc4ca', blend: 'standard', alpha: 0.5,
            position: [m.pos.x, 10, m.pos.z], box: [[-R, 0, -R * 0.5], [R, 20, R * 0.5]], direction: [[-0.4, 1, -0.4], [0.4, 1, 0.4]], gravity: [0, 40, 0] }) : null;
        let move = 0;
        const range = 100 * m.scale[2] * (m.has('move') ? 1.5 : 0);
        return { update: (dt) => {
            move += dt;
            const cx = m.pos.x + Math.sin(move * 0.7) * range;
            root.position.x = cx;
            rings.forEach((r, i) => { r.rotation.y += dt * (3 + i * 0.4); r.position.x = Math.sin(L.time * 2 + i * 0.6) * (8 + i * 3); });
            for (const b of L.world.bodies) {
                if (b.type !== 'dynamic') continue;
                const dx = b.pos.x - cx, dz = b.pos.z - m.pos.z;
                const r = Math.sqrt(dx * dx + dz * dz);
                if (r > R * 1.2 || b.pos.y > H) continue;
                const dm = b.data && b.data.dummy;
                if (dm) { dm.activate(); const pt = b.data.part; if (pt.hazard < 40) { pt.hazard = 40; pt.hazardKind = 'crush'; pt.hazardPoint = b.pos.clone(); } }
                const k = dm ? 1 : Math.min(1, 20 / Math.max(1, b.mass));
                b.vel.y += (b.pos.y < H * 0.8 ? 3000 : -400) * k * dt;
                // вращение в плоскости XZ (на экране — мотает влево-вправо)
                b.vel.x += (-dz / Math.max(20, r) * 900 - dx * 3) * k * dt;
                b.vel.z += (dx / Math.max(20, r) * 900 - dz * 3) * k * dt;
                if (b.pos.y > H * 0.75) b.vel.x += Math.sign(dx || 1) * 2600 * k * dt;
            }
        }, dispose: () => { if (dust) dust.dispose(); } };
    },
});

Props.def('mine', {
    build(L, m) {
        const it = Props.solid(L, { name: 'mine', pos: m.pos.clone(), listen: true, data: { explosive: { r: 260, power: 1.1, threshold: 0, touch: true } },
            shapes: b => b.addBox(new V3(0, 6, 0), new V3(22, 6, 22)),
            visual: n => {
                Props.cyl(L, n, 46, 50, 12, 0x3f4a33, 0, 6, 0, 0, 0, 0, 18);
                Props.cyl(L, n, 12, 12, 6, L.mat(0xff3b30, { emissive: 0x802010 }), 0, 14, 0, 0, 0, 0, 10);
            } }, 'static');
        const lamp = it.root.getChildMeshes()[1];
        it.update = () => { if (lamp && lamp.material) lamp.material.emissiveColor.set(Math.sin(L.time * 8) > 0 ? 1 : 0.3, 0.1, 0.05); };
        return it;
    },
});

// Лифт: платформа ездит вверх-вниз (scale y — ход ×100 px).
Props.def('lift', {
    build(L, m) {
        const W = 120 * m.scale[0], range = 100 * m.scale[1] * 3, period = m.num('p', 60) / 10;
        const y0 = m.pos.y;
        const it = Props.solid(L, { name: 'lift', pos: m.pos.clone(), friction: 0.9, data: {},
            shapes: b => b.addBox(new V3(0, -10, 0), new V3(W / 2, 10, 60)),
            visual: n => { Props.box(L, n, W, 20, 120, 0xf2c230, 0, -10, 0); for (const s of [-1, 1]) Props.box(L, n, W, 6, 6, 0x2a2c31, 0, 0, s * 57); } });
        const rail = Props.box(L, null, 16, y0 + range + 40, 16, 0x3b3f47, m.pos.x - W / 2 - 12, (y0 + range + 40) / 2, m.pos.z - 40);
        L.nodes.push(rail);
        let t = 0;
        it.update = (dt) => {
            t = (t + dt) % period;
            const k = t < period * 0.25 ? 0 : (t < period * 0.5 ? (t - period * 0.25) / (period * 0.25) : (t < period * 0.75 ? 1 : 1 - (t - period * 0.75) / (period * 0.25)));
            it.body.kinPos.set(m.pos.x, y0 + range * (k * k * (3 - 2 * k)), m.pos.z);
        };
        return it;
    },
});

Props.def('cactus', {
    build(L, m) {
        const H = 150 * m.scale[1];
        return Props.solid(L, { name: 'cactus', pos: m.pos.clone(), q: m.q, friction: 0.9, data: { hazard: { dps: 75, kind: 'pierce' }, impactFactor: 1.3 },
            shapes: b => { b.addCapsule(new V3(0, 20, 0), new V3(0, H - 22, 0), 22); b.addCapsule(new V3(20, H * 0.5, 0), new V3(44, H * 0.7, 0), 11); b.addCapsule(new V3(-20, H * 0.42, 0), new V3(-42, H * 0.6, 0), 11); },
            visual: n => {
                const g = 0x4f9e44;
                Props.cap(L, n, H, 24, g, 0, H / 2, 0);
                Props.cap(L, n, 44, 12, g, 46, H * 0.62, 0); Props.cap(L, n, 30, 11, g, 32, H * 0.5, 0, 0, 0, Math.PI / 2);
                Props.cap(L, n, 40, 12, g, -44, H * 0.54, 0); Props.cap(L, n, 28, 11, g, -30, H * 0.42, 0, 0, 0, Math.PI / 2);
                for (let i = 0; i < 14; i++) Props.box(L, n, 1.5, 7, 1.5, 0xf5f0d8, Math.sin(i * 2.4) * 22, 16 + (i * 37) % (H - 30), Math.cos(i * 2.4) * 22);
                Props.sph(L, n, 14, 0xf06bc4, 0, H + 2, 0, 1, 0.6, 1, 8);
            } }, 'static');
    },
});
