// Dummy.js — манекен для краш-тестов: 16 частей (= 16 костей) на физике Phys.js,
// суставы с пределами (шея, позвоночник, плечи, локти, кисти, бёдра, колени,
// стопы), позы (стоит, сидит, лежит, боксирует, висит, привязан…), кости с
// прочностью, поломка (цвет, трещины, «разболтанный» сустав), лицо.
//
// Пока манекен «в позе», его части кинематические (позу держит скрипт, лёгкое
// дыхание) — как в оригинале, он стоит, пока его не заденут. Удар, опасность или
// хватание — activate(): части становятся динамическими, дальше это ragdoll.
//
// Модельные координаты манекена: смотрит в +Z, левая сторона +X, вверх +Y, стопы
// на y = 0, рост ~187 px (1 м = 100 px). Позы — углы суставов (градусы, Эйлер как у
// Babylon: x — наклон вперёд/назад, y — поворот, z — вбок) в системе родителя.

const DUMMY_PARTS = [
    // id, центр (модель), форма, масса кг, прочность
    { id: 'pelvis', c: [0, 104, 0], cap: [[-7, 0, 0], [7, 0, 0], 13], mass: 10, hp: 150 },
    { id: 'belly', c: [0, 122, 0], cap: [[-5, 0, 0], [5, 0, 0], 12], mass: 8, hp: 130 },
    { id: 'chest', c: [0, 143, 0], cap: [[-8, 0, 0], [8, 0, 0], 16], mass: 15, hp: 150 },
    { id: 'head', c: [0, 174, 0], sph: 13, mass: 5, hp: 110 },
    { id: 'armL', c: [26, 135, 0], cap: [[0, -11, 0], [0, 11, 0], 7], mass: 2.5, hp: 90 },
    { id: 'foreL', c: [27.5, 103, 0], cap: [[0, -10, 0], [0, 10, 0], 6], mass: 1.5, hp: 85 },
    { id: 'handL', c: [28.5, 80, 0], cap: [[0, -4, 0], [0, 4, 0], 5.5], mass: 0.5, hp: 65 },
    { id: 'armR', c: [-26, 135, 0], cap: [[0, -11, 0], [0, 11, 0], 7], mass: 2.5, hp: 90 },
    { id: 'foreR', c: [-27.5, 103, 0], cap: [[0, -10, 0], [0, 10, 0], 6], mass: 1.5, hp: 85 },
    { id: 'handR', c: [-28.5, 80, 0], cap: [[0, -4, 0], [0, 4, 0], 5.5], mass: 0.5, hp: 65 },
    { id: 'thighL', c: [10.5, 77.5, 0], cap: [[0, -16, 0], [0, 16, 0], 10], mass: 7, hp: 120 },
    { id: 'shinL', c: [11, 33, 0], cap: [[0, -17, 0], [0, 17, 0], 8], mass: 3.5, hp: 100 },
    { id: 'footL', c: [11, 5, 5], box: [6, 5, 12], mass: 1, hp: 65 },
    { id: 'thighR', c: [-10.5, 77.5, 0], cap: [[0, -16, 0], [0, 16, 0], 10], mass: 7, hp: 120 },
    { id: 'shinR', c: [-11, 33, 0], cap: [[0, -17, 0], [0, 17, 0], 8], mass: 3.5, hp: 100 },
    { id: 'footR', c: [-11, 5, 5], box: [6, 5, 12], mass: 1, hp: 65 },
];

