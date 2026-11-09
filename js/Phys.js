// Phys.js — физика игры: твёрдые тела по схеме XPBD (Müller et al., «Detailed Rigid
// Body Simulation with Extended Position Based Dynamics», 2020). Подшаги, позиционные
// связи с податливостью, контакты с трением и упругостью, суставы (шар, шарнир,
// пределы качания и закрутки), верёвки и «пружина» перетаскивания.
//
// Babylon здесь не нужен (физику гоняют тесты в node): мир в осях Babylon — X вправо,
// Y вверх, Z глубина; единицы — px (1 м = 100 px), кг, с. Визуал синхронизирует игра.
//
// Тело — PBody: 'dynamic' (масса, двигается), 'static' (стены, пол), 'kinematic'
// (двигает скрипт: пилы, прессы, машины — у него есть скорость, но нет массы).
// Формы в системе тела: сфера, капсула (отрезок + радиус), коробка (оси тела),
// плоскость пола (только у статического тела, с дырами-ямами).
//
// Шаг мира: широкая фаза раз за шаг (AABB с запасом на скорость) -> N подшагов:
// интеграция -> суставы и связи -> контакты (генерация + позиционная коррекция +
// статическое трение) -> скорости из позиций -> скоростная фаза (упругость,
// динамическое трение, демпфирование суставов). Слушатель contactListener получает
// каждый контакт тела с флагом listen (удар, опасность, датчик).

class V3 {
    constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
    set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
    copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
    clone() { return new V3(this.x, this.y, this.z); }
    add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
    sub(v) { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; }
    scale(s) { this.x *= s; this.y *= s; this.z *= s; return this; }
    addScaled(v, s) { this.x += v.x * s; this.y += v.y * s; this.z += v.z * s; return this; }
    dot(v) { return this.x * v.x + this.y * v.y + this.z * v.z; }
    len() { return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z); }
    len2() { return this.x * this.x + this.y * this.y + this.z * this.z; }
    normalize() { const l = this.len(); if (l > 1e-12) { this.x /= l; this.y /= l; this.z /= l; } return this; }
    isFinite() { return Number.isFinite(this.x) && Number.isFinite(this.y) && Number.isFinite(this.z); }
    static sub(a, b, out) { return (out || new V3()).set(a.x - b.x, a.y - b.y, a.z - b.z); }
    static add(a, b, out) { return (out || new V3()).set(a.x + b.x, a.y + b.y, a.z + b.z); }
    static cross(a, b, out) {
        const x = a.y * b.z - a.z * b.y, y = a.z * b.x - a.x * b.z, z = a.x * b.y - a.y * b.x;
        return (out || new V3()).set(x, y, z);
    }
    static lerp(a, b, t, out) { return (out || new V3()).set(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t); }
    static dist(a, b) { const x = a.x - b.x, y = a.y - b.y, z = a.z - b.z; return Math.sqrt(x * x + y * y + z * z); }
}

class Quat {
    constructor(x = 0, y = 0, z = 0, w = 1) { this.x = x; this.y = y; this.z = z; this.w = w; }
    set(x, y, z, w) { this.x = x; this.y = y; this.z = z; this.w = w; return this; }
    copy(q) { this.x = q.x; this.y = q.y; this.z = q.z; this.w = q.w; return this; }
    clone() { return new Quat(this.x, this.y, this.z, this.w); }
    normalize() {
        const l = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
        if (l < 1e-12) return this.set(0, 0, 0, 1);
        this.x /= l; this.y /= l; this.z /= l; this.w /= l;
        return this;
    }
    conjugate() { this.x = -this.x; this.y = -this.y; this.z = -this.z; return this; }
    // out = a * b (сначала поворот b, потом a)
    static mul(a, b, out) {
        const x = a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y;
        const y = a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x;
        const z = a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w;
        const w = a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z;
        return (out || new Quat()).set(x, y, z, w);
    }
    // v' = q v q*
    rotate(v, out) {
        const qx = this.x, qy = this.y, qz = this.z, qw = this.w;
        const tx = 2 * (qy * v.z - qz * v.y), ty = 2 * (qz * v.x - qx * v.z), tz = 2 * (qx * v.y - qy * v.x);
        return (out || new V3()).set(
            v.x + qw * tx + (qy * tz - qz * ty),
            v.y + qw * ty + (qz * tx - qx * tz),
            v.z + qw * tz + (qx * ty - qy * tx));
    }
    invRotate(v, out) {
        const qx = -this.x, qy = -this.y, qz = -this.z, qw = this.w;
        const tx = 2 * (qy * v.z - qz * v.y), ty = 2 * (qz * v.x - qx * v.z), tz = 2 * (qx * v.y - qy * v.x);
        return (out || new V3()).set(
            v.x + qw * tx + (qy * tz - qz * ty),
            v.y + qw * ty + (qz * tx - qx * tz),
            v.z + qw * tz + (qx * ty - qy * tx));
    }
    static fromAxisAngle(axis, angle, out) {
        const l = Math.sqrt(axis.x * axis.x + axis.y * axis.y + axis.z * axis.z) || 1;
        const s = Math.sin(angle / 2) / l;
        return (out || new Quat()).set(axis.x * s, axis.y * s, axis.z * s, Math.cos(angle / 2));
    }
    // Поворот, переводящий единичный a в единичный b.
    static fromTo(a, b, out) {
        const d = a.x * b.x + a.y * b.y + a.z * b.z;
        if (d < -0.999999) {
            let ax = V3.cross(new V3(1, 0, 0), a);
            if (ax.len2() < 1e-6) ax = V3.cross(new V3(0, 1, 0), a);
            return Quat.fromAxisAngle(ax.normalize(), Math.PI, out);
        }
        const c = V3.cross(a, b);
        return (out || new Quat()).set(c.x, c.y, c.z, 1 + d).normalize();
    }
    // Эйлер в градусах, порядок как у Babylon mesh.rotation (yaw Y, pitch X, roll Z).
    static fromEulerDeg(x, y, z, out) {
        const D = Math.PI / 180;
        const hy = y * D / 2, hx = x * D / 2, hz = z * D / 2;
        const sy = Math.sin(hy), cy = Math.cos(hy), sx = Math.sin(hx), cx = Math.cos(hx), sz = Math.sin(hz), cz = Math.cos(hz);
        return (out || new Quat()).set(
            cy * sx * cz + sy * cx * sz,
            sy * cx * cz - cy * sx * sz,
            cy * cx * sz - sy * sx * cz,
            cy * cx * cz + sy * sx * sz);
    }
    static slerp(a, b, t, out) {
        let bx = b.x, by = b.y, bz = b.z, bw = b.w;
        let cos = a.x * bx + a.y * by + a.z * bz + a.w * bw;
        if (cos < 0) { cos = -cos; bx = -bx; by = -by; bz = -bz; bw = -bw; }
        let k0, k1;
        if (cos > 0.9995) { k0 = 1 - t; k1 = t; }
        else {
            const th = Math.acos(cos), s = Math.sin(th);
            k0 = Math.sin((1 - t) * th) / s; k1 = Math.sin(t * th) / s;
        }
        return (out || new Quat()).set(a.x * k0 + bx * k1, a.y * k0 + by * k1, a.z * k0 + bz * k1, a.w * k0 + bw * k1).normalize();
    }
    axisX(out) { return this.rotate(PHYS_AXES.X, out); }
    axisY(out) { return this.rotate(PHYS_AXES.Y, out); }
    axisZ(out) { return this.rotate(PHYS_AXES.Z, out); }
}

const PHYS_AXES = { X: new V3(1, 0, 0), Y: new V3(0, 1, 0), Z: new V3(0, 0, 1) };

// Группы столкновений (битовые маски).
const PHYS_GROUP = { WORLD: 1, DUMMY: 2, PROP: 4, ZONE: 8, DEBRIS: 16, WALL: 32, ALL: 0xffff };   // WALL — невидимые стенки кадра (только для манекена)

// --- Геометрия ------------------------------------------------------------------

