// Props.js — предметы уровней: что ставит маркер карты (гиря, дрель, пила, шредер,
// молния, каток…). Каждый вид — Props.def(имя, { build(level, m), hole?(m) }):
// build создаёт тела (Phys.js) и меши (Babylon, процедурно) и возвращает предмет
// { body?, home?, update(dt)?, post(dt)?, sync(dt)?, dispose()?, onGrab?, onRelease? }.
// m — разобранный маркер (Level.parse): pos (мир), q, heading, scale, flags.
//
// Свойства тел для урона (body.data): power — множитель урона удара; hazard —
// { dps, kind: 'cut'|'pierce'|'burn'|'shock'|'crush' } урон в секунду при касании
// (hazardTag — только формы с этой меткой); crush — урон в секунду, если часть
// зажата между этим телом и опорой; explosive — { r, power, threshold } взрыв при
// сильном ударе; impactFactor — «масса» неподвижного тела для удара.

/** @satisfies {Record<string, any>} */
const Props = {
    kinds: {},

    def(name, spec) { this.kinds[name] = spec; },

    // --- Меши -------------------------------------------------------------------------

    node(level, name) {
        const n = new BABYLON.Mesh(name, level.scene);
        n.rotationQuaternion = new BABYLON.Quaternion();
        level.nodes.push(n);
        return n;
    },

    _place(m, parent, x, y, z, rx, ry, rz) {
        m.parent = parent;
        m.position.set(x || 0, y || 0, z || 0);
        m.rotation.set(rx || 0, ry || 0, rz || 0);
        return m;
    },
    box(L, parent, w, h, d, hex, x, y, z, rx, ry, rz) {
        const m = BABYLON.MeshBuilder.CreateBox('b', { width: w, height: h, depth: d }, L.scene);
        m.material = typeof hex === 'number' ? L.mat(hex) : hex;
        return this._place(m, parent, x, y, z, rx, ry, rz);
    },
    cyl(L, parent, dTop, dBot, h, hex, x, y, z, rx, ry, rz, tess) {
        const m = BABYLON.MeshBuilder.CreateCylinder('c', { diameterTop: dTop, diameterBottom: dBot, height: h, tessellation: tess || 20 }, L.scene);
        m.material = typeof hex === 'number' ? L.mat(hex) : hex;
        return this._place(m, parent, x, y, z, rx, ry, rz);
    },
    sph(L, parent, d, hex, x, y, z, sx, sy, sz, seg) {
        const m = BABYLON.MeshBuilder.CreateSphere('s', { diameter: d, segments: seg || 14 }, L.scene);
        m.material = typeof hex === 'number' ? L.mat(hex) : hex;
        this._place(m, parent, x, y, z);
        m.scaling.set(sx || 1, sy || sx || 1, sz || sx || 1);
        return m;
    },
    cap(L, parent, h, r, hex, x, y, z, rx, ry, rz) {
        const m = BABYLON.MeshBuilder.CreateCapsule('k', { height: h, radius: r, tessellation: 14, subdivisions: 2 }, L.scene);
        m.material = typeof hex === 'number' ? L.mat(hex) : hex;
        return this._place(m, parent, x, y, z, rx, ry, rz);
    },
    torus(L, parent, d, t, hex, x, y, z, rx, ry, rz) {
        const m = BABYLON.MeshBuilder.CreateTorus('t', { diameter: d, thickness: t, tessellation: 22 }, L.scene);
        m.material = typeof hex === 'number' ? L.mat(hex) : hex;
        return this._place(m, parent, x, y, z, rx, ry, rz);
    },
    // Надпись на плоскости (лицом в +Z).
    label(L, parent, text, w, h, fg, bg, x, y, z, font) {
        const tex = new BABYLON.DynamicTexture('lbl', { width: 256, height: Math.round(256 * h / w) }, L.scene, true);
        const ctx = /** @type {CanvasRenderingContext2D} */ (/** @type {any} */ (tex.getContext()));
        const H = Math.round(256 * h / w);
        if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, 256, H); } else ctx.clearRect(0, 0, 256, H);
        ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = font || ('900 ' + Math.round(H * 0.62) + 'px Arial, sans-serif');
        // Плоскость развёрнута к камере — текст рисуем зеркально, чтобы читался.
        ctx.save(); ctx.translate(256, 0); ctx.scale(-1, 1);
        ctx.fillText(text, 128, H / 2 + 2);
        ctx.restore();
        tex.update(); tex.hasAlpha = !bg;
        const mat = new BABYLON.StandardMaterial('lbl-mat', L.scene);
        mat.diffuseTexture = tex; mat.useAlphaFromDiffuseTexture = !bg;
        mat.emissiveColor = new BABYLON.Color3(0.35, 0.35, 0.35); mat.specularColor = new BABYLON.Color3(0, 0, 0);
        mat.backFaceCulling = true;
        L.nodes.push(/** @type {any} */ ({ dispose: () => { mat.dispose(); tex.dispose(); } }));
        const plane = BABYLON.MeshBuilder.CreatePlane('lbl', { width: w, height: h }, L.scene);
        plane.material = mat;
        plane.rotation.y = Math.PI;   // лицо плоскости Babylon смотрит в −Z; нам нужно к камере (+Z)
        return this._place(plane, parent, x, y, z, 0, Math.PI, 0);
    },

    // --- Тела ---------------------------------------------------------------------------

    // Динамическое тело с визуалом. o: { name, pos, q, mass, shapes(b), visual(inner),
    // friction, restitution, draggable, data, kind, linDamp, angDamp, group, gravityScale }
    dyn(L, o) {
        const b = new PBody({ type: 'dynamic', pos: o.pos, q: o.q, friction: o.friction != null ? o.friction : 0.55,
            restitution: o.restitution != null ? o.restitution : 0.12, group: o.group || PHYS_GROUP.PROP, listen: true,
            linDamp: o.linDamp, angDamp: o.angDamp, gravityScale: o.gravityScale });
        o.shapes(b);
        b.finalize(o.mass);
        b.data = Object.assign({ power: 1 }, o.data || {});
        L.world.add(b);
        const root = this.node(L, o.name || 'prop');
        const inner = new BABYLON.Mesh((o.name || 'prop') + '-in', L.scene);
        inner.parent = root;
        inner.position.set(-b.com.x, -b.com.y, -b.com.z);
        if (o.visual) o.visual(inner);
        World3D.addObject(L.view, root, o.kind || 'actor');
        L.syncs.push({ body: b, node: root });
        if (o.draggable !== false) L.draggable.add(b);
        return { body: b, root, inner, home: { pos: b.pos.clone(), q: b.q.clone() } };
    },

    // Кинематическое (двигает скрипт) или статическое тело с визуалом.
    solid(L, o, type) {
        const b = new PBody({ type: type || 'kinematic', pos: o.pos, q: o.q, friction: o.friction != null ? o.friction : 0.6,
            restitution: o.restitution != null ? o.restitution : 0.1, group: o.group || PHYS_GROUP.WORLD, sensor: !!o.sensor, listen: !!o.listen });
        o.shapes(b);
        b.data = Object.assign({}, o.data || {});
        L.world.add(b);
        let root = null;
        if (o.visual) {
            root = this.node(L, o.name || 'solid');
            o.visual(root);
            World3D.addObject(L.view, root, o.kind || 'prop', o.addOpts);
            L.syncs.push({ body: b, node: root });
        }
        return { body: b, root };
    },

    // Удержание ориентации «парящего» инструмента (дрель, лазер): гравитации нет,
    // поворот тянется к заданному.
    hover(body, q, dt, k) {
        body.gravityScale = 0;
        const dq = Quat.mul(q, body.q.clone().conjugate());
        if (dq.w < 0) { dq.x = -dq.x; dq.y = -dq.y; dq.z = -dq.z; dq.w = -dq.w; }
        const K = k || 10, a = Math.min(1, 14 * dt);
        body.omega.x += (dq.x * 2 * K - body.omega.x) * a;
        body.omega.y += (dq.y * 2 * K - body.omega.y) * a;
        body.omega.z += (dq.z * 2 * K - body.omega.z) * a;
    },

    // Яма по маркеру hole: scale x/z — размер ×100 px, y — глубина ×100.
    holeOf(m, w, d, depth) {
        const W = (w || 100) * m.scale[0], D = (d || 100) * m.scale[2];
        return { x0: m.pos.x - W / 2, x1: m.pos.x + W / 2, z0: m.pos.z - D / 2, z1: m.pos.z + D / 2, depth: (depth || 100) * m.scale[1] * (depth ? 1 : 2.6) };
    },

    // Взрыв: толчок и урон в радиусе, цепная реакция.
    detonate(L, body) {
        const ex = body.data && body.data.explosive;
        if (!ex || ex.done) return;
        ex.done = true;
        const p = body.pos.clone(), R = ex.r || 260, P = ex.power || 1;
        const wasDrag = L.draggable.has(body);
        // Заряд уровня через 3 с появляется снова на своём месте (взорвал мимо — не тупик);
        // падающие метеоры и прочие временные — нет.
        const item = L.items.find(i => i.body === body);
        if (item && !item.tmp) L.respawnLater(item, body, wasDrag, item.home || { pos: body.pos.clone(), q: body.q.clone() }, 3);
        L.world.remove(body);
        L.draggable.delete(body);
        if (L.grab && L.grab.body === body) L.releaseGrab();
        const s = L.syncs.find(x => x.body === body);
        if (s) { s.node.setEnabled(false); }
        for (const b of L.world.bodies.slice()) {
            const part = b.data && b.data.part;
            if (b === body || (b.type !== 'dynamic' && !part)) continue;   // манекен в позе тоже задевает
            const d = V3.sub(b.pos, p);
            const dist = d.len();
            if (dist > R) continue;
            const k = 1 - dist / R;
            if (part) b.data.dummy.activate();
            d.normalize(); d.y += 0.6; d.normalize();
            b.vel.addScaled(d, 1900 * k * P * Math.min(1, 12 / Math.max(1, b.mass) + 0.35));
            if (part) { b.data.dummy.damage(part, 55 * k * P, 'blast'); part.burn = Math.min(1, part.burn + 0.5 * k); }
            const e2 = b.data && b.data.explosive;
            if (e2 && !e2.done && !e2.fuse && !e2.touch) e2.fuse = 0.12 + Math.random() * 0.1;
        }
        if (L.hooks.onExplode) L.hooks.onExplode(p, R);
    },
};