const _S40 = Math.sin(40 * Math.PI / 180), _C40 = Math.cos(40 * Math.PI / 180);
const DUMMY_JOINTS = [
    // parent -> child; at — точка сустава (модель); axis — ось закрутки (направление ребёнка);
    // cone — центр конуса качания (у плеч и бёдер смещён наружу/вперёд); углы — градусы
    { id: 'spineL', parent: 'pelvis', child: 'belly', at: [0, 113, 0], type: 'ball', axis: [0, 1, 0], swing: 24, twist: [-18, 18] },
    { id: 'spineU', parent: 'belly', child: 'chest', at: [0, 131, 0], type: 'ball', axis: [0, 1, 0], swing: 24, twist: [-18, 18] },
    { id: 'neck', parent: 'chest', child: 'head', at: [0, 160, 0], type: 'ball', axis: [0, 1, 0], swing: 40, twist: [-55, 55] },
    { id: 'shoulderL', parent: 'chest', child: 'armL', at: [25, 152, 0], type: 'ball', axis: [0, -1, 0], cone: [_S40, -_C40, 0.15], swing: 125, twist: [-65, 65] },
    { id: 'elbowL', parent: 'armL', child: 'foreL', at: [27, 118, 0], type: 'hinge', hinge: [-4, 145] },
    { id: 'wristL', parent: 'foreL', child: 'handL', at: [28, 88, 0], type: 'ball', axis: [0, -1, 0], swing: 55, twist: [-35, 35] },
    { id: 'shoulderR', parent: 'chest', child: 'armR', at: [-25, 152, 0], type: 'ball', axis: [0, -1, 0], cone: [-_S40, -_C40, 0.15], swing: 125, twist: [-65, 65] },
    { id: 'elbowR', parent: 'armR', child: 'foreR', at: [-27, 118, 0], type: 'hinge', hinge: [-4, 145] },
    { id: 'wristR', parent: 'foreR', child: 'handR', at: [-28, 88, 0], type: 'ball', axis: [0, -1, 0], swing: 55, twist: [-35, 35] },
    { id: 'hipL', parent: 'pelvis', child: 'thighL', at: [10, 100, 0], type: 'ball', axis: [0, -1, 0], cone: [0.14, -0.81, 0.57], swing: 78, twist: [-35, 35] },
    { id: 'kneeL', parent: 'thighL', child: 'shinL', at: [11, 55, 0], type: 'hinge', hinge: [-145, 4] },
    { id: 'ankleL', parent: 'shinL', child: 'footL', at: [11, 11, 0], type: 'hinge', hinge: [-35, 35] },
    { id: 'hipR', parent: 'pelvis', child: 'thighR', at: [-10, 100, 0], type: 'ball', axis: [0, -1, 0], cone: [-0.14, -0.81, 0.57], swing: 78, twist: [-35, 35] },
    { id: 'kneeR', parent: 'thighR', child: 'shinR', at: [-11, 55, 0], type: 'hinge', hinge: [-145, 4] },
    { id: 'ankleR', parent: 'shinR', child: 'footR', at: [-11, 11, 0], type: 'hinge', hinge: [-35, 35] },
];

