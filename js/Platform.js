// Platform.js — платформа игры: Яндекс Игры (YaGames), YouTube Playables (ytgame),
// Playgama Bridge (bridge) или локальный запуск. Игра зовёт только Platform — SDK знает этот файл.
// SDK подключает сборка: build.bat yandex вписывает в index.html скрипт /sdk.js,
// build.bat playables — SDK Playables первым скриптом, build.bat playgama — Playgama
// Bridge v2 и playgama-bridge-config.json рядом с index.html. Без SDK (run.bat, web-сборка)
// работает локальный адаптер: сохранения — в Store, реклама — ничего (с ?mockads в
// адресе — заглушка-оверлей на секунду: проверить паузу, звук и выдачу награды).
//
//   await Platform.init()        SDK, язык платформы, события паузы (main.js)
//   Platform.firstFrame()        экран загрузки на экране (Playables firstFrameReady; main.js)
//   Platform.ready()             игра готова к вводу: Яндекс LoadingAPI.ready, Playables gameReady (main.js)
//   Platform.gameplay(on)        идёт ли игровой процесс (Яндекс GameplayAPI start/stop);
//                                на паузе (Pause.js) движок сам шлёт stop, после — start
//   Platform.ads.roundEnded()    раунд завершён (победа или поражение) — ОДИН раз на раунд
//   Platform.ads.next(go)        переход по кнопке «Далее/Заново/Меню»: после двух (Playables — четырёх-пяти)
//                                результатов сначала interstitial, потом go(); защита от двойного клика
//   await Platform.rewarded(id)  true — ТОЛЬКО если SDK подтвердил просмотр
//   Platform.message(name, lvl)  событие уровня (Bridge: level_started/completed/failed/paused/resumed)
//   Platform.hasLeaderboard()    есть ли своя таблица рекордов (кнопка «Рекорды»)
//   Platform.submitScore(n)      рекорд: Яндекс — лидерборд 'Score' (не чаще раза в секунду), Playables — sendScore,
//                                Bridge — лидерборд 'score' из playgama-bridge-config.json, где площадка их даёт
//   await Platform.leaderboard() [{ rank, name, score, me }] или null (Яндекс)
//   await Platform.load()        сохранение игры (объект) или null
//   await Platform.save(obj)     записать сохранение (Яндекс — облако игрока + Store, Playables — saveData)
// На время рекламы игра и звук стоят (Pause 'ad'), после — прежнее состояние.