/** @satisfies {Record<string, any>} */
const PhysGeo = {
    clamp(v, a, b) { return v < a ? a : (v > b ? b : v); },

    // Ближайшая к p точка отрезка ab; out.t — параметр 0..1.
    closestOnSegment(a, b, p, out) {
        const abx = b.x - a.x, aby = b.y - a.y, abz = b.z - a.z;
        const l2 = abx * abx + aby * aby + abz * abz;
        let t = l2 > 1e-12 ? ((p.x - a.x) * abx + (p.y - a.y) * aby + (p.z - a.z) * abz) / l2 : 0;
        t = t < 0 ? 0 : (t > 1 ? 1 : t);
        const o = out || new V3();
        o.set(a.x + abx * t, a.y + aby * t, a.z + abz * t);
        /** @type {any} */ (o).t = t;
        return o;
    },

    // Ближайшие точки двух отрезков (Ericson, RTCD 5.1.9). Возвращает { c1, c2, s, t }.
    segSeg(p1, q1, p2, q2, res) {
        const d1x = q1.x - p1.x, d1y = q1.y - p1.y, d1z = q1.z - p1.z;
        const d2x = q2.x - p2.x, d2y = q2.y - p2.y, d2z = q2.z - p2.z;
        const rx = p1.x - p2.x, ry = p1.y - p2.y, rz = p1.z - p2.z;
        const a = d1x * d1x + d1y * d1y + d1z * d1z, e = d2x * d2x + d2y * d2y + d2z * d2z;
        const f = d2x * rx + d2y * ry + d2z * rz;
        let s, t;
        const EPS = 1e-9;
        if (a <= EPS && e <= EPS) { s = 0; t = 0; }
        else if (a <= EPS) { s = 0; t = PhysGeo.clamp(f / e, 0, 1); }
        else {
            const c = d1x * rx + d1y * ry + d1z * rz;
            if (e <= EPS) { t = 0; s = PhysGeo.clamp(-c / a, 0, 1); }
            else {
                const b = d1x * d2x + d1y * d2y + d1z * d2z;
                const denom = a * e - b * b;
                s = denom > EPS ? PhysGeo.clamp((b * f - c * e) / denom, 0, 1) : 0;
                t = (b * s + f) / e;
                if (t < 0) { t = 0; s = PhysGeo.clamp(-c / a, 0, 1); }
                else if (t > 1) { t = 1; s = PhysGeo.clamp((b - c) / a, 0, 1); }
            }
        }
        res.c1.set(p1.x + d1x * s, p1.y + d1y * s, p1.z + d1z * s);
        res.c2.set(p2.x + d2x * t, p2.y + d2y * t, p2.z + d2z * t);
        res.s = s; res.t = t;
        res.parallel = a > EPS && e > EPS && Math.abs(a * e - (d1x * d2x + d1y * d2y + d1z * d2z) ** 2) < 0.02 * a * e;
        return res;
    },
};

// --- Формы ----------------------------------------------------------------------

class PShape {
    // type: 'sphere' | 'capsule' | 'box' | 'plane'
    constructor(type, o) {
        this.type = type;
        this.c = o.c ? new V3(o.c.x, o.c.y, o.c.z) : new V3();      // центр (сфера, коробка)
        this.a = o.a ? new V3(o.a.x, o.a.y, o.a.z) : new V3();      // концы капсулы
        this.b = o.b ? new V3(o.b.x, o.b.y, o.b.z) : new V3();
        this.r = o.r || 0;
        this.h = o.h ? new V3(o.h.x, o.h.y, o.h.z) : new V3();      // полуразмеры коробки
        this.planeY = o.y || 0;                                     // высота плоскости
        this.holes = o.holes || [];                                 // [{ x0, x1, z0, z1 }]
        this.soft = 0;                                              // податливость контакта (сверло входит в тело)
        /** @type {PBody | null} */
        this.body = null;
        // мировые данные (обновляет PBody.updateWorld)
        this.wc = new V3(); this.wa = new V3(); this.wb = new V3();
        this.u0 = new V3(1, 0, 0); this.u1 = new V3(0, 1, 0); this.u2 = new V3(0, 0, 1);
        this.tag = o.tag || null;                                   // своя метка игры (часть предмета)
    }

    volume() {
        const r = this.r;
        if (this.type === 'sphere') return 4 / 3 * Math.PI * r * r * r;
        if (this.type === 'capsule') return Math.PI * r * r * V3.dist(this.a, this.b) + 4 / 3 * Math.PI * r * r * r;
        if (this.type === 'box') return 8 * this.h.x * this.h.y * this.h.z;
        return 0;
    }

    center() {
        if (this.type === 'capsule') return V3.lerp(this.a, this.b, 0.5);
        return this.c.clone();
    }

    // Диагональ тензора инерции формы массы m относительно её центра (оси тела).
    inertia(m) {
        const r = this.r;
        if (this.type === 'sphere') { const i = 0.4 * m * r * r; return new V3(i, i, i); }
        if (this.type === 'box') {
            const x = 2 * this.h.x, y = 2 * this.h.y, z = 2 * this.h.z;
            return new V3(m / 12 * (y * y + z * z), m / 12 * (x * x + z * z), m / 12 * (x * x + y * y));
        }
        if (this.type === 'capsule') {
            const L = V3.dist(this.a, this.b);
            const vc = Math.PI * r * r * L, vs = 4 / 3 * Math.PI * r * r * r, vt = vc + vs || 1;
            const mc = m * vc / vt, ms = m * vs / vt;
            const ia = 0.5 * mc * r * r + 0.4 * ms * r * r;
            const ip = mc * (L * L / 12 + r * r / 4) + ms * (0.4 * r * r + L * L / 4 + 3 * L * r / 8);
            const u = V3.sub(this.b, this.a).normalize();
            if (L < 1e-6) u.set(0, 1, 0);
            return new V3(ip * (1 - u.x * u.x) + ia * u.x * u.x, ip * (1 - u.y * u.y) + ia * u.y * u.y, ip * (1 - u.z * u.z) + ia * u.z * u.z);
        }
        return new V3();
    }

    shift(d) { this.c.add(d); this.a.add(d); this.b.add(d); }
}

// --- Тело -----------------------------------------------------------------------

class PBody {
    constructor(o = {}) {
        this.id = PBody._next++;
        /** @type {'dynamic' | 'static' | 'kinematic'} */
        this.type = o.type || 'dynamic';
        this.pos = o.pos ? new V3(o.pos.x, o.pos.y, o.pos.z) : new V3();
        this.q = o.q ? new Quat(o.q.x, o.q.y, o.q.z, o.q.w) : new Quat();
        this.prevPos = this.pos.clone();
        this.prevQ = this.q.clone();
        this.vel = new V3();
        this.omega = new V3();
        this.mass = 0;
        this.invMass = 0;
        this.invI = new V3();
        this.com = new V3();              // центр масс в исходных координатах тела (визуал сдвигается на −com)
        /** @type {PShape[]} */
        this.shapes = [];
        this.friction = o.friction != null ? o.friction : 0.5;
        this.restitution = o.restitution != null ? o.restitution : 0.15;
        this.linDamp = o.linDamp != null ? o.linDamp : 0.03;
        this.angDamp = o.angDamp != null ? o.angDamp : 0.3;
        this.gravityScale = o.gravityScale != null ? o.gravityScale : 1;
        this.sensor = !!o.sensor;         // датчик: касания видны слушателю, отталкивания нет
        this.group = o.group != null ? o.group : PHYS_GROUP.PROP;
        this.mask = o.mask != null ? o.mask : PHYS_GROUP.ALL;
        /** @type {Set<PBody> | null} */
        this.ignore = null;               // тела, с которыми не сталкиваться (соседи по суставу)
        this.listen = !!o.listen;         // отдавать контакты слушателю мира
        this.detect = false;              // искать касания даже с неподвижными телами (манекен в позе)
        this.enabled = true;
        this.maxSpeed = o.maxSpeed || 7000;
        this.data = o.data || null;       // что это для игры
        this.aabbMin = new V3(); this.aabbMax = new V3();
        // кинематика: цель позы на конец шага (игра ставит до world.step)
        this.kinPos = this.pos.clone();
        this.kinQ = this.q.clone();
        this._k0Pos = this.pos.clone();
        this._k0Q = this.q.clone();
        this.force = new V3();            // внешняя сила на шаг (сбрасывается после шага)
        /** @type {V3 | null} */
        this.surfaceVel = null;           // скорость поверхности (лента конвейера), тело само стоит
        /** @type {number | null} */
        this.planarZ = null;              // плоское тело: z не меняется, поворот только вокруг оси z
        this.world = null;
    }

    // Плоский режим (игра в плоскости экрана): центр остаётся на z, скорость по z и повороты
    // вокруг x и y гасятся. Точки тела при повороте вокруг z свой z не меняют — суставы
    // между плоскими телами остаются собранными.
    lockPlanar(z) {
        this.planarZ = z;
        this.pos.z = z; this.prevPos.z = z; this.kinPos.z = z; this._k0Pos.z = z;
        this.vel.z = 0; this.omega.x = 0; this.omega.y = 0;
        return this;
    }

