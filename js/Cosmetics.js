// Cosmetics.js — косметика манекена для магазина (Shop.js): скины, шапки, лица, следы
// пальца, эффекты ударов. Первый предмет каждой категории — бесплатный и надет сразу.
// Цены раздаёт Cosmetics.init: 45% предметов — за монеты, 55% — за 1–5 реклам.
//
// Шапки и лица — примитивы в системе головы (центр головы — 0, макушка ≈ y 14, лицо —
// +z ≈ 13), из них же рисуются иконки карточек:
//   sph(x, y, z, d, цвет, o)              o: { sx, sy, sz } — растяжение
//   cyl(x, y, z, dВерх, dНиз, h, цвет, o)  ось — y; o: { rx, ry, rz } — поворот, градусы
//   box(x, y, z, w, h, глубина, цвет, o)
//   tor(x, y, z, d, толщина, цвет, o)      кольцо в плоскости xz
// Общие поля o: glow (0..1 — светится), spec (0..1 — блестит), spin (рад/с вокруг y).

const cosSph = (x, y, z, d, c, o) => ['sph', x, y, z, d, c, o || {}];
const cosCyl = (x, y, z, dt, db, h, c, o) => ['cyl', x, y, z, dt, db, h, c, o || {}];
const cosBox = (x, y, z, w, h, dp, c, o) => ['box', x, y, z, w, h, dp, c, o || {}];
const cosTor = (x, y, z, d, t, c, o) => ['tor', x, y, z, d, t, c, o || {}];

