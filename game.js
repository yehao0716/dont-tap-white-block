class Game {
    constructor() {
        // 获取画布和上下文
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // 设置画布大小
        this.canvas.width = 800;
        this.canvas.height = 600;
        
        // 游戏区域参数
        this.gameAreaWidth = 400;
        this.tileCount = 4;
        this.tileWidth = this.gameAreaWidth / this.tileCount;
        this.tileHeight = 120;
        this.tiles = [];
        this.baseSpeed = 1.0;
        this.speed = this.baseSpeed;
        this.speedMultiplier = 1.0;
        this.score = 0;
        this.bestScore = localStorage.getItem('bestScore') || 0;
        
        // 游戏状态
        this.isPlaying = false;
        
        // 添加音频系统
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.audioBuffer = null;
        this.audioSource = null;
        
        // 添加音频分析器
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        this.bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(this.bufferLength);
        
        // 节拍检测参数
        this.beatDetectionThreshold = 0.15;
        this.lastBeatTime = 0;
        this.minBeatInterval = 250; // 最小节拍间隔(ms)
        this.beatWindow = {
            early: 200, // 提前点击容错时间从500ms改为200ms
            late: 200   // 延后点击容错时间从500ms改为200ms
        };
        
        // 添加节拍状态
        this.nextBeatTime = 0;
        this.beatActive = false;
        
        // 修改进度条参数
        this.progressBarHeight = 50;
        this.progressBarWidth = this.canvas.width - 40;
        this.progressBarX = 20;
        this.progressBarY = 30;
        
        // 添加节奏提示动画参数
        this.beatEffectAlpha = 0;
        this.beatEffectSize = 0;
        this.beatEffectMaxSize = 100;
        this.noteEffects = []; // 音符特效数组
        
        // 添加音乐时长相关属性
        this.musicDuration = 0;
        this.musicStartTime = 0;
        
        // 添加键盘映射
        this.keyMap = {
            'q': 0,
            'w': 1,
            'e': 2,
            'r': 3
        };
        
        // 添加点击效果参数
        this.clickEffects = [];
        this.clickEffectConfig = {
            initialSize: 45,       // 增加初始大小 (从30增加50%)
            growthSpeed: 9,        // 增加扩散速度 (从6增加50%)
            fadeSpeed: 0.015,      // 降低淡出速度，让效果持续更久
            textSize: 72,          // 增加文字大小 (从48增加50%)
            glowSize: 30,          // 增加发光效果 (从20增加50%)
            pulseRange: 15         // 增加脉冲范围 (从10增加50%)
        };
        
        // 修改节拍线参数，放在更外侧
        this.beatLine = {
            y: 0,
            width: 80,  // 调整宽度
            height: 4,
            color: '#ff0000',
            offsetX: 100, // 增加与方块的距离
            spacing: 180  // 增加间距
        };
        
        // 添加提示文本配置
        this.tipConfig = {
            y: this.canvas.height / 2,
            color: '#333',
            font: 'bold 20px Arial'
        };
        
        // 添加节奏相关参数
        this.beatProgress = 0;
        this.lastBeatSpeed = this.baseSpeed;
        this.targetBeatSpeed = this.baseSpeed;
        
        // 添加说明文本配置
        this.instructions = [
            { text: "游戏说明", style: "bold 24px Arial", color: "#333", y: 50 },
            { text: "1. 操作方式：", style: "bold 20px Arial", color: "#333", y: 100 },
            { text: "- 使用鼠标点击黑块", style: "16px Arial", color: "#666", y: 130 },
            { text: "- 或使用键盘 Q W E R", style: "16px Arial", color: "#666", y: 155 },
            { text: "2. 游戏规则：", style: "bold 20px Arial", color: "#333", y: 200 },
            { text: "- 在节奏点击黑块得分", style: "16px Arial", color: "#666", y: 230 },
            { text: "- 观察右侧节拍指示器", style: "16px Arial", color: "#666", y: 255 },
            { text: "- 当指示器变黄时点击", style: "16px Arial", color: "#666", y: 280 },
            { text: "3. 计分规则：", style: "bold 20px Arial", color: "#333", y: 325 },
            { text: "- 正确点击 +1分", style: "16px Arial", color: "#666", y: 355 },
            { text: "- 音乐结束游戏完成", style: "16px Arial", color: "#666", y: 380 },
            { text: "4. 提示：", style: "bold 20px Arial", color: "#333", y: 425 },
            { text: "- 跟随音乐节奏", style: "16px Arial", color: "#666", y: 455 },
            { text: "- 注意观察指示器", style: "16px Arial", color: "#666", y: 480 },
            { text: "- 保持节奏感", style: "16px Arial", color: "#666", y: 505 }
        ];
        
        // 添加初始状态标志
        this.isInitialState = true;
        
        // 添加加载状态元素
        this.loadingScreen = document.getElementById('loadingScreen');
        this.errorScreen = document.getElementById('errorScreen');
        
        // 初始化事件监听
        this.initEventListeners();
        this.loadAudio().catch(error => {
            console.error('音频加载失败:', error);
            this.showError();
        });
        this.updateBestScore();

        // 立即绘制初始界面
        this.drawInitialScreen();
    }

    initEventListeners() {
        document.getElementById('startButton').addEventListener('click', () => {
            this.startGame();
        });

        this.canvas.addEventListener('click', (e) => {
            if (!this.isPlaying) return;
            this.handleClick(e);
        });

        // 添加键盘事件监听
        document.addEventListener('keydown', (e) => {
            if (!this.isPlaying) return;
            this.handleKeyPress(e);
        });
    }

    // 修改音频加载方法
    async loadAudio() {
        try {
            const songSelect = document.getElementById('songSelect');
            const songUrl = 'music/' + songSelect.value;
            const response = await fetch(songUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.musicDuration = this.audioBuffer.duration * 1000; // 转换为毫秒
            console.log('音频加载成功，时长:', this.musicDuration, 'ms');
            this.hideLoading();
        } catch (error) {
            console.error('音频加载失败:', error);
            this.showError();
            throw error;
        }
    }

    // 添加加载状态处理方法
    showLoading() {
        if (this.loadingScreen) {
            this.loadingScreen.style.display = 'flex';
        }
    }

    hideLoading() {
        if (this.loadingScreen) {
            this.loadingScreen.style.display = 'none';
        }
    }

    showError() {
        if (this.errorScreen) {
            this.errorScreen.style.display = 'flex';
        }
        if (this.loadingScreen) {
            this.loadingScreen.style.display = 'none';
        }
    }

    // 添加初始界面绘制方法
    drawInitialScreen() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 绘制游戏区域边框
        this.ctx.strokeStyle = '#2a5298';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(0, 0, this.gameAreaWidth, this.canvas.height);

        // 绘制示例黑块
        const exampleBlockY = 200;
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(this.tileWidth, exampleBlockY, this.tileWidth, this.tileHeight);
        this.ctx.strokeRect(this.tileWidth, exampleBlockY, this.tileWidth, this.tileHeight);

        // 绘制示例节拍线
        const x = this.gameAreaWidth + this.beatLine.offsetX + this.beatLine.spacing;
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.fillRect(
            x - this.beatLine.width/2,
            0,
            this.beatLine.width,
            this.canvas.height
        );

        // 绘制示例黄色区域
        this.ctx.fillStyle = 'rgba(255, 255, 0, 0.2)';
        this.ctx.fillRect(
            x - this.beatLine.width/2,
            this.canvas.height * 0.7,
            this.beatLine.width,
            this.canvas.height * 0.2
        );

        // 绘制键位提示
        const keys = ['Q', 'W', 'E', 'R'];
        keys.forEach((key, index) => {
            const x = (index + 0.5) * this.tileWidth;
            this.ctx.fillStyle = '#eee';
            this.ctx.fillRect(
                index * this.tileWidth,
                this.canvas.height - 40,
                this.tileWidth,
                40
            );
            this.ctx.fillStyle = '#333';
            this.ctx.font = 'bold 24px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(key, x, this.canvas.height - 10);
        });

        // 绘制分隔线
        this.ctx.strokeStyle = '#ddd';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(this.gameAreaWidth + 20, 0);
        this.ctx.lineTo(this.gameAreaWidth + 20, this.canvas.height);
        this.ctx.stroke();

        // 绘制游戏说明
        this.instructions.forEach(instruction => {
            this.ctx.font = instruction.style;
            this.ctx.fillStyle = instruction.color;
            this.ctx.textAlign = 'left';
            this.ctx.fillText(
                instruction.text,
                this.gameAreaWidth + 40,
                instruction.y
            );
        });

        // 添加动画箭头指示
        const arrowY = exampleBlockY + this.tileHeight / 2;
        const arrowX = this.gameAreaWidth + this.beatLine.offsetX + this.beatLine.spacing;
        this.drawAnimatedArrow(this.tileWidth * 2 + 20, arrowY, arrowX - 30, arrowY);
    }

    // 添加动画箭头绘制方法
    drawAnimatedArrow(fromX, fromY, toX, toY) {
        const now = Date.now();
        const offset = Math.sin(now * 0.003) * 10; // 创建箭头的摆动效果

        this.ctx.beginPath();
        this.ctx.moveTo(fromX, fromY);
        this.ctx.lineTo(toX + offset, toY);
        
        // 箭头头部
        this.ctx.lineTo(toX - 20 + offset, toY - 10);
        this.ctx.moveTo(toX + offset, toY);
        this.ctx.lineTo(toX - 20 + offset, toY + 10);
        
        this.ctx.strokeStyle = '#4CAF50';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();

        // 如果是初始状态，继续动画
        if (this.isInitialState) {
            requestAnimationFrame(() => this.drawInitialScreen());
        }
    }

    // 修改开始游戏方法
    async startGame() {
        this.isInitialState = false;
        this.showLoading();
        
        try {
            if (!this.audioBuffer) {
                await this.loadAudio();
            }

            this.isPlaying = true;
            this.score = 0;
            this.tiles = [];
            this.speed = this.baseSpeed;
            
            if (this.audioSource) {
                this.audioSource.stop();
            }
            this.audioSource = this.audioContext.createBufferSource();
            this.audioSource.buffer = this.audioBuffer;
            this.audioSource.connect(this.analyser);
            this.audioSource.connect(this.audioContext.destination);
            
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            this.musicStartTime = Date.now();
            
            this.audioSource.onended = () => {
                this.gameOver();
            };
            
            this.audioSource.start(0);
            this.updateScore();
            this.addNewRow();
            this.gameLoop();
            this.hideLoading();
        } catch (error) {
            console.error('游戏启动失败:', error);
            this.showError();
        }
    }

    // 修改节拍检测方法
    detectBeat() {
        this.analyser.getByteFrequencyData(this.dataArray);
        
        let bassEnergy = 0;
        for(let i = 0; i < 10; i++) {
            bassEnergy += this.dataArray[i];
        }
        bassEnergy = bassEnergy / 10;
        
        const currentTime = Date.now();
        const timeSinceLastBeat = currentTime - this.lastBeatTime;
        
        // 计算节拍进度
        this.beatProgress = Math.min(1, timeSinceLastBeat / this.minBeatInterval);
        
        if (bassEnergy > this.beatDetectionThreshold * 255 && 
            timeSinceLastBeat > this.minBeatInterval) {
            this.lastBeatTime = currentTime;
            this.nextBeatTime = currentTime + this.minBeatInterval;
            this.beatActive = true;
            
            this.lastBeatSpeed = this.speed;
            this.targetBeatSpeed = this.baseSpeed * 2.5;
            
            return true;
        }
        
        // 修改最佳点击时机判断，增加容错时间
        const timeUntilNextBeat = this.nextBeatTime - currentTime;
        this.beatActive = (
            // 提前点击容错
            (timeUntilNextBeat > 0 && timeUntilNextBeat <= this.beatWindow.early) ||
            // 延后点击容错
            (timeUntilNextBeat < 0 && Math.abs(timeUntilNextBeat) <= this.beatWindow.late)
        );
        
        // 计算当前速度（使用缓动函数使速度变化更平滑）
        const easeOutQuad = t => t * (2 - t); // 缓动函数
        const speedProgress = easeOutQuad(this.beatProgress);
        this.speed = this.lastBeatSpeed + (this.targetBeatSpeed - this.lastBeatSpeed) * speedProgress;
        
        // 逐渐恢复到基础速度
        this.targetBeatSpeed = this.baseSpeed;
        
        return false;
    }

    // 修改更新方法
    update() {
        // 移动所有方块，使用当前速度
        this.tiles.forEach(row => {
            row.forEach(tile => {
                tile.y += this.speed * (1 + Math.sin(this.beatProgress * Math.PI) * 0.2);
            });
        });

        // 检查是否需要添加新行
        if (this.tiles.length === 0 || this.tiles[0][0].y >= 0) {
            this.addNewRow();
        }

        // 移除超出屏幕的行
        while (this.tiles.length > 0 && 
               this.tiles[this.tiles.length - 1][0].y >= this.canvas.height) {
            this.tiles.pop();
        }
    }

    // 修改游戏循环方法
    gameLoop() {
        if (!this.isPlaying) return;

        this.detectBeat(); // 检测节拍并更新速度
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }

    addNewRow() {
        const blackTileIndex = Math.floor(Math.random() * this.tileCount);
        const row = [];
        const yPos = this.tiles.length > 0 ? this.tiles[0][0].y - this.tileHeight : -this.tileHeight;
        
        for (let i = 0; i < this.tileCount; i++) {
            row.push({
                isBlack: i === blackTileIndex,
                y: yPos
            });
        }
        
        this.tiles.unshift(row);
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 获取当前时间（只声明一次）
        const currentTime = Date.now();

        // 计算并绘制节拍线
        if (this.lastBeatTime > 0) {
            const timeSinceLastBeat = currentTime - this.lastBeatTime;
            const progress = Math.min(1, timeSinceLastBeat / this.minBeatInterval);
            
            this.beatLine.y = this.canvas.height * progress;

            // 在每列方块右侧绘制节拍线指示器
            for (let i = 0; i < this.tileCount; i++) {
                const x = this.gameAreaWidth + this.beatLine.offsetX + (i * this.beatLine.spacing);
                
                // 绘制节拍线轨道（半透明背景）
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
                this.ctx.fillRect(
                    x - this.beatLine.width/2,
                    0,
                    this.beatLine.width,
                    this.canvas.height
                );

                // 绘制节拍线
                this.ctx.shadowColor = this.beatLine.color;
                this.ctx.shadowBlur = 15;
                this.ctx.fillStyle = this.beatLine.color;
                this.ctx.fillRect(
                    x - this.beatLine.width/2,
                    this.beatLine.y - this.beatLine.height/2,
                    this.beatLine.width,
                    this.beatLine.height
                );
                this.ctx.shadowBlur = 0;

                // 绘制容错区域（淡黄色）
                const earlyY = this.canvas.height * 0.8 - (this.canvas.height * (this.beatWindow.early / this.minBeatInterval));
                const lateY = this.canvas.height * 0.8 + (this.canvas.height * (this.beatWindow.late / this.minBeatInterval));
                
                this.ctx.fillStyle = 'rgba(255, 255, 0, 0.1)';
                this.ctx.fillRect(
                    x - this.beatLine.width/2,
                    earlyY,
                    this.beatLine.width,
                    lateY - earlyY
                );

                // 绘制最佳点击区域（深黄色）
                if (Math.abs(timeSinceLastBeat - this.nextBeatTime) <= 50) { // 最佳点击时间窗口缩小到±50ms
                    this.ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
                    this.ctx.fillRect(
                        x - this.beatLine.width/2,
                        this.canvas.height * 0.79,
                        this.beatLine.width,
                        this.canvas.height * 0.02
                    );
                }
            }
        }

        // 绘制方块
        this.tiles.forEach(row => {
            row.forEach((tile, colIndex) => {
                // 当节拍线接近目标位置时高亮黑块
                if (tile.isBlack && this.beatActive) {
                    this.ctx.shadowColor = 'yellow';
                    this.ctx.shadowBlur = 20;
                }
                
                this.ctx.fillStyle = tile.isBlack ? '#000' : '#fff';
                this.ctx.strokeStyle = '#000';
                this.ctx.fillRect(
                    colIndex * this.tileWidth,
                    tile.y,
                    this.tileWidth,
                    this.tileHeight
                );
                this.ctx.strokeRect(
                    colIndex * this.tileWidth,
                    tile.y,
                    this.tileWidth,
                    this.tileHeight
                );
                this.ctx.shadowBlur = 0;
            });
        });

        // 1. 绘制节拍闪光效果
        if (this.beatActive) {
            // 整个屏幕的闪光效果
            this.beatEffectAlpha = Math.min(0.3, this.beatEffectAlpha + 0.1);
            this.ctx.fillStyle = `rgba(255, 255, 0, ${this.beatEffectAlpha})`;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // 添加新的音符特效
            if (Math.random() < 0.2) {
                this.noteEffects.push({
                    x: Math.random() * this.canvas.width,
                    y: this.canvas.height,
                    speed: 2 + Math.random() * 2,
                    rotation: Math.random() * Math.PI * 2,
                    size: 20 + Math.random() * 10
                });
            }
        } else {
            this.beatEffectAlpha = Math.max(0, this.beatEffectAlpha - 0.05);
        }

        // 2. 绘制音符特效
        this.noteEffects = this.noteEffects.filter(note => {
            note.y -= note.speed;
            note.rotation += 0.05;
            
            this.ctx.save();
            this.ctx.translate(note.x, note.y);
            this.ctx.rotate(note.rotation);
            this.ctx.fillStyle = 'rgba(255, 255, 0, 0.6)';
            this.ctx.font = `${note.size}px Arial`;
            this.ctx.fillText('♪', -note.size/2, 0);
            this.ctx.restore();
            
            return note.y > -50;
        });

        // 3. 绘制进度条
        // 进度条背景
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(
            this.progressBarX - 2,
            this.progressBarY - 2,
            this.progressBarWidth + 4,
            this.progressBarHeight + 4
        );

        // 进度条主体
        if (this.lastBeatTime > 0) {
            const timeSinceLastBeat = currentTime - this.lastBeatTime;
            const progress = Math.min(1, timeSinceLastBeat / this.minBeatInterval);
            
            // 进度条渐变
            const gradient = this.ctx.createLinearGradient(
                this.progressBarX,
                0,
                this.progressBarX + this.progressBarWidth,
                0
            );
            gradient.addColorStop(0, '#4CAF50');
            gradient.addColorStop(progress, '#4CAF50');
            gradient.addColorStop(progress, '#ddd');
            gradient.addColorStop(1, '#ddd');
            
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(
                this.progressBarX,
                this.progressBarY,
                this.progressBarWidth,
                this.progressBarHeight
            );

            // 最佳点击区域
            if (progress >= 0.8 && progress <= 1) {
                const pulseSize = Math.sin(currentTime * 0.02) * 5;
                this.ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
                this.ctx.fillRect(
                    this.progressBarX + (this.progressBarWidth * 0.8) - pulseSize,
                    this.progressBarY - pulseSize,
                    this.progressBarWidth * 0.2 + pulseSize * 2,
                    this.progressBarHeight + pulseSize * 2
                );
            }

            // 4. 添加倒计时动画
            const countdownText = Math.ceil((1 - progress) * 3);
            if (countdownText > 0) {
                this.ctx.fillStyle = '#fff';
                this.ctx.font = 'bold 30px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(
                    countdownText,
                    this.canvas.width / 2,
                    this.progressBarY + this.progressBarHeight + 40
                );
                this.ctx.textAlign = 'left';
            }
        }

        // 6. 绘制键位提示
        const keys = ['Q', 'W', 'E', 'R'];
        keys.forEach((key, index) => {
            const x = (index + 0.5) * this.tileWidth;
            // 绘制按键背景
            this.ctx.fillStyle = this.beatActive ? 'rgba(255, 255, 0, 0.2)' : '#eee';
            this.ctx.fillRect(
                index * this.tileWidth,
                this.canvas.height - 40,
                this.tileWidth,
                40
            );
            // 绘制按键文字
            this.ctx.fillStyle = '#333';
            this.ctx.font = 'bold 24px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(
                key,
                x,
                this.canvas.height - 10
            );
        });

        // 添加点击提示
        this.ctx.fillStyle = '#333';
        this.ctx.font = 'bold 20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(
            '在进度条到达黄色区域时点击', 
            this.canvas.width / 2,
            this.progressBarY + this.progressBarHeight + 25
        );

        // 显示剩余时间（使用同一个 currentTime）
        if (this.musicStartTime > 0 && this.musicDuration > 0) {
            const remainingTime = Math.max(0, this.musicDuration - (currentTime - this.musicStartTime));
            const remainingSeconds = Math.ceil(remainingTime / 1000);
            
            this.ctx.fillStyle = '#333';
            this.ctx.font = '20px Arial';
            this.ctx.textAlign = 'right';
            this.ctx.fillText(
                `剩余时间: ${remainingSeconds}秒`,
                this.canvas.width - 20,
                30
            );
            this.ctx.textAlign = 'left';
        }

        // 修改点击效果的绘制
        this.clickEffects = this.clickEffects.filter(effect => {
            effect.size += this.clickEffectConfig.growthSpeed;
            effect.alpha -= this.clickEffectConfig.fadeSpeed;

            if (effect.alpha > 0) {
                // 增强发光效果
                this.ctx.shadowColor = effect.isSuccess ? '#4CAF50' : '#ff0000';
                this.ctx.shadowBlur = this.clickEffectConfig.glowSize;
                
                // 绘制外圈（增大）
                this.ctx.beginPath();
                this.ctx.arc(effect.x, effect.y, effect.size * 1.5, 0, Math.PI * 2);
                this.ctx.strokeStyle = `rgba(${effect.isSuccess ? '0,255,0' : '255,0,0'}, ${effect.alpha})`;
                this.ctx.lineWidth = 8; // 增加线条宽度
                this.ctx.stroke();

                // 绘制内圈（增大）
                this.ctx.beginPath();
                this.ctx.arc(effect.x, effect.y, effect.size * 0.9, 0, Math.PI * 2);
                this.ctx.strokeStyle = `rgba(${effect.isSuccess ? '0,255,0' : '255,0,0'}, ${effect.alpha * 0.7})`;
                this.ctx.lineWidth = 5;
                this.ctx.stroke();

                // 添加更大的脉冲效果
                const pulseSize = Math.sin(Date.now() * 0.01) * this.clickEffectConfig.pulseRange;
                this.ctx.beginPath();
                this.ctx.arc(effect.x, effect.y, effect.size * 0.45 + pulseSize, 0, Math.PI * 2);
                this.ctx.fillStyle = `rgba(${effect.isSuccess ? '0,255,0' : '255,0,0'}, ${effect.alpha * 0.3})`;
                this.ctx.fill();

                // 添加更大的✓或×符号
                this.ctx.fillStyle = `rgba(${effect.isSuccess ? '0,255,0' : '255,0,0'}, ${effect.alpha})`;
                this.ctx.font = `bold ${this.clickEffectConfig.textSize}px Arial`;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(effect.isSuccess ? '✓' : '×', effect.x, effect.y);
                
                // 添加额外的光环效果
                this.ctx.beginPath();
                this.ctx.arc(effect.x, effect.y, effect.size * 1.2, 0, Math.PI * 2);
                this.ctx.strokeStyle = `rgba(${effect.isSuccess ? '0,255,0' : '255,0,0'}, ${effect.alpha * 0.2})`;
                this.ctx.lineWidth = 15;
                this.ctx.stroke();
                
                this.ctx.shadowBlur = 0; // 重置阴影
                return true;
            }
            return false;
        });

        // 添加点击区域提示文本
        this.ctx.fillStyle = '#333';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(
            '当节拍线变黄色时点击',
            10,
            this.canvas.height - 60
        );

        // 添加操作说明
        this.ctx.fillStyle = '#333';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(
            '当节拍线进入黄色区域时点击对应列的黑块',
            this.canvas.width / 2,
            30
        );

        // 绘制分隔线
        this.ctx.strokeStyle = '#ddd';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(this.gameAreaWidth + 20, 0);
        this.ctx.lineTo(this.gameAreaWidth + 20, this.canvas.height);
        this.ctx.stroke();

        // 绘制说明文本
        this.instructions.forEach(instruction => {
            this.ctx.font = instruction.style;
            this.ctx.fillStyle = instruction.color;
            this.ctx.textAlign = 'left';
            this.ctx.fillText(
                instruction.text,
                this.gameAreaWidth + 40, // 在游戏区域右侧40px处开始绘制
                instruction.y
            );
        });
    }

    handleClick(e) {
        if (!this.beatActive) {
            // 点击时机不对，显示败效果
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            this.addClickEffect(x, y, false);
            return;
        }

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const col = Math.floor(x / this.tileWidth);
        
        let bottomBlackTile = null;
        let bottomBlackTileRow = null;

        for (let i = this.tiles.length - 1; i >= 0; i--) {
            const row = this.tiles[i];
            if (row[col].isBlack) {
                bottomBlackTile = row[col];
                bottomBlackTileRow = row;
                break;
            }
        }

        if (!bottomBlackTile) {
            // 点击白块，显示失败效果
            this.addClickEffect(x, y, false);
            return;
        }

        const tileY = bottomBlackTileRow[0].y;
        if (Math.abs(y - (tileY + this.tileHeight/2)) < this.tileHeight/2) {
            // 点击成功，显示成功效果
            this.addClickEffect(x, y, true);
            this.score++;
            this.updateScore();
            bottomBlackTile.isBlack = false;
            this.beatActive = false;
        }
    }

    updateScore() {
        document.getElementById('score').textContent = this.score;
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            localStorage.setItem('bestScore', this.bestScore);
            this.updateBestScore();
        }
    }

    updateBestScore() {
        document.getElementById('bestScore').textContent = this.bestScore;
    }

    // 修改游戏结束方法
    gameOver() {
        this.isPlaying = false;
        if (this.audioSource) {
            this.audioSource.stop();
        }

        const message = `游戏结束！\n最终得分：${this.score}\n最高记录：${this.bestScore}`;
        setTimeout(() => {
            alert(message);
        }, 100);
    }

    // 添加键盘处理方法
    handleKeyPress(e) {
        if (!this.beatActive) {
            return;
        }

        const key = e.key.toLowerCase();
        if (!(key in this.keyMap)) {
            return;
        }

        const col = this.keyMap[key];
        const x = (col + 0.5) * this.tileWidth; // 键盘点击效果显示在列的中间
        
        let bottomBlackTile = null;
        let bottomBlackTileRow = null;

        for (let i = this.tiles.length - 1; i >= 0; i--) {
            const row = this.tiles[i];
            if (row[col].isBlack) {
                bottomBlackTile = row[col];
                bottomBlackTileRow = row;
                break;
            }
        }

        if (!bottomBlackTile) {
            // 没有黑块，显示失败效果
            this.addClickEffect(x, this.canvas.height - 100, false);
            return;
        }

        const tileY = bottomBlackTileRow[0].y;
        if (tileY > 0 && tileY < this.canvas.height) {
            // 点击成功，显示成功效果
            this.addClickEffect(x, tileY + this.tileHeight/2, true);
            this.score++;
            this.updateScore();
            bottomBlackTile.isBlack = false;
            this.beatActive = false;
        }
    }

    // 修改点击效果方法
    addClickEffect(x, y, isSuccess) {
        this.clickEffects.push({
            x: x,
            y: y,
            size: this.clickEffectConfig.initialSize,
            alpha: 1,
            color: isSuccess ? '#4CAF50' : '#ff0000',
            isSuccess: isSuccess
        });
    }
}

// 当页面加载完成后初始化游戏
window.onload = () => {
    new Game();
}; 