    // Обратный момент инерции вокруг мировой оси z (для плоского тела).
    _izInv() {
        const e = this.q.invRotate(_tz.set(0, 0, 1), _tz);
        const i = this.invI;
        const I = (i.x > 0 ? e.x * e.x / i.x : 0) + (i.y > 0 ? e.y * e.y / i.y : 0) + (i.z > 0 ? e.z * e.z / i.z : 0);
        return I > 1e-12 ? 1 / I : 0;
    }

    get isDynamic() { return this.type === 'dynamic' && this.invMass > 0; }

    addSphere(c, r, tag) { return this._add(new PShape('sphere', { c, r, tag })); }
    addCapsule(a, b, r, tag) { return this._add(new PShape('capsule', { a, b, r, tag })); }
    addBox(c, h, tag) { return this._add(new PShape('box', { c, h, tag })); }
    addPlane(y, holes) { return this._add(new PShape('plane', { y, holes })); }
    _add(s) { s.body = this; this.shapes.push(s); return s; }

    // Масса и инерция из форм (доли по объёму). shiftCom — перенести начало тела в центр
    // масс (позиция в мире сохраняется, визуал сдвигать на −com).
    finalize(mass, shiftCom = true) {
        if (this.type !== 'dynamic') { this.mass = 0; this.invMass = 0; this.invI.set(0, 0, 0); return this; }
        const shapes = this.shapes.filter(s => s.type !== 'plane');
        let vol = 0;
        for (const s of shapes) vol += s.volume();
        vol = vol || 1;
        const com = new V3();
        for (const s of shapes) com.addScaled(s.center(), s.volume() / vol);
        if (shiftCom && com.len2() > 1e-8) {
            const neg = com.clone().scale(-1);
            for (const s of shapes) s.shift(neg);
            this.pos.add(this.q.rotate(com));
            this.prevPos.copy(this.pos); this.kinPos.copy(this.pos); this._k0Pos.copy(this.pos);
            this.com.add(com);
        }
        const I = new V3();
        for (const s of shapes) {
            const m = mass * s.volume() / vol;
            const ic = s.inertia(m), c = s.center();
            I.x += ic.x + m * (c.y * c.y + c.z * c.z);
            I.y += ic.y + m * (c.x * c.x + c.z * c.z);
            I.z += ic.z + m * (c.x * c.x + c.y * c.y);
        }
        this.mass = mass;
        this.invMass = mass > 0 ? 1 / mass : 0;
        this.invI.set(I.x > 1e-9 ? 1 / I.x : 0, I.y > 1e-9 ? 1 / I.y : 0, I.z > 1e-9 ? 1 / I.z : 0);
        return this;
    }

    // Перевести в динамику/кинематику (манекен: поза -> ragdoll).
    setType(type) {
        this.type = type;
        if (type !== 'dynamic') { this._saved = { m: this.invMass, i: this.invI.clone() }; this.invMass = 0; this.invI.set(0, 0, 0); }
        else if (this._saved) { this.invMass = this._saved.m; this.invI.copy(this._saved.i); this._saved = null; }
        this.kinPos.copy(this.pos); this.kinQ.copy(this.q);
    }

    // Мгновенно поставить тело (без скорости).
    teleport(pos, q) {
        this.pos.copy(pos); this.prevPos.copy(pos); this.kinPos.copy(pos); this._k0Pos.copy(pos);
        if (q) { this.q.copy(q); this.prevQ.copy(q); this.kinQ.copy(q); this._k0Q.copy(q); }
        this.vel.set(0, 0, 0); this.omega.set(0, 0, 0);
    }

    toWorld(local, out) { return this.q.rotate(local, out).add(this.pos); }
    toLocal(world, out) { const o = V3.sub(world, this.pos, out); return this.q.invRotate(o, o); }
    prevToWorld(local, out) { return this.prevQ.rotate(local, out).add(this.prevPos); }

    velocityAt(p, out) {
        const rx = p.x - this.pos.x, ry = p.y - this.pos.y, rz = p.z - this.pos.z;
        const w = this.omega, s = this.surfaceVel;
        return (out || new V3()).set(
            this.vel.x + w.y * rz - w.z * ry + (s ? s.x : 0),
            this.vel.y + w.z * rx - w.x * rz + (s ? s.y : 0),
            this.vel.z + w.x * ry - w.y * rx + (s ? s.z : 0));
    }

    // Обобщённая обратная масса вдоль n в точке p (без p — вращательная).
    invMassAlong(n, p) {
        if (this.invMass === 0 && this.type !== 'dynamic') return 0;
        if (this.planarZ !== null && this.type === 'dynamic') {
            if (!p) return n.z * n.z * this._izInv();
            const rx = p.x - this.pos.x, ry = p.y - this.pos.y, rn = rx * n.y - ry * n.x;
            return this.invMass * (n.x * n.x + n.y * n.y) + rn * rn * this._izInv();
        }
        let rn;
        if (p) rn = V3.cross(V3.sub(p, this.pos, _t1), n, _t2);
        else rn = _t2.copy(n);
        this.q.invRotate(rn, rn);
        let w = rn.x * rn.x * this.invI.x + rn.y * rn.y * this.invI.y + rn.z * rn.z * this.invI.z;
        if (p) w += this.invMass;
        return w;
    }

    applyRotation(rot, scale) {
        let s = scale;
        const phi = rot.len();
        if (phi * s > 0.5) s = 0.5 / phi;
        const dq = _q1.set(rot.x * s, rot.y * s, rot.z * s, 0);
        Quat.mul(dq, this.q, dq);
        this.q.x += 0.5 * dq.x; this.q.y += 0.5 * dq.y; this.q.z += 0.5 * dq.z; this.q.w += 0.5 * dq.w;
        this.q.normalize();
    }

    applyCorrection(corr, p, velocityLevel) {
        if (this.type !== 'dynamic' || this.invMass === 0) return;
        if (this.planarZ !== null) {
            let az = corr.z;
            if (p) {
                const t = velocityLevel ? this.vel : this.pos;
                t.x += corr.x * this.invMass; t.y += corr.y * this.invMass;
                az = (p.x - this.pos.x) * corr.y - (p.y - this.pos.y) * corr.x;
            }
            const dw = az * this._izInv();
            if (velocityLevel) this.omega.z += dw;
            else this.applyRotation(_t3.set(0, 0, dw), 1);
            return;
        }
        let dq;
        if (!p) dq = _t3.copy(corr);
        else {
            if (velocityLevel) this.vel.addScaled(corr, this.invMass);
            else this.pos.addScaled(corr, this.invMass);
            dq = V3.cross(V3.sub(p, this.pos, _t3), corr, _t3);
        }
        this.q.invRotate(dq, dq);
        dq.set(this.invI.x * dq.x, this.invI.y * dq.y, this.invI.z * dq.z);
        this.q.rotate(dq, dq);
        if (velocityLevel) this.omega.add(dq);
        else this.applyRotation(dq, 1);
    }

    integrate(h, gravity, frac) {
        this.prevPos.copy(this.pos);
        this.prevQ.copy(this.q);
        if (this.type === 'kinematic') {
            V3.lerp(this._k0Pos, this.kinPos, frac, this.pos);
            Quat.slerp(this._k0Q, this.kinQ, frac, this.q);
            return;
        }
        if (this.type !== 'dynamic' || this.invMass === 0) return;
        const g = this.gravityScale;
        this.vel.x += (gravity.x * g + this.force.x * this.invMass) * h;
        this.vel.y += (gravity.y * g + this.force.y * this.invMass) * h;
        this.vel.z += (gravity.z * g + this.force.z * this.invMass) * h;
        if (this.planarZ !== null) { this.vel.z = 0; this.omega.x = 0; this.omega.y = 0; this.pos.z = this.planarZ; }
        this.pos.addScaled(this.vel, h);
        this.applyRotation(this.omega, h);
    }