// Позы: root — поворот корпуса (градусы), face — какой вектор модели (после root)
// смотрит по курсу маркера, anchor — чем поза касается точки маркера: 'feet' (низ
// на высоте маркера), 'seat' (таз сидит на ней), 'low' (самая низкая точка), 'hands'
// (кисти висят на ней), 'feetTop' (стопы подвешены). pins — части, прибитые к миру.
const DUMMY_POSES = {
    stand: { face: [0, 0, 1], anchor: 'feet', j: { shoulderL: [0, 0, 11], shoulderR: [0, 0, -11], elbowL: [-14, 0, 0], elbowR: [-14, 0, 0], hipL: [0, 0, 3], hipR: [0, 0, -3], kneeL: [3, 0, 0], kneeR: [3, 0, 0] } },
    scared: { face: [0, 0, 1], anchor: 'feet', j: { shoulderL: [-50, 0, 25], shoulderR: [-50, 0, -25], elbowL: [-120, 0, 0], elbowR: [-120, 0, 0], hipL: [-8, 0, 6], hipR: [-8, 0, -6], kneeL: [14, 0, 0], kneeR: [14, 0, 0], spineU: [8, 0, 0] } },
    up: { face: [0, 0, 1], anchor: 'feet', j: { shoulderL: [0, 0, 150], shoulderR: [0, 0, -150], elbowL: [-20, 0, 0], elbowR: [-20, 0, 0], hipL: [0, 0, 5], hipR: [0, 0, -5] } },
    tpose: { face: [0, 0, 1], anchor: 'feet', j: { shoulderL: [0, 0, 82], shoulderR: [0, 0, -82], hipL: [0, 0, 9], hipR: [0, 0, -9] } },
    tied: { face: [0, 0, 1], anchor: 'feet', root: [-18, 0, 0], pins: ['handL', 'handR', 'footL', 'footR', 'chest'], j: { shoulderL: [0, 0, 55], shoulderR: [0, 0, -55], hipL: [0, 0, 8], hipR: [0, 0, -8] } },
    box: { face: [0, 0, 1], anchor: 'feet', j: { spineU: [6, -20, 0], neck: [0, 18, 0], shoulderL: [-55, 0, 18], elbowL: [-115, 0, 0], shoulderR: [-35, 0, -22], elbowR: [-125, 0, 0], hipL: [-22, 0, 6], hipR: [18, 0, -6], kneeL: [22, 0, 0], kneeR: [12, 0, 0], ankleL: [10, 0, 0] } },
    wave: { face: [0, 0, 1], anchor: 'feet', j: { shoulderL: [0, 0, 135], elbowL: [-30, 0, 0], shoulderR: [0, 0, -10], elbowR: [-10, 0, 0], hipL: [0, 0, 3], hipR: [0, 0, -3] } },
    sit: { face: [0, 0, 1], anchor: 'seat', j: { hipL: [-88, 0, 4], hipR: [-88, 0, -4], kneeL: [88, 0, 0], kneeR: [88, 0, 0], shoulderL: [-20, 0, 8], shoulderR: [-20, 0, -8], elbowL: [-40, 0, 0], elbowR: [-40, 0, 0] } },
    sitfloor: { face: [0, 0, 1], anchor: 'low', j: { hipL: [-85, 0, 8], hipR: [-85, 0, -8], kneeL: [8, 0, 0], kneeR: [8, 0, 0], spineL: [-8, 0, 0], shoulderL: [20, 0, 18], shoulderR: [20, 0, -18], elbowL: [-10, 0, 0], elbowR: [-10, 0, 0] } },
    lie: { face: [0, 0, -1], root: [-90, 0, 0], anchor: 'low', j: { shoulderL: [0, 0, 20], shoulderR: [0, 0, -20], elbowL: [-10, 0, 0], elbowR: [-10, 0, 0], hipL: [0, 0, 6], hipR: [0, 0, -6], ankleL: [20, 0, 0], ankleR: [20, 0, 0] } },
    liefront: { face: [0, 0, 1], root: [90, 0, 0], anchor: 'low', j: { shoulderL: [0, 0, 30], shoulderR: [0, 0, -30], elbowL: [-30, 0, 0], elbowR: [-30, 0, 0], hipL: [0, 0, 6], hipR: [0, 0, -6], ankleL: [-25, 0, 0], ankleR: [-25, 0, 0] } },
    kneel: { face: [0, 0, 1], anchor: 'low', j: { kneeL: [95, 0, 0], kneeR: [95, 0, 0], hipL: [-5, 0, 5], hipR: [-5, 0, -5], ankleL: [30, 0, 0], ankleR: [30, 0, 0], shoulderL: [0, 0, 150], shoulderR: [0, 0, -150], elbowL: [-15, 0, 0], elbowR: [-15, 0, 0] } },
    hang: { face: [0, 0, 1], anchor: 'hands', pins: ['handL', 'handR'], j: { shoulderL: [0, 0, 160], shoulderR: [0, 0, -160], hipL: [-6, 0, 3], hipR: [-6, 0, -3], kneeL: [10, 0, 0], kneeR: [10, 0, 0] } },
    hangfeet: { face: [0, 0, 1], root: [0, 0, 180], anchor: 'feetTop', pins: ['footL', 'footR'], j: { shoulderL: [0, 0, 20], shoulderR: [0, 0, -20], hipL: [0, 0, 4], hipR: [0, 0, -4] } },
    handstand: { face: [0, 0, 1], root: [0, 0, 180], anchor: 'low', j: { shoulderL: [0, 0, 165], shoulderR: [0, 0, -165], hipL: [0, 0, 8], hipR: [0, 0, -8] } },
    think: { face: [0, 0, 1], anchor: 'feet', j: { shoulderL: [-40, 0, 12], elbowL: [-135, 0, 0], shoulderR: [-38, 0, 12], elbowR: [-140, 0, 0], neck: [10, 0, 8], hipL: [0, 0, 3], hipR: [0, 0, -3] } },
    run: { face: [0, 0, 1], anchor: 'feet', j: { shoulderL: [40, 0, 8], elbowL: [-80, 0, 0], shoulderR: [-45, 0, -8], elbowR: [-80, 0, 0], hipL: [-40, 0, 3], kneeL: [40, 0, 0], hipR: [25, 0, -3], kneeR: [60, 0, 0], spineU: [8, 0, 0] } },
    dab: { face: [0, 0, 1], anchor: 'feet', j: { shoulderL: [0, 0, 135], elbowL: [0, 0, 0], shoulderR: [-60, 0, -95], elbowR: [-135, 0, 0], neck: [25, -25, 0], hipL: [0, 0, 8], hipR: [0, 0, -8] } },
    meditate: { face: [0, 0, 1], anchor: 'low', j: { hipL: [-80, 0, 38], hipR: [-80, 0, -38], kneeL: [140, 0, 0], kneeR: [140, 0, 0], shoulderL: [0, 0, 22], shoulderR: [0, 0, -22], elbowL: [-45, 0, 0], elbowR: [-45, 0, 0] } },
};

// Кости для интерфейса (порядок — как DUMMY_PARTS).
const DUMMY_BONE_KEYS = ['bonePelvis', 'boneSpine', 'boneRibs', 'boneSkull', 'boneArm', 'boneForearm', 'boneHand', 'boneArm', 'boneForearm', 'boneHand',
    'boneFemur', 'boneShin', 'boneFoot', 'boneFemur', 'boneShin', 'boneFoot'];

class Dummy {
    // world — PhysWorld; opts: { scene?, view?, pose, pos: V3 (точка маркера), heading (градусы курса карты), scale? }
    constructor(world, opts) {
        this.world = world;
        this.opts = opts || {};
        this.poseName = DUMMY_POSES[this.opts.pose] ? this.opts.pose : 'stand';
        this.pose = DUMMY_POSES[this.poseName];
        this.active = false;
        this.parts = [];          // { def, body, rest: V3, node, meshes, mat, hp, maxHp, broken, burn, ... }
        /** @type {DummyVisual | null} */
        this.visual = null;       // вид (Level: new DummyVisual)
        /** @type {PDepthLock | null} */
        this.depthLock = null;    // удержание на линии уровня (после оживления)
        this.byId = {};
        this.joints = [];         // { def, joint }
        this.pins = [];
        this.time = Math.random() * 10;
        this.brokenCount = 0;
        this.onBreak = null;      // (part) — кость сломана
        this.onActivate = null;
        this.face = null;
        this.root = { pos: new V3(), q: new Quat() };
        this.spawn = { pos: (this.opts.pos || new V3()).clone(), heading: this.opts.heading || 0 };
        this.power = 1;           // множитель урона (награда «Сила x2»)
        /** @type {V3 | null} */
        this.comVel = null;       // скорость центра масс (считает Level)
        this._buildPhysics();
        this.placePose(true);
    }