/** @satisfies {Record<string, any>} */
const Platform = {
    name: 'local',        // 'yandex' | 'playables' | 'bridge' | 'local'
    BRIDGE_BOARD: 'score', // id лидерборда в playgama-bridge-config.json
    /** @type {{kind: string, on: (state: string) => void} | null} */
    _adWait: null,        // Bridge: ждём состояния рекламы (события приходят в _onBridgeAd)
    sdk: null,            // объект SDK Яндекса (ysdk)
    lang: null,           // язык платформы (BCP-47) или null
    player: null,         // игрок Яндекса
    LEADERBOARD: 'Score', // технический id лидерборда Яндекса (в интерфейсе — «Рекорды»)
    _readySent: false,
    _firstFrameSent: false,
    _playing: false,
    _gameplaySent: false, // последнее, что ушло в GameplayAPI: stop без start не шлётся
    _adBusy: false,
    _loaded: null,        // Promise первого load() — Playables: saveData только после loadData
    _scoreAt: 0,
    _scoreTimer: 0,
    _scorePending: null,

    async init() {
        try {
            if (typeof bridge !== 'undefined' && typeof bridge.initialize === 'function') await this._initBridge();
            else if (typeof YaGames !== 'undefined') await this._initYandex();
            else if (typeof ytgame !== 'undefined' && ytgame.IN_PLAYABLES_ENV) await this._initPlayables();
        } catch (e) {
            // В Playables нельзя незаметно перейти на локальные сохранения или
            // потерять обязательные SDK-события. Загрузка покажет ошибку/повтор.
            if (typeof ytgame !== 'undefined' && ytgame.IN_PLAYABLES_ENV) throw e;
            console.warn('Platform: SDK не поднялся, играем локально — ' + ((e && e.message) || e));
            this.name = 'local';
            this.sdk = null;
        }
        Pause.onChange(() => this._syncGameplay());
        console.log('Platform: ' + this.name + (this.lang ? ', язык платформы ' + this.lang : ''));
        return this;
    },

    async _initYandex() {
        let timer = 0;
        const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('YaGames.init timeout')), 8000); });
        try { this.sdk = await Promise.race([YaGames.init(), timeout]); } finally { clearTimeout(timer); }
        this.name = 'yandex';
        try { this.lang = this.sdk.environment.i18n.lang || null; } catch (e) { /* язык по умолчанию */ }
        if (typeof this.sdk.on === 'function') {
            this.sdk.on('game_api_pause', () => Pause.set('platform', true));
            this.sdk.on('game_api_resume', () => Pause.set('platform', false));
        }
        try { this.player = await this.sdk.getPlayer({ scopes: false }); } catch (e) { this.player = null; }
    },

    // Playgama Bridge v2: initialize до любых вызовов; язык площадки; пауза и звук —
    // по событиям площадки (вкладка, реклама, системная пауза), начальный звук — вручную.
    async _initBridge() {
        let timer = 0;
        const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('bridge.initialize timeout')), 10000); });
        try { await Promise.race([bridge.initialize(), timeout]); } finally { clearTimeout(timer); }
        this.name = 'bridge';
        this.sdk = bridge;
        try { this.lang = bridge.platform.language || null; } catch (e) { this.lang = null; }
        const E = bridge.EVENT_NAME;
        bridge.platform.on(E.PAUSE_STATE_CHANGED, (paused) => Pause.set('platform', !!paused));
        bridge.platform.on(E.AUDIO_STATE_CHANGED, (on) => Sound.setPlatformMuted(!on));
        Sound.setPlatformMuted(bridge.platform.isAudioEnabled === false);
        bridge.advertisement.on(E.INTERSTITIAL_STATE_CHANGED, (state) => this._onBridgeAd('interstitial', state));
        bridge.advertisement.on(E.REWARDED_STATE_CHANGED, (state) => this._onBridgeAd('rewarded', state));
        // Реклама уже открыта при старте — игра стоит и молчит, пока не закроется.
        if (bridge.advertisement.interstitialState === 'opened') Pause.set('ad', true);
    },

    _onBridgeAd(kind, state) {
        if (kind === 'interstitial' && state !== 'opened' && state !== 'loading' && !this._adBusy) Pause.set('ad', false);
        if (this._adWait && this._adWait.kind === kind) this._adWait.on(state);
    },

    // Показ рекламы Bridge: ждём итог по событиям. Interstitial — true, если закрыли
    // (показ был); rewarded — true только после состояния rewarded. Не началась за 5 с
    // (частота, нет рекламы) — false, игра идёт дальше.
    _bridgeAd(kind, show) {
        return new Promise((resolve) => {
            let got = false, started = false, done = false, t1 = 0, t2 = 0;
            const finish = (v) => {
                if (done) return;
                done = true; this._adWait = null; clearTimeout(t1); clearTimeout(t2); resolve(v);
            };
            this._adWait = { kind, on: (state) => {
                if (state === 'loading' || state === 'opened') started = true;
                if (state === 'rewarded') got = true;
                if (state === 'closed') finish(kind === 'rewarded' ? got : true);
                if (state === 'failed') finish(false);
            } };
            t1 = setTimeout(() => { if (!started) finish(false); }, 5000);
            t2 = setTimeout(() => finish(kind === 'rewarded' ? got : false), 180000);
            try { show(); } catch (e) { finish(false); }
        });
    },

    async _initPlayables() {
        this.name = 'playables';
        const sys = ytgame.system;
        sys.onPause(() => Pause.set('platform', true));
        sys.onResume(() => Pause.set('platform', false));
        sys.onAudioEnabledChange((on) => Sound.setPlatformMuted(!on));
        Sound.setPlatformMuted(!sys.isAudioEnabled());
        try { this.lang = await sys.getLanguage(); } catch (e) { this.lang = null; }
    },

    // --- Жизненный цикл -------------------------------------------------------

    firstFrame() {
        if (!this._firstFrameSent && typeof ytgame !== 'undefined' && ytgame.IN_PLAYABLES_ENV) {
            ytgame.game.firstFrameReady();
            this._firstFrameSent = true;
        }
    },

    ready() {
        if (this._readySent) return;
        try {
            if (this.name === 'yandex') this.sdk.features.LoadingAPI && this.sdk.features.LoadingAPI.ready();
            else if (this.name === 'bridge') bridge.platform.sendMessage('game_ready');
            else if (this.name === 'playables') {
                this.firstFrame();
                ytgame.game.gameReady();
            }
            this._readySent = true;
        } catch (e) {
            if (this.name === 'playables') throw e;
            console.warn('Platform.ready:', e);
        }
    },

    // Событие уровня для площадки (Bridge): level_started, level_completed, level_failed,
    // level_paused, level_resumed. level — номер уровня.
    message(name, level) {
        if (this.name !== 'bridge') return;
        try {
            const r = bridge.platform.sendMessage(name, level != null ? { level: String(level) } : undefined);
            if (r && typeof r.catch === 'function') r.catch(() => {});
        } catch (e) { /* площадка не принимает это событие */ }
    },

    // on — игрок в игровом процессе (раунд идёт). Меню, экран результата, пауза — false.
    gameplay(on) {
        this._playing = !!on;
        this._syncGameplay();
    },

    _syncGameplay() {
        const want = this._playing && !Pause.active;
        if (this._gameplaySent === want || this.name !== 'yandex') { this._gameplaySent = want; return; }
        this._gameplaySent = want;
        try {
            const api = this.sdk.features.GameplayAPI;
            if (api) { if (want) api.start(); else api.stop(); }
        } catch (e) { /* SDK без GameplayAPI */ }
    },

    // --- Реклама ----------------------------------------------------------------

    // Interstitial. true — запрос успешен (Playables НЕ подтверждает факт показа).
    // Яндекс возвращает shown. Ошибка/нет API — false, переход всё равно продолжается.
    async interstitial() {
        if (this._adBusy) return false;
        this._adBusy = true;
        Pause.set('ad', true);
        try {
            if (this.name === 'yandex') {
                return await new Promise((resolve) => this.sdk.adv.showFullscreenAdv({ callbacks: {
                    onClose: (shown) => resolve(!!shown),
                    onError: () => resolve(false),
                    onOffline: () => resolve(false),
                } }));
            }
            if (this.name === 'bridge') {
                if (!bridge.advertisement.isInterstitialSupported) return false;
                return await this._bridgeAd('interstitial', () => bridge.advertisement.showInterstitial('level_transition'));
            }
            if (this.name === 'playables') {
                if (!ytgame.ads || !ytgame.ads.requestInterstitialAd) return false;
                await ytgame.ads.requestInterstitialAd();
                return true;
            }
            return await this._mockAd(false);
        } catch (e) {
            return false;
        } finally {
            Pause.set('ad', false);
            this._adBusy = false;
        }
    },

    // Rewarded. id — стабильный id награды без данных игрока ('continue', 'coins-x2').
    // true — ТОЛЬКО по подтверждению SDK; закрытие и ошибка — false. Награду выдаёт
    // игра по true и один раз.
    async rewarded(id) {
        if (this._adBusy) return false;
        this._adBusy = true;
        Pause.set('ad', true);
        try {
            if (this.name === 'yandex') {
                return await new Promise((resolve) => {
                    let got = false;
                    this.sdk.adv.showRewardedVideo({ callbacks: {
                        onRewarded: () => { got = true; },
                        onClose: () => resolve(got),
                        onError: () => resolve(false),
                    } });
                });
            }
            if (this.name === 'bridge') {
                if (!bridge.advertisement.isRewardedSupported) return false;
                return await this._bridgeAd('rewarded', () => bridge.advertisement.showRewarded(String(id || 'coins')));
            }
            if (this.name === 'playables') {
                if (!ytgame.ads || !ytgame.ads.requestRewardedAd) return false;
                return (await ytgame.ads.requestRewardedAd(String(id || 'reward'))) === true;
            }
            return await this._mockAd(true);
        } catch (e) {
            return false;
        } finally {
            Pause.set('ad', false);
            this._adBusy = false;
        }
    },

    // Локальная заглушка рекламы: только с ?mockads в адресе — оверлей на секунду,
    // rewarded засчитывается. Без флага — рекламы нет (false).
    _mockAd(reward) {
        if (!/[?&#]mockads\b/.test(location.search + location.hash)) return Promise.resolve(false);
        return new Promise((resolve) => {
            const el = document.createElement('div');
            el.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;' +
                'background:rgba(0,0,0,.85);color:#fff;font:bold 22px system-ui,sans-serif;text-align:center';
            el.textContent = (reward ? 'REWARDED' : 'INTERSTITIAL') + ' — local mock';
            document.body.appendChild(el);
            setTimeout(() => { el.remove(); resolve(true); }, 1000);
        });
    },

    // Счётчик interstitial по правилу игры: реклама — после каждых ДВУХ завершённых
    // раундов (любой исход); в YouTube Playables реже — после четырёх или пяти (случайно,
    // новый цикл — новое число). Только по кнопке перехода, не в момент результата.
    ads: {
        results: 0,
        busy: false,
        _need: 0,

        // Сколько результатов до следующей рекламы.
        need() {
            if (!this._need) this._need = Platform.name === 'playables' ? 4 + Math.floor(Math.random() * 2) : 2;
            return this._need;
        },

        // Раунд завершён (победа или поражение) — звать ОДИН раз на раунд.
        roundEnded() { this.results++; },

        // Переход по кнопке: набралось нужное число результатов — сначала реклама, затем go().
        // Повторный клик, пока идёт переход, игнорируется. Реклама не пришла или
        // ошибка — переход без задержки, новый цикл.
        async next(go) {
            if (this.busy) return;
            this.busy = true;
            try {
                if (this.results >= this.need()) {
                    this.results = 0;
                    this._need = 0;
                    await Platform.interstitial();
                }
                if (go) await go();
            } finally {
                this.busy = false;
            }
        },
    },

    // --- Рекорды -------------------------------------------------------------------

    // Рекорд игрока. Яндекс: лидерборд 'Score', не чаще раза в секунду (лишнее — последним
    // значением через секунду). Playables: sendScore.
    // Своя таблица рекордов: Яндекс — да; Bridge — если площадка даёт in_game.
    hasLeaderboard() {
        if (this.name === 'yandex') return true;
        try { return this.name === 'bridge' && bridge.leaderboards.type === 'in_game'; } catch (e) { return false; }
    },

    submitScore(value) {
        const number = Number(value);
        if (!Number.isFinite(number)) return;
        const v = Math.max(0, Math.floor(number));
        if (!Number.isSafeInteger(v)) return;
        if (this.name === 'bridge') {
            try {
                const type = bridge.leaderboards.type;
                if (type && type !== 'not_available') bridge.leaderboards.setScore(this.BRIDGE_BOARD, v).catch(() => {});
            } catch (e) { /* нет лидербордов */ }
            return;
        }
        if (this.name === 'playables') {
            try { ytgame.engagement.sendScore({ value: v }).catch(() => {}); } catch (e) { /* SDK старый */ }
            return;
        }
        if (this.name !== 'yandex') return;
        this._scorePending = v;
        const wait = this._scoreAt + 1100 - Date.now();
        if (wait > 0) {
            if (!this._scoreTimer) this._scoreTimer = setTimeout(() => { this._scoreTimer = 0; this.submitScore(this._scorePending); }, wait);
            return;
        }
        this._scoreAt = Date.now();
        this._scorePending = null;
        const lb = this.sdk.leaderboards;
        const p = lb && lb.setScore ? lb.setScore(this.LEADERBOARD, v)
            : this.sdk.getLeaderboards().then((old) => old.setLeaderboardScore(this.LEADERBOARD, v));
        Promise.resolve(p).catch((e) => console.warn('Platform.submitScore:', (e && e.message) || e));
    },

    // Таблица рекордов (Яндекс): [{ rank, name, score, me }] или null — нет SDK,
    // нет лидерборда или ошибка. Лимит Яндекса — 20 запросов за 5 минут: кэшировать в игре.
    async leaderboard(opts) {
        if (this.name === 'bridge') {
            if (!this.hasLeaderboard()) return null;
            try {
                const entries = await bridge.leaderboards.getEntries(this.BRIDGE_BOARD);
                let myId = '';
                try { myId = bridge.player.id || ''; } catch (e) { /* аноним */ }
                return (entries || []).slice(0, 20).map((e) => ({ rank: e.rank, score: e.score, name: e.name || '', me: !!(myId && e.id === myId) }));
            } catch (e) {
                return null;
            }
        }
        if (this.name !== 'yandex') return null;
        const o = Object.assign({ quantityTop: 10, includeUser: true, quantityAround: 3 }, opts || {});
        try {
            const lb = this.sdk.leaderboards;
            const res = lb && lb.getEntries ? await lb.getEntries(this.LEADERBOARD, o)
                : await (await this.sdk.getLeaderboards()).getLeaderboardEntries(this.LEADERBOARD, o);
            let myId = '';
            try { myId = this.player ? this.player.getUniqueID() : ''; } catch (e) { /* аноним */ }
            return (res.entries || []).map((e) => ({
                rank: e.rank, score: e.score,
                name: (e.player && e.player.publicName) || '',
                me: !!(myId && e.player && e.player.uniqueID === myId),
            }));
        } catch (e) {
            return null;
        }
    },

    // --- Сохранения ------------------------------------------------------------------

    _storeKey() { return (typeof GAME_ID !== 'undefined' ? GAME_ID : 'lory-game') + '.save'; },

    // Сохранение игры: объект или null.
    load() {
        if (!this._loaded) this._loaded = this._load().catch((error) => {
            this._loaded = null; // ошибка сети/данных не означает пустое сохранение; возможен повтор
            throw error;
        });
        return this._loaded;
    },

    async _load() {
        if (this.name === 'playables') {
            // Только SDK. Успешный loadData обязателен ДО saveData; ошибку нельзя
            // превращать в null и затем перезаписывать облако новой игрой.
            const raw = await ytgame.game.loadData();
            if (!raw) return null;
            const data = JSON.parse(raw);
            if (!data || typeof data !== 'object') throw new Error('Invalid Playables save data');
            return data;
        }
        if (this.name === 'bridge') {
            // Только Storage Bridge (облако площадки, где оно есть) — не localStorage.
            const data = await bridge.storage.get(['save']);
            const raw = Array.isArray(data) ? data[0] : data;
            if (raw == null || raw === '') return null;
            const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
            return obj && typeof obj === 'object' ? obj : null;
        }
        const local = Store.getJSON(this._storeKey(), null);
        try {
            if (this.name === 'yandex' && this.player) {
                const data = await this.player.getData(['save']);
                if (data && data.save && typeof data.save === 'object') return data.save;
            }
        } catch (e) {
            console.warn('Platform.load:', (e && e.message) || e);
        }
        return local;
    },

    // Записать JSON. Playables: только SDK, после УСПЕШНОГО load; без localStorage.
    // До начала новой игры нужно await Platform.load() и применить загруженный
    // прогресс; rejected load следует показать как ошибку с повтором.
    async save(obj) {
        try {
            const data = JSON.stringify(obj);
            if (typeof data !== 'string') return false;
            if (this.name === 'bridge') {
                await bridge.storage.set(['save'], [data]);
                return true;
            }
            if (this.name === 'playables') {
                // Консервативная проверка обоих представлений: < 3 MiB (MUST).
                // JSON.stringify экранирует непарные суррогаты: строка well-formed UTF-16.
                const bytes = Math.max(data.length * 2, new TextEncoder().encode(data).byteLength);
                if (bytes >= 3 * 1024 * 1024) throw new Error('Playables save must be smaller than 3 MiB');
                await this.load();
                await ytgame.game.saveData(data);
            } else {
                const stored = Store.set(this._storeKey(), data);
                if (this.name === 'yandex' && this.player) await this.player.setData({ save: obj }, true);
                else if (!stored) return false;
            }
            return true;
        } catch (e) {
            console.warn('Platform.save:', (e && e.message) || e);
            return false;
        }
    },
};