    updateVelocity(h) {
        if (this.type === 'static') return;
        this.vel.set((this.pos.x - this.prevPos.x) / h, (this.pos.y - this.prevPos.y) / h, (this.pos.z - this.prevPos.z) / h);
        const dq = Quat.mul(this.q, _q2.copy(this.prevQ).conjugate(), _q2);
        const k = dq.w >= 0 ? 2 / h : -2 / h;
        this.omega.set(dq.x * k, dq.y * k, dq.z * k);
        if (this.type !== 'dynamic') return;
        if (this.planarZ !== null) { this.vel.z = 0; this.omega.x = 0; this.omega.y = 0; }
        const ld = Math.max(0, 1 - this.linDamp * h), ad = Math.max(0, 1 - this.angDamp * h);
        this.vel.scale(ld); this.omega.scale(ad);
        const v2 = this.vel.len2(), vm = this.maxSpeed;
        if (v2 > vm * vm) this.vel.scale(vm / Math.sqrt(v2));
        const w2 = this.omega.len2();
        if (w2 > 3600) this.omega.scale(60 / Math.sqrt(w2));
    }

    // Мировые данные форм и AABB (с запасом margin).
    updateWorld(margin) {
        const mn = this.aabbMin.set(Infinity, Infinity, Infinity), mx = this.aabbMax.set(-Infinity, -Infinity, -Infinity);
        for (const s of this.shapes) {
            if (s.type === 'plane') { mn.set(-Infinity, -Infinity, -Infinity); mx.set(Infinity, s.planeY, Infinity); continue; }
            if (s.type === 'sphere') {
                this.toWorld(s.c, s.wc);
                grow(mn, mx, s.wc, s.r);
            } else if (s.type === 'capsule') {
                this.toWorld(s.a, s.wa); this.toWorld(s.b, s.wb);
                grow(mn, mx, s.wa, s.r); grow(mn, mx, s.wb, s.r);
            } else if (s.type === 'box') {
                this.toWorld(s.c, s.wc);
                this.q.rotate(PHYS_AXES.X, s.u0); this.q.rotate(PHYS_AXES.Y, s.u1); this.q.rotate(PHYS_AXES.Z, s.u2);
                const ex = Math.abs(s.u0.x) * s.h.x + Math.abs(s.u1.x) * s.h.y + Math.abs(s.u2.x) * s.h.z;
                const ey = Math.abs(s.u0.y) * s.h.x + Math.abs(s.u1.y) * s.h.y + Math.abs(s.u2.y) * s.h.z;
                const ez = Math.abs(s.u0.z) * s.h.x + Math.abs(s.u1.z) * s.h.y + Math.abs(s.u2.z) * s.h.z;
                if (s.wc.x - ex < mn.x) mn.x = s.wc.x - ex; if (s.wc.x + ex > mx.x) mx.x = s.wc.x + ex;
                if (s.wc.y - ey < mn.y) mn.y = s.wc.y - ey; if (s.wc.y + ey > mx.y) mx.y = s.wc.y + ey;
                if (s.wc.z - ez < mn.z) mn.z = s.wc.z - ez; if (s.wc.z + ez > mx.z) mx.z = s.wc.z + ez;
            }
        }
        if (margin) { mn.x -= margin; mn.y -= margin; mn.z -= margin; mx.x += margin; mx.y += margin; mx.z += margin; }
    }
}
PBody._next = 1;

function grow(mn, mx, p, r) {
    if (p.x - r < mn.x) mn.x = p.x - r; if (p.x + r > mx.x) mx.x = p.x + r;
    if (p.y - r < mn.y) mn.y = p.y - r; if (p.y + r > mx.y) mx.y = p.y + r;
    if (p.z - r < mn.z) mn.z = p.z - r; if (p.z + r > mx.z) mx.z = p.z + r;
}

// Временные векторы (физика однопоточная; каждый держится только внутри функции).
const _t1 = new V3(), _t2 = new V3(), _t3 = new V3(), _t4 = new V3(), _t5 = new V3(), _t6 = new V3(), _tz = new V3(), _tp = new V3();
const _q1 = new Quat(), _q2 = new Quat();

// --- Связи -----------------------------------------------------------------------

/** @satisfies {Record<string, any>} */
const PhysSolve = {
    // Сдвинуть b0 на corr относительно b1 (XPBD). p0/p1 — точки приложения (без них —
    // поворот). Возвращает λ (≤ 0).
    pair(b0, b1, corr, compliance, h, p0, p1, velocityLevel) {
        // Плоские тела: поправку — только в доступные им направления (поворот вокруг z,
        // сдвиг по x/y). Иначе поправка почти вдоль z делится на почти нулевую массу — рывок.
        const pl0 = !!(b0 && b0.planarZ !== null && b0.type === 'dynamic'), pl1 = !!(b1 && b1.planarZ !== null && b1.type === 'dynamic');
        if (pl0 || pl1) {
            const free0 = b0 && b0.type === 'dynamic' && !pl0, free1 = b1 && b1.type === 'dynamic' && !pl1;
            if (!p0 && !p1) corr = _tp.set(0, 0, corr.z);
            else if (!free0 && !free1) corr = _tp.set(corr.x, corr.y, 0);
        }
        const C = corr.len();
        if (C < 1e-9) return 0;
        const n = _t4.copy(corr).scale(1 / C);
        const w0 = b0 ? b0.invMassAlong(n, p0) : 0;
        const w1 = b1 ? b1.invMassAlong(n, p1) : 0;
        const w = w0 + w1;
        if (w < 1e-12) return 0;
        const lambda = -C / (w + compliance / (h * h));
        const imp = _t5.copy(n).scale(-lambda);
        if (b0) b0.applyCorrection(imp, p0, velocityLevel);
        if (b1) { imp.scale(-1); b1.applyCorrection(imp, p1, velocityLevel); }
        return lambda;
    },

    // Предел угла между векторами a (тела 0) и b (тела 1) вокруг оси n: [minA, maxA].
    limitAngle(b0, b1, n, a, b, minA, maxA, compliance, h, maxCorr = Math.PI) {
        const c = V3.cross(a, b, _t6);
        let phi = Math.asin(PhysGeo.clamp(c.dot(n), -1, 1));
        if (a.dot(b) < 0) phi = Math.PI - phi;
        if (phi > Math.PI) phi -= 2 * Math.PI;
        if (phi < -Math.PI) phi += 2 * Math.PI;
        if (phi < minA || phi > maxA) {
            phi = PhysGeo.clamp(phi, minA, maxA);
            const q = Quat.fromAxisAngle(n, phi, _q1);
            const omega = q.rotate(a, new V3());
            V3.cross(omega, b, omega);
            const l = omega.len();
            if (l > maxCorr) omega.scale(maxCorr / l);
            PhysSolve.pair(b0, b1, omega, compliance, h, null, null, false);
        }
    },
};

// Сустав между b0 и b1 (b1 может быть статическим якорем). Кадры сустава в системе
// каждого тела: позиция + поворот; ось X кадра — ось закрутки (шар) или шарнира.
class PJoint {
    constructor(o) {
        this.b0 = o.b0; this.b1 = o.b1;
        this.type = o.type || 'ball';          // 'ball' | 'hinge' | 'fixed'
        this.p0 = o.p0 ? new V3(o.p0.x, o.p0.y, o.p0.z) : new V3();
        this.p1 = o.p1 ? new V3(o.p1.x, o.p1.y, o.p1.z) : new V3();
        this.r0 = o.r0 ? o.r0.clone() : new Quat();
        this.r1 = o.r1 ? o.r1.clone() : new Quat();
        this.swing = o.swing != null ? o.swing : -1;        // шар: полуугол конуса (рад), −1 — без предела
        this.twistMin = o.twistMin != null ? o.twistMin : 1; // шар: закрутка (рад); min > max — без предела
        this.twistMax = o.twistMax != null ? o.twistMax : -1;
        this.hingeMin = o.hingeMin != null ? o.hingeMin : 1; // шарнир: угол (рад)
        this.hingeMax = o.hingeMax != null ? o.hingeMax : -1;
        this.compliance = o.compliance || 0;
        this.limitCompliance = o.limitCompliance || 0;
        this.damping = o.damping || 0;          // гашение относительного вращения, 1/с
        this.enabled = true;
        this.breakForce = o.breakForce || 0;    // > 0 — рвётся (px·кг/с², по λ позиции)
        this.broken = false;
        this.lastLambda = 0;
        this.data = o.data || null;
        this._g0 = { p: new V3(), q: new Quat() };
        this._g1 = { p: new V3(), q: new Quat() };
    }

    _frames() {
        const b0 = this.b0, b1 = this.b1;
        b0.toWorld(this.p0, this._g0.p); Quat.mul(b0.q, this.r0, this._g0.q);
        b1.toWorld(this.p1, this._g1.p); Quat.mul(b1.q, this.r1, this._g1.q);
    }