    _buildPhysics() {
        const w = this.world;
        for (const def of DUMMY_PARTS) {
            const b = new PBody({ type: 'dynamic', pos: new V3(def.c[0], def.c[1], def.c[2]), group: PHYS_GROUP.DUMMY,
                friction: 0.7, restitution: 0.05, linDamp: 0.08, angDamp: 0.9, listen: true, maxSpeed: 5000 });
            if (def.cap) b.addCapsule(v3(def.cap[0]), v3(def.cap[1]), def.cap[2]);
            else if (def.sph) b.addSphere(new V3(), def.sph);
            else if (def.box) b.addBox(new V3(), v3(def.box));
            b.finalize(def.mass);
            const part = { def, id: def.id, body: b, rest: b.pos.clone(), index: this.parts.length,
                hp: def.hp, maxHp: def.hp, broken: false, burn: 0, shock: 0, hit: 0, node: null, meshes: [], mat: null,
                hazard: 0, hazardKind: '', impact: 0, impactOther: null, impactPoint: null, cooldown: 0, touches: [] };
            b.data = { dummy: this, part };
            this.parts.push(part);
            this.byId[def.id] = part;
            w.add(b);
        }
        for (const def of DUMMY_JOINTS) {
            const child = this.byId[def.child].body, parent = this.byId[def.parent].body;
            const at = v3(def.at);
            const D = Math.PI / 180;
            const o = { b0: child, b1: parent, p0: child.toLocal(at), p1: parent.toLocal(at), damping: 12 };
            if (def.type === 'hinge') {
                Object.assign(o, { type: 'hinge', hingeMin: def.hinge[0] * D, hingeMax: def.hinge[1] * D });
            } else {
                const axis = v3(def.axis).normalize();
                const fc = Quat.fromTo(PHYS_AXES.X, axis);
                const cone = def.cone ? v3(def.cone).normalize() : axis;
                const fp = Quat.mul(Quat.fromTo(axis, cone), fc);
                Object.assign(o, { type: 'ball', r0: fc, r1: fp, swing: def.swing * D, twistMin: def.twist[0] * D, twistMax: def.twist[1] * D });
            }
            const j = new PJoint(o);
            j.data = { def, base: { swing: j.swing, twistMin: j.twistMin, twistMax: j.twistMax, hingeMin: j.hingeMin, hingeMax: j.hingeMax } };
            this.joints.push({ def, joint: j });
            w.addJoint(j);
            child.ignore = child.ignore || new Set(); parent.ignore = parent.ignore || new Set();
            child.ignore.add(parent); parent.ignore.add(child);
        }
        // Соседи через одного у корпуса и кисти у бёдер в позе «сидя» не мешают друг другу.
        const skip = [['pelvis', 'chest'], ['belly', 'thighL'], ['belly', 'thighR'], ['chest', 'head'], ['armL', 'belly'], ['armR', 'belly']];
        for (const [a, b] of skip) { this.byId[a].body.ignore.add(this.byId[b].body); this.byId[b].body.ignore.add(this.byId[a].body); }
        this.mass = this.parts.reduce((s, p) => s + p.def.mass, 0);
    }

    // --- Поза ------------------------------------------------------------------------

    // Мировая поза всех частей для набора углов суставов (FK от таза).
    _fk(angles, rootPos, rootQ) {
        const out = {};
        const pelvis = this.byId.pelvis;
        out.pelvis = { pos: rootQ.rotate(pelvis.rest).add(rootPos), q: rootQ.clone() };
        for (const { def } of this.joints) {
            const par = out[def.parent], cp = this.byId[def.child], pp = this.byId[def.parent];
            const a = angles[def.id];
            const R = a ? Quat.fromEulerDeg(a[0], a[1], a[2]) : new Quat();
            const q = Quat.mul(par.q, R);
            const at = v3(def.at);
            const anchor = par.q.rotate(V3.sub(at, pp.rest)).add(par.pos);
            const pos = q.rotate(V3.sub(cp.rest, at)).add(anchor);
            out[def.child] = { pos, q };
        }
        return out;
    }