// Цвета по флагу маркера.
const PROP_COLORS = { red: 0xe0412f, green: 0x3fbf4f, blue: 0x3a7be0, purple: 0xa33fd6, yellow: 0xf2c230, black: 0x2a2c33, orange: 0xf08a24, pink: 0xf06bc4, white: 0xf2f2f2 };
function propColor(m, dflt) { for (const f of m.flags) if (PROP_COLORS[f] != null) return PROP_COLORS[f]; return dflt; }

// Висит на верёвке (флаг rope[длина]; cut — верёвку можно перерезать взмахом).
function hangOnRope(L, item, m, topLocal) {
    const len = m.num('rope', 0) || 220;
    const b = item.body;
    const attach = b.toWorld(topLocal);
    const anchor = new V3(attach.x, attach.y + len, attach.z);
    const rope = new PRope({ b0: b, p0: topLocal, p1: anchor, len, rope: true });
    L.world.addJoint(rope);
    const line = Props.cyl(L, null, 3, 3, 1, 0x5b4630);
    L.nodes.push(line);
    const plate = Props.box(L, null, 30, 8, 30, 0x555a63, anchor.x, anchor.y + 4, anchor.z);
    L.nodes.push(plate);
    item.rope = { joint: rope, anchor, line, cut: m.has('cut') };
    const prevSync = item.sync;
    item.sync = (dt) => {
        if (prevSync) prevSync(dt);
        if (!item.rope || !item.rope.joint.enabled) { line.setEnabled(false); return; }
        const a = b.toWorld(topLocal), z = item.rope.anchor;
        const dx = z.x - a.x, dy = z.y - a.y, dz = z.z - a.z, l = Math.sqrt(dx * dx + dy * dy + dz * dz);
        line.position.set((a.x + z.x) / 2, (a.y + z.y) / 2, (a.z + z.z) / 2);
        line.scaling.set(1, l, 1);
        const dir = new BABYLON.Vector3(dx / l, dy / l, dz / l);
        const axis = BABYLON.Vector3.Cross(BABYLON.Axis.Y, dir);
        const ang = Math.acos(Math.max(-1, Math.min(1, dir.y)));
        line.rotationQuaternion = axis.lengthSquared() > 1e-8 ? BABYLON.Quaternion.RotationAxis(axis.normalize(), ang) : new BABYLON.Quaternion();
    };
    if (item.rope.cut) L.cuttable.push(item);
}

