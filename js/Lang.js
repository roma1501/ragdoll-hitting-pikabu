// Lang.js — тексты интерфейса игры (I18N). Все видимые строки — ключами в
// LANG_STRINGS, в коде — Lang.t('ключ', { имя: значение }) с подстановкой {имя},
// в разметке — атрибуты data-t="ключ" (текст), data-t-title, data-t-placeholder
// (Lang.apply() проставляет их после init и смены языка).
//
// Язык — GAME_LANG (Constants.js): сборка ставит ru для Яндекса и en для Playables.
// Видимого переключателя языка нет. LANG_AUTO = 1 — язык платформы (Platform.lang),
// если он есть в словаре. Нет строки в языке — английская, нет и её — сам ключ.
// Новая строка = ключ в ОБОИХ словарях.

const LANG_STRINGS = {
    ru: {
        'loading': 'Загрузка…',
        'loadingScene': 'Готовим первый кадр…',
        'loadingReady': 'Готово',
        'loadingFailed': 'Не удалось загрузить. Попробуйте ещё раз.',
        'loadingRetry': 'Повторить',
        'no3d': '3D недоступен: браузер без WebGL',
        'title': 'СЛОМАЙ КОСТИ',
        'subtitle': 'Манекен ждёт',
        'play': 'ИГРАТЬ',
        'level': 'УРОВЕНЬ {n}',
        'levelShort': 'Уровень {n}',
        'levels': 'Уровни',
        'records': 'Рекорды',
        'recordsEmpty': 'Пока пусто — ломайте кости первым!',
        'recordsFail': 'Рекорды сейчас недоступны',
        'you': 'вы',
        'back': 'Назад',
        'pause': 'ПАУЗА',
        'resume': 'Продолжить',
        'restart': 'Заново',
        'menu': 'Меню',
        'sound': 'Звук',
        'soundOn': 'Звук: вкл',
        'soundOff': 'Звук: выкл',
        'capBreak': 'СЛОМАЙ КОСТИ',
        'capCrush': 'РАЗДАВИ КОСТИ',
        'capBurn': 'ПОДЖАРЬ МАНЕКЕНА',
        'capShock': 'УДАРЬ ТОКОМ',
        'capThrow': 'БРОСЬ МАНЕКЕНА',
        'capDrop': 'СБРОСЬ ЕГО',
        'capSmash': 'РАЗБЕЙ ЕГО',
        'capBlast': 'ВЗОРВИ ЕГО',
        'capCut': 'ПЕРЕРЕЖЬ ВЕРЁВКУ',
        'bones': 'Кости: {n}/{t}',
        'win': 'УРОВЕНЬ ПРОЙДЕН!',
        'lose': 'ВРЕМЯ ВЫШЛО!',
        'brokenCount': 'Сломано костей: {n}',
        'brokenOf': 'Сломано костей: {n} из {t}',
        'next': 'ДАЛЕЕ',
        'retry': 'ЗАНОВО',
        'moreTime': '+15 секунд',
        'skip': 'Пропустить уровень',
        'skipAds': 'За рекламу · {n}/2',
        'skipOne': 'Ещё одна реклама — и уровень пропущен',
        'toonOn': 'Мультяшный шейдер: вкл',
        'toonOff': 'Мультяшный шейдер: выкл',
        'forAd': 'За рекламу',
        'power': 'Сила ×2',
        'powerOn': 'Сила ×2 включена',
        'powerHint': 'Удары ломают кости вдвое сильнее до конца уровня',
        'adFail': 'Реклама недоступна, попробуйте позже',
        'allDone': 'Все 100 уровней пройдены! Начинаем с первого.',
        'locked': 'Сначала пройдите предыдущий уровень',
        'crack': 'ХРУСТЬ!', 'snap': 'ТРЕСК!', 'crunch': 'ХРЯСЬ!',
        'pow': 'БАХ!', 'bam': 'БАМ!', 'ouch': 'ОЙ!', 'bonk': 'БУМ!', 'boom': 'БАБАХ!',
        'total': 'Всего костей: {n}',
        'shop': 'Магазин',
        'tabSkin': 'Скины', 'tabHat': 'Шапки', 'tabFace': 'Лица', 'tabTrail': 'Следы', 'tabHit': 'Удары',
        'equip': 'Надеть', 'equipped': 'Надето', 'buy': 'Купить', 'watchAd': 'Открыть',
        'adsProgress': 'Реклама {n}/{t}', 'adsLeft': 'Ещё {n} — и предмет ваш',
        'notEnough': 'Не хватает {n} монет — проходите уровни', 'unlocked': 'Открыто: {name}',
        'x3': 'Монеты ×3',
        'bonePelvis': 'Таз', 'boneSpine': 'Позвоночник', 'boneRibs': 'Рёбра', 'boneSkull': 'Череп',
        'boneArm': 'Плечо', 'boneForearm': 'Предплечье', 'boneHand': 'Кисть',
        'boneFemur': 'Бедро', 'boneShin': 'Голень', 'boneFoot': 'Стопа',
    },
    en: {
        'loading': 'Loading…',
        'loadingScene': 'Preparing the first frame…',
        'loadingReady': 'Ready',
        'loadingFailed': 'Loading failed. Please try again.',
        'loadingRetry': 'Retry',
        'no3d': '3D is unavailable: no WebGL in this browser',
        'title': 'BREAK THE BONES',
        'subtitle': 'The dummy is waiting',
        'play': 'PLAY',
        'level': 'LEVEL {n}',
        'levelShort': 'Level {n}',
        'levels': 'Levels',
        'records': 'Leaderboard',
        'recordsEmpty': 'No records yet — be the first!',
        'recordsFail': 'Leaderboard is unavailable right now',
        'you': 'you',
        'back': 'Back',
        'pause': 'PAUSED',
        'resume': 'Resume',
        'restart': 'Restart',
        'menu': 'Menu',
        'sound': 'Sound',
        'soundOn': 'Sound: on',
        'soundOff': 'Sound: off',
        'capBreak': 'BREAK THE BONES',
        'capCrush': 'CRUSH THE BONES',
        'capBurn': 'ROAST THE DUMMY',
        'capShock': 'SHOCK THE DUMMY',
        'capThrow': 'THROW THE DUMMY',
        'capDrop': 'DROP HIM',
        'capSmash': 'SMASH HIM',
        'capBlast': 'BLOW HIM UP',
        'capCut': 'CUT THE ROPE',
        'bones': 'Bones: {n}/{t}',
        'win': 'LEVEL COMPLETE!',
        'lose': "TIME'S UP!",
        'brokenCount': 'Bones broken: {n}',
        'brokenOf': 'Bones broken: {n} of {t}',
        'next': 'NEXT',
        'retry': 'RETRY',
        'moreTime': '+15 seconds',
        'skip': 'Skip level',
        'skipAds': 'Watch ads · {n}/2',
        'skipOne': 'One more ad and the level is skipped',
        'toonOn': 'Toon shader: on',
        'toonOff': 'Toon shader: off',
        'forAd': 'Watch an ad',
        'power': 'Power ×2',
        'powerOn': 'Power ×2 is on',
        'powerHint': 'Hits break bones twice as hard until the level ends',
        'adFail': 'Ad is unavailable, try again later',
        'allDone': 'All 100 levels complete! Starting over.',
        'locked': 'Beat the previous level first',
        'crack': 'CRACK!', 'snap': 'SNAP!', 'crunch': 'CRUNCH!',
        'pow': 'POW!', 'bam': 'BAM!', 'ouch': 'OUCH!', 'bonk': 'BONK!', 'boom': 'KABOOM!',
        'total': 'Total bones: {n}',
        'shop': 'Shop',
        'tabSkin': 'Skins', 'tabHat': 'Hats', 'tabFace': 'Faces', 'tabTrail': 'Trails', 'tabHit': 'Hits',
        'equip': 'Equip', 'equipped': 'Equipped', 'buy': 'Buy', 'watchAd': 'Unlock',
        'adsProgress': 'Ads {n}/{t}', 'adsLeft': '{n} more and it is yours',
        'notEnough': 'You need {n} more coins — beat levels', 'unlocked': 'Unlocked: {name}',
        'x3': 'Coins ×3',
        'bonePelvis': 'Pelvis', 'boneSpine': 'Spine', 'boneRibs': 'Ribs', 'boneSkull': 'Skull',
        'boneArm': 'Humerus', 'boneForearm': 'Forearm', 'boneHand': 'Hand',
        'boneFemur': 'Femur', 'boneShin': 'Shin', 'boneFoot': 'Foot',
    },
};