    solvePos(h) {
        if (!this.enabled || this.broken) return;
        const b0 = this.b0, b1 = this.b1;
        const g0 = this._g0, g1 = this._g1;
        if (this.type === 'fixed') {
            this._frames();
            const dq = Quat.mul(g0.q, _q2.copy(g1.q).conjugate(), new Quat());
            const k = dq.w >= 0 ? 2 : -2;
            const corr = new V3(-dq.x * k, -dq.y * k, -dq.z * k);
            PhysSolve.pair(b0, b1, corr, 0, h, null, null, false);
        } else if (this.type === 'hinge') {
            this._frames();
            const a0 = g0.q.axisX(new V3()), a1 = g1.q.axisX(new V3());
            PhysSolve.pair(b0, b1, V3.cross(a0, a1, a0), 0, h, null, null, false);
            if (this.hingeMin <= this.hingeMax) {
                this._frames();
                const n = g0.q.axisX(new V3()), v0 = g0.q.axisY(new V3()), v1 = g1.q.axisY(new V3());
                PhysSolve.limitAngle(b0, b1, n, v0, v1, this.hingeMin, this.hingeMax, this.limitCompliance, h);
            }
        } else {
            if (this.swing >= 0) {
                this._frames();
                const a0 = g0.q.axisX(new V3()), a1 = g1.q.axisX(new V3());
                const n = V3.cross(a0, a1, new V3());
                if (n.len2() > 1e-10) {
                    n.normalize();
                    PhysSolve.limitAngle(b0, b1, n, a0, a1, 0, this.swing, this.limitCompliance, h);
                }
            }
            if (this.twistMin <= this.twistMax) {
                this._frames();
                const n0 = g0.q.axisX(new V3()), n1 = g1.q.axisX(new V3());
                const n = V3.add(n0, n1, new V3()).normalize();
                const a0 = g0.q.axisY(new V3()); a0.addScaled(n, -n.dot(a0)).normalize();
                const a1 = g1.q.axisY(new V3()); a1.addScaled(n, -n.dot(a1)).normalize();
                const maxCorr = n0.dot(n1) > -0.5 ? 2 * Math.PI : h;
                PhysSolve.limitAngle(b0, b1, n, a0, a1, this.twistMin, this.twistMax, this.limitCompliance, h, maxCorr);
            }
        }
        this._frames();
        const corr = V3.sub(g1.p, g0.p, new V3());
        this.lastLambda = PhysSolve.pair(b0, b1, corr, this.compliance, h, g0.p, g1.p, false);
        if (this.breakForce > 0 && Math.abs(this.lastLambda) / (h * h) > this.breakForce) this.broken = true;
    }

    solveVel(h) {
        if (!this.enabled || this.broken || this.damping <= 0) return;
        const w = V3.sub(this.b1.omega, this.b0.omega, new V3());
        w.scale(Math.min(1, this.damping * h));
        PhysSolve.pair(this.b0, this.b1, w, 0, h, null, null, true);
    }
}

// Верёвка/стержень: точка p0 тела b0 держится на расстоянии len от точки p1 тела b1
// (b1 — null: мировая точка p1). rope — только натяжение.
class PRope {
    constructor(o) {
        this.b0 = o.b0; this.b1 = o.b1 || null;
        this.p0 = new V3(o.p0.x, o.p0.y, o.p0.z);
        this.p1 = new V3(o.p1.x, o.p1.y, o.p1.z);
        this.len = o.len;
        this.rope = o.rope !== false;
        this.compliance = o.compliance || 0;
        this.enabled = true;
        this.w0 = new V3(); this.w1 = new V3();
    }
    solvePos(h) {
        if (!this.enabled) return;
        this.b0.toWorld(this.p0, this.w0);
        if (this.b1) this.b1.toWorld(this.p1, this.w1); else this.w1.copy(this.p1);
        const d = V3.sub(this.w1, this.w0, new V3());
        const l = d.len();
        if (l < 1e-6) return;
        const err = l - this.len;
        if (this.rope && err <= 0) return;
        d.scale(err / l);
        PhysSolve.pair(this.b0, this.b1, d, this.compliance, h, this.w0, this.b1 ? this.w1 : null, false);
    }
    solveVel() { }
}

// Глубина составного тела (манекен): центр масс частей держится там, где был при
// оживлении (фигура не уезжает от камеры и за предметы), а сами части гнутся свободно —
// колени и локти сгибаются вперёд, но не дальше slab от своей стартовой глубины.
// Сдвиг общий для всех частей — суставы он не трогает.
class PDepthLock {
    constructor(bodies, slab) {
        this.bodies = bodies;
        this.slab = slab || 60;
        this.soft = 0.2;
        this.enabled = true;
        let m = 0, z = 0;
        for (const b of bodies) { m += b.mass || 1; z += b.pos.z * (b.mass || 1); }
        this.z0 = m > 0 ? z / m : 0;
        this.ref = bodies.map(b => b.pos.z);
    }
    solvePos() {
        if (!this.enabled) return;
        let m = 0, z = 0;
        for (const b of this.bodies) if (b.type === 'dynamic') { m += b.mass; z += b.pos.z * b.mass; }
        if (m <= 0) return;
        // Мягко (доля за подшаг): резкий сдвиг частей, лежащих на полу, спорит с трением.
        const dz = (z / m - this.z0) * this.soft;
        this.bodies.forEach((b, i) => {
            if (b.type !== 'dynamic') return;
            b.pos.z = PhysGeo.clamp(b.pos.z - dz, this.ref[i] - this.slab, this.ref[i] + this.slab);
        });
    }
    solveVel() {
        if (!this.enabled) return;
        let m = 0, vz = 0;
        for (const b of this.bodies) if (b.type === 'dynamic') { m += b.mass; vz += b.vel.z * b.mass; }
        if (m <= 0) return;
        vz /= m;
        for (const b of this.bodies) if (b.type === 'dynamic') b.vel.z -= vz;
    }
}

// Пружина перетаскивания: точка local тела тянется к target. frac — доля разрыва,
// закрываемая за подшаг (игра считает её по массе: тяжёлое идёт за пальцем медленнее;
// у манекена — по массе всего манекена, иначе лёгкая кисть рвала бы суставы).
// Скорость точки тянется к скорости цели (targetVel) — без раскачки.
class PGrab {
    constructor(body, local, frac) {
        this.body = body;
        this.local = local.clone();
        this.target = body.toWorld(local);
        this.from = this.target.clone();   // цель прошлого кадра: за подшаги цель идёт от неё к target
        this.targetVel = new V3();
        this.frac = frac;
        this.maxReach = 220;
        this.enabled = true;
        this.world = new V3();
    }
    // Палец двигается раз в кадр; цель ведём плавно по подшагам (s — доля кадра), иначе тело
    // догоняет скачок в начале кадра и к концу стоит: скорость удара случайна по подшагу.
    solvePos(h, s = 1) {
        if (!this.enabled) return;
        const b = this.body;
        const p = b.toWorld(this.local, this.world);
        const f = this.from, t = this.target;
        const corr = new V3(f.x + (t.x - f.x) * s - p.x, f.y + (t.y - f.y) * s - p.y, f.z + (t.z - f.z) * s - p.z);
        const l = corr.len();
        if (l < 1e-6) return;
        if (l > this.maxReach) corr.scale(this.maxReach / l);
        corr.scale(PhysGeo.clamp(this.frac, 0.001, 1));
        // Сила пальца ограничена: за подшаг — не дальше, чем позволяет предел скорости тела.
        const cl = corr.len(), lim = b.maxSpeed * h * 1.2;
        if (cl > lim) corr.scale(lim / cl);
        PhysSolve.pair(b, null, corr, 0, h, p, null, false);
    }
    solveVel(h) {
        if (!this.enabled) return;
        const b = this.body;
        const p = b.toWorld(this.local, this.world);
        const v = b.velocityAt(p);
        const dv = V3.sub(this.targetVel, v, new V3()).scale(Math.min(1, 6 * h));
        PhysSolve.pair(b, null, dv, 0, h, p, null, true);
        b.omega.scale(Math.max(0, 1 - 3 * h));
    }
}

// --- Контакты --------------------------------------------------------------------

class PContact {
    constructor() {
        this.a = null; this.b = null;
        this.sa = null; this.sb = null;
        this.pA = new V3(); this.pB = new V3();   // мировые точки на A и на B
        this.rA = new V3(); this.rB = new V3();   // те же точки в системах тел
        this.n = new V3();                        // нормаль от B к A
        this.d = 0;                               // глубина
        this.vnPre = 0;                           // нормальная скорость сближения до решения (< 0 — сближаются)
        this.lambdaN = 0;
        this.friction = 0.5;
        this.restitution = 0.1;
        this.sensor = false;
    }
}

