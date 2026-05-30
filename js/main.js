/**
 * 结算页主逻辑：模拟数据填充、按钮事件、视口适配、Canvas 初始化。
 */
(function () {
    'use strict';

    // 屏蔽手势缩放
    document.addEventListener('gesturestart', function (e) { e.preventDefault(); }, { passive: false });
    document.addEventListener('gesturechange', function (e) { e.preventDefault(); }, { passive: false });
    document.addEventListener('gestureend', function (e) { e.preventDefault(); }, { passive: false });

    // 屏蔽双指缩放与双击放大
    var lastTouchEnd = 0;
    document.addEventListener('touchstart', function (e) {
        if (e.touches.length > 1) e.preventDefault();
    }, { passive: false });
    document.addEventListener('touchend', function (e) {
        var now = Date.now();
        if (now - lastTouchEnd <= 300) e.preventDefault();
        lastTouchEnd = now;
    }, { passive: false });

    // 屏蔽默认右键菜单
    document.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    // ===== 模拟结算数据（后续可由真实数据替换）=====
    var mockResult = {
        score: 86,
        medal: '颠勺小能手',
        tip: '差一点就满分啦，再接再厉～',
        items: ['炒锅', '菜刀', '砧板', '青菜', '番茄', '鸡蛋', '酱油', '盐']
    };

    function renderScore(score) {
        var el = document.getElementById('scoreNumber');
        if (!el) return;
        var target = Math.max(0, Math.min(100, score | 0));
        var current = 0;
        var step = Math.max(1, Math.ceil(target / 24));
        var timer = setInterval(function () {
            current += step;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            el.textContent = current;
        }, 24);
    }

    function renderMedal(text) {
        var el = document.getElementById('medalTag');
        if (el) el.textContent = text;
    }

    function renderTip(text) {
        var el = document.getElementById('tipText');
        if (el) el.textContent = text;
    }

    function renderItems(items) {
        var list = document.getElementById('itemsList');
        if (!list) return;
        list.innerHTML = '';
        items.forEach(function (name) {
            var li = document.createElement('li');
            li.className = 'item';
            li.textContent = name;
            list.appendChild(li);
        });
    }

    function bindActions() {
        var btnRetry = document.getElementById('btnRetry');
        var btnShare = document.getElementById('btnShare');
        if (btnRetry) {
            btnRetry.addEventListener('click', function () {
                // TODO: 接入再来一局逻辑
                console.log('[settlement] retry');
            });
        }
        if (btnShare) {
            btnShare.addEventListener('click', function () {
                // TODO: 接入分享逻辑
                console.log('[settlement] share');
            });
        }
    }

    function initCanvases() {
        if (!window.KitchenCanvas) return;
        window.KitchenCanvas.init('canvasOriginal', '原始厨房');
        window.KitchenCanvas.init('canvasPlayer', '你的复刻');
    }

    function handleResize() {
        if (window.KitchenCanvas) window.KitchenCanvas.resizeAll();
    }

    function boot() {
        renderScore(mockResult.score);
        renderMedal(mockResult.medal);
        renderTip(mockResult.tip);
        renderItems(mockResult.items);
        bindActions();
        initCanvases();
    }

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', function () {
        setTimeout(handleResize, 200);
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
