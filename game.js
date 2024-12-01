class Game {
    constructor() {
        // 获取画布和上下文
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // 调整画布大小，确保右侧区域与左侧对齐
        this.canvas.width = 800;  // 减小总宽度
        this.canvas.height = 600;
        
        // 游戏区域参数
        this.gameAreaWidth = 400;
        this.tileCount = 4;
        this.tileWidth = this.gameAreaWidth / this.tileCount;
        this.tileHeight = 120;
        this.tiles = [];
        
        // 节拍显示区域参数
        this.beatAreaX = this.gameAreaWidth + 20;  // 减小间距
        this.beatAreaWidth = 380;  // 调整宽度使其与左侧对齐
        this.beatLineCount = 4;    // 节拍线数量
        this.beatLineSpacing = 100; // 节拍线间距
        
        // 游戏状态参数
        this.isPlaying = false;
        this.isPaused = false;
        this.score = 0;
        this.bestScore = localStorage.getItem('bestScore') || 0;
        this.gameEnded = false;
        this.speed = 2; // 基础移动速度
        this.musicStartTime = 0;
        this.showInstructions = true;  // 添加说明显示状态
        
        // 添加音频系统
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.audioBuffer = null;
        this.audioSource = null;
        
        // 添加加载状态元素
        this.loadingScreen = document.getElementById('loadingScreen');
        this.errorScreen = document.getElementById('errorScreen');
        
        // 添加点击特效数组
        this.clickEffects = [];
        this.keyLabels = ['Q', 'W', 'E', 'R'];
        
        // 定义特效颜色
        this.effectColors = {
            correct: '#4CAF50',  // 正确 - 绿色
            wrong: '#f44336'     // 错误 - 红色
        };
        
        // 添加分数显示元素
        this.scoreElement = document.getElementById('currentScore');
        this.bestScoreElement = document.getElementById('bestScore');
        
        // 初始化最高分显示
        this.bestScoreElement.textContent = this.bestScore;
        
        // 初始化事件监听
        this.initEventListeners();
        
        // 立即尝试加载音频
        this.loadAudio().catch(error => {
            console.error('音频加载失败:', error);
            this.showError();
        });
    }

    // 初始化事件监听器
    initEventListeners() {
        // 开始按钮
        document.getElementById('startButton').addEventListener('click', () => {
            this.startGame();
        });

        // 暂停按钮
        document.getElementById('pauseButton').addEventListener('click', () => {
            this.togglePause();
        });

        // 键盘事件
        document.addEventListener('keydown', (e) => {
            if (!this.isPlaying || this.isPaused || this.gameEnded) return;

            let column;
            switch(e.key.toLowerCase()) {
                case 'q': column = 0; break;
                case 'w': column = 1; break;
                case 'e': column = 2; break;
                case 'r': column = 3; break;
                default: return;
            }

            this.handleInput(column);
        });

        // 鼠标点击事件
        this.canvas.addEventListener('click', (e) => {
            if (!this.isPlaying || this.isPaused || this.gameEnded) return;

            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const column = Math.floor(x / this.tileWidth);
            
            if (column >= 0 && column < this.tileCount) {
                this.handleInput(column);
            }
        });
    }

    // 处理输入
    handleInput(column) {
        if (this.tiles.length > 0) {
            const bottomRow = this.tiles[this.tiles.length - 1];
            const tile = bottomRow[column];
            const hitZoneY = this.canvas.height - 150;
            const hitZoneHeight = 60;
            
            // 检查是否在最佳点击区域内
            if (tile && tile.y >= hitZoneY && tile.y <= hitZoneY + hitZoneHeight) {
                if (tile.isBlack) {
                    // 点击正确
                    this.score++;
                    // 更新分数显示
                    this.scoreElement.textContent = this.score;
                    if (this.score > this.bestScore) {
                        this.bestScore = this.score;
                        localStorage.setItem('bestScore', this.bestScore);
                        // 更新最高分显示
                        this.bestScoreElement.textContent = this.bestScore;
                    }
                    bottomRow[column].isBlack = false;
                    // 添加正确点击特效
                    this.addClickEffect(column * this.tileWidth + this.tileWidth/2, tile.y + this.tileHeight/2, 'correct');
                } else {
                    // 添加错误点击特效
                    this.addClickEffect(column * this.tileWidth + this.tileWidth/2, tile.y + this.tileHeight/2, 'wrong');
                }
            } else {
                // 不在点击区域内，显示错误特效
                this.addClickEffect(column * this.tileWidth + this.tileWidth/2, 
                    this.canvas.height - 120, 'wrong');
            }
        }
    }

    // 添加点击特效
    addClickEffect(x, y, type) {
        // 主圆圈效果
        const mainEffect = {
            x: x,
            y: y,
            type: type,
            radius: 20,            // 增大初始半径
            maxRadius: 200,        // 增大最大半径
            alpha: 1,
            expandSpeed: 8,        // 增加扩散速度
            startTime: Date.now()
        };

        // 次级圆圈效果
        const secondaryEffect = {
            x: x,
            y: y,
            type: type,
            radius: 15,           // 较小的初始半径
            maxRadius: 150,       // 较小的最大半径
            alpha: 0.8,
            expandSpeed: 6,       // 较慢的扩散速度
            startTime: Date.now()
        };

        // 最内层圆圈效果
        const innerEffect = {
            x: x,
            y: y,
            type: type,
            radius: 10,          // 最小的初始半径
            maxRadius: 100,      // 最小的最大半径
            alpha: 0.6,
            expandSpeed: 4,      // 最慢的扩散速度
            startTime: Date.now()
        };

        this.clickEffects.push(mainEffect, secondaryEffect, innerEffect);
    }

    // 更新特效
    updateEffects() {
        const currentTime = Date.now();
        this.clickEffects = this.clickEffects.filter(effect => {
            effect.radius += effect.expandSpeed;
            effect.alpha = Math.max(0, 1 - effect.radius / effect.maxRadius);
            return effect.alpha > 0;
        });
    }

    // 绘制特效
    drawEffects() {
        this.clickEffects.forEach(effect => {
            const color = this.effectColors[effect.type];
            
            // 绘制扩散圆环
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = 4;  // 增加线条宽度
            this.ctx.globalAlpha = effect.alpha;
            
            // 绘制实心圆
            const gradient = this.ctx.createRadialGradient(
                effect.x, effect.y, 0,
                effect.x, effect.y, effect.radius
            );
            gradient.addColorStop(0, `${color}33`);
            gradient.addColorStop(0.6, `${color}11`);
            gradient.addColorStop(1, 'transparent');
            
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
            this.ctx.fill();
            
            // 绘制圆环边缘
            this.ctx.beginPath();
            this.ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
            this.ctx.stroke();
        });
        this.ctx.globalAlpha = 1;
    }

    // 切换暂停状态
    togglePause() {
        if (!this.isPlaying) return;
        
        this.isPaused = !this.isPaused;
        const pauseButton = document.getElementById('pauseButton');
        
        if (this.isPaused) {
            if (this.audioSource) {
                this.audioSource.playbackRate.value = 0;
            }
            pauseButton.textContent = '继续';
        } else {
            if (this.audioSource) {
                this.audioSource.playbackRate.value = 1;
            }
            pauseButton.textContent = '暂停';
            requestAnimationFrame(() => this.gameLoop());
        }
    }

    // 加载音频
    async loadAudio() {
        try {
            this.showLoading();
            console.log('开始加载音频...');
            
            const songSelect = document.getElementById('songSelect');
            const songUrl = 'music/' + songSelect.value;
            console.log('加载音频文件:', songUrl);
            
            const response = await fetch(songUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const arrayBuffer = await response.arrayBuffer();
            console.log('音频文件下完成，开始解码...');
            
            this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.musicDuration = this.audioBuffer.duration * 1000; // 转换为毫秒
            
            console.log('音频解码完成，开始分析节拍...');
            this.analyzeBeats();
            
            console.log('音频加载成功，时长:', this.musicDuration, 'ms');
            this.hideLoading();
            return true;
        } catch (error) {
            console.error('音频加载失败:', error);
            this.showError();
            throw error;
        }
    }

    // 开始游戏
    async startGame() {
        this.showInstructions = false;  // 隐藏说明
        try {
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            if (!this.audioBuffer) {
                await this.loadAudio();
            }
            
            // 重置游戏状态
            this.isPlaying = true;
            this.isPaused = false;
            this.gameEnded = false;
            this.score = 0;
            // 重置分数显示
            this.scoreElement.textContent = '0';
            this.tiles = [];
            this.musicStartTime = Date.now();  // 记录开始时间

            // 启用暂停按钮
            const pauseButton = document.getElementById('pauseButton');
            pauseButton.disabled = false;
            pauseButton.style.opacity = '1';
            pauseButton.style.pointerEvents = 'auto';
            
            // 创建音频源并开始播放
            if (this.audioSource) {
                this.audioSource.stop();
            }
            this.audioSource = this.audioContext.createBufferSource();
            this.audioSource.buffer = this.audioBuffer;
            this.audioSource.connect(this.audioContext.destination);
            this.audioSource.start(0);
            
            // 监听音乐结束
            this.audioSource.onended = () => {
                this.endGame();
            };
            
            // 开始游戏循环
            requestAnimationFrame(() => this.gameLoop());
            
        } catch (error) {
            console.error('游戏启动失败:', error);
            this.showError();
        }
    }

    // 显示加载界面
    showLoading() {
        console.log('显示加载界面');
        if (this.loadingScreen) {
            this.loadingScreen.style.display = 'flex';
        }
        if (this.errorScreen) {
            this.errorScreen.style.display = 'none';
        }
    }

    // 隐藏加载界面
    hideLoading() {
        console.log('隐藏加载界面');
        if (this.loadingScreen) {
            this.loadingScreen.style.display = 'none';
        }
    }

    // 显示错误界面
    showError() {
        console.log('显示错误界面');
        if (this.errorScreen) {
            this.errorScreen.style.display = 'flex';
        }
        if (this.loadingScreen) {
            this.loadingScreen.style.display = 'none';
        }
    }

    // 游戏循环
    gameLoop() {
        if (this.showInstructions) {
            this.drawInstructions();
            requestAnimationFrame(() => this.gameLoop());
            return;
        }
        
        if (!this.isPlaying || this.gameEnded) return;
        if (this.isPaused) {
            requestAnimationFrame(() => this.gameLoop());
            return;
        }
        
        this.update();
        this.draw();
        
        requestAnimationFrame(() => this.gameLoop());
    }

    // 更新游戏状态
    update() {
        if (!this.isPlaying) return;

        // 更新方块位置
        if (this.tiles.length > 0) {
            this.tiles.forEach(row => {
                row.forEach(tile => {
                    tile.y += this.speed;
                });
            });

            // 移除超出屏幕的方块
            if (this.tiles[this.tiles.length - 1][0].y > this.canvas.height) {
                this.tiles.pop();
            }
        }

        // 检查是否需要添加新的方块行
        if (this.tiles.length === 0 || this.tiles[0][0].y >= 0) {
            this.addNewRow();
        }
    }

    // 添加新的方块行
    addNewRow() {
        // 获取当前时间
        const currentTime = this.getCurrentTime();
        
        // 查找下一个节拍
        let nextBeat = null;
        if (this.beats) {
            nextBeat = this.beats.find(beat => beat.time > currentTime);
        }
        
        // 根据节拍决定是否添加黑块
        let blackTileIndex = -1;
        if (nextBeat && nextBeat.time - currentTime < 1000) {  // 如下一个节拍在1秒内
            blackTileIndex = Math.floor(Math.random() * this.tileCount);
        }
        
        const row = [];
        
        // 计算新行的y坐标
        let yPos = -this.tileHeight;
        if (this.tiles.length > 0) {
            yPos = this.tiles[0][0].y - this.tileHeight;
        }
        
        // 创建新行的方块
        for (let i = 0; i < this.tileCount; i++) {
            const tile = {
                isBlack: i === blackTileIndex,
                y: yPos,
                x: i * this.tileWidth,
                id: `tile_${Date.now()}_${i}`
            };
            row.push(tile);
        }
        
        this.tiles.unshift(row);
    }

    // 获取当前时间
    getCurrentTime() {
        if (!this.musicStartTime) {
            return 0;
        }
        return Date.now() - this.musicStartTime;
    }

    // 主绘制方法
    draw() {
        // 清空画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 1. 绘制游戏区域背景
        this.ctx.fillStyle = '#ffffff';  // 白色背景
        this.ctx.fillRect(0, 0, this.gameAreaWidth, this.canvas.height);
        
        // 2. 绘制游戏区域边框
        this.ctx.strokeStyle = '#2a5298';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(0, 0, this.gameAreaWidth, this.canvas.height);
        
        // 3. 绘制方块
        this.tiles.forEach(row => {
            row.forEach((tile, colIndex) => {
                this.ctx.fillStyle = tile.isBlack ? '#000' : '#fff';
                this.ctx.fillRect(
                    colIndex * this.tileWidth,
                    tile.y,
                    this.tileWidth,
                    this.tileHeight
                );
                this.ctx.strokeStyle = '#333';
                this.ctx.strokeRect(
                    colIndex * this.tileWidth,
                    tile.y,
                    this.tileWidth,
                    this.tileHeight
                );
            });
        });

        // 4. 绘制右侧节拍区域
        this.drawBeatArea();
        
        // 5. 绘制最佳点击区域指示线
        const hitZoneY = this.canvas.height - 150;
        const hitZoneHeight = 60;
        
        const gradient = this.ctx.createLinearGradient(0, hitZoneY - 20, 0, hitZoneY + hitZoneHeight + 20);
        gradient.addColorStop(0, 'rgba(255, 255, 0, 0)');
        gradient.addColorStop(0.2, 'rgba(255, 255, 0, 0.2)');
        gradient.addColorStop(0.8, 'rgba(255, 255, 0, 0.2)');
        gradient.addColorStop(1, 'rgba(255, 255, 0, 0)');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, hitZoneY - 20, this.gameAreaWidth, hitZoneHeight + 40);

        // 6. 绘制按键提示
        this.ctx.fillStyle = '#333';
        this.ctx.font = 'bold 32px Arial';
        this.ctx.textAlign = 'center';
        this.keyLabels.forEach((key, index) => {
            this.ctx.fillText(
                key,
                index * this.tileWidth + this.tileWidth/2,
                this.canvas.height - 20
            );
        });

        // 7. 绘制特效
        this.updateEffects();
        this.drawEffects();

        // 如果暂停，显示暂停信息
        if (this.isPaused) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '36px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('已暂停', this.canvas.width / 2, this.canvas.height / 2);
        }
    }

    // 节拍区域绘制方法
    drawBeatArea() {
        const currentTime = this.getCurrentTime();
        const futureTime = currentTime + 2000; // 显示未来2秒的节拍
        
        // 1. 绘制节拍区域背景
        this.ctx.fillStyle = '#2a3f5f';
        this.ctx.fillRect(this.beatAreaX, 0, this.beatAreaWidth, this.canvas.height);
        
        // 2. 绘制标题
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('节奏指示器', this.beatAreaX + this.beatAreaWidth/2, 130);  // 移动标题位置
        
        // 3. 绘制节拍类型图例
        const legendX = this.beatAreaX + 20;
        const legendY = 150;  // 调整图例起始位置
        const types = [
            { type: 'bass', name: '低音', color: '#FF6B6B' },
            { type: 'midLow', name: '中低音', color: '#4ECDC4' },
            { type: 'mid', name: '中音', color: '#45B7D1' },
            { type: 'high', name: '高音', color: '#96CEB4' }
        ];
        
        types.forEach((item, i) => {
            this.ctx.fillStyle = item.color;
            this.ctx.beginPath();
            this.ctx.arc(legendX, legendY + i * 25, 6, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(item.name, legendX + 15, legendY + i * 25 + 4);
        });
        
        // 4. 绘制节拍轨道
        const trackWidth = this.beatAreaWidth - 80;
        const trackX = this.beatAreaX + 40;
        const trackStartY = 150;
        const trackEndY = this.canvas.height - 50;
        
        // 绘制轨道背景和网格线
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.fillRect(trackX, trackStartY, trackWidth, trackEndY - trackStartY);
        
        // 绘制水平网格线
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.lineWidth = 1;
        for (let y = trackStartY; y <= trackEndY; y += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(trackX, y);
            this.ctx.lineTo(trackX + trackWidth, y);
            this.ctx.stroke();
        }
        
        // 5. 绘制节拍点和连线
        if (this.beats) {
            let lastY = null;
            let lastType = null;
            
            this.beats.forEach(beat => {
                if (beat.time > currentTime && beat.time < futureTime) {
                    const progress = 1 - ((beat.time - currentTime) / 2000);
                    const y = trackStartY + progress * (trackEndY - trackStartY);
                    
                    // 设置节拍颜色
                    const color = types.find(t => t.type === beat.type)?.color || '#FFFFFF';
                    
                    // 绘制连接线
                    if (lastY !== null && lastType === beat.type) {
                        this.ctx.strokeStyle = color;
                        this.ctx.lineWidth = 2;
                        this.ctx.globalAlpha = 0.3;
                        this.ctx.beginPath();
                        this.ctx.moveTo(trackX + trackWidth/2, lastY);
                        this.ctx.lineTo(trackX + trackWidth/2, y);
                        this.ctx.stroke();
                        this.ctx.globalAlpha = 1;
                    }
                    
                    // 绘制节拍点
                    this.ctx.fillStyle = color;
                    this.ctx.beginPath();
                    this.ctx.arc(trackX + trackWidth/2, y, 8, 0, Math.PI * 2);
                    this.ctx.fill();
                    
                    // 绘制发光效果
                    const glow = this.ctx.createRadialGradient(
                        trackX + trackWidth/2, y, 0,
                        trackX + trackWidth/2, y, 20
                    );
                    glow.addColorStop(0, color);
                    glow.addColorStop(1, 'rgba(255,255,255,0)');
                    this.ctx.fillStyle = glow;
                    this.ctx.globalAlpha = 0.3;
                    this.ctx.beginPath();
                    this.ctx.arc(trackX + trackWidth/2, y, 20, 0, Math.PI * 2);
                    this.ctx.fill();
                    this.ctx.globalAlpha = 1;
                    
                    // 当节拍进入点击区域时添加动画效果
                    if (y >= trackEndY - 100 && y <= trackEndY - 40) {
                        this.ctx.strokeStyle = color;
                        this.ctx.lineWidth = 3;
                        this.ctx.setLineDash([5, 5]);
                        this.ctx.beginPath();
                        this.ctx.moveTo(trackX, y);
                        this.ctx.lineTo(trackX + trackWidth, y);
                        this.ctx.stroke();
                        this.ctx.setLineDash([]);
                    }
                    
                    lastY = y;
                    lastType = beat.type;
                }
            });
        }
    }

    analyzeBeats() {
        // 获取音频数据
        const audioData = this.audioBuffer.getChannelData(0);
        const sampleRate = this.audioBuffer.sampleRate;
        const audioBufferLength = audioData.length;
        
        // 调整频段范围，主要关注低频
        const frequencyBands = {
            bass: { min: 35, max: 100 },      // 主要低音范围
            midLow: { min: 100, max: 300 },   // 中低音范围
            mid: { min: 300, max: 1500 },     // 中音范围
            high: { min: 1500, max: 4000 }    // 高音范围
        };

        // 分析窗口设置
        const windowSize = Math.floor(sampleRate * 0.05); // 50ms窗口
        const hopSize = Math.floor(windowSize / 2);       // 50%重叠
        const fftSize = 2048;
        
        // 存储所有窗口的能量信息
        const energyFrames = [];
        
        // 对每个时间窗口进行分析
        for(let start = 0; start < audioBufferLength - windowSize; start += hopSize) {
            const windowData = new Float32Array(fftSize);
            for(let i = 0; i < windowSize; i++) {
                const hannWindow = 0.5 * (1 - Math.cos(2 * Math.PI * i / windowSize));
                windowData[i] = audioData[start + i] * hannWindow;
            }
            
            const fft = new FFT(fftSize, sampleRate);
            fft.forward(windowData);
            
            const energies = {
                bass: 0,
                midLow: 0,
                mid: 0,
                high: 0
            };
            
            for(let i = 0; i < fftSize/2; i++) {
                const frequency = i * sampleRate / fftSize;
                const magnitude = Math.sqrt(fft.real[i]**2 + fft.imag[i]**2);
                
                if(frequency >= frequencyBands.bass.min && frequency <= frequencyBands.bass.max) {
                    energies.bass += magnitude;
                } else if(frequency >= frequencyBands.midLow.min && frequency <= frequencyBands.midLow.max) {
                    energies.midLow += magnitude;
                } else if(frequency >= frequencyBands.mid.min && frequency <= frequencyBands.mid.max) {
                    energies.mid += magnitude;
                } else if(frequency >= frequencyBands.high.min && frequency <= frequencyBands.high.max) {
                    energies.high += magnitude;
                }
            }
            
            energyFrames.push({
                time: start / sampleRate * 1000,
                energies
            });
        }

        // 计算整体能量统计
        const globalStats = {
            bass: calculateStats(energyFrames.map(frame => frame.energies.bass)),
            midLow: calculateStats(energyFrames.map(frame => frame.energies.midLow))
        };

        // 节拍检测参数
        const lookAhead = 8;
        const lookBack = 8;
        const minInterval = 300;  // 减小最小间隔
        const mergeWindow = 150;  // 减小合并窗口

        // 降低基础阈值
        const baseThresholds = {
            bass: 1.4,      // 降低低音阈值
            midLow: 1.6     // 降低中低音阈值
        };

        const beats = [];
        const lastBeatTimes = {
            bass: -minInterval,
            midLow: -minInterval
        };

        // 首先检测低音节拍
        for(let i = lookBack; i < energyFrames.length - lookAhead; i++) {
            const current = energyFrames[i];
            const localWindow = energyFrames.slice(i - lookBack, i + lookAhead + 1);
            
            // 只检测低音
            const localAverage = localWindow.reduce((sum, frame) => sum + frame.energies.bass, 0) / localWindow.length;
            const ratio = current.energies.bass / localAverage;
            const globalRatio = current.energies.bass / globalStats.bass.mean;
            
            // 检查是否是显著的局部峰值
            const isPeak = i > 0 && i < energyFrames.length - 1 &&
                         current.energies.bass > energyFrames[i - 1].energies.bass * 1.2 &&
                         current.energies.bass > energyFrames[i + 1].energies.bass * 1.2;
            
            if (isPeak && 
                ratio > baseThresholds.bass &&
                globalRatio > 1.2 &&
                (current.time - lastBeatTimes.bass) >= minInterval) {
                
                beats.push({
                    time: current.time,
                    type: 'bass',
                    strength: ratio * globalRatio
                });
                lastBeatTimes.bass = current.time;
            }
        }

        // 然后检测中低音节拍，��只在没有低音节拍的地方
        for(let i = lookBack; i < energyFrames.length - lookAhead; i++) {
            const current = energyFrames[i];
            
            // 检查是否已经有附近的节拍点
            const hasNearbyBeat = beats.some(beat => 
                Math.abs(beat.time - current.time) < mergeWindow
            );
            
            if (!hasNearbyBeat) {
                const localWindow = energyFrames.slice(i - lookBack, i + lookAhead + 1);
                const localAverage = localWindow.reduce((sum, frame) => sum + frame.energies.midLow, 0) / localWindow.length;
                const ratio = current.energies.midLow / localAverage;
                const globalRatio = current.energies.midLow / globalStats.midLow.mean;
                
                // 检查是否是显著的局部峰值
                const isPeak = i > 0 && i < energyFrames.length - 1 &&
                             current.energies.midLow > energyFrames[i - 1].energies.midLow * 1.2 &&
                             current.energies.midLow > energyFrames[i + 1].energies.midLow * 1.2;
                
                if (isPeak &&
                    ratio > baseThresholds.midLow &&
                    globalRatio > 1.3 &&
                    (current.time - lastBeatTimes.midLow) >= minInterval) {
                    
                    beats.push({
                        time: current.time,
                        type: 'midLow',
                        strength: ratio * globalRatio
                    });
                    lastBeatTimes.midLow = current.time;
                }
            }
        }

        // 按时间排序
        beats.sort((a, b) => a.time - b.time);
        
        // 最后的过滤：移除重复和弱节拍
        const filteredBeats = beats.reduce((acc, beat) => {
            if (acc.length === 0) {
                acc.push(beat);
            } else {
                const lastBeat = acc[acc.length - 1];
                const timeDiff = beat.time - lastBeat.time;
                
                // 放宽过滤规则
                if (timeDiff >= minInterval && (
                    // 降低强度要求
                    (beat.type === 'bass' && beat.strength > 1.8) ||
                    // 降低中低音要求
                    (beat.type === 'midLow' && beat.strength > 2.0 &&
                     !acc.slice(-2).some(b => b.type === 'bass' && Math.abs(b.time - beat.time) < minInterval * 1.5))
                )) {
                    acc.push(beat);
                }
            }
            return acc;
        }, []);
        
        // 保存分析结果
        this.beats = filteredBeats;
        
        console.log('节拍分析结果：', {
            totalBeats: filteredBeats.length,
            beatTypes: {
                bass: filteredBeats.filter(b => b.type === 'bass').length,
                midLow: filteredBeats.filter(b => b.type === 'midLow').length
            }
        });
    }

    // 绘制游戏说明
    drawInstructions() {
        // 设置半透明背景
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 设置文字样式
        this.ctx.fillStyle = '#fff';
        this.ctx.textAlign = 'left';
        this.ctx.font = '24px Arial';
        
        // 标题
        this.ctx.font = 'bold 32px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('游戏说明', this.canvas.width / 2, 80);
        
        // 说明文字
        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'left';
        const instructions = [
            '1. 选择音乐后点击"开始游戏"开始',
            '2. 当拍点到达最点击区域时点击对应列',
            '3. 键盘按键：Q W E R 分别对应 1 2 3 4 ',
            '4. 点击正确 +1 分',
            '5. 音乐结束时游戏结束',
            '6. 点击暂停按钮可以暂停游戏'
        ];
        
        const startY = 150;
        const lineHeight = 40;
        instructions.forEach((text, index) => {
            this.ctx.fillText(text, 100, startY + index * lineHeight);
        });
        
        // 开始提示
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('点击"开始游戏"开始', this.canvas.width / 2, 500);
    }

    // 结束游戏
    endGame() {
        this.isPlaying = false;
        this.gameEnded = true;
        
        // 禁用暂停按钮
        const pauseButton = document.getElementById('pauseButton');
        pauseButton.disabled = true;
        pauseButton.style.opacity = '0.5';
        pauseButton.style.pointerEvents = 'none';
        pauseButton.textContent = '暂停';
        
        if (this.audioSource) {
            this.audioSource.stop();
        }
        
        // 显示游戏结束信息
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '36px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('游戏结束', this.canvas.width / 2, this.canvas.height / 2 - 40);
        
        this.ctx.font = '24px Arial';
        this.ctx.fillText(`终得分: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 10);
        this.ctx.fillText(`最高分: ${this.bestScore}`, this.canvas.width / 2, this.canvas.height / 2 + 50);
        
        // 添加重新开始��示
        this.ctx.font = '20px Arial';
        this.ctx.fillText('点击"开始游戏"重新开始', this.canvas.width / 2, this.canvas.height / 2 + 100);
    }
}

// FFT类 - 用于音频频率分析
class FFT {
    constructor(size, sampleRate) {
        this.size = size;
        this.sampleRate = sampleRate;
        this.real = new Float32Array(size);
        this.imag = new Float32Array(size);
    }
    
    forward(buffer) {
        // 复制输入数据
        this.real.set(buffer);
        this.imag.fill(0);
        
        // 基2 FFT
        const N = this.size;
        for(let i = 0; i < N; i++) {
            let j = 0;
            let k = i;
            for(let n = 1; n < N; n <<= 1) {
                j = (j << 1) | (k & 1);
                k >>= 1;
            }
            if(j > i) {
                [this.real[i], this.real[j]] = [this.real[j], this.real[i]];
                [this.imag[i], this.imag[j]] = [this.imag[j], this.imag[i]];
            }
        }
        
        for(let size = 2; size <= N; size *= 2) {
            const halfsize = size / 2;
            const step = N / size;
            for(let i = 0; i < N; i += size) {
                for(let j = i, k = 0; j < i + halfsize; j++, k += step) {
                    const thetaR = Math.cos(-2 * Math.PI * k / N);
                    const thetaI = Math.sin(-2 * Math.PI * k / N);
                    const tmpR = this.real[j+halfsize] * thetaR - this.imag[j+halfsize] * thetaI;
                    const tmpI = this.real[j+halfsize] * thetaI + this.imag[j+halfsize] * thetaR;
                    this.real[j+halfsize] = this.real[j] - tmpR;
                    this.imag[j+halfsize] = this.imag[j] - tmpI;
                    this.real[j] += tmpR;
                    this.imag[j] += tmpI;
                }
            }
        }
    }
}

// 辅助函数：计算统计信息
function calculateStats(values) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const variability = stdDev / mean;
    
    return {
        mean,
        stdDev,
        variability
    };
}

// 当页面加载完成后初始化游戏
window.onload = () => {
    const game = new Game();
    requestAnimationFrame(() => game.gameLoop());  // 立即开始游戏循环以显示说明
}; 