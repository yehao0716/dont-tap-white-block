# 别踩白块游戏

这是一个基于经典手机游戏"别踩白块"开发的网页版游戏。

## 游戏规则
1. 游戏界面由4×4的黑白方块组成
2. 玩家需要点击黑色方块
3. 点击白色方块或让黑色方块移动到底部都会导致游戏结束
4. 游戏会记录玩家的得分和最高分

## 游戏特点
1. 渐进式难度系统：
   - 0-9分：基础速度
   - 10-19分：速度提升20%
   - 20-29分：速度提升40%
   - 30-49分：速度提升60%
   - 50-69分：速度提升80%
   - 70-99分：速度翻倍
   - 100分以上：速度提升120%

2. 动态难度调整：
   - 每获得10分会额外增加一点微小的速度
   - 难度提升平滑，确保游戏体验
   - 初始速度适中，适合新手上手

3. 成绩记录系统：
   - 实时显示当前得分
   - 自动保存并显示最高分
   - 游戏结束时显示详细得分信息

## 技术特点
- 使用HTML5 Canvas进行游戏渲染
- 使用JavaScript实现游戏逻辑
- 响应式设计，适配不同屏幕尺寸
- 支持触摸屏和鼠标操作
- localStorage保存最高分记录

## 操作说明
1. 点击"开始游戏"按钮开始新游戏
2. 使用鼠标或触摸屏点击黑色方块
3. 避免点击白色方块
4. 注意不要让黑色方块触底

## 游戏技巧
1. 开始时速度较慢，可以稳步建立节奏
2. 随着分数增加要保持专注，速度会逐渐加快
3. 在速度提升的关键分数点（10分、20分等）要特别注意适应新的速度
4. 建议将注意力集中在屏幕上方，为接下来的方块做好准备

## 开发计划
- [x] 基础游戏界面搭建
- [x] 实现方块生成和移动逻辑
- [x] 添加点击检测和游戏规则
- [x] 实现计分系统
- [x] 实现渐进式难度系统
- [ ] 添加游戏音效
- [ ] 添加暂停功能
- [ ] 添加教程模式
- [ ] 添加不同游戏模式 