// --- Бросаемые ---------------------------------------------------------------------------

Props.def('kettlebell', {
    build(L, m) {
        const col = propColor(m, PROP_COLORS.purple);
        const mass = m.num('kg', 100);
        const it = Props.dyn(L, { name: 'kettlebell', pos: m.pos.clone().add(new V3(0, 24, 0)), q: m.q, mass,
            restitution: 0.08, friction: 0.6, data: { power: 1.2, crush: 80, sound: 'metal' },
            shapes: b => { b.addSphere(new V3(0, 0, 0), 24); b.addCapsule(new V3(-13, 38, 0), new V3(13, 38, 0), 5.5); },
            visual: n => {
                Props.sph(L, n, 48, col, 0, 0, 0, 1, 0.96, 1, 18);
                Props.torus(L, n, 30, 8, col, 0, 30, 0, Math.PI / 2, 0, 0);
                Props.cyl(L, n, 34, 30, 4, 0x2a2c33, 0, -22, 0);
                Props.label(L, n, mass + ' kg', 30, 12, '#ffffff', null, 0, 4, 24.6);
            } });
        return it;
    },
});

Props.def('dumbbell', {
    build(L, m) {
        const col = propColor(m, 0x2f3238);
        return Props.dyn(L, { name: 'dumbbell', pos: m.pos.clone().add(new V3(0, 16, 0)), q: m.q, mass: m.num('kg', 30), data: { power: 1.1, sound: 'metal' },
            shapes: b => { b.addCapsule(new V3(-28, 0, 0), new V3(28, 0, 0), 4); b.addCapsule(new V3(-33, 0, 0), new V3(-22, 0, 0), 15); b.addCapsule(new V3(22, 0, 0), new V3(33, 0, 0), 15); },
            visual: n => {
                Props.cyl(L, n, 8, 8, 70, 0xc9ced6, 0, 0, 0, 0, 0, Math.PI / 2);
                for (const s of [-1, 1]) { Props.cyl(L, n, 32, 32, 12, col, 27 * s, 0, 0, 0, 0, Math.PI / 2, 8); Props.cyl(L, n, 22, 22, 4, 0xc9ced6, 34.5 * s, 0, 0, 0, 0, Math.PI / 2, 8); }
            } });
    },
});

Props.def('bowling', {
    build(L, m) {
        const col = propColor(m, PROP_COLORS.blue);
        return Props.dyn(L, { name: 'bowling', pos: m.pos.clone().add(new V3(0, 19, 0)), q: m.q, mass: 7, restitution: 0.25, friction: 0.35, data: { power: 1.8, sound: 'thud' },
            shapes: b => b.addSphere(new V3(), 19),
            visual: n => {
                Props.sph(L, n, 38, col, 0, 0, 0, 1, 1, 1, 18);
                for (const [x, y] of [[-5, 7], [5, 7], [0, -1]]) Props.cyl(L, n, 5, 5, 2, 0x111111, x, y, 18.3, Math.PI / 2, 0, 0, 10);
            } });
    },
});

Props.def('anvil', {
    build(L, m) {
        const it = Props.dyn(L, { name: 'anvil', pos: m.pos.clone(), q: m.q, mass: m.num('kg', 120), restitution: 0.05, data: { power: 2, crush: 120, sound: 'metal' },
            shapes: b => {
                b.addBox(new V3(0, 8, 0), new V3(24, 8, 16)); b.addBox(new V3(0, 22, 0), new V3(12, 7, 10));
                b.addBox(new V3(-4, 36, 0), new V3(30, 8, 14)); b.addCapsule(new V3(28, 38, 0), new V3(50, 40, 0), 6);
            },
            visual: n => {
                const c = 0x3b3f47, t = 0x5a606b;
                Props.box(L, n, 48, 16, 32, c, 0, 8, 0); Props.box(L, n, 24, 14, 20, c, 0, 22, 0);
                Props.box(L, n, 60, 16, 28, t, -4, 36, 0);
                Props.cyl(L, n, 2, 15, 30, t, 40, 39, 0, 0, 0, Math.PI / 2 + 0.06, 12);
            } });
        if (m.has('rope') || m.flags.some(f => f.startsWith('rope'))) hangOnRope(L, it, m, new V3(-4, 44, 0));
        return it;
    },
});

Props.def('brick', {
    build(L, m) {
        const col = propColor(m, 0xb5533c);
        return Props.dyn(L, { name: 'brick', pos: m.pos.clone().add(new V3(0, 10, 0)), q: m.q, mass: 3, data: { power: 2.6, sound: 'thud' },
            shapes: b => b.addBox(new V3(), new V3(22, 10, 11)),
            visual: n => Props.box(L, n, 44, 20, 22, col) });
    },
});

Props.def('sledgehammer', {
    build(L, m) {
        return Props.dyn(L, { name: 'sledgehammer', pos: m.pos.clone(), q: m.q, mass: 11, angDamp: 0.6, data: { power: 1.6, sound: 'metal' },
            shapes: b => { b.addCapsule(new V3(0, -58, 0), new V3(0, 42, 0), 4); b.addBox(new V3(0, 56, 0), new V3(22, 11, 11)); },
            visual: n => {
                Props.cyl(L, n, 8, 9, 108, 0xa8743f, 0, -8, 0);
                Props.box(L, n, 46, 24, 24, 0x4a4f58, 0, 56, 0);
                Props.cyl(L, n, 11, 11, 16, 0x222222, 0, -58, 0);
            } });
    },
});