    _poseAngles(t) {
        const a = {};
        const j = this.pose.j || {};
        for (const k in j) a[k] = j[k].slice();
        if (!this.opts.still) {
            const add = (k, x, y, z) => { const v = a[k] || (a[k] = [0, 0, 0]); v[0] += x; v[1] += y; v[2] += z; };
            const br = Math.sin(t * 1.9);
            add('spineU', br * 1.6, 0, 0);
            add('neck', Math.sin(t * 0.7) * 4, Math.sin(t * 0.45) * 14, Math.sin(t * 0.9) * 3);
            add('shoulderL', 0, 0, br * 2.2);
            add('shoulderR', 0, 0, -br * 2.2);
            if (this.poseName === 'wave') add('elbowL', Math.sin(t * 6) * 25, 0, 0);
            if (this.poseName === 'box') { const b = Math.sin(t * 4) * 5; add('spineL', b * 0.4, 0, 0); add('shoulderL', b, 0, 0); add('shoulderR', -b, 0, 0); }
            if (this.poseName === 'scared') { add('spineU', Math.sin(t * 17) * 1.2, 0, 0); }
        }
        return a;
    }

    // Корень позы из маркера: курс, опорная точка позы.
    _rootFor(angles) {
        const P = this.pose, D = Math.PI / 180;
        const rootRot = P.root ? Quat.fromEulerDeg(P.root[0], P.root[1], P.root[2]) : new Quat();
        const f = rootRot.rotate(v3(P.face || [0, 0, 1]));
        const phi = Math.atan2(f.z, f.x);
        const yaw = Quat.fromAxisAngle(PHYS_AXES.Y, phi - this.spawn.heading * D);
        const q = Quat.mul(yaw, rootRot);
        const s = this.spawn.pos;
        // Поставить по опоре: сначала в ноль, потом сдвинуть по высоте.
        const probe = this._fk(angles, new V3(0, 0, 0), q);
        let dy = 0;
        const partsY = (ids, fn) => {
            let v = fn === 'min' ? Infinity : -Infinity;
            for (const id of ids) {
                const p = probe[id], part = this.byId[id];
                const r = part.def.cap ? part.def.cap[2] : (part.def.sph || part.def.box[1]);
                const y = fn === 'min' ? p.pos.y - r : p.pos.y + r;
                v = fn === 'min' ? Math.min(v, y) : Math.max(v, y);
            }
            return v;
        };
        const all = DUMMY_PARTS.map(d => d.id);
        if (P.anchor === 'feet' || P.anchor === 'low') dy = -partsY(P.anchor === 'feet' ? ['footL', 'footR', 'shinL', 'shinR'] : all, 'min');
        else if (P.anchor === 'seat') dy = -(probe.pelvis.pos.y - 13);
        else if (P.anchor === 'hands') dy = -probe.handL.pos.y;
        else if (P.anchor === 'feetTop') dy = -probe.footL.pos.y;
        // Горизонталь: таз над точкой маркера (у лежачей — середина между головой и стопами).
        let cx = probe.pelvis.pos.x, cz = probe.pelvis.pos.z;
        if (P.anchor === 'hands') { cx = (probe.handL.pos.x + probe.handR.pos.x) / 2; cz = (probe.handL.pos.z + probe.handR.pos.z) / 2; }
        if (P.anchor === 'feetTop') { cx = (probe.footL.pos.x + probe.footR.pos.x) / 2; cz = (probe.footL.pos.z + probe.footR.pos.z) / 2; }
        if (this.poseName === 'lie' || this.poseName === 'liefront') {
            cx = (probe.head.pos.x + probe.footL.pos.x) / 2; cz = (probe.head.pos.z + probe.footL.pos.z) / 2;
        }
        return { pos: new V3(s.x - cx, s.y + dy + 0.5, s.z - cz), q };
    }

    // Поставить позу (teleport — без скорости: старт уровня и возврат манекена).
    placePose(teleport) {
        const angles = this._poseAngles(this.time);
        const r = this._rootFor(angles);
        this.root = r;
        const fk = this._fk(angles, r.pos, r.q);
        for (const p of this.parts) {
            const t = fk[p.id];
            if (teleport) p.body.teleport(t.pos, t.q);
            else { p.body.kinPos.copy(t.pos); p.body.kinQ.copy(t.q); }
        }
        if (teleport) {
            for (const p of this.parts) { p.body.setType('kinematic'); p.body.detect = true; }
            this.active = false;
            this._makePins();
        }
    }

    _makePins() {
        for (const pin of this.pins) { this.world.removeJoint(pin.joint); this.world.remove(pin.anchor); }
        this.pins = [];
        // Флаг pin (маркер dummy.<поза>.pin) — корпус закреплён, как у груши: бьют, а он стоит.
        const ids = (this.pose.pins || []).concat(this.opts.pin ? ['chest', 'pelvis'] : []);
        for (const id of [...new Set(ids)]) {
            const part = this.byId[id];
            const at = id === 'chest' ? part.body.toWorld(new V3(0, 8, 0)) : part.body.pos.clone();
            const anchor = this.world.add(new PBody({ type: 'static', pos: at, group: 0, mask: 0 }));
            const j = new PJoint({ b0: part.body, b1: anchor, type: 'ball', p0: part.body.toLocal(at), p1: new V3(), damping: 2 });
            this.world.addJoint(j);
            this.pins.push({ part, anchor, joint: j });
        }
    }

