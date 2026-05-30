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

    // ===== 模拟结算数据（后续可由真实数据替换） =====
    var mockResult = {
        score: 86,
        medal: '颠勺小能手',
        medalIcon: '👨‍🍳',
        tip: '差一点就满分啦，再接再厉～',
        items: [
            { icon: '🍳', name: '平底锅' },
            { icon: '🔪', name: '菜刀' },
            { icon: '🥘', name: '砂锅' },
            { icon: '🫖', name: '水壶' },
            { icon: '🍅', name: '番茄' },
            { icon: '🥚', name: '鸡蛋' },
            { icon: '🧂', name: '盐罐' },
            { icon: '🥬', name: '青菜' },
            { icon: '🧄', name: '大蒜' }
        ]
    };

    function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

    function renderScore(score) {
        var target = clamp(score | 0, 0, 100);
        var numEl = document.getElementById('scoreNumber');
        var barEl = document.getElementById('scoreBarFill');
        var starsEl = document.getElementById('scoreStars');

        // 数字滚动
        if (numEl) {
            var current = 0;
            var step = Math.max(1, Math.ceil(target / 28));
            var timer = setInterval(function () {
                current += step;
                if (current >= target) {
                    current = target;
                    clearInterval(timer);
                }
                numEl.textContent = current;
            }, 24);
        }

        // 进度条
        if (barEl) {
            requestAnimationFrame(function () {
                barEl.style.width = target + '%';
            });
        }

        // 星级（每 20 分一颗星）
        if (starsEl) {
            var stars = starsEl.querySelectorAll('.star');
            var lit = Math.round(target / 20);
            stars.forEach(function (s, i) {
                setTimeout(function () {
                    if (i < lit) s.classList.add('on');
                }, 120 + i * 90);
            });
        }
    }

    function renderMedal(text, icon) {
        var tag = document.getElementById('medalTag');
        if (!tag) return;
        var iconEl = tag.querySelector('.medal-icon');
        var textEl = tag.querySelector('.medal-text');
        if (iconEl && icon) iconEl.textContent = icon;
        if (textEl) textEl.textContent = text;
    }

    function renderTip(text) {
        var el = document.getElementById('tipText');
        if (el) el.textContent = text;
    }

    function renderItems(items) {
        var list = document.getElementById('itemsList');
        var count = document.getElementById('itemsCount');
        if (!list) return;
        list.innerHTML = '';
        items.forEach(function (it) {
            var li = document.createElement('li');
            li.className = 'item';
            var icon = document.createElement('div');
            icon.className = 'item-icon';
            icon.textContent = it.icon || '🍽️';
            var name = document.createElement('div');
            name.className = 'item-name';
            name.textContent = it.name || '';
            li.appendChild(icon);
            li.appendChild(name);
            list.appendChild(li);
        });
        if (count) count.textContent = '共 ' + items.length + ' 件';
    }

    function bindActions() {
        var btnRetry = document.getElementById('btnRetry');
        var btnHome = document.getElementById('btnHome');
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

    function initCanvases() {
        if (!window.KitchenCanvas) return;
        window.KitchenCanvas.init('canvasOriginal', '原始厨房');
        window.KitchenCanvas.init('canvasPlayer', '我的复刻');
    }

    function handleResize() {
        if (window.KitchenCanvas) window.KitchenCanvas.resizeAll();
    }

    function boot() {
        renderMedal(mockResult.medal, mockResult.medalIcon);
        renderTip(mockResult.tip);
        renderItems(mockResult.items);
        bindActions();
        initCanvases();
        // 得分动画稍微延迟，让进场更有节奏
        setTimeout(function () { renderScore(mockResult.score); }, 180);
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