Props.def('tnt', {
    build(L, m) {
        const big = m.has('big');
        const s = big ? 1.5 : 1;
        const it = Props.dyn(L, { name: 'tnt', pos: m.pos.clone().add(new V3(0, 20 * s, 0)), q: m.q, mass: 8 * s,
            data: { power: 1, explosive: { r: 280 * s, power: 1.1 * s, threshold: 460 }, sound: 'wood' }, draggable: !m.has('fixed'),
            shapes: b => b.addBox(new V3(), new V3(18 * s, 20 * s, 18 * s)),
            visual: n => {
                Props.box(L, n, 36 * s, 40 * s, 36 * s, 0xd8342b);
                Props.box(L, n, 37 * s, 5 * s, 37 * s, 0x6b3b1f, 0, 13 * s, 0); Props.box(L, n, 37 * s, 5 * s, 37 * s, 0x6b3b1f, 0, -13 * s, 0);
                Props.label(L, n, 'TNT', 30 * s, 14 * s, '#ffffff', null, 0, 0, 18.3 * s);
            } });
        it.update = (dt) => {
            const ex = it.body.data.explosive;
            if (ex && ex.fuse > 0 && !ex.done) { ex.fuse -= dt; if (ex.fuse <= 0) Props.detonate(L, it.body); }
        };
        return it;
    },
});

Props.def('bomb', {
    build(L, m) {
        const it = Props.dyn(L, { name: 'bomb', pos: m.pos.clone().add(new V3(0, 20, 0)), q: m.q, mass: 6,
            data: { power: 1, explosive: { r: 300, power: 1.2, threshold: 99999 }, sound: 'metal' },
            shapes: b => b.addSphere(new V3(), 20),
            visual: n => {
                Props.sph(L, n, 40, 0x24262c, 0, 0, 0, 1, 1, 1, 16);
                Props.cyl(L, n, 12, 12, 8, 0x55585f, 0, 21, 0);
                Props.cyl(L, n, 2.5, 2.5, 14, 0xd8c79a, 3, 30, 0, 0, 0, -0.35);
            } });
        let lit = false;
        it.onGrab = () => { if (!lit) { lit = true; it.body.data.explosive.fuse = 3; } };
        it.onRespawn = () => { lit = false; };
        it.update = (dt) => {
            const ex = it.body.data.explosive;
            if (ex.fuse > 0 && !ex.done) {
                ex.fuse -= dt;
                if (L.hooks.onFuse) L.hooks.onFuse(it.body.toWorld(new V3(5, 38, 0)));
                if (ex.fuse <= 0) Props.detonate(L, it.body);
            }
        };
        return it;
    },
});

// --- Инструменты в руке (парят, держат ориентацию) -----------------------------------------

Props.def('drill', {
    build(L, m) {
        const q = m.q.clone();
        let spinMesh = null;
        const it = Props.dyn(L, { name: 'drill', pos: m.pos.clone(), q, mass: 6, linDamp: 3, angDamp: 4, gravityScale: 0,
            data: { power: 0.6, hazard: { dps: 95, kind: 'pierce' }, hazardTag: 'bit', sound: 'metal' },
            shapes: b => {
                b.addBox(new V3(0, 0, 0), new V3(26, 36, 21));
                b.addBox(new V3(-60, 8, 0), new V3(34, 16, 15));
                b.addCapsule(new V3(0, -42, 0), new V3(0, -56, 0), 13);
                const bit = b.addCapsule(new V3(0, -62, 0), new V3(0, -168, 0), 4.5, 'bit');
                bit.soft = 0.00002;
            },
            visual: n => {
                const Y = 0xf2b928, K = 0x26282e;
                Props.box(L, n, 52, 72, 42, Y, 0, 0, 0);
                Props.box(L, n, 54, 14, 44, K, 0, 14, 0);
                Props.box(L, n, 30, 8, 30, K, 0, 40, 0);
                Props.box(L, n, 66, 28, 30, K, -46, 8, 0);
                Props.box(L, n, 36, 46, 36, Y, -86, 8, 0);
                Props.box(L, n, 8, 6, 10, 0xd8342b, -22, -8, 16);
                Props.cyl(L, n, 30, 24, 28, K, 0, -48, 0);
                Props.cyl(L, n, 16, 20, 18, Y, 0, -67, 0);
                spinMesh = Props.cyl(L, n, 9, 3, 104, 0x8d939c, 0, -118, 0, 0, 0, 0, 8);
            } });
        it.q0 = q;
        it.update = (dt) => { Props.hover(it.body, it.q0, dt); };
        it.sync = (dt) => { if (spinMesh) spinMesh.rotation.y += dt * 40; };
        return it;
    },
});