    // Ожить: позу больше не держим, дальше — ragdoll.
    activate() {
        if (this.active) return;
        this.active = true;
        for (const p of this.parts) { p.body.detect = false; p.body.setType('dynamic'); }
        // Манекен не уходит по z: центр масс — на линии уровня, конечности гнутся свободно.
        if (!this.depthLock) {
            this.depthLock = new PDepthLock(this.parts.map(p => p.body), 60);
            this.world.constraints.push(this.depthLock);
        }
        if (this.onActivate) this.onActivate();
    }

    // Вернуть манекен на точку старта (улетел за пределы уровня). Кости остаются сломанными.
    respawn() {
        this.placePose(true);
        this.activate();
        for (const p of this.parts) p.body.vel.set(0, -50, 0);
    }

    get center() { return this.byId.chest.body.pos; }

    // --- Урон ------------------------------------------------------------------------

    // Урон части: amount — очки прочности; kind — 'impact' | 'hazard' | 'crush' | 'fire' | 'shock'.
    damage(part, amount, kind, depth = 0) {
        if (amount <= 0) return false;
        if (!depth) amount *= this.power;
        part.hit = Math.min(1, part.hit + amount / 60);
        if (part.broken) {
            // Удар по сломанной кости отдаётся соседней целой: удары в одно место тоже ломают.
            const next = depth < 2 ? this._neighbor(part) : null;
            return next ? this.damage(next, amount * 0.5, kind, depth + 1) : false;
        }
        part.hp -= amount;
        if (part.hp > 0) return false;
        part.hp = 0;
        part.broken = true;
        this.brokenCount++;
        // Сломанная кость «разбалтывает» соседние суставы.
        for (const { joint } of this.joints) {
            if (joint.b0 !== part.body && joint.b1 !== part.body) continue;
            const D = Math.PI / 180;
            if (joint.type === 'hinge') { joint.hingeMin -= 35 * D; joint.hingeMax += 35 * D; }
            else { if (joint.swing >= 0) joint.swing = Math.min(Math.PI * 0.95, joint.swing + 35 * D); joint.twistMin -= 30 * D; joint.twistMax += 30 * D; }
            joint.damping = 2;
        }
        if (this.onBreak) this.onBreak(part, kind);
        return true;
    }

    // Целая соседняя кость (по суставу) с наименьшим запасом прочности.
    _neighbor(part) {
        let best = null;
        for (const { joint } of this.joints) {
            const other = joint.b0 === part.body ? joint.b1 : (joint.b1 === part.body ? joint.b0 : null);
            if (!other) continue;
            const p = this.parts.find(x => x.body === other);
            if (p && !p.broken && (!best || p.hp < best.hp)) best = p;
        }
        return best;
    }

    // Кадр: поза (пока не ожил), остывание вспышек.
    update(dt) {
        this.time += dt;
        if (!this.active) this.placePose(false);
        for (const p of this.parts) {
            p.hit = Math.max(0, p.hit - dt * 2.5);
            p.shock = Math.max(0, p.shock - dt * 2);
            p.cooldown = Math.max(0, p.cooldown - dt);
        }
    }

    lowestY() { let y = Infinity; for (const p of this.parts) y = Math.min(y, p.body.pos.y); return y; }

    dispose() {
        if (this.depthLock) { const i = this.world.constraints.indexOf(this.depthLock); if (i >= 0) this.world.constraints.splice(i, 1); this.depthLock = null; }
        for (const pin of this.pins) { this.world.removeJoint(pin.joint); this.world.remove(pin.anchor); }
        for (const { joint } of this.joints) this.world.removeJoint(joint);
        for (const p of this.parts) this.world.remove(p.body);
        if (this.visual) this.visual.dispose();
        this.pins = []; this.joints = [];
    }
}

function v3(a) { return new V3(a[0], a[1], a[2]); }

// --- Внешний вид манекена (Babylon) ------------------------------------------------

