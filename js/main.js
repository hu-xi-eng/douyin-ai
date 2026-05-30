/**
 * 结算页主逻辑：
 *  - 物品字典 ITEM_DICT（id → {name, img, icon}）
 *  - 物品场景布局 ITEM_LAYOUT（Canvas 复刻视图中的相对坐标）
 *  - 玩家选中物品 ID 数组 SELECTED_IDS
 *  - 全局状态 GameState：score / similarity / title / tips / selectedIds
 *  - 分数 → 称号映射 TIER_CONFIG
 *  - 治愈系提示语固定池 TIPS_POOL（来自策划文案，随机抽一条）
 *  - getTitleAndTips(score) / renderResultInfo() 暴露给业务侧
 *
 * 后续业务接入：
 *  - GameState.update({...}) 写入真实结算数据
 *  - assets/items/*.png 替换占位 emoji
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
     * 1. 物品字典
     * ============================================================ */
    var ITEM_DICT = {
        '01': { id: '01', name: '平底锅', img: 'assets/items/item_pan.png',       icon: '🍳' },
        '02': { id: '02', name: '砂锅',   img: 'assets/items/item_pot.png',       icon: '🥘' },
        '03': { id: '03', name: '菜刀',   img: 'assets/items/item_knife.png',     icon: '🔪' },
        '04': { id: '04', name: '砧板',   img: 'assets/items/item_board.png',     icon: '🪵' },
        '05': { id: '05', name: '水壶',   img: 'assets/items/item_kettle.png',    icon: '🫖' },
        '06': { id: '06', name: '碗',     img: 'assets/items/item_bowl.png',      icon: '🥣' },
        '07': { id: '07', name: '番茄',   img: 'assets/items/item_tomato.png',    icon: '🍅' },
        '08': { id: '08', name: '鸡蛋',   img: 'assets/items/item_egg.png',       icon: '🥚' },
        '09': { id: '09', name: '青菜',   img: 'assets/items/item_veggie.png',    icon: '🥬' },
        '10': { id: '10', name: '大蒜',   img: 'assets/items/item_garlic.png',    icon: '🧄' },
        '11': { id: '11', name: '盐罐',   img: 'assets/items/item_salt.png',      icon: '🧂' },
        '12': { id: '12', name: '微波炉', img: 'assets/items/item_microwave.png', icon: '🍱' }
    };

    /* ============================================================
     * 1.1 物品在 Canvas 复刻场景中的布局
     *  x / y / size 均为 0~1 的相对值，确保任意尺寸下保持比例
     *  上排放置于隔板下方，下排摆在灶台台面
     * ============================================================ */
    var ITEM_LAYOUT = [
        // 隔板下排
        { id: '06', x: 0.16, y: 0.34, size: 0.20 },  // 碗
        { id: '11', x: 0.40, y: 0.34, size: 0.20 },  // 盐罐
        { id: '10', x: 0.62, y: 0.34, size: 0.20 },  // 大蒜
        { id: '05', x: 0.84, y: 0.34, size: 0.20 },  // 水壶
        // 灶台上排
        { id: '01', x: 0.20, y: 0.74, size: 0.26 },  // 平底锅
        { id: '02', x: 0.50, y: 0.74, size: 0.26 },  // 砂锅
        { id: '12', x: 0.80, y: 0.74, size: 0.26 },  // 微波炉
        // 台面散落小件
        { id: '07', x: 0.10, y: 0.58, size: 0.13 },  // 番茄
        { id: '08', x: 0.30, y: 0.58, size: 0.13 },  // 鸡蛋
        { id: '09', x: 0.70, y: 0.58, size: 0.13 },  // 青菜
        { id: '03', x: 0.88, y: 0.58, size: 0.13 },  // 菜刀
        { id: '04', x: 0.50, y: 0.58, size: 0.16 }   // 砧板
    ].map(function (slot) {
        var data = ITEM_DICT[slot.id];
        return Object.assign({}, slot, { icon: data ? data.icon : '🍽️', name: data ? data.name : '' });
    });

    /* ============================================================
     * 2. 玩家选中物品 ID 数组（模拟数据）
     * ============================================================ */
    var SELECTED_IDS = ['01', '03', '05', '06', '07', '08', '09', '11'];

    /* ============================================================
     * 3. 全局状态：score / similarity / title / tips / selectedIds
     * ============================================================ */
    var GameState = {
        score: 0,
        similarity: 0,
        title: '',
        tips: '',
        selectedIds: []
    };
    global.GameState = GameState;

    /* ============================================================
     * 3.1 分数 → 称号 映射（4 档区间，含边界）
     * ============================================================ */
    var TIER_CONFIG = [
        { min: 0,  max: 30,  title: '声音小白' },
        { min: 31, max: 60,  title: '听觉新手' },
        { min: 61, max: 85,  title: '声音达人' },
        { min: 86, max: 100, title: '声音猎手' }
    ];

    /* ============================================================
     * 3.2 治愈系提示语固定池（策划文案，随机抽取）
     *  注意：不使用 AI 生成，固定 6 条
     * ============================================================ */
    var TIPS_POOL = [
        '我很享受人类制造的珍贵的声响',
        '独处时我才能听见自己的声音',
        '一人食的时候就想象自己是孤独的美食家',
        '感受活着的日子',
        '一起做饭是件很浪漫的事情',
        '厨房是我最小单位的精神世界'
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

    function findTier(score) {
        var s = clamp(score | 0, 0, 100);
        for (var i = 0; i < TIER_CONFIG.length; i++) {
            var t = TIER_CONFIG[i];
            if (s >= t.min && s <= t.max) return t;
        }
        return TIER_CONFIG[0];
    }

    /* ============================================================
     * 核心：根据分数派生 称号 + 随机提示语
     *  - 称号来自档位
     *  - 提示语来自固定 TIPS_POOL 随机抽一条
     *  - 写入 GameState 并触发 renderResultInfo()
     * ============================================================ */
    function getTitleAndTips(score) {
        var s = clamp(score | 0, 0, 100);
        var tier = findTier(s);
        var result = {
            title: tier.title,
            tips: randomFrom(TIPS_POOL)
        };
        GameState.score = s;
        GameState.title = result.title;
        GameState.tips  = result.tips;
        renderResultInfo();
        return result;
    }

    /* ============================================================
     * 渲染：分数 + 称号 + 提示语 统一入口
     * ============================================================ */
    function renderResultInfo() {
        renderScore(GameState.score);
        renderTitle(GameState.title);
        renderTips(GameState.tips);
    }

    /* ============================================================
     * 渲染：分数（数字滚动 + 进度条 + 星级）
     * ============================================================ */
    function renderScore(score) {
        var target = clamp(score | 0, 0, 100);
        var numEl   = $('scoreNumber');
        var barEl   = $('scoreBarFill');
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
        if (barEl) {
            requestAnimationFrame(function () { barEl.style.width = target + '%'; });
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
     * 渲染：称号 / 提示语
     * ============================================================ */
    function renderTitle(title) {
        var tag = $('medalTag');
        if (!tag) return;
        var textEl = tag.querySelector('.medal-text');
        if (textEl) textEl.textContent = title || '';
    }

    function renderTips(tips) {
        var el = $('tipText');
        if (el) el.textContent = tips || '';
    }

    /* ============================================================
     * 渲染：选中物品列表（DOM）
     * ============================================================ */
    function renderSelectedItems(ids) {
        var list  = $('itemsList');
        var count = $('itemsCount');
        if (!list) return;

        list.innerHTML = '';
        var valid = (ids || []).filter(function (id) { return !!ITEM_DICT[id]; });

        valid.forEach(function (id) {
            var data = ITEM_DICT[id];
            var li = document.createElement('li');
            li.className = 'item';
            li.setAttribute('data-id', data.id);

            var iconBox = document.createElement('div');
            iconBox.className = 'item-icon';

            var img = new Image();
            img.alt = data.name;
            img.className = 'item-img';
            img.onload = function () {
                iconBox.innerHTML = '';
                iconBox.appendChild(img);
            };
            img.onerror = function () {
                iconBox.textContent = data.icon || '🍽️';
            };
            iconBox.textContent = data.icon || '🍽️';
            img.src = data.img;

            var name = document.createElement('div');
            name.className = 'item-name';
            name.textContent = data.name;

            li.appendChild(iconBox);
            li.appendChild(name);
            list.appendChild(li);
        });

        if (count) count.textContent = '共 ' + valid.length + ' 件';
    }

    /* ============================================================
     * 渲染：Canvas 复刻厨房
     *  - selectedIds 内的物品全不透明绘制
     *  - 其它物品以 30% 不透明度绘制，融入厨房背景
     * ============================================================ */
    function renderKitchenCanvas() {
        if (!global.KitchenCanvas) return;
        global.KitchenCanvas.render('canvasPlayer', {
            label: '我的复刻厨房',
            selectedIds: GameState.selectedIds,
            layout: ITEM_LAYOUT,
            missedAlpha: 0.3
        });
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
     * Canvas 初始化（仅保留玩家复刻）
     * ============================================================ */
    function initCanvases() {
        if (!global.KitchenCanvas) return;
        global.KitchenCanvas.init('canvasPlayer', '我的复刻厨房');
    }

    function handleResize() {
        if (global.KitchenCanvas) global.KitchenCanvas.resizeAll();
    }

    /* ============================================================
     * 数据绑定入口：
     *  - score / similarity / selectedIds 由调用方提供
     *  - title / tips 由 getTitleAndTips(score) 派生（支持显式覆盖）
     *  - 触发：物品列表 + Canvas + 结果信息
     * ============================================================ */
    function applyState(state) {
        GameState.score       = clamp(state.score      | 0, 0, 100);
        GameState.similarity  = clamp(state.similarity | 0, 0, 100);
        GameState.selectedIds = (state.selectedIds || []).slice();

        renderSelectedItems(GameState.selectedIds);
        renderKitchenCanvas();

        if (state.title || state.tips) {
            GameState.title = state.title || findTier(GameState.score).title;
            GameState.tips  = state.tips  || randomFrom(TIPS_POOL);
            setTimeout(renderResultInfo, 180);
        } else {
            setTimeout(function () { getTitleAndTips(GameState.score); }, 180);
        }

        console.log('[GameState]', JSON.parse(JSON.stringify(GameState)));
    }

    /* ============================================================
     * 启动（静态结算数据）
     * ============================================================ */
    function boot() {
        bindActions();
        initCanvases();

        applyState({
            score:       86,
            similarity:  92,
            selectedIds: SELECTED_IDS
            // title / tips 不传 → 自动派生（声音猎手 + 随机一条治愈系提示）
        });
    }

    // 业务侧 API
    GameState.update           = applyState;
    GameState.getTitleAndTips  = getTitleAndTips;
    GameState.renderResultInfo = renderResultInfo;

    global.addEventListener('resize', handleResize);
    global.addEventListener('orientationchange', function () { setTimeout(handleResize, 200); });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})(window);