const COSMETICS = {
    // body/joint — цвета тела и шарниров; pat — узор (c2, c3 — его цвета); emis — светящийся
    // узор; glow — тело светится; spec — блеск; alpha — прозрачность.
    skin: [
        { id: 'classic', ru: 'Манекен', en: 'Dummy', body: 0xf2b928, joint: 0x8a4a26 },
        { id: 'crash', ru: 'Краш-тест', en: 'Crash Test', body: 0xf4f4f0, joint: 0x2a2c31, pat: 'crash', c2: 0xffcc1a, c3: 0x16181c },
        { id: 'zombie', ru: 'Зомби', en: 'Zombie', body: 0x86b66a, joint: 0x4d3b63, pat: 'spots', c2: 0x5f8a4a },
        { id: 'robot', ru: 'Робот', en: 'Robot', body: 0xc9d1dc, joint: 0x4a5260, pat: 'panels', c2: 0x8f99a8, spec: 0.9 },
        { id: 'gold', ru: 'Золото', en: 'Gold', body: 0xf5c542, joint: 0xa8731a, spec: 1 },
        { id: 'ice', ru: 'Лёд', en: 'Ice', body: 0xbfe9ff, joint: 0x6fb0d6, pat: 'facets', c2: 0xe8f8ff, spec: 0.9 },
        { id: 'lava', ru: 'Лава', en: 'Lava', body: 0x2e2622, joint: 0xff6a1a, pat: 'cracks', c2: 0xff7a1a, emis: 'cracks' },
        { id: 'galaxy', ru: 'Галактика', en: 'Galaxy', body: 0x1d1650, joint: 0x6a48d8, pat: 'stars', c2: 0xffffff, c3: 0xb89cff },
        { id: 'camo', ru: 'Камуфляж', en: 'Camo', body: 0x6f7d3c, joint: 0x3b4222, pat: 'camo', c2: 0x4a5528, c3: 0x9a915e },
        { id: 'zebra', ru: 'Зебра', en: 'Zebra', body: 0xf6f6f2, joint: 0x1d1d20, pat: 'tiger', c2: 0x1d1d20 },
        { id: 'candy', ru: 'Леденец', en: 'Candy Cane', body: 0xffffff, joint: 0xe8414e, pat: 'diag', c2: 0xe8414e },
        { id: 'pumpkin', ru: 'Тыква', en: 'Pumpkin', body: 0xff8a1e, joint: 0x3f7a2a, pat: 'ribs', c2: 0xd8641a },
        { id: 'ghost', ru: 'Призрак', en: 'Ghost', body: 0xe8f4ff, joint: 0xa9c7ea, glow: 0.35, alpha: 0.62 },
        { id: 'neon', ru: 'Неон', en: 'Neon', body: 0xff3fb4, joint: 0x3ff4ff, glow: 0.5 },
        { id: 'melon', ru: 'Арбуз', en: 'Watermelon', body: 0x4f9a3a, joint: 0xe8414e, pat: 'vstripes', c2: 0x2f6e27 },
        { id: 'cow', ru: 'Бурёнка', en: 'Cow', body: 0xf8f6f0, joint: 0xffa8b8, pat: 'spots', c2: 0x222222 },
        { id: 'denim', ru: 'Джинса', en: 'Denim', body: 0x3b5b8f, joint: 0xc98a3a, pat: 'stitch', c2: 0xe0b060 },
        { id: 'tiger', ru: 'Тигр', en: 'Tiger', body: 0xff9a2e, joint: 0x2a1c14, pat: 'tiger', c2: 0x2a1c14 },
        { id: 'rainbow', ru: 'Радуга', en: 'Rainbow', body: 0xffffff, joint: 0x7a4ad8, pat: 'rainbow' },
        { id: 'choco', ru: 'Шоколад', en: 'Chocolate', body: 0x6b3b1f, joint: 0x3e2211, pat: 'grid', c2: 0x4e2a14, spec: 0.4 },
        { id: 'marble', ru: 'Мрамор', en: 'Marble', body: 0xf2f0ea, joint: 0x8f949c, pat: 'marble', c2: 0x9aa0aa, spec: 0.6 },
        { id: 'cactus', ru: 'Кактус', en: 'Cactus', body: 0x4caf50, joint: 0xe8c26b, pat: 'dots', c2: 0xf4f7e8 },
        { id: 'pixel', ru: 'Пиксели', en: 'Pixels', body: 0x5ab84a, joint: 0x6b4a2a, pat: 'pixels', c2: 0x3f8f35, c3: 0x8ed36a },
        { id: 'hazard', ru: 'Осторожно', en: 'Hazard', body: 0xffcc1a, joint: 0x1d1d20, pat: 'diag', c2: 0x1d1d20 },
        { id: 'electric', ru: 'Электро', en: 'Electric', body: 0x243a8f, joint: 0x7af4ff, pat: 'bolts', c2: 0x7af4ff, emis: 'bolts' },
        { id: 'diamond', ru: 'Алмаз', en: 'Diamond', body: 0x8fe8ff, joint: 0x3fa8d8, pat: 'facets', c2: 0xd8f8ff, spec: 1, glow: 0.12 },
        { id: 'mummy', ru: 'Мумия', en: 'Mummy', body: 0xe8dcc0, joint: 0x9a8a68, pat: 'bandage', c2: 0xb8a882 },
    ],
    hat: [
        { id: 'none', ru: 'Без шапки', en: 'No Hat', parts: [] },
        { id: 'cap', ru: 'Кепка', en: 'Cap', parts: [cosSph(0, 8.5, -1, 29, 0xe23a3a, { sy: 0.6 }), cosBox(0, 8.5, 14.5, 20, 2.5, 13, 0xe23a3a, { rx: -8 })] },
        { id: 'tophat', ru: 'Цилиндр', en: 'Top Hat', parts: [cosCyl(0, 11, 0, 38, 38, 2.5, 0x26282e), cosCyl(0, 24, 0, 22, 22, 24, 0x26282e), cosCyl(0, 15, 0, 23, 23, 4.5, 0xe23a3a)] },
        { id: 'crown', ru: 'Корона', en: 'Crown', parts: [cosCyl(0, 15, 0, 25, 23, 9, 0xf5c542, { spec: 1 }),
            cosCyl(11, 23, 0, 0, 6, 8, 0xf5c542, { spec: 1 }), cosCyl(-11, 23, 0, 0, 6, 8, 0xf5c542, { spec: 1 }), cosCyl(0, 23, 11, 0, 6, 8, 0xf5c542, { spec: 1 }),
            cosCyl(0, 23, -11, 0, 6, 8, 0xf5c542, { spec: 1 }), cosSph(0, 15, 12.5, 4.5, 0xe23a3a, { spec: 1 }), cosSph(12.5, 15, 0, 4, 0x3b8fe6, { spec: 1 }), cosSph(-12.5, 15, 0, 4, 0x3b8fe6, { spec: 1 })] },
        { id: 'party', ru: 'Колпак', en: 'Party Hat', parts: [cosCyl(0, 26, 0, 0, 19, 26, 0xff5ab4), cosCyl(0, 21, 0, 12.5, 12.5, 3, 0xffe24a), cosSph(0, 40, 0, 7, 0xffe24a)] },
        { id: 'beanie', ru: 'Шапка', en: 'Beanie', parts: [cosSph(0, 9, -1.5, 29.5, 0x3b8fe6, { sy: 0.74 }), cosCyl(0, 7, -1.5, 29.5, 29.5, 5, 0x1f5fae), cosSph(0, 20, -1.5, 10, 0xfffaf0)] },
        { id: 'chef', ru: 'Повар', en: 'Chef', parts: [cosCyl(0, 17, 0, 22, 23, 12, 0xfffaf0), cosSph(0, 27, 0, 30, 0xfffaf0, { sy: 0.62 })] },
        { id: 'viking', ru: 'Викинг', en: 'Viking', parts: [cosSph(0, 9.5, -1, 30.5, 0x9aa3ad, { sy: 0.66, spec: 0.7 }), cosCyl(0, 8, -1, 30.5, 30.5, 4, 0x6b4a2a),
            cosCyl(15, 17, -1, 0, 7, 17, 0xf4ecd8, { rz: -52 }), cosCyl(-15, 17, -1, 0, 7, 17, 0xf4ecd8, { rz: 52 })] },
        { id: 'cowboy', ru: 'Ковбой', en: 'Cowboy', parts: [cosCyl(0, 10, 0, 50, 50, 2.5, 0x9a6232), cosCyl(0, 18, 0, 17, 23, 14, 0x9a6232), cosCyl(0, 13, 0, 23.5, 23.5, 3.5, 0x3a2414)] },
        { id: 'halo', ru: 'Нимб', en: 'Halo', parts: [cosTor(0, 25, 0, 24, 3, 0xffe24a, { glow: 0.8 })] },
        { id: 'propeller', ru: 'Пропеллер', en: 'Propeller', parts: [cosSph(0, 8.5, -1, 29, 0x3ed05f, { sy: 0.6 }), cosCyl(0, 17, 0, 2, 2, 7, 0x26282e),
            cosBox(0, 21, 0, 34, 1.5, 5, 0xe23a3a, { spin: 14 })] },
        { id: 'wizard', ru: 'Волшебник', en: 'Wizard', parts: [cosCyl(0, 10, 0, 40, 40, 2.5, 0x5a3eb8), cosCyl(-3, 29, 0, 0, 22, 38, 0x5a3eb8, { rz: 12 }), cosSph(4, 25, 9, 5, 0xffe24a, { glow: 0.5 })] },
        { id: 'cone', ru: 'Конус', en: 'Traffic Cone', parts: [cosBox(0, 10, 0, 26, 3, 26, 0xff7a1a), cosCyl(0, 27, 0, 5, 21, 32, 0xff7a1a), cosCyl(0, 27, 0, 13.5, 13.5, 5, 0xfffaf0)] },
        { id: 'hardhat', ru: 'Каска', en: 'Hard Hat', parts: [cosSph(0, 9.5, -1, 30.5, 0xffcc1a, { sy: 0.66, spec: 0.5 }), cosCyl(0, 8, 1, 35, 35, 2, 0xffcc1a), cosBox(0, 18.5, -1, 3.5, 3.5, 26, 0xf0b400)] },
        { id: 'santa', ru: 'Дед Мороз', en: 'Santa', parts: [cosCyl(4, 21, 0, 4, 25, 26, 0xe23a3a, { rz: -24 }), cosCyl(0, 9, 0, 29, 29, 6, 0xfffaf0), cosSph(10, 33, 0, 9, 0xfffaf0)] },
        { id: 'bunny', ru: 'Зайка', en: 'Bunny Ears', parts: [cosSph(6, 25, -2, 9, 0xfffaf0, { sy: 2.8, rz: -12 }), cosSph(-6, 25, -2, 9, 0xfffaf0, { sy: 2.8, rz: 12 }),
            cosSph(6.4, 25, 0.8, 5, 0xffa8c8, { sy: 3.2, rz: -12 }), cosSph(-6.4, 25, 0.8, 5, 0xffa8c8, { sy: 3.2, rz: 12 })] },
        { id: 'alien', ru: 'Антенны', en: 'Antennae', parts: [cosCyl(5, 19, 0, 1.8, 1.8, 14, 0x26282e, { rz: -20 }), cosCyl(-5, 19, 0, 1.8, 1.8, 14, 0x26282e, { rz: 20 }),
            cosSph(7.6, 26, 0, 6, 0x7aff5a, { glow: 0.7 }), cosSph(-7.6, 26, 0, 6, 0x7aff5a, { glow: 0.7 })] },
        { id: 'sombrero', ru: 'Сомбреро', en: 'Sombrero', parts: [cosCyl(0, 10, 0, 64, 64, 2.5, 0xe8c26b), cosCyl(0, 19, 0, 13, 21, 16, 0xe8c26b), cosCyl(0, 13, 0, 21.5, 21.5, 4, 0xe23a3a),
            cosTor(0, 10, 0, 62, 2.5, 0x3ed05f)] },
        { id: 'grad', ru: 'Выпускник', en: 'Graduate', parts: [cosCyl(0, 12, 0, 24, 24, 7, 0x26282e), cosBox(0, 16, 0, 32, 2, 32, 0x26282e, { ry: 45 }),
            cosCyl(14, 12, 6, 1.5, 1.5, 9, 0xffcc1a)] },
        { id: 'headphones', ru: 'Наушники', en: 'Headphones', parts: [cosCyl(0, 17, 0, 3.5, 3.5, 30, 0x26282e, { rz: 90 }), cosCyl(14.5, 9, 0, 3.5, 3.5, 14, 0x26282e),
            cosCyl(-14.5, 9, 0, 3.5, 3.5, 14, 0x26282e), cosCyl(14.5, 0, 0, 12, 12, 6, 0xe23a3a, { rz: 90 }), cosCyl(-14.5, 0, 0, 12, 12, 6, 0xe23a3a, { rz: 90 })] },
        { id: 'pot', ru: 'Кастрюля', en: 'Saucepan', parts: [cosCyl(0, 14, 0, 29, 27, 14, 0xb8c0ca, { spec: 0.9 }), cosBox(22, 17, 0, 18, 3, 4, 0x26282e)] },
        { id: 'witch', ru: 'Ведьма', en: 'Witch', parts: [cosCyl(0, 10, 0, 44, 44, 2.5, 0x2c2238), cosCyl(3, 28, 0, 0, 21, 36, 0x2c2238, { rz: -16 }), cosCyl(0, 14, 0, 21.5, 21.5, 4, 0x8a4ad8)] },
        { id: 'mohawk', ru: 'Ирокез', en: 'Mohawk', parts: [cosCyl(0, 17, -11, 0, 7, 12, 0xff3fb4, { rx: -50 }), cosCyl(0, 19, -5, 0, 7, 14, 0xff3fb4, { rx: -22 }),
            cosCyl(0, 20, 1, 0, 7, 15, 0xff3fb4), cosCyl(0, 19, 7, 0, 7, 13, 0xff3fb4, { rx: 25 })] },
        { id: 'afro', ru: 'Афро', en: 'Afro', parts: [cosSph(0, 13, -7, 42, 0x3a2414, { sy: 0.86 })] },
        { id: 'fez', ru: 'Феска', en: 'Fez', parts: [cosCyl(0, 17, 0, 15, 19, 12, 0xc8283a), cosCyl(0, 23.5, 0, 2, 2, 1.5, 0x26282e), cosCyl(-5, 17, 7, 1.5, 1.5, 10, 0xffcc1a, { rz: -10 })] },
        { id: 'pirate', ru: 'Пират', en: 'Pirate', parts: [cosSph(0, 14, 0, 44, 0x26282e, { sy: 0.42, sz: 0.5 }), cosSph(0, 17, 10.5, 7, 0xfffaf0)] },
    ],
    face: [
        { id: 'plain', ru: 'Обычное', en: 'Plain', parts: [] },
        { id: 'angry', ru: 'Сердитое', en: 'Angry', parts: [cosBox(4.8, 9.5, 13.3, 9, 2.2, 2, 0x16181c, { rz: -22 }), cosBox(-4.8, 9.5, 13.3, 9, 2.2, 2, 0x16181c, { rz: 22 })] },
        { id: 'shades', ru: 'Очки', en: 'Shades', parts: [cosBox(5.4, 3.4, 16, 9.5, 6.5, 1.6, 0x16181c, { spec: 1 }), cosBox(-5.4, 3.4, 16, 9.5, 6.5, 1.6, 0x16181c, { spec: 1 }),
            cosBox(0, 4.6, 16, 3, 1.5, 1.4, 0x16181c)] },
        { id: 'mustache', ru: 'Усы', en: 'Mustache', parts: [cosSph(3.8, -2.6, 13.4, 8.5, 0x3a2414, { sx: 1.25, sy: 0.55, rz: 16 }), cosSph(-3.8, -2.6, 13.4, 8.5, 0x3a2414, { sx: 1.25, sy: 0.55, rz: -16 })] },
        { id: 'clown', ru: 'Клоун', en: 'Clown', parts: [cosSph(0, -0.5, 15, 7.5, 0xe23a3a, { spec: 0.6 }), cosSph(8.2, -3, 10.8, 5, 0xff8ab0, { sz: 0.5 }), cosSph(-8.2, -3, 10.8, 5, 0xff8ab0, { sz: 0.5 })] },
        { id: 'monocle', ru: 'Монокль', en: 'Monocle', parts: [cosTor(-4.6, 3.2, 15.8, 10, 1.3, 0xf5c542, { rx: 90, spec: 1 }), cosBox(-3, 8.6, 13.6, 9, 1.6, 1.6, 0x16181c, { rz: 10 })] },
        { id: 'beard', ru: 'Борода', en: 'Beard', hideMouth: true, parts: [cosSph(0, -8.5, 7, 25, 0x6b4426, { sy: 0.85, sz: 0.62 }), cosSph(0, -3, 13, 9, 0x6b4426, { sx: 1.3, sy: 0.45 })] },
        { id: 'cyclops', ru: 'Циклоп', en: 'Cyclops', hideEyes: true, parts: [cosSph(0, 3.5, 10.2, 14, 0xffffff), cosSph(0, 3.5, 16.8, 5.5, 0x16181c)] },
        { id: 'nerd', ru: 'Ботаник', en: 'Nerd', parts: [cosTor(5, 3.2, 15.7, 9.5, 1.4, 0x16181c, { rx: 90 }), cosTor(-5, 3.2, 15.7, 9.5, 1.4, 0x16181c, { rx: 90 }),
            cosBox(0, 3.2, 15.9, 1.6, 1.4, 1.2, 0x16181c), cosBox(1.5, -8.2, 12.2, 2.6, 3, 1, 0xffffff), cosBox(-1.5, -8.2, 12.2, 2.6, 3, 1, 0xffffff)] },
        { id: 'eyepatch', ru: 'Повязка', en: 'Eye Patch', parts: [cosCyl(4.6, 3.2, 15.4, 10, 10, 1.6, 0x16181c, { rx: 90 }), cosBox(0, 7.8, 13.2, 26, 1.4, 1, 0x16181c, { rz: -22 })] },
        { id: 'ninja', ru: 'Ниндзя', en: 'Ninja', hideMouth: true, parts: [cosSph(0, -4.5, 1.5, 27.6, 0x26282e, { sy: 0.62, sz: 0.98 }), cosBox(0, 9.5, 12.4, 22, 3.5, 2, 0xe23a3a)] },
        { id: 'lasereyes', ru: 'Лазер-глаза', en: 'Laser Eyes', hideEyes: true, parts: [cosSph(4.6, 3.2, 11, 9.8, 0xff2a2a, { glow: 1 }), cosSph(-4.6, 3.2, 11, 9.8, 0xff2a2a, { glow: 1 })] },
        { id: 'vampire', ru: 'Вампир', en: 'Vampire', parts: [cosCyl(2.4, -7.6, 12.6, 2.6, 0, 4.2, 0xffffff), cosCyl(-2.4, -7.6, 12.6, 2.6, 0, 4.2, 0xffffff),
            cosBox(4.8, 9, 13.3, 8, 1.8, 1.6, 0x16181c, { rz: -14 }), cosBox(-4.8, 9, 13.3, 8, 1.8, 1.6, 0x16181c, { rz: 14 })] },
        { id: 'bandage', ru: 'Пластырь', en: 'Band-Aid', parts: [cosBox(6.5, 9.5, 12.2, 9, 3, 1, 0xe8c08a, { rz: 40 }), cosBox(6.5, 9.5, 12.3, 9, 3, 1, 0xe8c08a, { rz: -40 })] },
    ],
    // Линия перетаскивания: c — цвет, c2 — второй цвет; glow — свечение; dash — точки;
    // deco — значки вдоль линии; jag — молния; rainbow; candy — полоски; core — белая сердцевина.
    trail: [
        { id: 'green', ru: 'Зелёный', en: 'Green', c: '#2fe04a', c2: '#0d3a1a' },
        { id: 'rainbow', ru: 'Радуга', en: 'Rainbow', rainbow: true, c: '#ff4a4a', c2: '#16233a' },
        { id: 'fire', ru: 'Огонь', en: 'Fire', c: '#ffb020', c2: '#ff3a1a', glow: '#ff6a1a', grad: true },
        { id: 'ice', ru: 'Лёд', en: 'Ice', c: '#8ff4ff', c2: '#2a6fb8', core: true },
        { id: 'gold', ru: 'Золото', en: 'Gold', c: '#ffd24a', c2: '#8a5a10', deco: 'spark' },
        { id: 'neon', ru: 'Неон', en: 'Neon', c: '#ff3fb4', c2: '#ffffff', glow: '#ff3fb4', core: true },
        { id: 'dots', ru: 'Точки', en: 'Dots', c: '#fffaf0', c2: '#16233a', dash: true },
        { id: 'electric', ru: 'Молния', en: 'Lightning', c: '#7af4ff', c2: '#ffffff', glow: '#7af4ff', jag: true },
        { id: 'candy', ru: 'Леденец', en: 'Candy', c: '#ffffff', c2: '#e8414e', candy: true },
        { id: 'ink', ru: 'Чернила', en: 'Ink', c: '#16181c', c2: '#16181c', wide: true },
        { id: 'stars', ru: 'Звёзды', en: 'Stars', c: '#ffe24a', c2: '#16233a', deco: 'star' },
        { id: 'hearts', ru: 'Сердечки', en: 'Hearts', c: '#ff5a8a', c2: '#7a1030', deco: 'heart' },
        { id: 'laser', ru: 'Лазер', en: 'Laser', c: '#ff2a2a', c2: '#ffffff', glow: '#ff2a2a', core: true, thin: true },
    ],
    // Удары: c1/c2 — цвета искр, multi — разные цвета по очереди, grav — тяжесть искр,
    // pop — цвет надписи «ХРУСТЬ!», blend — непрозрачные частицы, tex — спрайт из Fx.TEX
// (без него — круглая мягкая частица: чистый цвет без оттенка спрайта).
    hit: [
        { id: 'sparks', ru: 'Искры', en: 'Sparks', c1: '#ffffff', c2: '#ffe28a', pop: '#ff5a3a' },
        { id: 'confetti', ru: 'Конфетти', en: 'Confetti', multi: ['#ff4a6a', '#ffd24a', '#3ed05f', '#3b8fe6', '#b86aff'], c1: '#ffd24a', c2: '#ff4a6a', grav: -500, blend: 'standard', pop: '#b86aff' },
        { id: 'stars', ru: 'Звёзды', en: 'Stars', c1: '#ffe24a', c2: '#fff6c0', pop: '#ffc42e', tex: 'spark' },
        { id: 'hearts', ru: 'Сердца', en: 'Hearts', c1: '#ff5a8a', c2: '#ffc0d4', pop: '#ff5a8a' },
        { id: 'flame', ru: 'Пламя', en: 'Flames', c1: '#ffffff', c2: '#ff7a1a', grav: 300, pop: '#ff7a1a', tex: 'flame' },
        { id: 'zap', ru: 'Разряд', en: 'Zap', c1: '#8ff4ff', c2: '#ffffff', grav: 0, fast: true, pop: '#3fd8ff', tex: 'spark' },
        { id: 'toxic', ru: 'Яд', en: 'Toxic', c1: '#9dff3a', c2: '#3ed05f', blend: 'standard', pop: '#7ae82a' },
        { id: 'ink', ru: 'Клякса', en: 'Ink', c1: '#16181c', c2: '#3a3f4a', blend: 'standard', pop: '#26282e' },
        { id: 'bubbles', ru: 'Пузыри', en: 'Bubbles', c1: '#bfe9ff', c2: '#ffffff', grav: 200, slow: true, pop: '#3b8fe6', tex: 'puff' },
        { id: 'coins', ru: 'Монеты', en: 'Coins', c1: '#ffc42e', c2: '#fff0a0', blend: 'standard', pop: '#ffc42e' },
        { id: 'rainbow', ru: 'Радуга', en: 'Rainbow', multi: ['#ff4a4a', '#ffa82e', '#ffe24a', '#3ed05f', '#3b8fe6', '#8a4ad8'], c1: '#ff4a4a', c2: '#3b8fe6', pop: '#ff4ad8' },
        { id: 'frost', ru: 'Иней', en: 'Frost', c1: '#e8f8ff', c2: '#8fd4ff', grav: -150, slow: true, pop: '#6fc4ff' },
        { id: 'candy', ru: 'Сладости', en: 'Sweets', multi: ['#ff8ab0', '#8ff0d0', '#fff0a0'], c1: '#ff8ab0', c2: '#8ff0d0', blend: 'standard', pop: '#ff6aa0' },
    ],
};