class DummyVisual {
    constructor(dummy, view) {
        this.dummy = dummy;
        this.view = view;
        const scene = view.scene;
        this.scene = scene;
        const B = BABYLON.MeshBuilder;
        const C = (hex) => World3D.hexColor3(hex);
        this.colors = { body: C(DummyVisual.BODY), joint: C(DummyVisual.JOINT), hurt: C(0xe0452b), burnt: C(0x2a2522), shock: C(0x8ff4ff) };
        this.jointMat = DummyVisual.mat(scene, 'dummy-joint', this.colors.joint);
        const dark = DummyVisual.mat(scene, 'dummy-ink', C(0x151515));
        const white = DummyVisual.mat(scene, 'dummy-eye', C(0xffffff));
        white.metadata = { toon: false }; white.emissiveColor = C(0xdddddd);
        this.roots = [];
        for (const part of dummy.parts) {
            const root = new BABYLON.Mesh('dummy-' + part.id, scene);
            root.rotationQuaternion = new BABYLON.Quaternion();
            const mat = DummyVisual.mat(scene, 'dummy-mat-' + part.id, this.colors.body.clone());
            part.mat = mat;
            part.node = root;
            const d = part.def;
            const meshes = [];
            const add = (m, material) => { m.parent = root; m.material = material || mat; meshes.push(m); return m; };
            if (part.id === 'head') {
                const h = add(B.CreateSphere('head', { diameter: 27, segments: 16 }, scene)); h.scaling.set(0.96, 1.06, 1);
                for (const s of [1, -1]) {
                    const eye = add(B.CreateSphere('eye', { diameter: 9.5, segments: 10 }, scene), white);
                    eye.position.set(4.6 * s, 3.2, 10.6);
                    const pupil = add(B.CreateSphere('pupil', { diameter: 3.6, segments: 8 }, scene), dark);
                    pupil.position.set(4.6 * s, 3.2, 15.1);
                    (this.pupils || (this.pupils = [])).push({ mesh: pupil, base: pupil.position.clone(), eye });
                }
                const mouth = [];
                for (let i = 0; i <= 6; i++) mouth.push(new BABYLON.Vector3(-6 + i * 2, -5.6 + (i % 2 ? 1.6 : -0.6), 12.3 - Math.abs(i - 3) * 0.35));
                this.mouth = add(B.CreateTube('mouth', { path: mouth, radius: 0.75, tessellation: 5 }, scene), dark);
            } else if (part.id === 'chest') {
                const c = add(B.CreateCapsule('chest', { height: 50, radius: 17, orientation: BABYLON.Axis.X, tessellation: 18, subdivisions: 2 }, scene)); c.scaling.set(1, 0.98, 0.76);
                const neck = add(B.CreateSphere('neckball', { diameter: 13, segments: 10 }, scene), this.jointMat); neck.position.set(0, 15, 0);
                for (const s of [1, -1]) {
                    const sh = add(B.CreateSphere('shoulder', { diameter: 17, segments: 12 }, scene), this.jointMat);
                    sh.position.set(24 * s, 9, 0);
                }
            } else if (part.id === 'belly') {
                // Пояс — коричневый, как шарниры, но свой материал: краснеет при переломе.
                part.mat = DummyVisual.mat(scene, 'dummy-belly', this.colors.joint.clone());
                const b = add(B.CreateCapsule('belly', { height: 34, radius: 12, orientation: BABYLON.Axis.X, tessellation: 16 }, scene), part.mat);
                b.scaling.set(1, 0.9, 0.72);
            } else if (part.id === 'pelvis') {
                const p = add(B.CreateCapsule('pelvis', { height: 42, radius: 14, orientation: BABYLON.Axis.X, tessellation: 16 }, scene)); p.scaling.set(1, 0.95, 0.8);
                for (const s of [1, -1]) {
                    const hip = add(B.CreateSphere('hip', { diameter: 17, segments: 10 }, scene), this.jointMat); hip.position.set(10 * s, -6, 0);
                }
            } else if (d.cap) {
                const L = Math.abs(d.cap[1][1] - d.cap[0][1]), r = d.cap[2];
                if (/^hand/.test(part.id)) {
                    const palm = add(B.CreateCapsule('hand', { height: L + 2 * r + 2, radius: r, tessellation: 10 }, scene)); palm.scaling.set(1, 1, 0.62);
                    const thumb = add(B.CreateCapsule('thumb', { height: 9, radius: 2.2, tessellation: 8 }, scene));
                    thumb.position.set(0, 1, 4.2); thumb.rotation.x = 0.6;
                } else {
                    add(B.CreateCapsule(part.id, { height: L + 2 * r, radius: r, tessellation: 14 }, scene));
                    // Шар сустава на нижнем конце (локоть, запястье, колено, лодыжка).
                    const jr = /^fore/.test(part.id) ? 5 : (/^arm/.test(part.id) ? 7.2 : (/^thigh/.test(part.id) ? 9.4 : 7.4));
                    const ball = add(B.CreateSphere('joint', { diameter: jr * 2, segments: 10 }, scene), this.jointMat);
                    ball.position.set(0, -L / 2 - r * 0.55, 0);
                }
            } else if (d.box) {
                const foot = add(B.CreateCapsule('foot', { height: 26, radius: 6.2, orientation: BABYLON.Axis.Z, tessellation: 10 }, scene));
                foot.scaling.set(1.05, 0.85, 1); foot.position.set(0, -0.6, 0.5);
            }
            part.meshes = meshes;
            World3D.addObject(view, root, 'actor');
            this.roots.push(root);
        }
        this.xEyes = false;
        this.glow = 0;
        this.skinGlow = 0;        // скин светится сам (Cosmetics)
        /** @type {Array<{slot: string, mesh: any, w: number}>} */
        this.spins = [];          // вращающиеся детали косметики (пропеллер)
        this.worn = {};
        this.skinId = '';
        if (typeof Cosmetics !== 'undefined' && Cosmetics.game) Cosmetics.apply(this);
        this.sync();
    }