// --- Мир -------------------------------------------------------------------------

class PhysWorld {
    constructor(o = {}) {
        this.gravity = new V3(0, o.gravity != null ? -o.gravity : -1500, 0);
        this.substeps = o.substeps || 10;
        /** @type {PBody[]} */
        this.bodies = [];
        /** @type {Array<PJoint | PRope | PGrab>} */
        this.joints = [];
        /** @type {Array<{solvePos: Function, solveVel: Function}>} */
        this.constraints = [];
        this._pool = [];
        this._contacts = [];
        this._nc = 0;
        this._pairs = [];
        this.maxDepen = o.maxDepen || 900;   // px/с: предел скорости выталкивания из проникновения
        this.contactListener = null;   // (contact, h) — после скоростной фазы подшага
        this.preContact = null;        // (contact) — до решения (манекен в позе оживает)
        this.time = 0;
        this.steps = 0;
        this._seg = { c1: new V3(), c2: new V3(), s: 0, t: 0, parallel: false };
    }

    add(b) { if (this.bodies.indexOf(b) < 0) { this.bodies.push(b); b.world = this; } return b; }
    remove(b) {
        const i = this.bodies.indexOf(b);
        if (i >= 0) this.bodies.splice(i, 1);
        this.joints = this.joints.filter(j => /** @type {any} */ (j).b0 !== b && /** @type {any} */ (j).b1 !== b);
        this.constraints = this.constraints.filter(c => /** @type {any} */ (c).body !== b && /** @type {any} */ (c).b0 !== b);
        b.world = null;
    }
    addJoint(j) { this.joints.push(j); return j; }
    removeJoint(j) { const i = this.joints.indexOf(j); if (i >= 0) this.joints.splice(i, 1); }
    clear() { this.bodies = []; this.joints = []; this.constraints = []; this._pairs = []; }

    step(dt) {
        dt = Math.min(dt, 1 / 30);
        if (dt <= 0) return;
        const n = this.substeps, h = dt / n;
        for (const b of this.bodies) {
            if (b.type === 'kinematic') { b._k0Pos.copy(b.pos); b._k0Q.copy(b.q); }
        }
        this._broadphase(dt);
        for (let s = 0; s < n; s++) {
            const frac = (s + 1) / n;
            for (const b of this.bodies) if (b.enabled) b.integrate(h, this.gravity, frac);
            for (const c of this.constraints) c.solvePos(h, frac);   // мягкие (перетаскивание) — до жёстких суставов
            for (const j of this.joints) j.solvePos(h);
            this._narrowphase();
            this._solveContacts(h);
            for (const b of this.bodies) if (b.enabled) b.updateVelocity(h);
            this._solveVelocities(h);
            for (const j of this.joints) j.solveVel(h);
            for (const c of this.constraints) c.solveVel(h);
            if (this.contactListener) {
                for (let i = 0; i < this._nc; i++) {
                    const c = this._contacts[i];
                    if (c.a.listen || c.b.listen) this.contactListener(c, h);
                }
            }
        }
        for (const b of this.bodies) {
            b.force.set(0, 0, 0);
            if (!b.pos.isFinite() || !Number.isFinite(b.q.w)) {
                b.pos.copy(b._k0Pos.isFinite() ? b._k0Pos : new V3(0, 200, 0));
                b.q.set(0, 0, 0, 1); b.vel.set(0, 0, 0); b.omega.set(0, 0, 0);
            }
        }
        for (const c of this.constraints) if (/** @type {any} */ (c).from) /** @type {any} */ (c).from.copy(/** @type {any} */ (c).target);
        this.time += dt;
        this.steps++;
    }

    _canPair(a, b) {
        if (!a.enabled || !b.enabled) return false;
        const da = a.type === 'dynamic', db = b.type === 'dynamic';
        if (!da && !db && !(a.detect || b.detect)) return false;
        if (a.sensor && b.sensor) return false;
        if (!(a.group & b.mask) || !(b.group & a.mask)) return false;
        if (a.ignore && a.ignore.has(b)) return false;
        if (b.ignore && b.ignore.has(a)) return false;
        return true;
    }

    _broadphase(dt) {
        const pairs = this._pairs;
        pairs.length = 0;
        const list = this.bodies;
        for (const b of list) {
            if (!b.enabled) continue;
            const m = 2 + (b.type === 'static' ? 0 : b.vel.len() * dt * 1.5 + 2);
            b.updateWorld(m);
        }
        for (let i = 0; i < list.length; i++) {
            const a = list[i];
            for (let j = i + 1; j < list.length; j++) {
                const b = list[j];
                if (!this._canPair(a, b)) continue;
                if (a.aabbMin.x > b.aabbMax.x || b.aabbMin.x > a.aabbMax.x) continue;
                if (a.aabbMin.y > b.aabbMax.y || b.aabbMin.y > a.aabbMax.y) continue;
                if (a.aabbMin.z > b.aabbMax.z || b.aabbMin.z > a.aabbMax.z) continue;
                pairs.push(a, b);
            }
        }
    }

    _newContact() {
        let c = this._pool[this._nc];
        if (!c) { c = new PContact(); this._pool.push(c); }
        this._contacts[this._nc++] = c;
        return c;
    }

    // Точка контакта: pA на A, pB на B, n от B к A, глубина d > 0.
    _emit(a, sa, b, sb, pA, pB, n, d) {
        const c = this._newContact();
        c.a = a; c.b = b; c.sa = sa; c.sb = sb;
        c.pA.copy(pA); c.pB.copy(pB); c.n.copy(n); c.d = d;
        a.toLocal(pA, c.rA); b.toLocal(pB, c.rB);
        const va = a.velocityAt(pA, _t1), vb = b.velocityAt(pB, _t2);
        c.vnPre = (va.x - vb.x) * n.x + (va.y - vb.y) * n.y + (va.z - vb.z) * n.z;
        c.lambdaN = 0;
        c.friction = Math.sqrt(a.friction * b.friction);
        c.restitution = Math.max(a.restitution, b.restitution);
        c.sensor = a.sensor || b.sensor;
        return c;
    }

    _narrowphase() {
        this._nc = 0;
        const pairs = this._pairs;
        for (const b of this.bodies) if (b.enabled && b.type !== 'static') b.updateWorld(0);
        for (let i = 0; i < pairs.length; i += 2) {
            const a = pairs[i], b = pairs[i + 1];
            for (const sa of a.shapes) for (const sb of b.shapes) this._collide(a, sa, b, sb);
        }
        if (this.preContact) for (let i = 0; i < this._nc; i++) this.preContact(this._contacts[i]);
    }

    _collide(A, sa, B, sb) {
        const ta = sa.type, tb = sb.type;
        // Порядок: плоскость и коробка — вторыми (B); меняем местами с переворотом нормали.
        const rank = { sphere: 0, capsule: 1, box: 2, plane: 3 };
        if (rank[ta] > rank[tb]) { this._collideOrdered(B, sb, A, sa, true); return; }
        this._collideOrdered(A, sa, B, sb, false);
    }

    // sa.rank <= sb.rank. flip — в вызывающем порядке A и B переставлены: эмитим как (B, A).
    _collideOrdered(A, sa, B, sb, flip) {
        const ta = sa.type, tb = sb.type;
        const emit = (pA, pB, n, d) => {
            if (!flip) this._emit(A, sa, B, sb, pA, pB, n, d);
            else this._emit(B, sb, A, sa, pB, pA, _t6.copy(n).scale(-1), d);
        };
        if (tb === 'plane') {
            if (ta === 'sphere') this._pointPlane(sa.wc, sa.r, sb, emit);
            else if (ta === 'capsule') { this._pointPlane(sa.wa, sa.r, sb, emit); this._pointPlane(sa.wb, sa.r, sb, emit); }
            else if (ta === 'box') this._boxPlane(sa, sb, emit);
            return;
        }
        if (tb === 'box') {
            if (ta === 'sphere') this._sphereBox(sa.wc, sa.r, sb, emit, sa.body);
            else if (ta === 'capsule') this._capsuleBox(sa, sb, emit);
            else if (ta === 'box') this._boxBox(A, sa, B, sb, flip);
            return;
        }
        if (ta === 'sphere' && tb === 'sphere') { this._sphereSphere(sa.wc, sa.r, sb.wc, sb.r, emit); return; }
        if (ta === 'sphere' && tb === 'capsule') {
            const q = PhysGeo.closestOnSegment(sb.wa, sb.wb, sa.wc, new V3());
            this._sphereSphere(sa.wc, sa.r, q, sb.r, emit);
            return;
        }
        if (ta === 'capsule' && tb === 'capsule') {
            const r = PhysGeo.segSeg(sa.wa, sa.wb, sb.wa, sb.wb, this._seg);
            const c1 = r.c1.clone(), c2 = r.c2.clone(), par = r.parallel, s0 = r.s;
            this._sphereSphere(c1, sa.r, c2, sb.r, emit);
            if (par) {
                // Параллельные капсулы (рука на бедре): вторая точка опоры.
                const other = s0 < 0.5 ? sa.wb : sa.wa;
                const q = PhysGeo.closestOnSegment(sb.wa, sb.wb, other, new V3());
                this._sphereSphere(other, sa.r, q, sb.r, emit);
            }
        }
    }

