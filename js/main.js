/**
 * 结算页主逻辑：
 *  - 全局状态 GameState：score / similarity / title / tips
 *  - 分数 → 称号 6 档映射 RANK_CONFIG
 *  - 治愈系提示语固定池 TIPS_POOL（策划文案，随机抽一条）
 *  - 数据绑定渲染：得分 / 还原程度 / 声音鉴定水平 / 提示语
 *
 * 业务侧 API：
 *  - GameState.update({...})
 *  - GameState.getTitleAndTips(score)
 *  - GameState.renderResultInfo()
 */
(function (global) {
    'use strict';

    /* ============================================================
     * 0. 移动端手势/缩放/右键屏蔽
     * ============================================================ */
    document.addEventListener('gesturestart',  function (e) { e.preventDefault(); }, { passive: false });
    document.addEventListener('gesturechange', function (e) { e.preventDefault(); }, { passive: false });
    document.addEventListener('gestureend',    function (e) { e.preventDefault(); }, { passive: false });

    var lastTouchEnd = 0;
    document.addEventListener('touchstart', function (e) {
        if (e.touches.length > 1) e.preventDefault();
    }, { passive: false });
    document.addEventListener('touchend', function (e) {
        var now = Date.now();
        if (now - lastTouchEnd <= 300) e.preventDefault();
        lastTouchEnd = now;
    }, { passive: false });
    document.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    /* ============================================================
     * 1. 全局状态
     * ============================================================ */
    var GameState = {
        score: 0,
        similarity: 0,
        title: '',
        rankIcon: '',
        rankMeta: '',
        tips: ''
    };
    global.GameState = GameState;

    /* ============================================================
     * 2. 分数 → 声音鉴定水平 映射（6 档）
     *  数组按 max 从高到低排列，命中第一条 score >= min 的规则
     * ============================================================ */
    var RANK_CONFIG = [
        { min: 90, max: 100, icon: '🎯', title: '听觉猎手', meta: '全服前 5%' },
        { min: 75, max: 89,  icon: '📡', title: '声音雷达', meta: '全服前 15%' },
        { min: 60, max: 74,  icon: '🍳', title: '厨房老炮', meta: '全服前 35%' },
        { min: 45, max: 59,  icon: '👂', title: '声音学徒', meta: '正在进阶' },
        { min: 30, max: 44,  icon: '🥄', title: '初入厨房', meta: '旅程刚开始' },
        { min: 0,  max: 29,  icon: '👀', title: '视觉动物', meta: '耳朵还没开窍' }
    ];

    /* ============================================================
     * 3. 治愈系提示语固定池（策划文案，随机抽取，禁 AI 生成）
     * ============================================================ */
    var TIPS_POOL = [
        '我很享受人类制造的珍贵的声响',
        '独处时我才能听见自己的声音',
        '一人食的时候就想象自己是孤独的美食家',
        '感受活着的日子',
        '一起做饭是件很浪漫的事情',
        '厨房是我最小单位的精神世界',
        '一个人做饭，是淡淡的浪漫',
        '锅铲声是这个家最日常的 BGM',
        '今天的厨房，比昨天更热闹一点点',
        '煎蛋的声音下雨天听起来特别像下暴雨',
        '有烟火气的地方就有家的感觉',
        '水壶鸣叫的那一刻，什么烦恼都先等一等'
    ];

    /* ============================================================
     * 工具
     * ============================================================ */
    function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
    function $(id) { return document.getElementById(id); }
    function randomFrom(arr) {
        if (!arr || !arr.length) return '';
        return arr[Math.floor(Math.random() * arr.length)];
    }

    function findRank(score) {
        var s = clamp(score | 0, 0, 100);
        for (var i = 0; i < RANK_CONFIG.length; i++) {
            var r = RANK_CONFIG[i];
            if (s >= r.min && s <= r.max) return r;
        }
        return RANK_CONFIG[RANK_CONFIG.length - 1];
    }

    /* ============================================================
     * 核心：根据分数派生 称号 + 随机提示语
     * ============================================================ */
    function getTitleAndTips(score) {
        var s = clamp(score | 0, 0, 100);
        var rank = findRank(s);
        var result = {
            title: rank.title,
            tips: randomFrom(TIPS_POOL),
            rankIcon: rank.icon,
            rankMeta: rank.meta
        };
        GameState.score    = s;
        GameState.title    = result.title;
        GameState.tips     = result.tips;
        GameState.rankIcon = result.rankIcon;
        GameState.rankMeta = result.rankMeta;
        renderResultInfo();
        return result;
    }

    /* ============================================================
     * 渲染：统一入口
     * ============================================================ */
    function renderResultInfo() {
        renderScore(GameState.score);
        renderSimilarity(GameState.similarity);
        renderRank(GameState.title, GameState.rankIcon, GameState.rankMeta);
        renderTips(GameState.tips);
    }

    /* ============================================================
     * 渲染：分数 + 星级
     * ============================================================ */
    function renderScore(score) {
        var target = clamp(score | 0, 0, 100);
        var numEl   = $('scoreNumber');
        var starsEl = $('scoreStars');

        if (numEl) {
            var current = 0;
            var step = Math.max(1, Math.ceil(target / 28));
            var timer = setInterval(function () {
                current += step;
                if (current >= target) { current = target; clearInterval(timer); }
                numEl.textContent = current;
            }, 24);
        }

        if (starsEl) {
            var stars = starsEl.querySelectorAll('.star');
            var lit = Math.round(target / 20);
            stars.forEach(function (s, i) {
                s.classList.remove('on');
                setTimeout(function () {
                    if (i < lit) s.classList.add('on');
                }, 120 + i * 90);
            });
        }
    }

    /* ============================================================
     * 渲染：还原程度（百分比 + 进度条）
     * ============================================================ */
    function renderSimilarity(similarity) {
        var target = clamp(similarity | 0, 0, 100);
        var percentEl = $('similarityPercent');
        var barEl     = $('similarityBarFill');

        if (percentEl) {
            var current = 0;
            var step = Math.max(1, Math.ceil(target / 28));
            var timer = setInterval(function () {
                current += step;
                if (current >= target) { current = target; clearInterval(timer); }
                percentEl.textContent = current + '%';
            }, 24);
        }
        if (barEl) {
            requestAnimationFrame(function () { barEl.style.width = target + '%'; });
        }
    }

    /* ============================================================
     * 渲染：声音鉴定水平标签
     * ============================================================ */
    function renderRank(title, icon, meta) {
        var tag = $('rankTag');
        if (!tag) return;
        var iconEl = tag.querySelector('.rank-icon');
        var nameEl = tag.querySelector('.rank-name');
        var metaEl = tag.querySelector('.rank-meta');
        if (iconEl) iconEl.textContent = icon || '';
        if (nameEl) nameEl.textContent = title || '';
        if (metaEl) metaEl.textContent = meta || '';
    }

    /* ============================================================
     * 渲染：提示语
     * ============================================================ */
    function renderTips(tips) {
        var el = $('tipText');
        if (el) el.textContent = tips || '';
    }

    /* ============================================================
     * 按钮事件
     * ============================================================ */
    function bindActions() {
        var btnRetry = $('btnRetry');
        var btnHome  = $('btnHome');
        if (btnRetry) {
            btnRetry.addEventListener('click', function () {
                console.log('[settlement] retry');
            });
        }
        if (btnHome) {
            btnHome.addEventListener('click', function () {
                console.log('[settlement] home');
            });
        }
    }

    /* ============================================================
     * 数据绑定入口
     * ============================================================ */
    function applyState(state) {
        GameState.score      = clamp(state.score      | 0, 0, 100);
        GameState.similarity = clamp(state.similarity | 0, 0, 100);

        if (state.title || state.tips) {
            var rank = findRank(GameState.score);
            GameState.title    = state.title    || rank.title;
            GameState.tips     = state.tips     || randomFrom(TIPS_POOL);
            GameState.rankIcon = state.rankIcon || rank.icon;
            GameState.rankMeta = state.rankMeta || rank.meta;
            setTimeout(renderResultInfo, 180);
        } else {
            setTimeout(function () { getTitleAndTips(GameState.score); }, 180);
        }

        console.log('[GameState]', JSON.parse(JSON.stringify(GameState)));
    }

    /* ============================================================
     * 启动
     * ============================================================ */
    /* ============================================================
     * 背景图预检：方便在控制台快速判断 bg 是否加载成功
     * ============================================================ */
    function checkBackgroundImage() {
        var src = './assets/bg/ending.jpg';
        var img = new Image();
        img.onload = function () {
            console.log('%c[BG] 背景图加载成功 ' + src + ' (' + img.naturalWidth + 'x' + img.naturalHeight + ')',
                        'color:#5aa84a;font-weight:bold');
        };
        img.onerror = function () {
            console.warn('%c[BG] 背景图未找到：' + src +
                         '\n请把厨房插画文件保存到 assets/bg/ending.jpg（项目根目录下）',
                         'color:#d63a55;font-weight:bold');
        };
        img.src = src;
    }

    function boot() {
        bindActions();
        checkBackgroundImage();
        applyState({
            score:      86,
            similarity: 92
            // title / tips 不传 → 按分数自动派生 声音雷达 + 随机一条治愈系文案
        });
    }

    GameState.update           = applyState;
    GameState.getTitleAndTips  = getTitleAndTips;
    GameState.renderResultInfo = renderResultInfo;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})(window);