/** @satisfies {Record<string, any>} */
const Lang = {
    code: 'ru',

    // platformLang — язык платформы (Platform.lang) или null.
    init(platformLang) {
        const def = typeof GAME_LANG !== 'undefined' ? GAME_LANG : 'ru';
        const auto = typeof LANG_AUTO !== 'undefined' ? LANG_AUTO : 0;
        const p = String(platformLang || '').toLowerCase().split(/[-_]/)[0];
        this.code = auto > 0 && p && LANG_STRINGS[p] ? p : (LANG_STRINGS[def] ? def : 'en');
        document.documentElement.lang = this.code;
    },

    has(key) {
        return !!((LANG_STRINGS[this.code] || {})[key] || LANG_STRINGS.en[key]);
    },

    t(key, params) {
        const s = (LANG_STRINGS[this.code] || {})[key] || LANG_STRINGS.en[key] || key;
        return params ? s.replace(/\{(\w+)\}/g, (m, k) => (k in params ? String(params[k]) : m)) : s;
    },

    // Разметка: data-t, data-t-title, data-t-placeholder внутри root.
    apply(root) {
        const r = root || document;
        for (const el of /** @type {NodeListOf<HTMLElement>} */ (r.querySelectorAll('[data-t]'))) el.textContent = this.t(el.dataset.t);
        for (const el of /** @type {NodeListOf<HTMLElement>} */ (r.querySelectorAll('[data-t-title]'))) el.title = this.t(el.dataset.tTitle);
        for (const el of /** @type {NodeListOf<HTMLInputElement>} */ (r.querySelectorAll('[data-t-placeholder]'))) el.placeholder = this.t(el.dataset.tPlaceholder);
    },
};