    _sphereSphere(c1, r1, c2, r2, emit) {
        const dx = c1.x - c2.x, dy = c1.y - c2.y, dz = c1.z - c2.z;
        const d2 = dx * dx + dy * dy + dz * dz, rr = r1 + r2;
        if (d2 >= rr * rr) return;
        const dist = Math.sqrt(d2);
        const n = dist > 1e-9 ? new V3(dx / dist, dy / dist, dz / dist) : new V3(0, 1, 0);
        const pA = new V3(c1.x - n.x * r1, c1.y - n.y * r1, c1.z - n.z * r1);
        const pB = new V3(c2.x + n.x * r2, c2.y + n.y * r2, c2.z + n.z * r2);
        emit(pA, pB, n, rr - dist);
    }

    _inHole(s, x, z) {
        for (const h of s.holes) if (x > h.x0 && x < h.x1 && z > h.z0 && z < h.z1) return true;
        return false;
    }

    _pointPlane(c, r, s, emit) {
        const y = s.planeY;
        if (c.y - r >= y) return;
        if (this._inHole(s, c.x, c.z)) return;
        if (c.y < y - 60) return;   // уже провалился глубоко (в яму у края) — плоскость не выталкивает
        emit(new V3(c.x, c.y - r, c.z), new V3(c.x, y, c.z), PHYS_AXES.Y, y - (c.y - r));
    }

    _boxCorners(s) {
        const out = [];
        for (let i = 0; i < 8; i++) {
            const sx = i & 1 ? 1 : -1, sy = i & 2 ? 1 : -1, sz = i & 4 ? 1 : -1;
            out.push(new V3(
                s.wc.x + s.u0.x * s.h.x * sx + s.u1.x * s.h.y * sy + s.u2.x * s.h.z * sz,
                s.wc.y + s.u0.y * s.h.x * sx + s.u1.y * s.h.y * sy + s.u2.y * s.h.z * sz,
                s.wc.z + s.u0.z * s.h.x * sx + s.u1.z * s.h.y * sy + s.u2.z * s.h.z * sz));
        }
        return out;
    }

    _boxPlane(sa, sb, emit) {
        for (const p of this._boxCorners(sa)) this._pointPlane(p, 0, sb, emit);
    }

    // Сфера (c, r) против коробки s.
    // owner — тело сферы/угла: если оно или коробка плоские, грани вдоль z не выталкивают
    // (одинаковая глубина коробок иначе даёт касание по z, и стопка проваливается).
    _sphereBox(c, r, s, emit, owner) {
        const dx = c.x - s.wc.x, dy = c.y - s.wc.y, dz = c.z - s.wc.z;
        const lx = dx * s.u0.x + dy * s.u0.y + dz * s.u0.z;
        const ly = dx * s.u1.x + dy * s.u1.y + dz * s.u1.z;
        const lz = dx * s.u2.x + dy * s.u2.y + dz * s.u2.z;
        const hx = s.h.x, hy = s.h.y, hz = s.h.z;
        const qx = PhysGeo.clamp(lx, -hx, hx), qy = PhysGeo.clamp(ly, -hy, hy), qz = PhysGeo.clamp(lz, -hz, hz);
        const ox = lx - qx, oy = ly - qy, oz = lz - qz;
        const o2 = ox * ox + oy * oy + oz * oz;
        if (o2 > 1e-10) {
            if (o2 >= r * r) return;
            const dist = Math.sqrt(o2);
            const qw = new V3(
                s.wc.x + s.u0.x * qx + s.u1.x * qy + s.u2.x * qz,
                s.wc.y + s.u0.y * qx + s.u1.y * qy + s.u2.y * qz,
                s.wc.z + s.u0.z * qx + s.u1.z * qy + s.u2.z * qz);
            const n = V3.sub(c, qw, new V3()).scale(1 / dist);
            emit(new V3(c.x - n.x * r, c.y - n.y * r, c.z - n.z * r), qw, n, r - dist);
            return;
        }
        // Центр внутри коробки — наружу через ближайшую грань.
        let px = hx - Math.abs(lx), py = hy - Math.abs(ly), pz = hz - Math.abs(lz);
        const flat = (b) => b && b.planarZ !== null && b.type === 'dynamic';
        if (flat(s.body) || flat(owner)) {
            if (Math.abs(s.u0.z) > 0.7) px = Infinity;
            if (Math.abs(s.u1.z) > 0.7) py = Infinity;
            if (Math.abs(s.u2.z) > 0.7) pz = Infinity;
            if (px === Infinity && py === Infinity && pz === Infinity) return;
        }
        let n, pen;
        if (px <= py && px <= pz) { n = s.u0.clone().scale(lx >= 0 ? 1 : -1); pen = px; }
        else if (py <= pz) { n = s.u1.clone().scale(ly >= 0 ? 1 : -1); pen = py; }
        else { n = s.u2.clone().scale(lz >= 0 ? 1 : -1); pen = pz; }
        const pB = new V3(c.x + n.x * pen, c.y + n.y * pen, c.z + n.z * pen);
        emit(new V3(c.x - n.x * r, c.y - n.y * r, c.z - n.z * r), pB, n, r + pen);
    }

    _clampToBox(p, s, out) {
        const dx = p.x - s.wc.x, dy = p.y - s.wc.y, dz = p.z - s.wc.z;
        const qx = PhysGeo.clamp(dx * s.u0.x + dy * s.u0.y + dz * s.u0.z, -s.h.x, s.h.x);
        const qy = PhysGeo.clamp(dx * s.u1.x + dy * s.u1.y + dz * s.u1.z, -s.h.y, s.h.y);
        const qz = PhysGeo.clamp(dx * s.u2.x + dy * s.u2.y + dz * s.u2.z, -s.h.z, s.h.z);
        return out.set(
            s.wc.x + s.u0.x * qx + s.u1.x * qy + s.u2.x * qz,
            s.wc.y + s.u0.y * qx + s.u1.y * qy + s.u2.y * qz,
            s.wc.z + s.u0.z * qx + s.u1.z * qy + s.u2.z * qz);
    }

    _capsuleBox(sa, sb, emit) {
        this._sphereBox(sa.wa, sa.r, sb, emit, sa.body);
        this._sphereBox(sa.wb, sa.r, sb, emit, sa.body);
        // Внутренняя точка отрезка, ближайшая к коробке (чередование проекций).
        const s = V3.lerp(sa.wa, sa.wb, 0.5, new V3());
        const q = new V3();
        let t = 0.5;
        for (let i = 0; i < 5; i++) {
            this._clampToBox(s, sb, q);
            const cp = PhysGeo.closestOnSegment(sa.wa, sa.wb, q, s);
            t = /** @type {any} */ (cp).t;
        }
        if (t > 0.08 && t < 0.92) this._sphereBox(s, sa.r, sb, emit, sa.body);
    }

    _boxBox(A, sa, B, sb, flip) {
        // Углы A против коробки B и углы B против A (рёбра не ловим — редкость).
        const emitAB = (pA, pB, n, d) => {
            if (!flip) this._emit(A, sa, B, sb, pA, pB, n, d);
            else this._emit(B, sb, A, sa, pB, pA, new V3(-n.x, -n.y, -n.z), d);
        };
        const emitBA = (pB, pA, n, d) => emitAB(pA, pB, new V3(-n.x, -n.y, -n.z), d);
        for (const p of this._boxCorners(sa)) this._sphereBox(p, 0, sb, emitAB, sa.body);
        for (const p of this._boxCorners(sb)) this._sphereBox(p, 0, sa, emitBA, sb.body);
    }

