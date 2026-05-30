/**
 * 结算页主逻辑：
 *  - 物品字典（id → {name, img, icon}）
 *  - 玩家选中物品 ID 数组 → 自动渲染列表
 *  - 全局状态 GameState：score / similarity / title / tips
 *  - 静态赋值并完成数据绑定渲染，验证 UI 联动
 *
 * 后续业务接入：
 *  - 用真实结算数据替换 GameState 字段
 *  - 把 SELECTED_IDS 换成真实玩家选中 ID 数组
 *  - 将 assets/items/*.png 替换为真实素材
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
     * 1. 物品字典（模拟数据）
     *    后续替换为真实数据时只需保持字段一致
     * ============================================================ */
    var ITEM_DICT = {
        '01': { id: '01', name: '平底锅', img: 'assets/items/item_pan.png',      icon: '🍳' },
        '02': { id: '02', name: '砂锅',   img: 'assets/items/item_pot.png',      icon: '🥘' },
        '03': { id: '03', name: '菜刀',   img: 'assets/items/item_knife.png',    icon: '🔪' },
        '04': { id: '04', name: '砧板',   img: 'assets/items/item_board.png',    icon: '🪵' },
        '05': { id: '05', name: '水壶',   img: 'assets/items/item_kettle.png',   icon: '🫖' },
        '06': { id: '06', name: '碗',     img: 'assets/items/item_bowl.png',     icon: '🥣' },
        '07': { id: '07', name: '番茄',   img: 'assets/items/item_tomato.png',   icon: '🍅' },
        '08': { id: '08', name: '鸡蛋',   img: 'assets/items/item_egg.png',      icon: '🥚' },
        '09': { id: '09', name: '青菜',   img: 'assets/items/item_veggie.png',   icon: '🥬' },
        '10': { id: '10', name: '大蒜',   img: 'assets/items/item_garlic.png',   icon: '🧄' },
        '11': { id: '11', name: '盐罐',   img: 'assets/items/item_salt.png',     icon: '🧂' },
        '12': { id: '12', name: '微波炉', img: 'assets/items/item_microwave.png', icon: '🍱' }
    };

    /* ============================================================
     * 2. 玩家选中物品 ID 数组（模拟数据）
     * ============================================================ */
    var SELECTED_IDS = ['01', '03', '05', '06', '07', '08', '09', '11'];

    /* ============================================================
     * 3. 全局状态：预留 score / similarity / title / tips
     *    暴露到 window.GameState 便于业务侧赋值或调试
     * ============================================================ */
    var GameState = {
        score: 0,         // 得分 0-100
        similarity: 0,    // 图片相似度 0-100（暂未直接渲染，留作 canvas 比对模块读取）
        title: '',        // 称号
        tips: '',         // 趣味提示语
        selectedIds: []   // 当次选中物品 ID 数组
    };
    global.GameState = GameState;

    /* ============================================================
     * 3.1 分数 → 称号 / 提示语 映射库
     *  四档区间（含边界），每档配多条治愈系文案
     * ============================================================ */
    var TIER_CONFIG = [
        {
            min: 0, max: 30,
            title: '声音小白',
            tips: [
                '没关系呀，今天的厨房悄悄睡着了～',
                '第一次嘛，让耳朵慢慢醒过来就好啦',
                '别着急，听觉是慢慢长出来的小芽',
                '没听清也没关系，再煮一壶茶慢慢来～',
                '今天的小耳朵在偷懒，明天再战一回吧'
            ]
        },
        {
            min: 31, max: 60,
            title: '听觉新手',
            tips: [
                '你已经听见厨房在说话啦～',
                '不错哦，再多一点点专注就更棒啦',
                '厨房里飘出来的声音，被你接住了一半呢',
                '半数答对，比昨天的自己又前进了一步',
                '耳朵正在悄悄苏醒，继续加油呀～'
            ]
        },
        {
            min: 61, max: 85,
            title: '声音达人',
            tips: [
                '你的耳朵会发光，厨房都被你听透啦',
                '厉害呀，连水龙头的小水滴都没逃过你',
                '厨房的悄悄话，被你听得清清楚楚呢',
                '大部分声音都被你温柔地接住啦',
                '哇，你和这个小厨房很合拍喔～'
            ]
        },
        {
            min: 86, max: 100,
            title: '声音猎手',
            tips: [
                '你就是传说中的厨房耳朵，太强啦！',
                '哇，连最细的声音都被你温柔捕捉啦～',
                '满满的灵感和耳力，今天就是大厨日！',
                '安静的厨房在和你说悄悄话，被你全部记住啦',
                '厉害到让小锅铲都想给你鼓掌～'
            ]
        }
    ];

    /* ============================================================
     * 工具函数
     * ============================================================ */
    function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
    function $(id) { return document.getElementById(id); }
    function randomFrom(arr) {
        if (!arr || !arr.length) return '';
        return arr[Math.floor(Math.random() * arr.length)];
    }

    /* ============================================================
     * 分数 → 档位查找
     * ============================================================ */
    function findTier(score) {
        var s = clamp(score | 0, 0, 100);
        for (var i = 0; i < TIER_CONFIG.length; i++) {
            var t = TIER_CONFIG[i];
            if (s >= t.min && s <= t.max) return t;
        }
        return TIER_CONFIG[0];
    }

    /* ============================================================
     * 核心：根据分数返回称号 + 随机提示语
     *  - 写入 GameState
     *  - 触发 renderResultInfo() 完成页面渲染
     * ============================================================ */
    function getTitleAndTips(score) {
        var s = clamp(score | 0, 0, 100);
        var tier = findTier(s);
        var result = {
            title: tier.title,
            tips: randomFrom(tier.tips)
        };
        GameState.score = s;
        GameState.title = result.title;
        GameState.tips  = result.tips;
        renderResultInfo();
        return result;
    }

    /* ============================================================
     * 结果信息统一渲染：分数 + 称号 + 提示语
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
     * 渲染：称号
     * ============================================================ */
    function renderTitle(title) {
        var tag = $('medalTag');
        if (!tag) return;
        var textEl = tag.querySelector('.medal-text');
        if (textEl) textEl.textContent = title || '';
    }

    /* ============================================================
     * 渲染：提示语
     * ============================================================ */
    function renderTips(tips) {
        var el = $('tipText');
        if (el) el.textContent = tips || '';
    }

    /* ============================================================
     * 渲染：选中物品列表
     *  - 入参：选中 ID 数组
     *  - 行为：查字典 → 生成 DOM；图片加载失败回退到 emoji 图标
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

            // 优先尝试加载图片；失败则回退为 emoji
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
            // 先占位显示 emoji，等图片加载完再替换
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
     * Canvas 初始化
     * ============================================================ */
    function initCanvases() {
        if (!global.KitchenCanvas) return;
        global.KitchenCanvas.init('canvasOriginal', '原始厨房');
        global.KitchenCanvas.init('canvasPlayer',   '我的复刻');
    }

    function handleResize() {
        if (global.KitchenCanvas) global.KitchenCanvas.resizeAll();
    }

    /* ============================================================
     * 数据绑定入口：
     *  - score / similarity / selectedIds 由调用方提供
     *  - title / tips 由 getTitleAndTips(score) 按档位自动派生
     *  - 调用方亦可显式传入 title / tips 覆盖
     * ============================================================ */
    function applyState(state) {
        GameState.score       = clamp(state.score      | 0, 0, 100);
        GameState.similarity  = clamp(state.similarity | 0, 0, 100);
        GameState.selectedIds = (state.selectedIds || []).slice();

        // 物品列表先行渲染
        renderSelectedItems(GameState.selectedIds);

        // 派生称号 + 提示语并渲染（含分数动画）
        if (state.title || state.tips) {
            // 显式覆盖
            GameState.title = state.title || findTier(GameState.score).title;
            GameState.tips  = state.tips  || randomFrom(findTier(GameState.score).tips);
            setTimeout(renderResultInfo, 180);
        } else {
            setTimeout(function () { getTitleAndTips(GameState.score); }, 180);
        }

        console.log('[GameState]', JSON.parse(JSON.stringify(GameState)));
    }

    /* ============================================================
     * 静态赋值（模拟结算数据） + 启动
     * ============================================================ */
    function boot() {
        bindActions();
        initCanvases();

        applyState({
            score:       86,
            similarity:  92,
            selectedIds: SELECTED_IDS
            // title / tips 不传 → 由分数自动派生（声音猎手 + 随机一条治愈系提示）
        });
    }

    // 暴露给业务侧：
    //  - GameState.update(state)         一次性写入全部字段并渲染
    //  - GameState.getTitleAndTips(s)    仅根据分数派生称号 + 提示语并渲染
    //  - GameState.renderResultInfo()    用当前状态强制重渲
    GameState.update            = applyState;
    GameState.getTitleAndTips   = getTitleAndTips;
    GameState.renderResultInfo  = renderResultInfo;

    global.addEventListener('resize', handleResize);
    global.addEventListener('orientationchange', function () { setTimeout(handleResize, 200); });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})(window);
