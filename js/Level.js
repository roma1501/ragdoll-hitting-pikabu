// Level.js — уровень игры поверх карты Maps.js: физика (Phys.js), окружение (пол с
// ямами, небо, свет), объекты карты -> тела, маркеры -> манекен, камера и предметы
// (Props.js), перетаскивание пальцем с «пружиной» (зелёная линия), урон по костям.
//
// Карта уровня (скилл game, §Карты): маркеры — точки логики:
//   dummy.<поза>[.grab]  — манекен (поза из DUMMY_POSES; .grab — его можно таскать)
//   camera               — центр кадра; scale x/y — ширина/высота области (×600 px)
//   env.<тема>           — оформление (studio, street, gym, storm, night, …)
//   hole                 — яма в полу (scale x/z — размер ×100 px, y — глубина)
//   hint                 — куда показывает рука-подсказка
//   <предмет>[.флаги]    — предмет из Props.js (kettlebell, drill, saw.move, …)
// Модели карты по имени: throw[.флаги] — тело, которое можно бросать; push — тело
// без перетаскивания; solid[.флаги] — неподвижное препятствие; drive[.скорость] —
// едет по курсу; остальное — декор без столкновений.
// Координаты карты: x -> X, y -> Z (глубина), h -> высота Y.

const LEVEL_THEMES = {
    studio: { sky: 0xa5d6f2, floor: 0x8cc6ea, fog: 0.00042 },
    gym: { sky: 0xe9dcc7, floor: 0xc99a62, fog: 0.00040, floorTex: 'planks' },
    street: { sky: 0x86c5ea, floor: 0x9aa4ab, fog: 0.00030, road: true },
    storm: { sky: 0x3b4e5c, floor: 0x3d505c, fog: 0.00055, light: 0.62 },
    night: { sky: 0x2b2f52, floor: 0x3a3f68, fog: 0.00050, light: 0.6 },
    construction: { sky: 0xf2d8a8, floor: 0xc9a46c, fog: 0.00036, floorTex: 'dirt' },
    factory: { sky: 0xb9c3cc, floor: 0x8e979f, fog: 0.00040, floorTex: 'tiles' },
    kitchen: { sky: 0xf4e9dc, floor: 0xe6e0d6, fog: 0.00040, floorTex: 'checker' },
    desert: { sky: 0xf6d9a0, floor: 0xe3bf7e, fog: 0.00030 },
    snow: { sky: 0xd9ecf7, floor: 0xf1f7fb, fog: 0.00040 },
    lava: { sky: 0x5a2a22, floor: 0x3c2c2a, fog: 0.00050, light: 0.75 },
    space: { sky: 0x0d1024, floor: 0x2a2f4a, fog: 0.00020, light: 0.8, gravity: 0.35, floorTex: 'grid' },
    park: { sky: 0x9fd6f5, floor: 0x7cc05a, fog: 0.00034, floorTex: 'grass' },
    beach: { sky: 0x9ee0f7, floor: 0xf0d9a2, fog: 0.00032 },
    pink: { sky: 0xf6c9e4, floor: 0xeea9d3, fog: 0.00042 },
    gold: { sky: 0xffe7a6, floor: 0xf5cf6b, fog: 0.00040 },
    cave: { sky: 0x3a4a5e, floor: 0x5b6b80, fog: 0.00055, light: 0.8, floorTex: 'dirt' },
    bathroom: { sky: 0xdff3f7, floor: 0xd5eef3, fog: 0.00040, floorTex: 'tiles' },
    office: { sky: 0xe6e2da, floor: 0x9fb0c2, fog: 0.00040, floorTex: 'tiles' },
    living: { sky: 0xf1e4d4, floor: 0xc49a6c, fog: 0.00040, floorTex: 'planks' },
    rails: { sky: 0x9fd0ee, floor: 0xa89a86, fog: 0.00030, floorTex: 'dirt', rails: true },
};

class Level {
    // app — window.app; rules — LEVEL_RULES[id]; hooks: { onBreak(part, kind), onFirstTouch() }
    constructor(app, rules, hooks) {
        this.app = app;
        this.loc = app.location;
        this.view = this.loc.view;
        this.scene = this.view.scene;
        this.map = this.loc.map;
        this.rules = rules || {};
        this.hooks = hooks || {};
        const U = 'undefined';
        this.world = new PhysWorld({ gravity: typeof GAME_GRAVITY !== U ? GAME_GRAVITY : 1500, substeps: 10 });
        this.items = [];            // предметы Props (update/post/dispose)
        this.syncs = [];            // { body, node } — меш за телом
        this.draggable = new Set(); // тела, которые можно тянуть
        this.nodes = [];            // свои меши/узлы уровня (удалить в dispose)
        this.mats = new Map();
        this.holes = [];
        this.dummy = null;
        this.grab = null;
        this.depth = 500;           // глубина игровой плоскости (Z)
        this.time = 0;
        this.slow = 1;
        this.touched = false;
        this.theme = LEVEL_THEMES.studio;
        this.themeName = 'studio';
        /** @type {any} */
        this.cam = { target: new BABYLON.Vector3(800, 120, 500), w: 600, h: 520, pitch: 8, pos: new BABYLON.Vector3(), shake: 0, shakeT: 0, cur: null };
        /** @type {{x: number, y: number, z: number, w: number, h: number, ox: number, oy: number} | null} */
        this.focus = null;          // кадр магазина (Shop.js); null — область уровня
        this.hint = null;
        this.bounds = { x0: -2000, x1: 4000, y0: -600, z0: -2000, z1: 3000 };
        this.pointer = null;
        this.fxTimers = [];
        this.sounds = {};           // зацикленные звуки предметов
        this.reparented = [];       // меши моделей карты под узлами тел (вернуть при уборке)
        this.cuttable = [];         // предметы на верёвке, которую режет взмах пальца
        this.respawns = [];         // взорванные заряды, которые вернутся (respawnLater)
        this.disposed = false;
        this.world.contactListener = (c, h) => this._onContact(c, h);
        this.world.preContact = (c) => this._preContact(c);
    }

    // --- Сборка ------------------------------------------------------------------------