    _solveContacts(h) {
        const pA = new V3(), pB = new V3(), pAp = new V3(), pBp = new V3(), dp = new V3(), corr = new V3();
        for (let i = 0; i < this._nc; i++) {
            const c = this._contacts[i];
            if (c.sensor) continue;
            const A = c.a, B = c.b;
            A.toWorld(c.rA, pA); B.toWorld(c.rB, pB);
            let d = (pB.x - pA.x) * c.n.x + (pB.y - pA.y) * c.n.y + (pB.z - pA.z) * c.n.z;
            if (d <= 0) continue;
            // Глубокое проникновение (зажали между телами) выталкиваем за несколько
            // подшагов: иначе вся коррекция уходит в скорость и части «выстреливают».
            if (d > this.maxDepen * h) d = this.maxDepen * h;
            corr.copy(c.n).scale(d);
            const soft = Math.max(c.sa.soft, c.sb.soft);
            const lam = PhysSolve.pair(A, B, corr, soft, h, pA, pB, false);
            c.lambdaN = -lam;
            if (soft > 0) continue;
            // Статическое трение: гасим касательный сдвиг точек за подшаг.
            A.toWorld(c.rA, pA); B.toWorld(c.rB, pB);
            A.prevToWorld(c.rA, pAp); B.prevToWorld(c.rB, pBp);
            if (B.surfaceVel) pBp.addScaled(B.surfaceVel, -h);
            if (A.surfaceVel) pAp.addScaled(A.surfaceVel, -h);
            dp.set((pA.x - pAp.x) - (pB.x - pBp.x), (pA.y - pAp.y) - (pB.y - pBp.y), (pA.z - pAp.z) - (pB.z - pBp.z));
            const dn = dp.dot(c.n);
            dp.addScaled(c.n, -dn);
            const dl = dp.len();
            if (dl < 1e-9) continue;
            const tn = new V3(dp.x / dl, dp.y / dl, dp.z / dl);
            const w = A.invMassAlong(tn, pA) + B.invMassAlong(tn, pB);
            if (w < 1e-12) continue;
            if (dl / w < c.friction * c.lambdaN) {
                dp.scale(-1);
                PhysSolve.pair(A, B, dp, 0, h, pA, pB, false);
            }
        }
    }

    _solveVelocities(h) {
        const pA = new V3(), pB = new V3(), dv = new V3();
        const g = Math.abs(this.gravity.y);
        for (let i = 0; i < this._nc; i++) {
            const c = this._contacts[i];
            if (c.sensor || c.lambdaN <= 0) continue;
            const A = c.a, B = c.b;
            A.toWorld(c.rA, pA); B.toWorld(c.rB, pB);
            const va = A.velocityAt(pA, _t2), vb = B.velocityAt(pB, _t3);
            const vx = va.x - vb.x, vy = va.y - vb.y, vz = va.z - vb.z;
            const n = c.n;
            const vn = vx * n.x + vy * n.y + vz * n.z;
            const tx = vx - n.x * vn, ty = vy - n.y * vn, tz = vz - n.z * vn;
            const vt = Math.sqrt(tx * tx + ty * ty + tz * tz);
            dv.set(0, 0, 0);
            if (vt > 1e-9) {
                const fn = c.lambdaN / h;
                const k = Math.min(0.85 * c.friction * fn, vt) / vt;
                dv.set(-tx * k, -ty * k, -tz * k);
            }
            const e = Math.abs(c.vnPre) <= 2 * g * h ? 0 : c.restitution;
            const target = Math.max(-e * c.vnPre, 0);
            dv.addScaled(n, target - vn);
            PhysSolve.pair(A, B, dv, 0, h, pA, pB, true);
        }
    }

    // Луч: origin + dir·t, t ≤ maxT. filter(body) -> false — пропустить.
    // { body, shape, point, normal, t } или null.
    raycast(origin, dir, maxT, filter) {
        let best = null;
        const d = dir.clone().normalize();
        for (const b of this.bodies) {
            if (!b.enabled || (filter && !filter(b))) continue;
            b.updateWorld(0);
            for (const s of b.shapes) {
                const hit = PhysRay.shape(origin, d, s, best ? best.t : maxT);
                if (hit && (!best || hit.t < best.t)) { best = hit; best.body = b; best.shape = s; }
            }
        }
        return best;
    }
}

// --- Лучи ------------------------------------------------------------------------

/** @satisfies {Record<string, any>} */
const PhysRay = {
    shape(o, d, s, maxT) {
        if (s.type === 'sphere') return PhysRay.sphere(o, d, s.wc, s.r, maxT);
        if (s.type === 'capsule') return PhysRay.capsule(o, d, s.wa, s.wb, s.r, maxT);
        if (s.type === 'box') return PhysRay.box(o, d, s, maxT);
        if (s.type === 'plane') {
            if (Math.abs(d.y) < 1e-9) return null;
            const t = (s.planeY - o.y) / d.y;
            if (t < 0 || t > maxT) return null;
            const p = new V3(o.x + d.x * t, s.planeY, o.z + d.z * t);
            for (const h of s.holes) if (p.x > h.x0 && p.x < h.x1 && p.z > h.z0 && p.z < h.z1) return null;
            return { t, point: p, normal: new V3(0, 1, 0), body: null, shape: null };
        }
        return null;
    },
    sphere(o, d, c, r, maxT) {
        const mx = o.x - c.x, my = o.y - c.y, mz = o.z - c.z;
        const b = mx * d.x + my * d.y + mz * d.z;
        const cc = mx * mx + my * my + mz * mz - r * r;
        if (cc > 0 && b > 0) return null;
        const disc = b * b - cc;
        if (disc < 0) return null;
        let t = -b - Math.sqrt(disc);
        if (t < 0) t = 0;
        if (t > maxT) return null;
        const p = new V3(o.x + d.x * t, o.y + d.y * t, o.z + d.z * t);
        return { t, point: p, normal: V3.sub(p, c, new V3()).normalize(), body: null, shape: null };
    },
    capsule(o, d, a, b, r, maxT) {
        // Цилиндр + две сферы; берём ближайшее попадание.
        let best = PhysRay.sphere(o, d, a, r, maxT);
        const hb = PhysRay.sphere(o, d, b, r, best ? best.t : maxT);
        if (hb) best = hb;
        const ab = V3.sub(b, a, new V3()), L = ab.len();
        if (L > 1e-6) {
            const u = ab.scale(1 / L);
            const ao = V3.sub(o, a, new V3());
            const dp = V3.sub(d, u.clone().scale(d.dot(u)), new V3());
            const op = V3.sub(ao, u.clone().scale(ao.dot(u)), new V3());
            const A = dp.dot(dp), B = 2 * dp.dot(op), C = op.dot(op) - r * r;
            if (A > 1e-12) {
                const disc = B * B - 4 * A * C;
                if (disc >= 0) {
                    let t = (-B - Math.sqrt(disc)) / (2 * A);
                    if (t < 0 && C < 0) t = 0;
                    if (t >= 0 && t <= (best ? best.t : maxT)) {
                        const p = new V3(o.x + d.x * t, o.y + d.y * t, o.z + d.z * t);
                        const k = V3.sub(p, a, new V3()).dot(u);
                        if (k >= 0 && k <= L) {
                            const axisP = a.clone().addScaled(u, k);
                            best = { t, point: p, normal: V3.sub(p, axisP, new V3()).normalize(), body: null, shape: null };
                        }
                    }
                }
            }
        }
        return best;
    },
    box(o, d, s, maxT) {
        const ro = V3.sub(o, s.wc, new V3());
        const axes = [s.u0, s.u1, s.u2], hs = [s.h.x, s.h.y, s.h.z];
        let t0 = 0, t1 = maxT, nAxis = -1, nSign = 1;
        for (let i = 0; i < 3; i++) {
            const e = axes[i].dot(ro), f = axes[i].dot(d);
            if (Math.abs(f) < 1e-9) { if (Math.abs(e) > hs[i]) return null; continue; }
            let ta = (-hs[i] - e) / f, tb = (hs[i] - e) / f, sign = -1;
            if (ta > tb) { const tmp = ta; ta = tb; tb = tmp; sign = 1; }
            if (ta > t0) { t0 = ta; nAxis = i; nSign = sign; }
            if (tb < t1) t1 = tb;
            if (t0 > t1) return null;
        }
        const p = new V3(o.x + d.x * t0, o.y + d.y * t0, o.z + d.z * t0);
        const n = nAxis >= 0 ? axes[nAxis].clone().scale(nSign) : d.clone().scale(-1);
        return { t: t0, point: p, normal: n, body: null, shape: null };
    },
};
