/**
 * Canvas 渲染模块（预留）。
 * 负责原始厨房图与玩家复刻图的绘制，对外暴露：
 *   - KitchenCanvas.init(canvasId)       初始化并按容器尺寸 + DPR 设置画布
 *   - KitchenCanvas.render(id, data)     绘制场景（data 由后续业务接入）
 *   - KitchenCanvas.clear(id)            清空画布
 *   - KitchenCanvas.resizeAll()          屏幕尺寸变化时整体重设
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

        // 背景棋盘格占位
        var cell = Math.max(8, Math.floor(Math.min(w, h) / 10));
        for (var y = 0; y < h; y += cell) {
            for (var x = 0; x < w; x += cell) {
                var even = ((x / cell) + (y / cell)) % 2 === 0;
                ctx.fillStyle = even ? '#fff3dc' : '#ffe6bf';
                ctx.fillRect(x, y, cell, cell);
            }
        }

        // 中心提示文字
        ctx.fillStyle = '#a36b3a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        var fontSize = Math.max(12, Math.floor(Math.min(w, h) * 0.12));
        ctx.font = '600 ' + fontSize + 'px -apple-system, "PingFang SC", sans-serif';
        ctx.fillText(label || '画布占位', w / 2, h / 2);
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
            // 业务渲染入口预留：data = { items: [...], background: ... }
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
