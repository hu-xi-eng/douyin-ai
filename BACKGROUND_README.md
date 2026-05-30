# 背景图放置说明

CSS 引用路径：`url('/ending.jpg')` —— 这是 **web 根** 绝对路径，浏览器会从域名根目录拉取。

## 放在哪里

把你的 `D:\Data\paper-game\ending.jpg` 复制到 **项目根目录**（与 `index.html` 同级）：

```
douyin-ai/
├── ending.jpg          ← 放这里
├── index.html
├── css/
└── js/
```

> 若以后接入 React / Vue / 构建工具，请改放到 `public/ending.jpg`，CSS 引用路径不变。

## 必须用本地服务器访问

`/ending.jpg` 这种绝对路径在 `file://` 协议下会被解析成系统根（Windows 为 `C:/ending.jpg`、Mac/Linux 为 `/ending.jpg`），双击 `index.html` 永远加载不到。

启一个本地服务器（任选其一）：

```bash
# Python（自带）
cd 项目根目录
python3 -m http.server 8080

# Node
npx serve .
```

然后访问 `http://localhost:8080`。

## 验证

打开浏览器控制台（F12 → Console）：

- ✅ 绿字 `[BG] 背景图加载成功 /ending.jpg (宽x高)` → 已生效
- ❌ 红字 `[BG] 背景图未找到` → 文件位置或服务器姿势不对