Props.def('laser', {
    build(L, m) {
        const q = m.q.clone();
        const it = Props.dyn(L, { name: 'laser', pos: m.pos.clone(), q, mass: 5, linDamp: 3, angDamp: 4, gravityScale: 0, data: { power: 0.5 },
            shapes: b => { b.addCapsule(new V3(10, 0, 0), new V3(60, 0, 0), 26); b.addCapsule(new V3(-70, 0, 0), new V3(0, 0, 0), 9); },
            visual: n => {
                const R = 0xe0322a;
                Props.cap(L, n, 110, 28, R, 38, 0, 0, 0, 0, Math.PI / 2);
                Props.box(L, n, 40, 26, 58, 0x26282e, 40, 10, 0, 0, 0, 0.25);
                Props.cyl(L, n, 12, 12, 80, 0x2b2d33, -32, 0, 0, 0, 0, Math.PI / 2);
                for (let i = 0; i < 4; i++) Props.torus(L, n, 22, 2.6, 0x49e05a, -14 - i * 11, 0, 0, 0, 0, Math.PI / 2);
                Props.sph(L, n, 18, 0xe0322a, -74, 0, 0);
            } });
        // Луч: тонкий светящийся цилиндр от дула по оси −X тела.
        const beamMat = L.mat(0x5dff6e, { unlit: true });
        const beam = BABYLON.MeshBuilder.CreateCylinder('beam', { diameter: 5, height: 1, tessellation: 8 }, L.scene);
        beam.material = beamMat; L.nodes.push(beam);
        const glow = BABYLON.MeshBuilder.CreateCylinder('beam-glow', { diameter: 13, height: 1, tessellation: 8 }, L.scene);
        glow.material = L.mat(0xb8ffbf, { unlit: true, alpha: 0.28 }); L.nodes.push(glow);
        it.q0 = q;
        it.beam = { from: new V3(), to: new V3(), hit: null };
        it.update = (dt) => {
            Props.hover(it.body, it.q0, dt);
            const b = it.body;
            const from = b.toWorld(new V3(-84, 0, 0)), dir = b.q.rotate(new V3(-1, 0, 0));
            const hit = L.world.raycast(from, dir, 1400, x => x !== b && !x.sensor);
            it.beam.from = from;
            it.beam.to = hit ? hit.point : from.clone().addScaled(dir, 1400);
            it.beam.hit = hit;
            const part = hit && hit.body && hit.body.data && hit.body.data.part;
            if (part) { part.hazard = Math.max(part.hazard, 90); part.hazardKind = 'burn'; part.hazardPoint = hit.point; part.hazardItem = it; hit.body.data.dummy.activate(); }
            const ex = hit && hit.body && hit.body.data && hit.body.data.explosive;
            if (ex && !ex.done && !ex.fuse) ex.fuse = 0.3;
        };
        it.sync = () => {
            const a = it.beam.from, z = it.beam.to;
            const dx = z.x - a.x, dy = z.y - a.y, dz = z.z - a.z, l = Math.max(1, Math.sqrt(dx * dx + dy * dy + dz * dz));
            const dir = new BABYLON.Vector3(dx / l, dy / l, dz / l);
            const axis = BABYLON.Vector3.Cross(BABYLON.Axis.Y, dir);
            const qq = axis.lengthSquared() > 1e-8 ? BABYLON.Quaternion.RotationAxis(axis.normalize(), Math.acos(Math.max(-1, Math.min(1, dir.y)))) : new BABYLON.Quaternion();
            for (const mesh of [beam, glow]) {
                mesh.position.set((a.x + z.x) / 2, (a.y + z.y) / 2, (a.z + z.z) / 2);
                mesh.scaling.set(1, l, 1);
                mesh.rotationQuaternion = qq;
            }
            glow.scaling.x = glow.scaling.z = 0.8 + Math.sin(L.time * 40) * 0.2;
        };
        return it;
    },
});

// --- Маятники ---------------------------------------------------------------------------

Props.def('bag', {
    build(L, m) {
        const col = propColor(m, 0xd8322e);
        const it = Props.dyn(L, { name: 'bag', pos: m.pos.clone(), q: m.q, mass: 70, angDamp: 1.2, restitution: 0.05, friction: 0.8, data: { power: 2.5, sound: 'thud' },
            shapes: b => b.addCapsule(new V3(0, -46, 0), new V3(0, 46, 0), 30),
            visual: n => {
                Props.cyl(L, n, 60, 60, 120, col, 0, 0, 0, 0, 0, 0, 24);
                Props.cyl(L, n, 62, 62, 10, 0x1e1f24, 0, 58, 0, 0, 0, 0, 24);
                Props.cyl(L, n, 62, 62, 10, 0x1e1f24, 0, -58, 0, 0, 0, 0, 24);
                Props.cyl(L, n, 63, 63, 5, 0x1e1f24, 0, 25, 0, 0, 0, 0, 24);
                for (const a of [0.9, -0.9]) Props.cyl(L, n, 2.4, 2.4, 44, 0x1e1f24, a * 14, 80, 0, 0, 0, a * 0.62, 6);
            } });
        hangOnRope(L, it, m, new V3(0, 98, 0));
        it.rope.line.material = L.mat(0x3a3d44);
        it.rope.line.scaling.x = 2;
        return it;
    },
});

// --- Опасности --------------------------------------------------------------------------

Props.def('saw', {
    build(L, m) {
        const R = 50 * m.scale[0];
        const pos0 = m.pos.clone();
        if (m.has('floor')) pos0.y = m.pos.y + R * 0.35;
        const qBase = m.q.clone();
        const it = Props.solid(L, { name: 'saw', pos: pos0, q: qBase, friction: 1,
            data: { hazard: { dps: 170, kind: 'cut' }, impactFactor: 1.4, sound: 'metal' },
            shapes: b => b.addSphere(new V3(), R * 0.92),
            visual: n => {
                const disc = Props.cyl(L, n, R * 2 * 0.92, R * 2 * 0.92, 4, L.mat(0xb9c0c9, { spec: 0.6 }), 0, 0, 0, Math.PI / 2, 0, 0, 36);
                const teeth = [];
                const N = Math.round(14 + R / 6);
                for (let i = 0; i < N; i++) {
                    const a = i / N * Math.PI * 2;
                    const t = BABYLON.MeshBuilder.CreateCylinder('tooth', { diameterTop: 0, diameterBottom: R * 0.26, height: R * 0.2, tessellation: 3 }, L.scene);
                    t.position.set(Math.cos(a) * R * 0.97, Math.sin(a) * R * 0.97, 0);
                    t.rotation.z = a - Math.PI / 2;
                    teeth.push(t);
                }
                const tm = BABYLON.Mesh.MergeMeshes(teeth, true);
                if (tm) { tm.material = L.mat(0x8d949e); tm.parent = n; }
                Props.cyl(L, n, R * 0.5, R * 0.5, 7, 0x2b2d33, 0, 0, 0, Math.PI / 2, 0, 0, 16);
                Props.cyl(L, n, R * 0.16, R * 0.16, 10, 0xd8342b, 0, 0, 0, Math.PI / 2, 0, 0, 10);
                disc.receiveShadows = true;
            } });
        // Стойка/рука пилы.
        if (!m.has('free')) {
            const arm = Props.node(L, 'saw-arm');
            if (m.has('floor')) Props.box(L, arm, R * 2.4, 16, 60, 0x3b3f47, pos0.x, m.pos.y + 8, pos0.z);
            else if (!m.has('swing')) Props.box(L, arm, 16, Math.max(10, pos0.y), 16, 0x3b3f47, pos0.x, pos0.y / 2, pos0.z - 12);
            World3D.addObject(L.view, arm, 'prop');
        }
        const range = 100 * m.scale[2] * (m.has('move') ? 1.6 : 0);
        const speed = m.has('fast') ? 1.5 : 1;
        let ang = 0;
        const swingLen = 240 * m.scale[1];
        const pivot = pos0.clone().add(new V3(0, swingLen, 0));
        let chain = null;
        if (m.has('swing')) {
            chain = Props.box(L, null, 10, swingLen, 8, 0x3b3f47);
            L.nodes.push(chain);
        }
        it.update = (dt) => {
            ang += dt * 14 * speed * (m.has('ccw') ? 1 : -1);
            const spin = Quat.mul(qBase, Quat.fromAxisAngle(new V3(0, 0, 1), ang));
            let pos = pos0;
            if (range > 0) pos = pos0.clone().add(new V3(Math.sin(L.time * 1.3 * speed) * range, 0, 0));
            if (m.has('swing')) {
                const a = Math.sin(L.time * 1.8 * speed) * 1.05;
                pos = pivot.clone().add(new V3(Math.sin(a) * swingLen, -Math.cos(a) * swingLen, 0));
                if (chain) {
                    chain.position.set((pivot.x + pos.x) / 2, (pivot.y + pos.y) / 2, pos.z - 6);
                    chain.rotation.z = a;
                }
            }
            it.body.kinPos.copy(pos);
            it.body.kinQ.copy(spin);
        };
        return it;
    },
});

