/**
 * Canvas 渲染模块（厨房复刻视图）
 *
 * 对外 API：
 *   KitchenCanvas.init(canvasId, label)
 *     初始化画布并按容器尺寸 + DPR 设置
 *
 *   KitchenCanvas.render(canvasId, data)
 *     根据传入数据绘制厨房复刻：
 *       data = {
 *         label:       String,                       // 占位文字（无 layout 时使用）
 *         selectedIds: ['01', '03', ...],            // 玩家答对/选中的物品 ID
 *         layout:      [{ id, icon, x, y, size, name? }, ...]
 *                                                    // 全部预设物品位置（x/y/size 都是 0~1 的相对值）
 *         missedAlpha: 0.3                           // 未选中物品的不透明度
 *       }
 *
 *   KitchenCanvas.clear(canvasId)
 *   KitchenCanvas.resizeAll()                        // resize / 旋转后重设并按上次数据重绘
 */
(function (global) {
    'use strict';

    var instances = Object.create(null);

    function setupCanvas(canvas) {
        var rect = canvas.getBoundingClientRect();
        var dpr = global.devicePixelRatio || 1;
        canvas.width = Math.max(1, Math.floor(rect.width * dpr));
        canvas.height = Math.max(1, Math.floor(rect.height * dpr));
        var ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        return {
            canvas: canvas, ctx: ctx,
            width: rect.width, height: rect.height,
            dpr: dpr,
            label: '', lastData: null
        };
    }

    /* ===== 背景：暖色厨房（墙面 + 灶台 + 隔板） ===== */
    function drawBackground(inst) {
        var ctx = inst.ctx;
        var w = inst.width;
        var h = inst.height;

        // 墙面：奶油色渐变
        var wallGrad = ctx.createLinearGradient(0, 0, 0, h);
        wallGrad.addColorStop(0, '#fff5e0');
        wallGrad.addColorStop(1, '#ffe7c2');
        ctx.fillStyle = wallGrad;
        ctx.fillRect(0, 0, w, h);

        // 墙面纹理点（柔和小圆点）
        ctx.fillStyle = 'rgba(180, 110, 60, 0.06)';
        var dot = Math.max(2, w * 0.012);
        for (var y = 0; y < h * 0.6; y += dot * 4) {
            for (var x = ((y / dot) % 2 ? dot * 2 : 0); x < w; x += dot * 4) {
                ctx.beginPath();
                ctx.arc(x, y, dot, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // 顶部隔板（搁物架）
        var shelfY = h * 0.18;
        var shelfH = Math.max(3, h * 0.035);
        ctx.fillStyle = '#c78a52';
        ctx.fillRect(0, shelfY, w, shelfH);
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.fillRect(0, shelfY + shelfH, w, Math.max(1, h * 0.008));

        // 灶台
        var counterH = h * 0.36;
        var counterY = h - counterH;
        var counterGrad = ctx.createLinearGradient(0, counterY, 0, h);
        counterGrad.addColorStop(0, '#d8a36d');
        counterGrad.addColorStop(1, '#a8703a');
        ctx.fillStyle = counterGrad;
        ctx.fillRect(0, counterY, w, counterH);

        // 灶台台面高光
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.fillRect(0, counterY, w, Math.max(2, h * 0.012));

        // 木纹横线
        ctx.strokeStyle = 'rgba(80, 40, 15, 0.18)';
        ctx.lineWidth = Math.max(1, w * 0.003);
        for (var i = 1; i < 4; i++) {
            var ly = counterY + (counterH / 4) * i;
            ctx.beginPath();
            ctx.moveTo(0, ly);
            ctx.lineTo(w, ly);
            ctx.stroke();
        }
    }

    /* ===== 单个物品绘制：圆角白底卡片 + emoji 图标 ===== */
    function drawItem(inst, item, alpha) {
        var ctx = inst.ctx;
        var w = inst.width;
        var h = inst.height;
        var base = Math.min(w, h);

        var size = item.size * base;
        var cx = item.x * w;
        var cy = item.y * h;
        var half = size / 2;
        var radius = size * 0.22;

        ctx.save();
        ctx.globalAlpha = alpha;

        // 卡片底
        ctx.fillStyle = '#fff8ec';
        roundRect(ctx, cx - half, cy - half, size, size, radius);
        ctx.fill();

        // 卡片描边
        ctx.lineWidth = Math.max(1, size * 0.05);
        ctx.strokeStyle = '#3a2113';
        roundRect(ctx, cx - half, cy - half, size, size, radius);
        ctx.stroke();

        // emoji 图标
        var iconSize = Math.floor(size * 0.62);
        ctx.font = iconSize + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.icon || '🍽️', cx, cy);

        ctx.restore();
    }

    function roundRect(ctx, x, y, w, h, r) {
        var rr = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + rr, y);
        ctx.arcTo(x + w, y,     x + w, y + h, rr);
        ctx.arcTo(x + w, y + h, x,     y + h, rr);
        ctx.arcTo(x,     y + h, x,     y,     rr);
        ctx.arcTo(x,     y,     x + w, y,     rr);
        ctx.closePath();
    }

    /* ===== 占位文字（未提供 layout 时） ===== */
    function drawPlaceholderText(inst, label) {
        var ctx = inst.ctx;
        var w = inst.width;
        var h = inst.height;
        ctx.fillStyle = 'rgba(90, 50, 20, 0.85)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        var fontSize = Math.max(12, Math.floor(Math.min(w, h) * 0.1));
        ctx.font = '800 ' + fontSize + 'px -apple-system, "PingFang SC", sans-serif';
        ctx.fillText(label || '我的复刻厨房', w / 2, h * 0.42);

        ctx.fillStyle = 'rgba(90, 50, 20, 0.55)';
        ctx.font = '600 ' + Math.floor(fontSize * 0.5) + 'px -apple-system, "PingFang SC", sans-serif';
        ctx.fillText('Canvas 预览区', w / 2, h * 0.42 + fontSize * 0.9);
    }

    /* ===== 主绘制入口 ===== */
    function paint(inst, data) {
        inst.lastData = data || null;
        var ctx = inst.ctx;
        ctx.clearRect(0, 0, inst.width, inst.height);

        drawBackground(inst);

        if (!data || !data.layout || !data.layout.length) {
            drawPlaceholderText(inst, (data && data.label) || inst.label);
            return;
        }

        var selected = {};
        (data.selectedIds || []).forEach(function (id) { selected[id] = true; });
        var missedAlpha = typeof data.missedAlpha === 'number' ? data.missedAlpha : 0.3;

        // 先画未选中（半透明，融入背景），再画选中（不透明，叠在上面）
        data.layout.forEach(function (it) {
            if (!selected[it.id]) drawItem(inst, it, missedAlpha);
        });
        data.layout.forEach(function (it) {
            if (selected[it.id]) drawItem(inst, it, 1);
        });
    }

    var KitchenCanvas = {
        init: function (canvasId, label) {
            var canvas = document.getElementById(canvasId);
            if (!canvas) return null;
            var inst = setupCanvas(canvas);
            inst.label = label || canvasId;
            instances[canvasId] = inst;
            paint(inst, null);
            return inst;
        },

        render: function (canvasId, data) {
            var inst = instances[canvasId];
            if (!inst) return;
            if (data && !data.label) data.label = inst.label;
            paint(inst, data);
        },

        clear: function (canvasId) {
            var inst = instances[canvasId];
            if (!inst) return;
            inst.ctx.clearRect(0, 0, inst.width, inst.height);
        },

        resizeAll: function () {
            Object.keys(instances).forEach(function (id) {
                var old = instances[id];
                var inst = setupCanvas(old.canvas);
                inst.label = old.label;
                inst.lastData = old.lastData;
                instances[id] = inst;
                paint(inst, old.lastData);
            });
        }
    };

    global.KitchenCanvas = KitchenCanvas;
})(window);