    // Позиции мешей из физики, цвет (удар, ожог, ток, перелом), глаза.
    sync(dt = 0) {
        const t = this.dummy.time;
        for (const part of this.dummy.parts) {
            const b = part.body, n = part.node;
            n.position.set(b.pos.x, b.pos.y, b.pos.z);
            n.rotationQuaternion.set(b.q.x, b.q.y, b.q.z, b.q.w);
            const base = part.id === 'belly' ? this.colors.joint : this.colors.body;
            const m = part.mat;
            if (!m) continue;
            const hurt = part.broken ? 0.85 : Math.min(0.6, 1 - part.hp / part.maxHp);
            let r = base.r + (this.colors.hurt.r - base.r) * hurt;
            let g = base.g + (this.colors.hurt.g - base.g) * hurt;
            let bl = base.b + (this.colors.hurt.b - base.b) * hurt;
            const burn = Math.min(0.92, part.burn);
            r += (this.colors.burnt.r - r) * burn; g += (this.colors.burnt.g - g) * burn; bl += (this.colors.burnt.b - bl) * burn;
            m.diffuseColor.set(r, g, bl);
            const f = part.hit * 0.6, s = part.shock > 0 ? (Math.sin(t * 60) > 0 ? 0.9 : 0.2) * Math.min(1, part.shock) : 0;
            const gl = Math.max(this.glow, this.skinGlow) * (1 - burn);   // в тёмных сценах манекен чуть светится, чтобы читался
            m.emissiveColor.set(f + this.colors.shock.r * s * 0.6 + r * gl, f * 0.35 + this.colors.shock.g * s * 0.6 + g * gl, f * 0.2 + this.colors.shock.b * s * 0.7 + bl * gl);
            if (part.broken && !part._crackTex) {
                part._crackTex = true;
                m.diffuseTexture = DummyVisual.crackTexture(this.scene);
            }
        }
        for (const sp of this.spins) sp.mesh.rotation.y += sp.w * dt;
        if (this.pupils) {
            const jitter = this.dummy.active ? 1.1 : 0.25;
            for (const p of this.pupils) {
                p.mesh.position.set(p.base.x + Math.sin(t * 7.3 + p.base.x) * jitter, p.base.y + Math.cos(t * 5.1) * jitter, p.base.z);
                p.mesh.scaling.setAll(this.xEyes ? 0.001 : (this.dummy.active ? 0.75 : 1));
            }
        }
    }

    // Глаза крестиками (нокаут) — на победе.
    knockOut() {
        if (this.xEyes || !this.pupils) return;
        this.xEyes = true;
        const B = BABYLON.MeshBuilder;
        const head = this.dummy.byId.head.node;
        const mat = DummyVisual.mat(this.scene, 'dummy-x', World3D.hexColor3(0x151515));
        for (const p of this.pupils) {
            for (const a of [0.785, -0.785]) {
                const bar = B.CreateBox('xeye', { width: 7, height: 1.6, depth: 1.2 }, this.scene);
                bar.parent = head; bar.material = mat;
                bar.position.set(p.base.x, p.base.y, p.base.z - 0.2);
                bar.rotation.z = a;
            }
        }
    }

    dispose() {
        for (const r of this.roots) {
            try { World3D.removeObject(this.view, r); } catch (e) { /* сцена уже снесена */ }
        }
        this.roots = [];
    }

    static mat(scene, name, color) {
        const m = new BABYLON.StandardMaterial(name, scene);
        m.diffuseColor = color;
        m.emissiveColor = new BABYLON.Color3(0, 0, 0);
        m.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        return m;
    }

    // Текстура перелома: красный с тёмными трещинами (одна на сцену).
    static crackTexture(scene) {
        const md = scene.metadata || (scene.metadata = {});
        if (md.dummyCrack) return md.dummyCrack;
        const size = 256;
        const tex = new BABYLON.DynamicTexture('dummy-crack', { width: size, height: size }, scene, true);
        const ctx = /** @type {CanvasRenderingContext2D} */ (/** @type {any} */ (tex.getContext()));
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);
        ctx.strokeStyle = 'rgba(60,10,10,0.95)';
        ctx.lineCap = 'round';
        let seed = 7;
        const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
        for (let k = 0; k < 9; k++) {
            let x = rnd() * size, y = rnd() * size;
            ctx.lineWidth = 3 + rnd() * 3;
            ctx.beginPath(); ctx.moveTo(x, y);
            for (let i = 0; i < 6; i++) {
                x += (rnd() - 0.5) * 70; y += (rnd() - 0.2) * 50;
                ctx.lineTo(x, y);
                if (rnd() < 0.35) { ctx.moveTo(x, y); ctx.lineTo(x + (rnd() - 0.5) * 40, y + (rnd() - 0.5) * 40); ctx.moveTo(x, y); }
            }
            ctx.stroke();
        }
        tex.update();
        md.dummyCrack = tex;
        return tex;
    }
}
DummyVisual.BODY = 0xf2b928;
DummyVisual.JOINT = 0x8a4a26;