    async build() {
        const loc = this.loc;
        for (const m of loc.terrain ? loc.terrain.meshes : []) m.setEnabled(false);
        const markers = [], models = [];
        for (const rec of loc.objects) {
            if (rec.def.kind === 'marker') markers.push(Level.parse(rec.def));
            else models.push(rec);
        }
        this.markers = markers;
        const env = markers.find(m => m.kind === 'env');
        this.themeName = env && LEVEL_THEMES[env.flags[0]] ? env.flags[0] : 'studio';
        this.theme = LEVEL_THEMES[this.themeName];
        this.world.gravity.y = -Math.abs(this.world.gravity.y) * (this.theme.gravity || 1);
        const dm = markers.find(m => m.kind === 'dummy');
        const cm0 = markers.find(m => m.kind === 'camera');
        this.depth = cm0 ? cm0.pos.z : (dm ? dm.pos.z : 500);
        // Ямы: маркеры hole и предметы, которым нужна яма (шреддер, лава).
        for (const m of markers) {
            const need = m.kind === 'hole' ? Props.holeOf(m) : (Props.kinds[m.kind] && Props.kinds[m.kind].hole ? Props.kinds[m.kind].hole(m) : null);
            if (need) this.holes.push(need);
        }
        this._applyTheme();
        this._buildGround();
        for (const rec of models) this._modelObject(rec);
        for (const m of markers) {
            if (m.kind === 'dummy' || m.kind === 'camera' || m.kind === 'env' || m.kind === 'hint' || m.kind === 'hole') continue;
            const K = Props.kinds[m.kind];
            if (!K) { console.warn('Level: неизвестный предмет «' + m.name + '»'); continue; }
            try {
                const item = await K.build(this, m);
                if (item) { item.kind = m.kind; item.marker = m; this.items.push(item); }
            } catch (e) { console.error('Level: предмет ' + m.name, e); }
        }
        if (dm) this._spawnDummy(dm);
        const cm = markers.find(m => m.kind === 'camera');
        this._setupCamera(cm);
        const hm = markers.find(m => m.kind === 'hint');
        this.hint = hm ? hm.pos.clone() : null;
        this.canDragDummy = !!(dm && (dm.flags.indexOf('grab') >= 0 || this.draggable.size === 0));
        if (this.canDragDummy && this.dummy) for (const p of this.dummy.parts) this.draggable.add(p.body);
        // Всё, что можно схватить, ходит только в плоскости экрана (z = глубина уровня).
        for (const b of this.draggable) {
            if (b.data && b.data.dummy) continue;
            b.lockPlanar(this.depth);
            const it = this.items.find(i => i.body === b);
            if (it && it.home) it.home.pos.z = this.depth;
        }
        this._buildWalls();
        this.sync(0);
        this._updateCamera(1, true);
    }

    // Невидимые стенки по краям кадра: манекен не улетает за камеру. Предметы, машины и
    // поезда проходят сквозь них (маска — только манекен).
    _buildWalls() {
        const c = this.cam;
        let x0 = c.target.x - c.w / 2, x1 = c.target.x + c.w / 2;
        // Манекен въезжает из-за кадра (конвейер) — стенка за его стартом.
        if (this.dummy) for (const p of this.dummy.parts) { x0 = Math.min(x0, p.body.pos.x - 40); x1 = Math.max(x1, p.body.pos.x + 40); }
        for (const s of [-1, 1]) {
            const w = new PBody({ type: 'static', group: PHYS_GROUP.WALL, mask: PHYS_GROUP.DUMMY, friction: 0.3, restitution: 0.2, pos: new V3((s < 0 ? x0 : x1) + s * 100, 1500, this.depth), data: { wall: true } });
            w.addBox(new V3(), new V3(100, 3000, 3000));
            w.finalize(0);
            this.world.add(w);
        }
    }

    // Имя маркера: 'saw.move-2' -> { kind: 'saw', flags: ['move'] }; позиция в мире.
    static parse(def) {
        const name = String(def.name || '').replace(/-\d+$/, '');
        const parts = name.split('.').filter(Boolean);
        const r = Array.isArray(def.rot) ? def.rot : [0, def.rot || 0, 0];
        const s = Array.isArray(def.scale) ? def.scale : [def.scale || 1, def.scale || 1, def.scale || 1];
        return {
            def, name, kind: (parts[0] || '').toLowerCase(), flags: parts.slice(1).map(f => f.toLowerCase()),
            pos: new V3(Number(def.x) || 0, Number(def.h) || 0, Number(def.y) || 0),
            rot: [Number(r[0]) || 0, Number(r[1]) || 0, Number(r[2]) || 0],
            heading: Number(r[1]) || 0,
            q: Quat.fromEulerDeg(Number(r[0]) || 0, -(Number(r[1]) || 0), Number(r[2]) || 0),
            scale: [Number(s[0]) || 1, Number(s[1]) || 1, Number(s[2]) || 1],
            has(flag) { return this.flags.indexOf(flag) >= 0; },
            num(prefix, dflt) {
                for (const f of this.flags) if (f.startsWith(prefix) && /^-?\d+(\.\d+)?$/.test(f.slice(prefix.length))) return Number(f.slice(prefix.length));
                return dflt;
            },
        };
    }

    // --- Окружение ---------------------------------------------------------------------

    _applyTheme() {
        const th = this.theme, v = this.view;
        v.opts.sky = th.sky;
        v.opts.fogDensity = th.fog;
        v.opts.groundTint = th.floor;
        v.applyLighting();
        const k = th.light || 1;
        v.sun.intensity *= k; v.hemi.intensity *= k;
        const md = this.scene.metadata;
        md.lorySun = { dir: v.sun.direction.negate().normalize(), color: v.sun.diffuse.scale(v.sun.intensity) };
    }