Props.def('spikes', {
    build(L, m) {
        const W = 100 * m.scale[0], D = 60 * m.scale[2];
        const pos = m.pos.clone();
        return Props.solid(L, { name: 'spikes', pos, q: m.q, friction: 0.9,
            data: { hazard: { dps: 140, kind: 'pierce' }, hazardTag: 'tips', impactFactor: 1.5, sound: 'metal' },
            shapes: b => { b.addBox(new V3(0, 5, 0), new V3(W / 2, 5, D / 2)); b.addBox(new V3(0, 22, 0), new V3(W / 2, 12, D / 2), 'tips'); },
            visual: n => {
                Props.box(L, n, W, 10, D, 0x3b3f47, 0, 5, 0);
                const cones = [];
                const nx = Math.max(2, Math.round(W / 20)), nz = Math.max(1, Math.round(D / 22));
                for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
                    const c = BABYLON.MeshBuilder.CreateCylinder('spike', { diameterTop: 0, diameterBottom: 15, height: 32, tessellation: 6 }, L.scene);
                    c.position.set(-W / 2 + (i + 0.5) * W / nx, 26, -D / 2 + (j + 0.5) * D / nz);
                    cones.push(c);
                }
                const cm = BABYLON.Mesh.MergeMeshes(cones, true);
                if (cm) { cm.material = L.mat(0xc9ced6, { spec: 0.5 }); cm.parent = n; }
            } }, 'static');
    },
});

// Шредер: яма с валами, внутри зона — урон, тянет вниз, трясёт.
Props.def('shredder', {
    hole(m) { const W = 240 * m.scale[0], D = 150 * m.scale[2]; return { x0: m.pos.x - W / 2, x1: m.pos.x + W / 2, z0: m.pos.z - D / 2, z1: m.pos.z + D / 2, depth: 170, wall: 0x2a2d33, floor: 0x0d0f12 }; },
    build(L, m) {
        const W = 240 * m.scale[0], D = 150 * m.scale[2];
        const x = m.pos.x, z = m.pos.z;
        const zone = Props.solid(L, { name: 'shredder-zone', pos: new V3(x, -85, z), sensor: true, group: PHYS_GROUP.ZONE,
            data: { hazard: { dps: 300, kind: 'crush' }, shredder: true },
            shapes: b => b.addBox(new V3(), new V3(W / 2, 90, D / 2)) }, 'static');
        // Валы-шестерни (визуал) и рама.
        const root = Props.node(L, 'shredder');
        const rows = 4, per = Math.max(3, Math.round(D / 22));
        const gears = [];
        for (let r = 0; r < rows; r++) {
            const gx = x - W / 2 + (r + 0.5) * W / rows;
            const row = Props.node(L, 'gear-row');
            row.parent = root;
            row.position.set(gx, -34, z);
            for (let i = 0; i < per; i++) {
                const gz = -D / 2 + (i + 0.5) * D / per;
                const g = BABYLON.MeshBuilder.CreateCylinder('gear', { diameter: W / rows * 0.95, height: D / per * 0.7, tessellation: 10 }, L.scene);
                g.rotation.x = Math.PI / 2;
                g.position.set(0, 0, gz);
                g.material = L.mat(i % 2 ? 0x9aa1ab : 0x6f7680, { spec: 0.4 });
                g.parent = row;
            }
            gears.push({ row, dir: r % 2 ? 1 : -1 });
        }
        const T = 22;
        for (const [px, pz, sx, sz] of [[x, z - D / 2 - T / 2, W + 2 * T, T], [x, z + D / 2 + T / 2, W + 2 * T, T], [x - W / 2 - T / 2, z, T, D], [x + W / 2 + T / 2, z, T, D]]) {
            Props.box(L, root, sx, 10, sz, 0x2a2d33, px, 4, pz);
        }
        World3D.addObject(L.view, root, 'prop');
        const it = { zone: zone.body };
        it.update = (dt) => {
            for (const g of gears) g.row.rotation.z += g.dir * dt * 9;
            // Всё, что попало внутрь, тянет вниз и трясёт.
            for (const b of L.world.bodies) {
                if (b.type !== 'dynamic') continue;
                const p = b.pos;
                if (p.x > x - W / 2 && p.x < x + W / 2 && p.z > z - D / 2 && p.z < z + D / 2 && p.y < 10 && p.y > -180) {
                    b.vel.y -= 900 * dt;
                    b.vel.x += (Math.random() - 0.5) * 900 * dt * 6;
                    b.vel.z += (Math.random() - 0.5) * 300 * dt * 6;
                    b.omega.x += (Math.random() - 0.5) * 60 * dt; b.omega.z += (Math.random() - 0.5) * 60 * dt;
                    if (b.data && b.data.part && L.hooks.onHazard) L.hooks.onHazard(b.data.part, 'shred', p, it);
                }
            }
        };
        return it;
    },
});

