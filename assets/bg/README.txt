把「图 2 厨房插画」放到本目录下，并命名为：

    ending.jpg

完整路径示例（Windows）：
    项目根目录\assets\bg\ending.jpg

完整路径示例（Mac / Linux）：
    项目根目录/assets/bg/ending.jpg

——

❌ 不要在 CSS 里写 D:\Data\paper-game\ending.jpg 这种本地绝对路径
   浏览器出于安全策略会拦截所有 file:/// 绝对路径引用，
   即便能加载也无法跟着项目走，部署后必然 404。

✅ 正确做法：把图片复制到 assets/bg/ 下面，CSS 用相对路径
   ./assets/bg/ending.jpg 即可。代码已配置好，无需再改 CSS。

——

验证：刷新页面后打开浏览器控制台（F12 → Console），
若看到绿字 "[BG] 背景图加载成功 ..." 说明已生效；
若看到红字 "[BG] 背景图未找到 ..." 说明文件还没放进来。