    _buildGround() {
        const g = new PBody({ type: 'static', group: PHYS_GROUP.WORLD, friction: 0.75, restitution: 0.08, data: { ground: true } });
        g.addPlane(0, this.holes);
        this.world.add(g);
        this.ground = g;
        // Пол: большая плоскость, вырезаны ямы (сетка по краям ям, клетки вне ям).
        const th = this.theme, BIG = 12000;
        const xs = [-BIG, BIG], zs = [-BIG, BIG];
        for (const h of this.holes) { xs.push(h.x0, h.x1); zs.push(h.z0, h.z1); }
        const ux = [...new Set(xs)].sort((a, b) => a - b), uz = [...new Set(zs)].sort((a, b) => a - b);
        const mat = this.floorMaterial(th);
        const pos = [], idx = [], uv = [], nrm = [];
        for (let i = 0; i < ux.length - 1; i++) {
            for (let j = 0; j < uz.length - 1; j++) {
                const cx = (ux[i] + ux[i + 1]) / 2, cz = (uz[j] + uz[j + 1]) / 2;
                if (this.holes.some(h => cx > h.x0 && cx < h.x1 && cz > h.z0 && cz < h.z1)) continue;
                const b = pos.length / 3;
                for (const [x, z] of [[ux[i], uz[j]], [ux[i + 1], uz[j]], [ux[i + 1], uz[j + 1]], [ux[i], uz[j + 1]]]) {
                    pos.push(x, 0, z); nrm.push(0, 1, 0); uv.push(x / 400, z / 400);
                }
                idx.push(b, b + 2, b + 1, b, b + 3, b + 2);
            }
        }
        const floor = new BABYLON.Mesh('floor', this.scene);
        const vd = new BABYLON.VertexData();
        vd.positions = pos; vd.indices = idx; vd.normals = nrm; vd.uvs = uv;
        vd.applyToMesh(floor);
        floor.material = mat;
        floor.receiveShadows = true;
        floor.isPickable = false;
        this.nodes.push(floor);
        for (const h of this.holes) this._buildPit(h);
        if (th.road) this._buildRoad();
        if (th.rails) this._buildRails();
    }

    _buildRails() {
        const z = this.depth;
        const parts = [];
        for (let x = -3000; x < 5000; x += 70) parts.push(Object.assign(BABYLON.MeshBuilder.CreateBox('sleeper', { width: 26, height: 8, depth: 190 }, this.scene), { position: new BABYLON.Vector3(x, 4, z) }));
        const sl = BABYLON.Mesh.MergeMeshes(parts, true);
        if (sl) { sl.material = this.mat(0x6b4a2a); sl.receiveShadows = true; this.nodes.push(sl); }
        for (const s of [-1, 1]) {
            const r = BABYLON.MeshBuilder.CreateBox('rail', { width: 24000, height: 10, depth: 9 }, this.scene);
            r.position.set(0, 13, z + s * 72); r.material = this.mat(0x8d939c, { spec: 0.5 }); r.receiveShadows = true;
            this.nodes.push(r);
        }
    }

    floorMaterial(th) {
        const m = new BABYLON.StandardMaterial('floor-mat', this.scene);
        m.metadata = { toonGroup: 'ground' };
        m.specularColor = new BABYLON.Color3(0, 0, 0);
        const tex = th.floorTex ? Level.floorTexture(this.scene, th.floorTex, th.floor) : null;
        if (tex) { m.diffuseTexture = tex; m.diffuseColor = new BABYLON.Color3(1, 1, 1); }
        else m.diffuseColor = World3D.hexColor3(th.floor);
        return m;
    }