// Грозовая туча: удары молнии по точке под ней с периодом.
Props.def('lightning', {
    build(L, m) {
        const x = m.pos.x, z = m.pos.z, top = Math.max(260, m.pos.y);
        const period = m.num('p', 14) / 10;
        const root = Props.node(L, 'cloud');
        const cm = L.mat(0x3a5a8c);
        for (const [cx, cy, d] of [[0, 0, 150], [-90, -12, 110], [90, -10, 120], [-40, 30, 120], [50, 35, 110], [150, -20, 80], [-150, -22, 80]]) {
            Props.sph(L, root, d, cm, x + cx, top + cy, z - 40, 1, 0.72, 0.8, 12);
        }
        World3D.addObject(L.view, root, 'prop', { castShadow: false });
        const bolt = Props.node(L, 'bolt');
        const boltMat = L.mat(0xaef6ff, { unlit: true });
        const glowMat = L.mat(0x6fd8ff, { unlit: true, alpha: 0.35 });
        let t = period * 0.6, flash = 0;
        const it = { strikeAt: new V3(x, 0, z) };
        const makeBolt = () => {
            for (const c of bolt.getChildMeshes()) c.dispose();
            const pts = [];
            let px = x, py = top - 40;
            while (py > 0) { pts.push(new BABYLON.Vector3(px, py, z)); py -= 26 + Math.random() * 20; px = x + (Math.random() - 0.5) * 50; }
            pts.push(new BABYLON.Vector3(x, 0, z));
            const tube = BABYLON.MeshBuilder.CreateTube('bolt', { path: pts, radius: 3.2, tessellation: 5 }, L.scene);
            tube.material = boltMat; tube.parent = bolt;
            const g = BABYLON.MeshBuilder.CreateTube('bolt-glow', { path: pts, radius: 10, tessellation: 6 }, L.scene);
            g.material = glowMat; g.parent = bolt;
            for (let k = 0; k < 2; k++) {
                const i0 = 2 + Math.floor(Math.random() * (pts.length - 3));
                const br = [pts[i0]];
                let bx = pts[i0].x, by = pts[i0].y;
                for (let s = 0; s < 3; s++) { bx += (Math.random() - 0.5) * 60 + (k ? 30 : -30); by -= 25; br.push(new BABYLON.Vector3(bx, by, z)); }
                const bt = BABYLON.MeshBuilder.CreateTube('branch', { path: br, radius: 1.8, tessellation: 4 }, L.scene);
                bt.material = boltMat; bt.parent = bolt;
            }
        };
        bolt.setEnabled(false);
        it.update = (dt) => {
            t -= dt;
            if (flash > 0) { flash -= dt; if (flash <= 0) bolt.setEnabled(false); }
            if (t <= 0) {
                t = period;
                flash = 0.22;
                makeBolt(); bolt.setEnabled(true);
                const d = L.dummy;
                let hitAny = false;
                if (d) for (const p of d.parts) {
                    const dx = p.body.pos.x - x, dz = p.body.pos.z - z;
                    if (dx * dx + dz * dz < 62 * 62 && p.body.pos.y < top) {
                        d.activate(); d.damage(p, 60, 'shock'); p.shock = 1.5; p.burn = Math.min(1, p.burn + 0.35);
                        p.body.vel.add(new V3(Math.sign(dx || 1) * 250, 420, 0)); hitAny = true;
                    }
                }
                for (const b of L.world.bodies) {
                    const ex = b.data && b.data.explosive;
                    if (ex && !ex.done) { const dx = b.pos.x - x, dz = b.pos.z - z; if (dx * dx + dz * dz < 70 * 70) ex.fuse = 0.05; }
                }
                if (L.hooks.onLightning) L.hooks.onLightning(new V3(x, 0, z), hitAny);
            }
        };
        return it;
    },
});

// Каток: едет туда-обратно, валец крутится, зажатое между вальцом и землёй — давит.
Props.def('roller', {
    build(L, m) {
        const range = 100 * m.scale[0] * 2.4;
        const x0 = m.pos.x, z = m.pos.z, speed = m.num('s', 130);
        let dir = m.heading > 90 && m.heading < 270 ? -1 : 1;
        let x = x0;
        const R = 52;
        const drum = Props.solid(L, { name: 'roller-drum', pos: new V3(x, R, z), friction: 1, data: { crush: 700, impactFactor: 2.5, sound: 'metal' },
            shapes: b => b.addCapsule(new V3(0, 0, -58), new V3(0, 0, 58), R),
            visual: n => {
                Props.cyl(L, n, R * 2, R * 2, 150, 0x2a2c31, 0, 0, 0, Math.PI / 2, 0, 0, 28);
                for (const s of [-1, 1]) Props.cyl(L, n, R * 1.5, R * 1.5, 4, 0xf2b928, 0, 0, 76 * s, Math.PI / 2, 0, 0, 20);
            } });
        const bodyH = 110;
        const chassis = Props.solid(L, { name: 'roller-body', pos: new V3(x, 0, z), friction: 0.6, data: { impactFactor: 2, crush: 400 },
            shapes: b => { b.addBox(new V3(-150, 80, 0), new V3(95, 40, 60)); b.addBox(new V3(-60, 70, 0), new V3(40, 20, 70)); },
            visual: n => {
                const Y = 0xf2b928, K = 0x2a2c31;
                Props.box(L, n, 190, 80, 120, Y, -150, 80, 0);
                Props.box(L, n, 110, 12, 150, Y, -60, 118, 0);
                Props.box(L, n, 90, 90, 100, Y, -170, 165, 0);
                Props.box(L, n, 76, 60, 104, L.mat(0x9fd3f0, { spec: 0.6 }), -170, 172, 0);
                Props.box(L, n, 100, 8, 110, Y, -170, 214, 0);
                for (const s of [-1, 1]) Props.cyl(L, n, 76, 76, 34, K, -205, 38, 58 * s, Math.PI / 2, 0, 0, 20);
                Props.box(L, n, 16, 100, 16, Y, -40, 70, -64); Props.box(L, n, 16, 100, 16, Y, -40, 70, 64);
                Props.box(L, n, 30, 10, 170, 0xe0412f, 0, 120, 0);
            } });
        let spin = 0;
        const it = { body: drum.body };
        it.update = (dt) => {
            x += dir * speed * dt;
            if (x > x0 + range / 2) { x = x0 + range / 2; dir = -1; }
            if (x < x0 - range / 2) { x = x0 - range / 2; dir = 1; }
            spin -= dir * speed * dt / R;
            const face = dir > 0 ? new Quat() : Quat.fromAxisAngle(new V3(0, 1, 0), Math.PI);
            drum.body.kinPos.set(x, R, z);
            drum.body.kinQ.copy(Quat.fromAxisAngle(new V3(0, 0, 1), spin));
            chassis.body.kinPos.set(x, 0, z);
            chassis.body.kinQ.copy(face);
        };
        return it;
    },
});