/** @satisfies {Record<string, any>} */
const Cosmetics = {
    CATS: ['skin', 'hat', 'face', 'trail', 'hit'],
    COIN_SHARE: 0.45,
    _icons: {},
    _rainbowK: 0,
    /** @type {any} */
    game: null,

    // Цены: по всем платным предметам подряд — ровно 45% за монеты, остальные за рекламу;
    // цена и число реклам растут к концу категории.
    init(game) {
        this.game = game;
        let g = 0;
        for (const cat of this.CATS) {
            const list = COSMETICS[cat], n = list.length;
            list.forEach((it, i) => {
                it.cat = cat;
                if (i === 0) { it.free = true; return; }
                const coin = Math.floor((g + 1) * this.COIN_SHARE) > Math.floor(g * this.COIN_SHARE);
                g++;
                if (coin) it.price = Math.round((120 + 1500 * (i - 1) / Math.max(1, n - 2)) / 10) * 10;
                else it.ads = Math.max(1, Math.min(5, 1 + Math.floor((i - 1) * 5 / Math.max(1, n - 1))));
            });
        }
    },

    list(cat) { return COSMETICS[cat] || []; },
    find(cat, id) { const l = this.list(cat); return l.find(x => x.id === id) || l[0]; },
    key(it) { return it.cat + ':' + it.id; },
    name(it) { return (it && (it[Lang.code] || it.en)) || ''; },

    // Сохранение: coins, own[], adp{} (просмотрено реклам), eq{} (надето).
    save() {
        const s = this.game ? this.game.save : {};
        if (typeof s.coins !== 'number') s.coins = 0;
        if (!Array.isArray(s.own)) s.own = [];
        if (!s.adp || typeof s.adp !== 'object') s.adp = {};
        if (!s.eq || typeof s.eq !== 'object') s.eq = {};
        return s;
    },
    owned(it) { return !!it && (it.free || this.save().own.indexOf(this.key(it)) >= 0); },
    equipped(cat) { return this.find(cat, this.save().eq[cat]); },
    look() {
        const o = {};
        for (const c of this.CATS) o[c] = this.equipped(c);
        return o;
    },

    // --- Манекен -----------------------------------------------------------------------

    // Надеть на манекен (DummyVisual) скин, шапку и лицо. look — { skin, hat, face }.
    apply(vis, look) {
        if (!vis || !vis.dummy) return;
        const lk = look || this.look();
        this._skin(vis, lk.skin || COSMETICS.skin[0]);
        this._wear(vis, 'hat', lk.hat || COSMETICS.hat[0]);
        this._wear(vis, 'face', lk.face || COSMETICS.face[0]);
    },

    _skin(vis, it) {
        if (vis.skinId === it.id) return;
        vis.skinId = it.id;
        const C = (hex) => World3D.hexColor3(hex);
        const tex = it.pat ? this.skinTexture(vis.scene, it, false) : null;
        const emis = it.emis ? this.skinTexture(vis.scene, it, true) : null;
        vis.colors.body = tex ? C(0xffffff) : C(it.body);
        vis.colors.joint = C(it.joint);
        vis.jointMat.diffuseColor = C(it.joint);
        vis.skinGlow = it.glow || 0;
        const spec = it.spec || 0;
        for (const part of vis.dummy.parts) {
            const m = part.mat;
            if (!m) continue;
            const belly = part.id === 'belly';
            if (!part._crackTex) m.diffuseTexture = belly ? null : tex;
            m.emissiveTexture = belly ? null : emis;
            m.specularColor = new BABYLON.Color3(0.1 + spec * 0.8, 0.1 + spec * 0.8, 0.1 + spec * 0.8);
            m.specularPower = spec ? 24 : 64;
            m.alpha = it.alpha || 1;
        }
        vis.jointMat.alpha = it.alpha || 1;
        vis.jointMat.specularColor = new BABYLON.Color3(0.1 + spec * 0.6, 0.1 + spec * 0.6, 0.1 + spec * 0.6);
    },

    // Шапка или лицо: свой узел на голове; прежний снимается.
    _wear(vis, slot, it) {
        const cur = vis.worn && vis.worn[slot];
        if (cur && cur.id === it.id) return;
        vis.worn = vis.worn || {};
        if (cur) {
            try { World3D.removeObject(vis.view, cur.root); } catch (e) { /* сцена снесена */ }
            for (const m of cur.mats) m.dispose();
            vis.spins = (vis.spins || []).filter(s => s.slot !== slot);
        }
        vis.worn[slot] = null;
        if (slot === 'face') {
            for (const p of vis.pupils || []) { p.eye.setEnabled(!it.hideEyes); p.mesh.setEnabled(!it.hideEyes); }
            if (vis.mouth) vis.mouth.setEnabled(!it.hideMouth);
        }
        if (!it.parts || !it.parts.length) { vis.worn[slot] = { id: it.id, root: null, mats: [] }; return; }
        const head = vis.dummy.byId.head.node;
        const root = new BABYLON.Mesh('cos-' + slot, vis.scene);
        root.parent = head;
        const mats = [];
        for (const pr of it.parts) {
            const mesh = this._prim(vis.scene, pr, mats);
            mesh.parent = root;
            const o = pr[pr.length - 1];
            if (o.spin) (vis.spins || (vis.spins = [])).push({ slot, mesh, w: o.spin });
        }
        World3D.addObject(vis.view, root, 'actor');
        vis.worn[slot] = { id: it.id, root, mats };
    },

    _prim(scene, pr, mats) {
        const B = BABYLON.MeshBuilder, D = Math.PI / 180;
        const [type, x, y, z] = pr;
        const o = pr[pr.length - 1];
        let mesh, color;
        if (type === 'sph') { mesh = B.CreateSphere('cos', { diameter: pr[4], segments: 12 }, scene); color = pr[5]; mesh.scaling.set(o.sx || 1, o.sy || 1, o.sz || 1); }
        else if (type === 'cyl') { mesh = B.CreateCylinder('cos', { diameterTop: pr[4], diameterBottom: pr[5], height: pr[6], tessellation: 18 }, scene); color = pr[7]; }
        else if (type === 'box') { mesh = B.CreateBox('cos', { width: pr[4], height: pr[5], depth: pr[6] }, scene); color = pr[7]; }
        else { mesh = B.CreateTorus('cos', { diameter: pr[4], thickness: pr[5], tessellation: 24 }, scene); color = pr[6]; }
        mesh.position.set(x, y, z);
        mesh.rotation.set((o.rx || 0) * D, (o.ry || 0) * D, (o.rz || 0) * D);
        const m = DummyVisual.mat(scene, 'cos-mat', World3D.hexColor3(color));
        if (o.spec) { m.specularColor = new BABYLON.Color3(o.spec, o.spec, o.spec); m.specularPower = 32; }
        if (o.glow) m.emissiveColor = World3D.hexColor3(color).scale(o.glow * 0.8);
        mesh.material = m;
        mats.push(m);
        return mesh;
    },

    // Узор скина — канвас-текстура (одна на скин и сцену); emis — светящаяся часть.
    skinTexture(scene, it, emis) {
        const md = scene.metadata || (scene.metadata = {});
        const cache = md.skinTex || (md.skinTex = {});
        const k = it.id + (emis ? ':e' : '');
        if (cache[k]) return cache[k];
        const size = 256;
        const tex = new BABYLON.DynamicTexture('skin-' + k, { width: size, height: size }, scene, true);
        const ctx = /** @type {CanvasRenderingContext2D} */ (/** @type {any} */ (tex.getContext()));
        this.paint(ctx, size, it, emis);
        tex.update();
        tex.wrapU = tex.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
        cache[k] = tex;
        return tex;
    },

    hex(c) { return '#' + (c >>> 0).toString(16).padStart(6, '0'); },

    // Рисует узор скина в квадрат size×size (текстура и иконка).
    paint(ctx, size, it, emis) {
        const H = (c) => this.hex(c);
        let seed = 0;
        for (const ch of it.id) seed = (seed * 31 + ch.charCodeAt(0)) % 2147483647;
        seed = seed || 7;
        const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
        const s = size / 256;
        ctx.save();
        ctx.fillStyle = emis ? '#000000' : H(it.body);
        ctx.fillRect(0, 0, size, size);
        const c2 = emis ? H(it.c2) : H(it.c2 || it.joint);
        ctx.fillStyle = c2; ctx.strokeStyle = c2;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        const blob = (x, y, r, col) => {
            ctx.fillStyle = col; ctx.beginPath();
            for (let a = 0; a <= 12; a++) {
                const t = a / 12 * Math.PI * 2, rr = r * (0.75 + rnd() * 0.45);
                const px = x + Math.cos(t) * rr, py = y + Math.sin(t) * rr;
                if (a) ctx.lineTo(px, py); else ctx.moveTo(px, py);
            }
            ctx.fill();
        };
        // Узор повторяется по краям (текстура обёрнута вокруг цилиндра).
        const wrap = (fn) => { for (const dx of [-size, 0, size]) { ctx.save(); ctx.translate(dx, 0); fn(); ctx.restore(); } };
        switch (it.pat) {
            case 'crash':
                for (const [x, y] of [[64, 64], [192, 192], [192, 64], [64, 192]]) {
                    const r = 38 * s, X = x * s, Y = y * s;
                    for (let q = 0; q < 4; q++) {
                        ctx.fillStyle = q % 2 ? H(it.c3) : H(it.c2);
                        ctx.beginPath(); ctx.moveTo(X, Y); ctx.arc(X, Y, r, q * Math.PI / 2, (q + 1) * Math.PI / 2); ctx.closePath(); ctx.fill();
                    }
                    ctx.strokeStyle = H(it.c3); ctx.lineWidth = 4 * s; ctx.beginPath(); ctx.arc(X, Y, r, 0, Math.PI * 2); ctx.stroke();
                }
                break;
            case 'spots':
                for (let i = 0; i < 9; i++) wrap(() => blob(rnd() * size, rnd() * size, (14 + rnd() * 26) * s, c2));
                break;
            case 'stars':
                for (let i = 0; i < 90; i++) { ctx.fillStyle = rnd() < 0.3 ? H(it.c3) : c2; const r = (0.8 + rnd() * 2.2) * s; ctx.beginPath(); ctx.arc(rnd() * size, rnd() * size, r, 0, Math.PI * 2); ctx.fill(); }
                for (let i = 0; i < 6; i++) { const x = rnd() * size, y = rnd() * size, r = (6 + rnd() * 6) * s; ctx.fillStyle = c2; ctx.beginPath();
                    for (let a = 0; a < 8; a++) { const t = a * Math.PI / 4, rr = a % 2 ? r * 0.25 : r; ctx.lineTo(x + Math.cos(t) * rr, y + Math.sin(t) * rr); } ctx.fill(); }
                break;
            case 'panels':
                ctx.lineWidth = 3 * s;
                for (let i = 0; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(0, i * 64 * s); ctx.lineTo(size, i * 64 * s); ctx.stroke(); }
                for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (const [a, b] of [[10, 10], [54, 10], [10, 54], [54, 54]]) {
                    ctx.beginPath(); ctx.arc((j * 64 + a) * s, (i * 64 + b) * s, 3 * s, 0, Math.PI * 2); ctx.fill();
                }
                break;
            case 'facets':
                for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
                    ctx.fillStyle = rnd() < 0.5 ? c2 : 'rgba(255,255,255,0.25)';
                    ctx.beginPath(); ctx.moveTo(j * 32 * s, i * 32 * s); ctx.lineTo((j + 1) * 32 * s, i * 32 * s); ctx.lineTo(j * 32 * s, (i + 1) * 32 * s); ctx.fill();
                }
                break;
            case 'cracks':
            case 'bolts': {
                ctx.strokeStyle = c2; ctx.lineWidth = (emis ? 5 : 7) * s;
                const jag = it.pat === 'bolts';
                for (let k = 0; k < (jag ? 7 : 10); k++) wrap(() => {
                    let x = rnd() * size, y = rnd() * size;
                    ctx.beginPath(); ctx.moveTo(x, y);
                    for (let i = 0; i < 5; i++) { x += (jag ? (i % 2 ? 26 : -26) : (rnd() - 0.5) * 70) * s; y += (jag ? 22 : (rnd() - 0.3) * 50) * s; ctx.lineTo(x, y); }
                    ctx.stroke();
                });
                break;
            }
            case 'camo':
                for (let i = 0; i < 16; i++) wrap(() => blob(rnd() * size, rnd() * size, (16 + rnd() * 24) * s, [c2, H(it.c3), H(it.joint)][i % 3]));
                break;
            case 'tiger':
                ctx.lineWidth = 12 * s;
                for (let i = 0; i < 9; i++) {
                    const y0 = (i + 0.5) * size / 9;
                    ctx.beginPath(); ctx.moveTo(-10, y0);
                    for (let x = 0; x <= size + 10; x += 16 * s) ctx.lineTo(x, y0 + Math.sin(x / size * Math.PI * 4 + i) * 8 * s + (rnd() - 0.5) * 4 * s);
                    ctx.lineWidth = (6 + rnd() * 10) * s; ctx.stroke();
                }
                break;
            case 'diag':
                ctx.lineWidth = 22 * s;
                for (let i = -8; i < 16; i++) { ctx.beginPath(); ctx.moveTo(i * 44 * s, 0); ctx.lineTo(i * 44 * s + size, size); ctx.stroke(); }
                break;
            case 'ribs':
            case 'vstripes':
                for (let i = 0; i < 8; i++) { ctx.fillRect((i * 32 + 8) * s, 0, (it.pat === 'ribs' ? 6 : 14) * s, size); }
                break;
            case 'stitch':
                ctx.lineWidth = 2.5 * s; ctx.setLineDash([7 * s, 6 * s]);
                for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(0, (i * 64 + 30) * s); ctx.lineTo(size, (i * 64 + 30) * s); ctx.stroke(); }
                for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo((i * 64 + 30) * s, 0); ctx.lineTo((i * 64 + 30) * s, size); ctx.stroke(); }
                ctx.setLineDash([]);
                break;
            case 'rainbow': {
                const cols = ['#ff4a4a', '#ffa82e', '#ffe24a', '#3ed05f', '#3b8fe6', '#8a4ad8'];
                for (let i = 0; i < 12; i++) { ctx.fillStyle = cols[i % 6]; ctx.fillRect(0, i * size / 12, size, size / 12 + 1); }
                break;
            }
            case 'grid':
                ctx.lineWidth = 6 * s;
                for (let i = 0; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(0, i * 64 * s); ctx.lineTo(size, i * 64 * s); ctx.stroke(); ctx.beginPath(); ctx.moveTo(i * 64 * s, 0); ctx.lineTo(i * 64 * s, size); ctx.stroke(); }
                break;
            case 'marble':
                ctx.lineWidth = 2 * s;
                for (let k = 0; k < 7; k++) wrap(() => {
                    let x = rnd() * size, y = rnd() * size;
                    ctx.globalAlpha = 0.5 + rnd() * 0.5; ctx.lineWidth = (1 + rnd() * 3) * s;
                    ctx.beginPath(); ctx.moveTo(x, y);
                    for (let i = 0; i < 8; i++) { x += (rnd() - 0.3) * 50 * s; y += (rnd() - 0.5) * 40 * s; ctx.quadraticCurveTo(x - 10 * s, y + 10 * s, x, y); }
                    ctx.stroke();
                });
                ctx.globalAlpha = 1;
                break;
            case 'dots':
                for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { ctx.beginPath(); ctx.arc((j * 32 + (i % 2) * 16 + 8) * s, (i * 32 + 16) * s, 2.6 * s, 0, Math.PI * 2); ctx.fill(); }
                break;
            case 'pixels':
                for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { ctx.fillStyle = [H(it.body), c2, H(it.c3)][Math.floor(rnd() * 3)]; ctx.fillRect(j * 32 * s, i * 32 * s, 32 * s + 1, 32 * s + 1); }
                break;
            case 'bandage':
                for (let i = 0; i < 11; i++) {
                    const y = i * size / 11 + (rnd() - 0.5) * 6 * s;
                    ctx.globalAlpha = 0.8; ctx.lineWidth = 2 * s;
                    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y + (rnd() - 0.5) * 14 * s); ctx.stroke();
                }
                ctx.globalAlpha = 1;
                break;
        }
        ctx.restore();
    },

    // --- Иконки карточек (канвас -> dataURL, кэш) --------------------------------------

    icon(it, size = 112) {
        const k = it.cat + ':' + it.id;
        if (this._icons[k]) return this._icons[k];
        const c = document.createElement('canvas');
        c.width = c.height = size;
        const ctx = c.getContext('2d');
        try {
            if (it.cat === 'skin') this._iconSkin(ctx, size, it);
            else if (it.cat === 'hat' || it.cat === 'face') this._iconHead(ctx, size, it);
            else if (it.cat === 'trail') this._iconTrail(ctx, size, it);
            else this._iconHit(ctx, size, it);
        } catch (e) { /* иконка без рисунка — пустая карточка */ }
        const url = c.toDataURL('image/png');
        this._icons[k] = url;
        return url;
    },

    _iconSkin(ctx, size, it) {
        const pc = document.createElement('canvas');
        pc.width = pc.height = 128;
        this.paint(pc.getContext('2d'), 128, it, false);
        if (it.emis) {
            const pctx = pc.getContext('2d'); pctx.globalCompositeOperation = 'lighter';
            const ec = document.createElement('canvas'); ec.width = ec.height = 128; this.paint(ec.getContext('2d'), 128, it, true);
            pctx.drawImage(ec, 0, 0);
        }
        const pat = ctx.createPattern(pc, 'repeat');
        const u = size / 100, ink = '#16233a';
        const joint = this.hex(it.joint);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.globalAlpha = it.alpha ? 0.8 : 1;
        // Ноги, руки, тело, голова — толстые линии с контуром.
        const limb = (x1, y1, x2, y2, w) => {
            ctx.strokeStyle = ink; ctx.lineWidth = (w + 5) * u; ctx.beginPath(); ctx.moveTo(x1 * u, y1 * u); ctx.lineTo(x2 * u, y2 * u); ctx.stroke();
            ctx.strokeStyle = pat; ctx.lineWidth = w * u; ctx.stroke();
        };
        limb(42, 62, 36, 90, 11); limb(58, 62, 64, 90, 11);
        limb(34, 34, 20, 56, 9); limb(66, 34, 80, 56, 9);
        const rr = (x, y, w, h, r) => { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };
        ctx.fillStyle = ink; rr(29 * u, 26 * u, 42 * u, 40 * u, 13 * u); ctx.fill();
        ctx.fillStyle = pat; rr(31.5 * u, 28.5 * u, 37 * u, 35 * u, 11 * u); ctx.fill();
        ctx.fillStyle = joint; ctx.fillRect(32 * u, 46 * u, 36 * u, 6 * u);
        ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(50 * u, 15 * u, 13 * u, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = pat; ctx.beginPath(); ctx.arc(50 * u, 15 * u, 10.5 * u, 0, Math.PI * 2); ctx.fill();
        for (const [x, y] of [[34, 34], [66, 34], [42, 62], [58, 62]]) { ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(x * u, y * u, 5.5 * u, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = joint; ctx.beginPath(); ctx.arc(x * u, y * u, 3.8 * u, 0, Math.PI * 2); ctx.fill(); }
        ctx.globalAlpha = 1;
        for (const x of [45.5, 54.5]) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x * u, 13 * u, 3.3 * u, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(x * u, 13.4 * u, 1.4 * u, 0, Math.PI * 2); ctx.fill(); }
    },

    // Шапка / лицо: вид спереди, примитивы от дальних к ближним, голова под ними.
    _iconHead(ctx, size, it) {
        const D = Math.PI / 180, ink = '#16233a';
        const shapes = [];
        for (const pr of it.parts) {
            const o = pr[pr.length - 1];
            const m = BABYLON.Matrix.RotationYawPitchRoll((o.ry || 0) * D, (o.rx || 0) * D, (o.rz || 0) * D);
            const ax = BABYLON.Vector3.TransformNormal(new BABYLON.Vector3(0, 1, 0), m);
            const ux = BABYLON.Vector3.TransformNormal(new BABYLON.Vector3(1, 0, 0), m);
            shapes.push({ pr, o, ax, ux, z: pr[3] });
        }
        const faceMode = it.cat === 'face';
        // Рамка: голова (радиус 14) и все формы.
        let x0 = -15, x1 = 15, y0 = -16, y1 = 16;
        for (const s of shapes) {
            const r = this._primR(s.pr);
            x0 = Math.min(x0, s.pr[1] - r); x1 = Math.max(x1, s.pr[1] + r); y0 = Math.min(y0, s.pr[2] - r); y1 = Math.max(y1, s.pr[2] + r);
        }
        if (faceMode) { x0 = -17; x1 = 17; y0 = -17; y1 = 17; }
        const span = Math.max(x1 - x0, y1 - y0) * 1.1;
        const k = size / span, cx = size / 2 - (x0 + x1) / 2 * k, cy = size / 2 + (y0 + y1) / 2 * k;
        const P = (x, y) => [cx + x * k, cy - y * k];
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        const lw = Math.max(2, size / 40);
        const fill = (col, path) => { ctx.fillStyle = col; ctx.strokeStyle = ink; ctx.lineWidth = lw; ctx.beginPath(); path(); ctx.fill(); ctx.stroke(); };
        const behind = shapes.filter(s => s.z < -2).sort((a, b) => a.z - b.z);
        // Маска у лица (центр глубже глаз) — под глазами, очки и усы — поверх.
        const mid = shapes.filter(s => s.z >= -2 && s.z < 8).sort((a, b) => a.z - b.z);
        const front = shapes.filter(s => s.z >= 8).sort((a, b) => a.z - b.z);
        for (const s of behind) this._drawPrim(ctx, s, P, k, fill);
        // Голова.
        const [hx, hy] = P(0, 0);
        fill('#f2b928', () => ctx.ellipse(hx, hy, 13 * k, 14.2 * k, 0, 0, Math.PI * 2));
        for (const s of mid) this._drawPrim(ctx, s, P, k, fill);
        if (!it.hideEyes) for (const sx of [1, -1]) {
            const [ex, ey] = P(4.6 * sx, 3.2);
            fill('#ffffff', () => ctx.arc(ex, ey, 4.4 * k, 0, Math.PI * 2));
            ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(ex, ey, 1.7 * k, 0, Math.PI * 2); ctx.fill();
        }
        if (!it.hideMouth) {
            ctx.strokeStyle = ink; ctx.lineWidth = 1.4 * k; ctx.beginPath();
            for (let i = 0; i <= 6; i++) { const [mx, my] = P(-6 + i * 2, -5.6 + (i % 2 ? 1.6 : -0.6)); if (i) ctx.lineTo(mx, my); else ctx.moveTo(mx, my); }
            ctx.stroke();
        }
        for (const s of front) this._drawPrim(ctx, s, P, k, fill);
    },

    _primR(pr) {
        const o = pr[pr.length - 1];
        if (pr[0] === 'sph') return pr[4] / 2 * Math.max(o.sx || 1, o.sy || 1);
        if (pr[0] === 'cyl') return Math.max(pr[4], pr[5], pr[6]) / 2;
        if (pr[0] === 'box') return Math.max(pr[4], pr[5]) / 2;
        return pr[4] / 2 + pr[5];
    },

    _drawPrim(ctx, s, P, k, fill) {
        const pr = s.pr, o = s.o, type = pr[0];
        const [x, y] = P(pr[1], pr[2]);
        const color = this.hex(type === 'sph' ? pr[5] : (type === 'tor' ? pr[6] : pr[7]));
        if (type === 'sph') {
            const rot = -(o.rz || 0) * Math.PI / 180;
            fill(color, () => ctx.ellipse(x, y, pr[4] / 2 * (o.sx || 1) * k, pr[4] / 2 * (o.sy || 1) * k, rot, 0, Math.PI * 2));
        } else if (type === 'cyl') {
            const ax = s.ax, h = pr[6], l2 = Math.hypot(ax.x, ax.y);
            if (l2 < 0.35) { fill(color, () => ctx.arc(x, y, Math.max(pr[4], pr[5]) / 2 * k, 0, Math.PI * 2)); return; }
            const dx = ax.x / l2, dy = ax.y / l2, nx = -dy, ny = dx;
            const hl = h / 2 * l2;
            const bx = pr[1] - dx * hl, by = pr[2] - dy * hl, tx = pr[1] + dx * hl, ty = pr[2] + dy * hl;
            const rb = pr[5] / 2, rt = pr[4] / 2;
            fill(color, () => {
                const pts = [P(bx + nx * rb, by + ny * rb), P(tx + nx * rt, ty + ny * rt), P(tx - nx * rt, ty - ny * rt), P(bx - nx * rb, by - ny * rb)];
                ctx.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1]); ctx.closePath();
            });
        } else if (type === 'box') {
            const w = pr[4], h = pr[5], ux = s.ux, a = Math.atan2(ux.y, ux.x);
            const cw = w * Math.max(0.25, Math.hypot(ux.x, ux.y));
            fill(color, () => { ctx.save(); ctx.translate(x, y); ctx.rotate(-a); ctx.rect(-cw / 2 * k, -h / 2 * k, cw * k, h * k); ctx.restore(); });
        } else {
            // Кольцо: нормаль — ось y формы; вид спереди — эллипс.
            const n = s.ax, R = pr[4] / 2;
            const minor = Math.max(0.12, Math.abs(n.z)), rot = Math.atan2(-n.x, n.y);
            ctx.strokeStyle = '#16233a'; ctx.lineWidth = (pr[5] + 1.6) * k;
            ctx.beginPath(); ctx.ellipse(x, y, R * k, R * minor * k, -rot, 0, Math.PI * 2); ctx.stroke();
            ctx.strokeStyle = color; ctx.lineWidth = pr[5] * k; ctx.stroke();
        }
    },

    _iconTrail(ctx, size, it) {
        const pts = [];
        for (let i = 0; i <= 24; i++) { const t = i / 24; pts.push([size * (0.16 + t * 0.7), size * (0.74 - Math.sin(t * Math.PI) * 0.46 + t * 0.04)]); }
        this.drawTrailPath(ctx, pts, it, 0.4, size / 90);
    },

    _iconHit(ctx, size, it) {
        const cx = size / 2, cy = size / 2, cols = it.multi || [it.c1, it.c2];
        const ink = '#16233a';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        for (let i = 0; i < 20; i++) { const a = -Math.PI / 2 + i * Math.PI / 10, r = size * (i % 2 ? 0.2 : 0.4); ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
        ctx.closePath(); ctx.fillStyle = it.c1; ctx.strokeStyle = ink; ctx.lineWidth = size / 30; ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, size * 0.13, 0, Math.PI * 2); ctx.fillStyle = it.c2; ctx.fill(); ctx.stroke();
        let seed = 11;
        const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
        for (let i = 0; i < 12; i++) {
            const a = rnd() * Math.PI * 2, r = size * (0.36 + rnd() * 0.1);
            ctx.fillStyle = cols[i % cols.length];
            ctx.beginPath(); ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, size * (0.03 + rnd() * 0.03), 0, Math.PI * 2); ctx.fill();
            ctx.lineWidth = size / 60; ctx.stroke();
        }
        ctx.fillStyle = it.pop; ctx.strokeStyle = ink; ctx.lineWidth = size / 28;
        ctx.font = '900 ' + Math.round(size * 0.22) + 'px Rubik, system-ui, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.strokeText('!', cx, cy + size * 0.01); ctx.fillText('!', cx, cy + size * 0.01);
    },

    // --- Линия пальца ------------------------------------------------------------------

    // Линия от (x1, y1) (что держим) до (x2, y2) (палец); t — время (анимация узоров).
    drawTrail(ctx, x1, y1, x2, y2, it, t) { this.drawTrailPath(ctx, [[x1, y1], [x2, y2]], it, t, 1); },

    // След по ломаной pts ([[x, y], …]); кружок — в начале. sc — масштаб толщины.
    drawTrailPath(ctx, pts, it, t, sc) {
        const st = it || COSMETICS.trail[0];
        const w = (st.wide ? 9 : (st.thin ? 3 : 5)) * sc;
        const segs = [];
        let len = 0;
        for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segs.push(l); len += l; }
        const [x1, y1] = pts[0], [x2, y2] = pts[pts.length - 1];
        // Точка на расстоянии d от начала.
        const at = (d) => {
            for (let i = 0; i < segs.length; i++) {
                if (d <= segs[i] || i === segs.length - 1) {
                    const f = segs[i] > 0 ? Math.min(1, d / segs[i]) : 0;
                    return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f, pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]];
                }
                d -= segs[i];
            }
            return [x2, y2, 1, 0];
        };
        // Путь линии: для молнии — зубцы поперёк, меняются 18 раз в секунду.
        let path = pts;
        if (st.jag && len > 12) {
            path = [];
            const n = Math.max(2, Math.round(len / (16 * sc)));
            for (let i = 0; i <= n; i++) {
                const [x, y, dx, dy] = at(len * i / n), l = Math.hypot(dx, dy) || 1;
                const j = i === 0 || i === n ? 0 : Math.sin(i * 12.9 + Math.floor(t * 18) * 7.1) * 6 * sc;
                path.push([x - dy / l * j, y + dx / l * j]);
            }
        }
        ctx.save();
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        const stroke = (col, width, dash) => {
            ctx.strokeStyle = col; ctx.lineWidth = width;
            ctx.setLineDash(dash || []);
            ctx.beginPath();
            ctx.moveTo(path[0][0], path[0][1]);
            for (let i = 1; i < path.length; i++) ctx.lineTo(path[i][0], path[i][1]);
            ctx.stroke();
        };
        if (!st.dash) stroke(st.wide ? 'rgba(22,24,28,0.25)' : 'rgba(10,20,30,0.35)', w + 4 * sc);
        if (st.glow) { ctx.shadowColor = st.glow; ctx.shadowBlur = 14 * sc; }
        let main = st.c;
        if (st.rainbow) {
            const g = ctx.createLinearGradient(x1, y1, x2 === x1 && y2 === y1 ? x1 + 1 : x2, y2);
            const cols = ['#ff4a4a', '#ffa82e', '#ffe24a', '#3ed05f', '#3b8fe6', '#8a4ad8'];
            const sh = Math.floor(t * 5);
            for (let i = 0; i <= 6; i++) g.addColorStop(i / 6, cols[(i + sh) % 6]);
            main = g;
        } else if (st.grad) {
            const g = ctx.createLinearGradient(x1, y1, x2 === x1 && y2 === y1 ? x1 + 1 : x2, y2);
            g.addColorStop(0, st.c2); g.addColorStop(1, st.c);
            main = g;
        }
        if (st.dash) {
            stroke('#16233a', w + 5 * sc, [0.1, 13 * sc]);
            stroke(main, w + 1 * sc, [0.1, 13 * sc]);
        } else stroke(main, w);
        ctx.shadowBlur = 0;
        if (st.candy) { ctx.lineDashOffset = -t * 60 * sc; stroke(st.c2, w, [9 * sc, 9 * sc]); ctx.lineDashOffset = 0; }
        if (st.core) stroke(st.id === 'neon' || st.id === 'laser' || st.id === 'ice' ? '#ffffff' : st.c2, Math.max(1, w * 0.35));
        // Значки вдоль линии бегут к пальцу.
        if (st.deco && len > 20) {
            const step = 26 * sc, off = (t * 60 * sc) % step;
            for (let d = off; d < len - 6 * sc; d += step) {
                const [x, y] = at(d);
                this._deco(ctx, st.deco, x, y, (st.deco === 'spark' ? 4.5 : 6.5) * sc, st);
            }
        }
        ctx.setLineDash([]);
        ctx.fillStyle = st.rainbow ? '#ffe24a' : st.c;
        ctx.beginPath(); ctx.arc(x1, y1, 6 * sc, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = st.rainbow || st.core || st.dash ? '#16233a' : st.c2; ctx.lineWidth = 2 * sc; ctx.stroke();
        ctx.restore();
    },

    _deco(ctx, kind, x, y, r, st) {
        ctx.fillStyle = kind === 'heart' ? st.c : (kind === 'spark' ? '#ffffff' : st.c);
        ctx.strokeStyle = '#16233a'; ctx.lineWidth = 1.5;
        ctx.beginPath();
        if (kind === 'heart') {
            ctx.moveTo(x, y + r * 0.8);
            ctx.bezierCurveTo(x - r * 1.3, y - r * 0.1, x - r * 0.6, y - r * 1.1, x, y - r * 0.35);
            ctx.bezierCurveTo(x + r * 0.6, y - r * 1.1, x + r * 1.3, y - r * 0.1, x, y + r * 0.8);
        } else {
            const n = kind === 'spark' ? 4 : 5;
            for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n, rr = i % 2 ? r * 0.42 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
            ctx.closePath();
        }
        ctx.fill(); if (kind !== 'spark') ctx.stroke();
    },

    // --- Удары ---------------------------------------------------------------------------

    // Цвета искр для Fx: { color, color2, gravity, blend, speed, life }.
    hitRecipe(it) {
        const h = it || this.equipped('hit');
        let c1 = h.c1, c2 = h.c2;
        if (h.multi) { this._rainbowK = (this._rainbowK + 1) % h.multi.length; c1 = h.multi[this._rainbowK]; c2 = h.multi[(this._rainbowK + 2) % h.multi.length]; }
        const r = { color: c1, color2: c2, gravity: [0, h.grav != null ? h.grav : -700, 0] };
        if (h.blend) r.blend = h.blend;
        r.texture = h.tex && typeof Fx !== 'undefined' ? Fx.TEX[h.tex] : null;
        if (h.fast) r.speed = [220, 520];
        if (h.slow) { r.speed = [50, 160]; r.life = [0.6, 1.2]; }
        return r;
    },

    popColor() { return this.equipped('hit').pop; },
};
