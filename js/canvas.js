/**
 * Canvas 渲染模块（预留）。
 * 负责原始厨房图与玩家复刻图的绘制，对外暴露：
 *   - KitchenCanvas.init(canvasId, label)   初始化并按容器尺寸 + DPR 设置画布
 *   - KitchenCanvas.render(id, data)        绘制场景（业务接入后替换占位）
 *   - KitchenCanvas.clear(id)               清空画布
 *   - KitchenCanvas.resizeAll()             屏幕尺寸变化时整体重设
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
        return { canvas: canvas, ctx: ctx, width: rect.width, height: rect.height, dpr: dpr };
    }

    function drawPlaceholder(inst, label) {
        var ctx = inst.ctx;
        var w = inst.width;
        var h = inst.height;
        ctx.clearRect(0, 0, w, h);

        // 奶油色暖背景
        var grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#fff5e0');
        grad.addColorStop(1, '#ffe7c2');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // 木纹地面
        var floorH = Math.floor(h * 0.32);
        var floorY = h - floorH;
        var floorGrad = ctx.createLinearGradient(0, floorY, 0, h);
        floorGrad.addColorStop(0, '#d39a64');
        floorGrad.addColorStop(1, '#b07338');
        ctx.fillStyle = floorGrad;
        ctx.fillRect(0, floorY, w, floorH);

        // 木纹线
        ctx.strokeStyle = 'rgba(90, 50, 20, 0.25)';
        ctx.lineWidth = Math.max(1, w * 0.004);
        for (var i = 1; i < 4; i++) {
            var y = floorY + (floorH / 4) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }

        // 中心提示文字
        ctx.fillStyle = 'rgba(90, 50, 20, 0.85)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        var fontSize = Math.max(12, Math.floor(Math.min(w, h) * 0.11));
        ctx.font = '800 ' + fontSize + 'px -apple-system, "PingFang SC", sans-serif';
        ctx.fillText(label || '画布占位', w / 2, h * 0.45);

        // 副文字
        ctx.fillStyle = 'rgba(90, 50, 20, 0.55)';
        ctx.font = '600 ' + Math.floor(fontSize * 0.55) + 'px -apple-system, "PingFang SC", sans-serif';
        ctx.fillText('Canvas 预览区', w / 2, h * 0.45 + fontSize * 0.95);
    }

    var KitchenCanvas = {
        init: function (canvasId, label) {
            var canvas = document.getElementById(canvasId);
            if (!canvas) return null;
            var inst = setupCanvas(canvas);
            inst.label = label || canvasId;
            instances[canvasId] = inst;
            drawPlaceholder(inst, inst.label);
            return inst;
        },

        render: function (canvasId, data) {
            var inst = instances[canvasId];
            if (!inst) return;
            drawPlaceholder(inst, (data && data.label) || inst.label);
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
                instances[id] = inst;
                drawPlaceholder(inst, inst.label);
            });
        }
    };

    global.KitchenCanvas = KitchenCanvas;
})(window);