Props.def('trampoline', {
    build(L, m) {
        const W = 150 * m.scale[0];
        const it = Props.solid(L, { name: 'trampoline', pos: m.pos.clone(), q: m.q, restitution: 1.15, friction: 0.5, data: { trampoline: true },
            shapes: b => b.addBox(new V3(0, 30, 0), new V3(W / 2, 8, 50)),
            visual: n => {
                Props.cyl(L, n, W, W, 10, 0x2a2c31, 0, 30, 0, 0, 0, 0, 28).scaling.z = 0.62;
                Props.torus(L, n, W, 12, 0x3a7be0, 0, 32, 0, 0, 0, 0).scaling.z = 0.62;
                for (const s of [-1, 1]) for (const t of [-1, 1]) Props.cyl(L, n, 8, 8, 34, 0x3b3f47, s * W * 0.42, 15, t * 26);
            } }, 'static');
        return it;
    },
});

// Гидравлический пресс: плита падает на пол и поднимается.
Props.def('press', {
    build(L, m) {
        const W = 160 * m.scale[0], D = 110 * m.scale[2];
        const top = Math.max(260, m.pos.y + 260), x = m.pos.x, z = m.pos.z;
        const period = m.num('p', 26) / 10;
        const plateH = 36;
        const spiky = m.has('spikes');
        const plate = Props.solid(L, { name: 'press-plate', pos: new V3(x, top, z), friction: 0.7,
            data: { crush: 700, impactFactor: 2.5, power: 1.2, sound: 'metal', hazard: spiky ? { dps: 200, kind: 'pierce' } : null, hazardTag: spiky ? 'tips' : null }, kind: 'actor',
            shapes: b => { b.addBox(new V3(), new V3(W / 2, plateH / 2, D / 2)); if (spiky) b.addBox(new V3(0, -plateH / 2 - 12, 0), new V3(W / 2, 12, D / 2), 'tips'); },
            visual: n => {
                Props.box(L, n, W, plateH, D, 0x3b3f47);
                for (let i = 0; i < 6; i++) Props.box(L, n, W / 12, plateH + 1, D + 1, 0xf2c230, -W / 2 + (i * 2 + 0.5) * W / 12, 0, 0, 0, 0, 0.5);
                Props.cyl(L, n, 40, 40, 400, 0xb9c0c9, 0, plateH / 2 + 200, 0);
                if (spiky) for (let i = 0; i < Math.round(W / 22); i++) for (let j = 0; j < 3; j++) Props.cyl(L, n, 12, 0, 26, 0xc9ced6, -W / 2 + (i + 0.5) * W / Math.round(W / 22), -plateH / 2 - 13, -D / 3 + j * D / 3, 0, 0, 0, 6);
            } });
        const frame = Props.node(L, 'press-frame');
        for (const s of [-1, 1]) {
            Props.box(L, frame, 34, top + 90, 40, 0x2a4b7a, x + s * (W / 2 + 30), (top + 90) / 2, z - D / 2 - 22);
            const post = new PBody({ type: 'static', pos: new V3(x + s * (W / 2 + 30), (top + 90) / 2, z - D / 2 - 22), group: PHYS_GROUP.WORLD });
            post.addBox(new V3(), new V3(17, (top + 90) / 2, 20)); L.world.add(post);
        }
        Props.box(L, frame, W + 110, 60, 60, 0x2a4b7a, x, top + 90, z - D / 2 - 22);
        const lamp = Props.sph(L, frame, 18, L.mat(0xff3b30, { emissive: 0x551010 }), x + W / 2 + 30, top + 130, z - D / 2 - 22);
        World3D.addObject(L.view, frame, 'prop');
        let t = m.num('o', 0) / 10;
        const it = { body: plate.body };
        it.update = (dt) => {
            t = (t + dt) % period;
            // 0..55% ждёт наверху, удар за 0.16 с, держит, поднимается.
            const wait = period * 0.5, fall = 0.16, hold = 0.35, rise = period - wait - fall - hold;
            let y;
            if (t < wait) y = top;
            else if (t < wait + fall) { const k = (t - wait) / fall; y = top - (top - plateH / 2 - (spiky ? 24 : 0)) * k * k; }
            else if (t < wait + fall + hold) y = plateH / 2 + (spiky ? 24 : 0);
            else { const k = (t - wait - fall - hold) / rise; y = plateH / 2 + (top - plateH / 2) * k; }
            plate.body.kinPos.set(x, y, z);
            /** @type {any} */ (lamp.material).emissiveColor.set(t > wait - 0.5 && t < wait + fall ? 1 : 0.3, 0.05, 0.05);
        };
        return it;
    },
});

// Стойка для гирь (неподвижная, две полки).
Props.def('rack', {
    build(L, m) {
        const W = 170 * m.scale[0];
        const it = Props.solid(L, { name: 'rack', pos: m.pos.clone(), q: m.q, friction: 0.8,
            // Полки на 45 и 125: между ними гиря (≈55 px) проходит свободно, не застревает.
            shapes: b => { b.addBox(new V3(0, 42, -4), new V3(W / 2, 3, 32)); b.addBox(new V3(0, 122, -8), new V3(W / 2, 3, 30)); },
            visual: n => {
                const c = 0x4a4f58;
                Props.box(L, n, W, 6, 64, c, 0, 42, -4);
                Props.box(L, n, W, 6, 60, c, 0, 122, -8);
                for (const s of [-1, 1]) {
                    Props.box(L, n, 8, 130, 8, c, s * W / 2, 65, -40);
                    Props.box(L, n, 8, 46, 8, c, s * W / 2, 23, 26);
                    Props.box(L, n, 8, 8, 74, c, s * W / 2, 4, -7);
                }
            } }, 'static');
        return it;
    },
});