    // Процедурные текстуры пола (доски, плитка, шахматка, грунт, трава, сетка).
    static floorTexture(scene, kind, base) {
        const S = 256;
        const tex = new BABYLON.DynamicTexture('floor-' + kind, { width: S, height: S }, scene, true);
        const ctx = /** @type {CanvasRenderingContext2D} */ (/** @type {any} */ (tex.getContext()));
        const c = World3D.hexColor3(base);
        const rgb = (k, a = 1) => 'rgba(' + Math.round(Math.min(255, c.r * 255 * k)) + ',' + Math.round(Math.min(255, c.g * 255 * k)) + ',' + Math.round(Math.min(255, c.b * 255 * k)) + ',' + a + ')';
        ctx.fillStyle = rgb(1); ctx.fillRect(0, 0, S, S);
        let seed = 11;
        const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
        if (kind === 'planks') {
            for (let y = 0; y < S; y += 32) {
                ctx.fillStyle = rgb(0.9 + rnd() * 0.15); ctx.fillRect(0, y, S, 32);
                ctx.fillStyle = rgb(0.7); ctx.fillRect(0, y, S, 2);
                const off = rnd() * S; ctx.fillRect(off, y, 2, 32); ctx.fillRect((off + S / 2) % S, y, 2, 32);
            }
        } else if (kind === 'tiles' || kind === 'checker') {
            const n = kind === 'checker' ? 4 : 2, t = S / n;
            for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
                ctx.fillStyle = kind === 'checker' ? ((i + j) % 2 ? rgb(0.78) : rgb(1.02)) : rgb(0.95 + rnd() * 0.08);
                ctx.fillRect(i * t, j * t, t, t);
                ctx.strokeStyle = rgb(0.7); ctx.lineWidth = 3; ctx.strokeRect(i * t, j * t, t, t);
            }
        } else if (kind === 'grid') {
            ctx.strokeStyle = 'rgba(120,160,255,0.45)'; ctx.lineWidth = 3;
            for (let i = 0; i <= S; i += 64) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, S); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(S, i); ctx.stroke(); }
        } else {
            for (let i = 0; i < 900; i++) {
                ctx.fillStyle = rgb(0.85 + rnd() * 0.3, 0.6);
                const r = kind === 'grass' ? 2 : 3 + rnd() * 4;
                ctx.fillRect(rnd() * S, rnd() * S, r, kind === 'grass' ? 6 : r);
            }
        }
        tex.update();
        tex.wrapU = tex.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
        return tex;
    }

    // Стенки и дно ямы (визуал + коллайдеры стенок, чтобы не пролетать вбок под пол).
    _buildPit(h) {
        const depth = h.depth || 260, T = 40;
        const w = h.x1 - h.x0, d = h.z1 - h.z0, cx = (h.x0 + h.x1) / 2, cz = (h.z0 + h.z1) / 2;
        const walls = [
            [cx, cz - d / 2 - T / 2, w + 2 * T, T], [cx, cz + d / 2 + T / 2, w + 2 * T, T],
            [h.x0 - T / 2, cz, T, d], [h.x1 + T / 2, cz, T, d],
        ];
        const wallMat = this.mat(h.wall || 0x2d3440);
        walls.forEach(([x, z, sx, sz], i) => {
            const b = new PBody({ type: 'static', group: PHYS_GROUP.WORLD, pos: new V3(x, -depth / 2, z), friction: 0.6 });
            b.addBox(new V3(), new V3(sx / 2, depth / 2, sz / 2));
            this.world.add(b);
            if (i === 1) return;   // ближняя к камере стенка — без меша: яму видно в разрезе
            const m = BABYLON.MeshBuilder.CreateBox('pit-wall', { width: sx, height: depth, depth: sz }, this.scene);
            m.position.set(x, -depth / 2 - 0.5, z); m.material = wallMat; m.receiveShadows = true;
            this.nodes.push(m);
        });
        if (h.bottom !== false) {
            const b = new PBody({ type: 'static', group: PHYS_GROUP.WORLD, pos: new V3(cx, -depth - 20, cz), friction: 0.8 });
            b.addBox(new V3(), new V3(w / 2 + T, 20, d / 2 + T));
            this.world.add(b);
        }
        const dark = BABYLON.MeshBuilder.CreateBox('pit-bottom', { width: w, height: 4, depth: d }, this.scene);
        dark.position.set(cx, -depth + 2, cz); dark.material = this.mat(h.floor || 0x151a22);
        this.nodes.push(dark);
    }

    _buildRoad() {
        const z = this.depth;
        const road = BABYLON.MeshBuilder.CreateBox('road', { width: 24000, height: 1, depth: 320 }, this.scene);
        road.position.set(0, 0.3, z - 40);
        road.material = this.mat(0x4a4e55);
        road.receiveShadows = true;
        this.nodes.push(road);
        for (const side of [-1, 1]) {
            const kerb = BABYLON.MeshBuilder.CreateBox('kerb', { width: 24000, height: 6, depth: 26 }, this.scene);
            kerb.position.set(0, 2, z - 40 + side * 173);
            kerb.material = this.mat(0xd9d9d9);
            kerb.receiveShadows = true;
            this.nodes.push(kerb);
        }
        const dashes = [];
        for (let x = -3000; x < 5000; x += 220) {
            const dash = BABYLON.MeshBuilder.CreateBox('dash', { width: 110, height: 1, depth: 10 }, this.scene);
            dash.position.set(x, 0.9, z - 40);
            dashes.push(dash);
        }
        const merged = BABYLON.Mesh.MergeMeshes(dashes, true);
        if (merged) { merged.material = this.mat(0xf2f2f2); merged.receiveShadows = true; this.nodes.push(merged); }
    }

    // Материал цвета hex (кэш уровня).
    mat(hex, opts) {
        const key = hex + (opts ? JSON.stringify(opts) : '');
        let m = this.mats.get(key);
        if (m) return m;
        m = new BABYLON.StandardMaterial('m' + hex.toString(16), this.scene);
        m.diffuseColor = World3D.hexColor3(hex);
        m.specularColor = new BABYLON.Color3(0.08, 0.08, 0.08);
        if (opts && opts.emissive != null) { m.emissiveColor = World3D.hexColor3(opts.emissive); }
        if (opts && opts.unlit) { m.disableLighting = true; m.emissiveColor = World3D.hexColor3(hex); m.metadata = { toon: false }; }
        if (opts && opts.alpha != null) { m.alpha = opts.alpha; }
        if (opts && opts.spec != null) { m.specularColor = new BABYLON.Color3(opts.spec, opts.spec, opts.spec); m.specularPower = 24; }
        this.mats.set(key, m);
        return m;
    }

    // --- Модели карты -> физика ----------------------------------------------------------

    _modelObject(rec) {
        const mesh = rec.mesh;
        if (!mesh) return;
        const p = Level.parse(rec.def);
        const role = p.kind;
        if (role !== 'throw' && role !== 'push' && role !== 'solid' && role !== 'drive') {
            mesh.isPickable = false;
            return;
        }
        // Локальные габариты модели (без поворота и сдвига, с масштабом).
        const pos0 = mesh.position.clone(), rot0 = mesh.rotation.clone(), q0 = mesh.rotationQuaternion;
        mesh.position.set(0, 0, 0); mesh.rotation.set(0, 0, 0); mesh.rotationQuaternion = null;
        mesh.computeWorldMatrix(true);
        for (const c of mesh.getChildMeshes(false)) c.computeWorldMatrix(true);
        const bb = mesh.getHierarchyBoundingVectors(true);
        mesh.position.copyFrom(pos0); mesh.rotation.copyFrom(rot0); mesh.rotationQuaternion = q0;
        const center = new V3((bb.min.x + bb.max.x) / 2, (bb.min.y + bb.max.y) / 2, (bb.min.z + bb.max.z) / 2);
        const half = new V3(Math.max(2, (bb.max.x - bb.min.x) / 2), Math.max(2, (bb.max.y - bb.min.y) / 2), Math.max(2, (bb.max.z - bb.min.z) / 2));
        const q = Quat.fromEulerDeg(rot0.x * 180 / Math.PI, rot0.y * 180 / Math.PI, rot0.z * 180 / Math.PI);
        const worldCenter = q.rotate(center).add(new V3(pos0.x, pos0.y, pos0.z));
        const type = role === 'solid' ? 'static' : (role === 'drive' ? 'kinematic' : 'dynamic');
        const b = new PBody({ type, pos: worldCenter, q, group: role === 'solid' || role === 'drive' ? PHYS_GROUP.WORLD : PHYS_GROUP.PROP,
            friction: p.has('ice') ? 0.05 : 0.6, restitution: p.has('bouncy') ? 1.1 : 0.12, listen: true });
        const shape = p.has('ball') ? 'ball' : (p.has('cyl') ? 'cyl' : 'box');
        if (shape === 'ball') b.addSphere(new V3(), Math.min(half.x, half.y, half.z));
        else if (shape === 'cyl') {
            const r = Math.min(half.x, half.z);
            b.addCapsule(new V3(0, -half.y + r, 0), new V3(0, half.y - r, 0), r);
        } else b.addBox(new V3(), half);
        const vol = 8 * half.x * half.y * half.z / 1e6;   // м³
        const mass = p.num('m', Math.max(2, Math.min(160, vol * 140)));
        b.finalize(mass);
        b.data = { model: true, power: p.num('p', 1), role, name: p.name, crush: mass >= 60 ? mass * 0.8 : 0,
            explosive: p.has('boom') ? { r: 260, power: 1, threshold: 520 } : null };
        this.world.add(b);
        if (type === 'static') { mesh.isPickable = false; return; }
        // Меш модели — ребёнок узла тела: узел в центре масс, модель со сдвигом.
        const root = new BABYLON.Mesh('body-' + p.name, this.scene);
        root.rotationQuaternion = new BABYLON.Quaternion();
        mesh.parent = root;
        mesh.rotationQuaternion = null;
        mesh.rotation.set(0, 0, 0);
        mesh.position.set(-center.x - b.com.x, -center.y - b.com.y, -center.z - b.com.z);
        this.reparented.push(mesh);
        this.nodes.push(root);
        this.syncs.push({ body: b, node: root });
        if (role === 'throw') this.draggable.add(b);
        if (role !== 'drive') this.items.push({ body: b, home: { pos: b.pos.clone(), q: b.q.clone() } });
        if (role === 'drive') {
            const speed = p.num('s', 900);
            // Машины Kenney смотрят вдоль своей +Z; флаг x — вдоль +X, back — задом.
            const dir = q.rotate(p.has('x') ? new V3(1, 0, 0) : new V3(0, 0, p.has('back') ? -1 : 1)); dir.y = 0; dir.normalize();
            const range = p.num('r', 2600);
            const start = b.pos.clone();
            const item = { t: Math.random() * 0.5, update: (dt) => {
                item.t += dt;
                const cycle = range / speed + p.num('w', 12) / 10;
                const tt = item.t % cycle;
                const d = Math.min(range, tt * speed);
                const pos = start.clone().addScaled(dir, d);
                if (tt < dt * 1.5) b.teleport(pos, b.q); else b.kinPos.copy(pos);
            } };
            b.data.impactFactor = 2.2;
            this.items.push(item);
        }
    }

    // --- Манекен -------------------------------------------------------------------------

    _spawnDummy(m) {
        const pose = m.flags.find(f => DUMMY_POSES[f]) || 'stand';
        const d = new Dummy(this.world, { pose, pos: m.pos, heading: m.heading, pin: m.has('pin') });
        d.visual = new DummyVisual(d, this.view);
        d.visual.glow = (this.theme.light || 1) < 1 ? 0.22 : 0.05;
        d.onBreak = (part, kind) => this._onBreak(part, kind);
        d.onActivate = () => { if (this.hooks.onActivate) this.hooks.onActivate(); };
        this.dummy = d;
        this.dummySpawn = m;
    }

    // --- Камера --------------------------------------------------------------------------

    _setupCamera(cm) {
        const c = this.cam;
        if (cm) {
            c.target.set(cm.pos.x, cm.pos.y, cm.pos.z);
            c.w = 600 * cm.scale[0];
            c.h = 600 * cm.scale[1];
            c.pitch = cm.rot[0] || 8;
        } else if (this.dummy) {
            const p = this.dummy.center;
            c.target.set(p.x, 110, p.z);
        }
        this.depth = c.target.z;
        this.bounds = { x0: c.target.x - 2600, x1: c.target.x + 2600, y0: -700, z0: c.target.z - 1800, z1: c.target.z + 1800 };
        c.base = c.target.clone();
    }

    // Кадр: область w×h вокруг цели влезает целиком (минус полосы интерфейса).
    _updateCamera(dt, snap) {
        const c = this.cam, cam = this.view.camera, U = 'undefined';
        const fovDeg = typeof GAME_CAMERA_FOV_DEG !== U ? GAME_CAMERA_FOV_DEG : 40;
        cam.fov = fovDeg * Math.PI / 180;
        const canvas = World3D.canvas;
        const W = (canvas && canvas.clientWidth) || 800, H = (canvas && canvas.clientHeight) || 600;
        const aspect = W / H;
        // Полосы интерфейса: сверху заголовок и прогресс, снизу подпись.
        const usable = H > W ? 0.66 : 0.74;
        const tanV = Math.tan(cam.fov / 2);
        // Кадр — область уровня или focus (магазин: манекен крупно, сбоку от панели);
        // переход плавный. ox/oy — сдвиг цели в долях кадра.
        const f = this.focus;
        const want = f ? f : { x: c.base.x, y: c.base.y, z: c.base.z, w: c.w, h: c.h, ox: 0, oy: 0 };
        const cur = c.cur || (c.cur = Object.assign({}, want));
        const k = snap ? 1 : 1 - Math.exp(-Math.max(0, dt) * 6);
        for (const key of ['x', 'y', 'z', 'w', 'h', 'ox', 'oy']) cur[key] += ((want[key] || 0) - (cur[key] || 0)) * k;
        const distH = cur.h / 2 / (tanV * usable);
        const distW = cur.w / 2 / (tanV * aspect * 0.94);
        const dist = Math.max(distH, distW);
        const pitch = c.pitch * Math.PI / 180;
        // Вертикальный сдвиг: область чуть ниже середины (сверху заголовок).
        const shiftY = (H > W ? 0.04 : 0.03) * 2 * tanV * dist;
        const tx = cur.x + cur.ox * 2 * tanV * aspect * dist, ty = cur.y + shiftY + cur.oy * 2 * tanV * dist, tz = cur.z;
        c.target.set(tx, ty, tz);
        let sx = 0, sy = 0;
        if (c.shakeT > 0) {
            // Плавная тряска (сумма синусов, гаснет), а не случайный скачок каждый кадр.
            c.shakeT -= dt;
            c.shakePh = (c.shakePh || 0) + dt;
            const a = c.shake * 0.6 * Math.min(1, c.shakeT / 0.25), q = c.shakePh;
            sx = a * (Math.sin(q * 47) * 0.6 + Math.sin(q * 83 + 1.3) * 0.4);
            sy = a * (Math.sin(q * 59 + 2.1) * 0.6 + Math.sin(q * 71) * 0.4);
        }
        cam.position.set(tx + sx, ty + Math.sin(pitch) * dist + sy, tz + Math.cos(pitch) * dist);
        cam.setTarget(new BABYLON.Vector3(tx + sx, ty + sy, tz));
        cam.maxZ = Math.max(9000, dist * 6);
        c.dist = dist;
        // Туман нарастает с расстоянием: в портрете камера втрое дальше, и поле тонуло в дымке.
        // Плотность подстраиваем так, чтобы на расстоянии до цели туман был как в ландшафте.
        const fogRef = 800;
        this.scene.fogDensity = this.theme.fog * Math.min(1, fogRef / Math.max(1, dist));
        this.view.fitShadowFrustum(tx, tz, 0, Math.max(cur.w, cur.h) * 0.9 + 200);
    }

    shake(amount, time) { this.cam.shake = Math.max(this.cam.shakeT > 0 ? this.cam.shake : 0, amount); this.cam.shakeT = Math.max(this.cam.shakeT, time || 0.25); }

    // --- Кадр ----------------------------------------------------------------------------

    update(dt) {
        if (this.disposed) return;
        const step = Math.min(dt, 1 / 30) * this.slow;
        this.time += step;
        this._updateGrab(dt);
        for (const it of this.items) if (it.update) it.update(step);
        if (this.dummy) {
            const d = this.dummy, v = d.comVel || (d.comVel = new V3());
            v.set(0, 0, 0);
            for (const p of d.parts) v.addScaled(p.body.vel, p.def.mass / d.mass);
            d.update(step);
        }
        if (step > 0) {
            this.world.substeps = Math.max(4, Math.min(16, Math.round(step / (1 / 600))));
            this.world.step(step);
        }
        this._applyDamage(step);
        this._respawnTick(step);
        for (const it of this.items) if (it.post) it.post(step);
        this._checkBounds(step);
    }

    // Меши за телами; вызывается каждый кадр (и на паузе — для камеры).
    sync(dt) {
        for (const s of this.syncs) {
            const b = s.body, n = s.node;
            n.position.set(b.pos.x, b.pos.y, b.pos.z);
            n.rotationQuaternion.set(b.q.x, b.q.y, b.q.z, b.q.w);
        }
        for (const it of this.items) if (it.sync) it.sync(dt);
        if (this.dummy && this.dummy.visual) this.dummy.visual.sync(dt);
        this._updateCamera(dt, false);
    }

    // Взорванный заряд вернётся через delay секунд (Props.detonate).
    respawnLater(item, body, drag, home, delay) {
        this.respawns.push({ item, body, drag, home, t: delay });
    }

    _respawnTick(dt) {
        for (let i = this.respawns.length - 1; i >= 0; i--) {
            const r = this.respawns[i];
            r.t -= dt;
            if (r.t > 0) continue;
            this.respawns.splice(i, 1);
            const b = r.body, ex = b.data && b.data.explosive;
            b.teleport(r.home.pos, r.home.q);
            if (ex) { ex.done = false; ex.fuse = 0; }
            this.world.add(b);
            if (r.drag) this.draggable.add(b);
            const s = this.syncs.find(x => x.body === b);
            if (s) s.node.setEnabled(true);
            if (r.item.onRespawn) r.item.onRespawn();
            if (this.hooks.onRespawnItem) this.hooks.onRespawnItem(b.pos);
        }
    }

    // Предмет или манекен улетел за пределы уровня — вернуть на место.
    _checkBounds(dt) {
        const B = this.bounds;
        const out = (p) => p.y < B.y0 || p.x < B.x0 || p.x > B.x1 || p.z < B.z0 || p.z > B.z1;
        if (this.dummy && out(this.dummy.center)) {
            this.dummyOut = (this.dummyOut || 0) + dt;
            if (this.dummyOut > 0.6) { this.releaseGrab(); this.dummy.respawn(); this.dummyOut = 0; if (this.hooks.onRespawn) this.hooks.onRespawn(); }
        }
        for (const it of this.items) {
            if (!it.home || !it.body) continue;
            if (out(it.body.pos)) {
                it._out = (it._out || 0) + dt;
                if (it._out > 1) { if (this.grab && this.grab.body === it.body) this.releaseGrab(); it.body.teleport(it.home.pos, it.home.q); it._out = 0; }
            } else it._out = 0;
        }
    }

    // --- Перетаскивание ------------------------------------------------------------------

    // Точка экрана (CSS px канваса) -> луч в мире.
    ray(px, py) {
        const r = this.scene.createPickingRay(px, py, BABYLON.Matrix.Identity(), this.view.camera, false);
        return { o: new V3(r.origin.x, r.origin.y, r.origin.z), d: new V3(r.direction.x, r.direction.y, r.direction.z).normalize() };
    }

    screen(p) { return this.view.projectToScreen(p.x, p.z, p.y); }

    // Нажатие: тело под пальцем (или ближайшее в 70 px экрана). true — схватили.
    pointerDown(px, py) {
        if (this.grab) return false;
        const { o, d } = this.ray(px, py);
        const hit = this.world.raycast(o, d, 20000, b => this.draggable.has(b));
        let body = null, point = null;
        if (hit) { body = hit.body; point = hit.point; }
        else {
            let best = 80 * 80;
            for (const b of this.draggable) {
                b.updateWorld(0);
                const pts = [b.pos];
                for (const s of b.shapes) { if (s.type === 'capsule') pts.push(s.wa, s.wb); else if (s.type !== 'plane') pts.push(s.wc); }
                for (const p of pts) {
                    const sp = this.screen(p);
                    if (sp.behind) continue;
                    const dd = (sp.x - px) * (sp.x - px) + (sp.y - py) * (sp.y - py);
                    if (dd < best) { best = dd; body = b; point = p.clone(); }
                }
            }
        }
        if (!body) return false;
        this.startGrab(body, point, px, py);
        return true;
    }

    startGrab(body, point, px, py) {
        const dm = body.data && body.data.dummy;
        if (dm) dm.activate();
        const item = body.data && body.data.item;
        if (item && item.onGrab) item.onGrab();
        const mass = dm ? dm.mass : Math.max(0.5, body.mass);
        const frac = Math.max(0.035, Math.min(0.3, 0.3 * Math.sqrt(8 / (8 + mass))));
        // Тяжёлое пальцем не разогнать как пёрышко: предел скорости по массе, пока держим.
        const cap = 600 + 2400 * 10 / (10 + mass);
        for (const b of dm ? dm.parts.map(p => p.body) : [body]) { b._maxSpeed0 = b._maxSpeed0 || b.maxSpeed; b.maxSpeed = cap; }
        const g = new PGrab(body, body.toLocal(point), frac);
        this.world.constraints.push(g);
        // Плоскость перетаскивания — параллельна экрану, через точку захвата.
        const cam = this.view.camera;
        const fwd = cam.getForwardRay(1).direction;
        this.grab = { body, constraint: g, plane: { p: point.clone(), n: new V3(fwd.x, fwd.y, fwd.z).normalize() }, px, py, last: point.clone(), vel: new V3(), item };
        this.touched = true;
        if (this.hooks.onGrab) this.hooks.onGrab(body);
        this.pointerMove(px, py);
    }

    pointerMove(px, py) {
        this.pointer = { x: px, y: py };
        const g = this.grab;
        if (!g) return;
        g.px = px; g.py = py;
    }

    _updateGrab(dt) {
        const g = this.grab;
        if (!g) return;
        let raw;
        if (g.world) raw = g.world.clone();   // цель в мире (автотест): как палец, но без экрана
        else {
            const { o, d } = this.ray(g.px, g.py);
            const pl = g.plane;
            const den = d.dot(pl.n);
            if (Math.abs(den) < 1e-6) return;
            const t = V3.sub(pl.p, o).dot(pl.n) / den;
            if (t <= 0) return;
            raw = o.clone().addScaled(d, t);
        }
        // Не вдавливать в пол: самая нижняя точка тела остаётся над землёй (над ямой — можно).
        const b = g.body;
        b.updateWorld(0);
        const p = b.toWorld(g.constraint.local);
        const gap = p.y - b.aabbMin.y;
        if (!this.holes.some(h => raw.x > h.x0 && raw.x < h.x1 && raw.z > h.z0 && raw.z < h.z1)) raw.y = Math.max(raw.y, gap + 1);
        // События пальца приходят неровно (в одном кадре нет, в следующем скачок): цель
        // идёт за пальцем критически задемпфированной пружиной (~35 мс) — движение плавное.
        const w = 28, h = Math.min(dt, 1 / 20);
        if (!g.aim) { g.aim = p.clone(); g.aimVel = new V3(); }
        const e = Math.exp(-w * h);
        for (const k of ['x', 'y', 'z']) {
            const x0 = g.aim[k] - raw[k], v0 = g.aimVel[k], c = v0 + w * x0;
            g.aim[k] = raw[k] + (x0 + c * h) * e;
            g.aimVel[k] = (v0 - w * c * h) * e;
        }
        g.last.copy(g.aim);
        g.vel.copy(g.aimVel);
        g.constraint.target.copy(g.aim);
        g.constraint.targetVel.copy(g.aimVel);
        const vl = g.aimVel.len();
        if (vl > 3500) g.constraint.targetVel.scale(3500 / vl);
    }

    pointerUp() { this.releaseGrab(); }

    releaseGrab() {
        const g = this.grab;
        if (!g) return;
        const i = this.world.constraints.indexOf(g.constraint);
        if (i >= 0) this.world.constraints.splice(i, 1);
        this.grab = null;
        const dm = g.body.data && g.body.data.dummy;
        for (const b of dm ? dm.parts.map(p => p.body) : [g.body]) { if (b._maxSpeed0) { b.maxSpeed = b._maxSpeed0; b._maxSpeed0 = 0; } }
        if (g.item && g.item.onRelease) g.item.onRelease();
        if (this.hooks.onRelease) this.hooks.onRelease(g.body);
    }

    // Путь руки-подсказки на экране: от того, что тянуть, к цели.
    hintPath() {
        let from = null, to = null;
        const tool = this.items.find(it => it.body && this.draggable.has(it.body) && !(it.body.data && it.body.data.dummy));
        const cutter = this.cuttable.find(it => it.rope && it.rope.joint.enabled);
        if (cutter && !tool) {
            const a = cutter.body.toWorld(new V3(0, 40, 0)), z = cutter.rope.anchor;
            const mid = V3.lerp(a, z, 0.5);
            from = this.screen(mid.clone().add(new V3(-70, 0, 0)));
            to = this.screen(mid.clone().add(new V3(70, 0, 0)));
            return from && to ? { from, to } : null;
        }
        if (tool) {
            from = this.screen(tool.body.pos);
            const aim = this.hint || (this.dummy ? this.dummy.center : null);
            if (aim) to = this.screen(aim);
        } else if (this.canDragDummy && this.dummy) {
            from = this.screen(this.dummy.byId.chest.body.pos);
            let aim = this.hint;
            if (!aim) {
                const hz = this.items.find(it => it.marker && it.kind !== 'rack');
                aim = hz ? hz.marker.pos.clone().add(new V3(0, 60, 0)) : this.dummy.center.clone().add(new V3(160, 120, 0));
            }
            to = this.screen(aim);
        }
        if (!from || !to || from.behind || to.behind) return null;
        // Не дальше 45% экрана: рука показывает направление, а не весь путь.
        const dx = to.x - from.x, dy = to.y - from.y, l = Math.hypot(dx, dy);
        const maxL = Math.min(window.innerWidth, window.innerHeight) * 0.45;
        if (l > maxL) { to = { x: from.x + dx / l * maxL, y: from.y + dy / l * maxL }; }
        return { from, to };
    }

    // Взмах пальца от a до b (экран) перерезает верёвки, которые пересёк.
    cutAlong(a, b) {
        const cross = (p, q, r, s) => {
            const d = (q.x - p.x) * (s.y - r.y) - (q.y - p.y) * (s.x - r.x);
            if (Math.abs(d) < 1e-6) return false;
            const t = ((r.x - p.x) * (s.y - r.y) - (r.y - p.y) * (s.x - r.x)) / d;
            const u = ((r.x - p.x) * (q.y - p.y) - (r.y - p.y) * (q.x - p.x)) / d;
            return t >= 0 && t <= 1 && u >= 0 && u <= 1;
        };
        for (const it of this.cuttable) {
            const r = it.rope;
            if (!r || !r.joint.enabled) continue;
            const p1 = this.screen(r.joint.w0.len2() ? r.joint.w0 : it.body.pos), p2 = this.screen(r.anchor);
            if (cross(a, b, p1, p2)) {
                r.joint.enabled = false;
                this.world.removeJoint(r.joint);
                this.touched = true;
                if (this.hooks.onCut) this.hooks.onCut(it);
            }
        }
    }


    // Точка захвата на экране (для зелёной линии).
    grabScreen() {
        const g = this.grab;
        if (!g) return null;
        const p = g.body.toWorld(g.constraint.local);
        return this.screen(p);
    }

    // --- Контакты и урон -------------------------------------------------------------------

    _preContact(c) {
        const d = this.dummy;
        if (!d || d.active) return;
        const pa = c.a.data && c.a.data.dummy === d, pb = c.b.data && c.b.data.dummy === d;
        if (pa === pb) return;
        const other = pa ? c.b : c.a;
        const od = other.data || {};
        if (od.ground || od.wall) return;
        const speed = -c.vnPre;
        if (od.hazard || od.crush || od.conveyor || od.bumper || speed > 70 || (other.type === 'dynamic' && other.vel.len() > 140)) d.activate();
    }

    _onContact(c, h) {
        this._side(c.a, c.b, c, 1);
        this._side(c.b, c.a, c, -1);
        const ea = c.a.data && c.a.data.explosive, eb = c.b.data && c.b.data.explosive;
        if (ea || eb) {
            const speed = -c.vnPre;
            // Мина — от любого касания; ящик/баллон — от сильного удара (манекен, привалившийся к нему, не в счёт).
            const fire = (ex, other) => ex.touch ? other.type === 'dynamic'
                : speed > (ex.threshold != null ? ex.threshold : 480) && !(other.data && other.data.dummy && speed < 700);
            if (ea && !ea.done && fire(ea, c.b)) Props.detonate(this, c.a);
            if (eb && !eb.done && fire(eb, c.a)) Props.detonate(this, c.b);
        }
    }

    _side(me, other, c, sign) {
        const md = me.data;
        const part = md && md.part;
        if (!part) return;
        const od = other.data || {};
        if (od.dummy === md.dummy || od.wall) return;   // невидимая стенка кадра не ломает кости
        // Опасность (пила, огонь, ток): урон в секунду, пока касается.
        const hz = od.hazard;
        if (hz) {
            const shape = sign > 0 ? c.sb : c.sa;
            if (!od.hazardTag || (shape && shape.tag === od.hazardTag)) {
                if (hz.dps > part.hazard) { part.hazard = hz.dps; part.hazardKind = hz.kind || 'cut'; part.hazardPoint = (sign > 0 ? c.pB : c.pA).clone(); part.hazardItem = od.item || null; }
            }
        }
        if (c.sensor) return;
        const n = sign > 0 ? c.n.clone() : c.n.clone().scale(-1);   // от другого к этой части
        part.touches.push({ other, n });
        // Бампер отталкивает (пинбол).
        if (od.bumper && (part.bumpCd || 0) <= this.time) {
            part.bumpCd = this.time + 0.25;
            for (const p of md.dummy.parts) p.body.vel.addScaled(n, od.bumper * (p === part ? 1 : 0.45));
            if (this.hooks.onBump) this.hooks.onBump(c.pA);
        }
        let speed = -c.vnPre;
        const U = 'undefined';
        const vmin = typeof GAME_IMPACT_MIN_SPEED !== U ? GAME_IMPACT_MIN_SPEED : 350;
        if (speed < vmin) return;
        // О пол, стену, машину бьёт всё тело: скорость части ограничена скоростью центра масс
        // манекена относительно препятствия (хлёстнувшая кисть — не перелом).
        if (other.type !== 'dynamic' && md.dummy.comVel) {
            const vo = other.velocityAt(sign > 0 ? c.pB : c.pA);
            const rel = V3.sub(md.dummy.comVel, vo);
            const app = -rel.dot(n);
            speed = Math.min(speed, Math.max(0, app) * 1.3 + 150);
            if (speed < vmin) return;
        }
        const K = typeof GAME_IMPACT_DAMAGE !== U ? GAME_IMPACT_DAMAGE : 16;
        // Эффективная скорость удара по кости (м/с): лёгкий предмет отдаёт кости лишь долю
        // своей скорости — m/(m + масса части); стена и пол — всю. Урон — за превышение порога.
        const mO = other.type === 'dynamic' ? other.mass : Infinity, mP = me.mass || 1;
        const ratio = mO === Infinity ? 1 : mO / (mO + mP);
        const factor = od.impactFactor != null ? od.impactFactor : (other.type === 'dynamic' ? 1 : 0.6);
        let dmg = K * Math.max(0, (speed - vmin) / 100) * ratio * factor * (od.power || 1);
        if (this.grab && this.grab.body.data && this.grab.body.data.dummy === md.dummy) dmg *= 0.3;
        if (dmg > part.impact) { part.impact = dmg; part.impactPoint = (sign > 0 ? c.pA : c.pB).clone(); part.impactOther = other; part.impactSpeed = speed; }
    }

    _applyDamage(dt) {
        const d = this.dummy;
        if (!d) return;
        let bigHit = 0, hitPoint = null, hitOther = null;
        for (const p of d.parts) {
            if (p.impact > 10 && p.cooldown <= 0) {
                d.damage(p, p.impact, 'impact');
                p.cooldown = 0.12;
                if (p.impact > bigHit) { bigHit = p.impact; hitPoint = p.impactPoint; hitOther = p.impactOther; }
            }
            if (p.hazard > 0) {
                const kind = p.hazardKind;
                d.damage(p, p.hazard * dt, kind);
                if (kind === 'burn') p.burn = Math.min(1, p.burn + dt * 0.9);
                if (kind === 'shock') p.shock = 1;
                if (this.hooks.onHazard) this.hooks.onHazard(p, kind, p.hazardPoint, p.hazardItem);
            }
            // Раздавливание: касание «давилки» и опоры с противоположной стороны.
            for (const t of p.touches) {
                const cr = t.other.data && t.other.data.crush;
                if (!cr || (this.grab && this.grab.body === t.other)) continue;   // держим пальцем — не пресс
                if (p.touches.some(u => u.other !== t.other && u.n.dot(t.n) < -0.25)) {
                    d.damage(p, cr * dt, 'crush');
                    if (this.hooks.onHazard) this.hooks.onHazard(p, 'crush', p.body.pos, null);
                    break;
                }
            }
            p.impact = 0; p.hazard = 0; p.touches.length = 0;
        }
        if (bigHit > 0 && this.hooks.onImpact) this.hooks.onImpact(bigHit, hitPoint, hitOther);
    }

    _onBreak(part, kind) {
        if (this.hooks.onBreak) this.hooks.onBreak(part, kind);
    }

    // --- Уборка --------------------------------------------------------------------------

    dispose() {
        this.disposed = true;
        this.releaseGrab();
        for (const it of this.items) { try { if (it.dispose) it.dispose(); } catch (e) { console.warn(e); } }
        if (this.dummy) this.dummy.dispose();
        // Меши моделей карты удаляет Location3D — отцепить от наших узлов.
        for (const m of this.reparented) { try { if (!m.isDisposed()) m.parent = null; } catch (e) { /* ok */ } }
        for (const n of this.nodes) { try { n.dispose(false, false); } catch (e) { /* уже снесён */ } }
        for (const m of this.mats.values()) { try { m.dispose(); } catch (e) { /* ok */ } }
        this.items = []; this.nodes = []; this.syncs = []; this.mats.clear();
        this.world.clear();
    }
}
