// LeanCloud 版本的跑步应用（修复版）
class LeanCloudRunningApp {
    constructor() {
        this.currentUser = null;
        this.runs = [];
        this.events = [];
        this.users = [];
        this.comments = {};
        this.isLoggingIn = false;
        this.useLocalStorage = false;
        
        // 立即设置事件监听器
        this.setupEventListeners();
        
        // 然后初始化应用
        this.init();
    }

    async init() {
        console.log('初始化应用...');
        
        // 显示加载状态
        this.showLoadingState();
        
        // 检查登录状态
        await this.checkLoginStatus();
    }

    // 显示加载状态
    showLoadingState() {
        const userNameElement = document.getElementById('userName');
        const loginBtnElement = document.getElementById('loginBtn');
        
        if (userNameElement) userNameElement.textContent = '登录中...';
        if (loginBtnElement) loginBtnElement.textContent = '登录中';
    }

    // 检查登录状态
    async checkLoginStatus() {
        console.log('检查登录状态...');
        
        try {
            // 检查 LeanCloud 是否可用
            if (typeof AV === 'undefined') {
                console.warn('LeanCloud SDK 未加载，使用本地存储模式');
                this.useLocalStorage = true;
                await this.checkLocalLoginStatus();
                return;
            }
            
            // LeanCloud 模式
            this.currentUser = AV.User.current();
            console.log('当前用户状态:', this.currentUser ? '已登录' : '未登录');
            
            if (!this.currentUser) {
                console.log('用户未登录，进行匿名登录...');
                this.isLoggingIn = true;
                
                this.currentUser = await AV.User.loginWithAuthData({}, 'anonymous');
                console.log('匿名登录成功:', this.currentUser.id);
                
                const username = `跑友${this.currentUser.id.slice(-4)}`;
                this.currentUser.set('username', username);
                await this.currentUser.save();
                
                console.log('用户名设置成功:', username);
                this.isLoggingIn = false;
            }
            
            this.updateUI();
            await this.loadData();
            
        } catch (error) {
            console.error('登录失败:', error);
            this.isLoggingIn = false;
            this.useLocalStorage = true;
            await this.checkLocalLoginStatus();
        }
    }

    // 本地存储登录检查
    async checkLocalLoginStatus() {
        console.log('使用本地存储模式');
        
        const localUser = localStorage.getItem('localUser');
        if (localUser) {
            this.currentUser = JSON.parse(localUser);
            console.log('本地用户已登录:', this.currentUser.username);
        } else {
            this.currentUser = {
                id: 'local_' + Date.now(),
                username: '跑友' + Math.random().toString(36).substr(2, 4),
                isLocal: true
            };
            localStorage.setItem('localUser', JSON.stringify(this.currentUser));
            console.log('创建本地用户:', this.currentUser.username);
        }
        
        this.updateUI();
        await this.loadData();
    }

    // 更新UI
    updateUI() {
        const userNameElement = document.getElementById('userName');
        const loginBtnElement = document.getElementById('loginBtn');
        
        if (!userNameElement || !loginBtnElement) return;
        
        if (this.currentUser) {
            const username = this.currentUser.username || this.currentUser.get?.('username') || '匿名用户';
            const mode = this.useLocalStorage ? ' (本地模式)' : ' (云端)';
            
            userNameElement.textContent = username + mode;
            loginBtnElement.textContent = '用户信息';
        } else if (this.isLoggingIn) {
            userNameElement.textContent = '登录中...';
            loginBtnElement.textContent = '登录中';
        } else {
            userNameElement.textContent = '未登录';
            loginBtnElement.textContent = '登录';
        }
    }

    // 事件监听器 - 修复为同步函数
    setupEventListeners() {
        console.log('设置事件监听器...');
        
        // 导航点击事件
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = e.target.getAttribute('href').substring(1);
                this.showPage(target);
            });
        });

        // 首页开始打卡按钮
        const startCheckinBtn = document.getElementById('startCheckinBtn');
        if (startCheckinBtn) {
            startCheckinBtn.addEventListener('click', () => {
                this.showPage('打卡');
            });
        }

        // 用户信息按钮
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                if (this.currentUser) {
                    const mode = this.useLocalStorage ? '本地存储模式' : 'LeanCloud 云端模式';
                    const username = this.currentUser.username || this.currentUser.get?.('username') || '匿名用户';
                    alert(`当前用户: ${username}\n模式: ${mode}\n用户ID: ${this.currentUser.id}`);
                }
            });
        }

        // 打卡表单
        const submitCheckinBtn = document.getElementById('submitCheckin');
        if (submitCheckinBtn) {
            submitCheckinBtn.addEventListener('click', () => this.submitCheckin());
        }
        
        // 自动计算配速
        const runDistance = document.getElementById('runDistance');
        const runDuration = document.getElementById('runDuration');
        if (runDistance && runDuration) {
            runDistance.addEventListener('input', () => this.calculatePace());
            runDuration.addEventListener('input', () => this.calculatePace());
        }

        // 照片预览
        const runPhoto = document.getElementById('runPhoto');
        if (runPhoto) {
            runPhoto.addEventListener('change', (e) => this.previewPhoto(e));
        }

        // 排行榜标签按钮
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.target.textContent.includes('本周') ? 'weekly' : 
                            e.target.textContent.includes('本月') ? 'monthly' : 'total';
                this.showLeaderboard(type);
            });
        });

        // 动态栏点赞和评论按钮的事件委托
        const runFeed = document.getElementById('runFeed');
        if (runFeed) {
            runFeed.addEventListener('click', (e) => {
                if (e.target.closest('.action-btn')) {
                    const button = e.target.closest('.action-btn');
                    if (button.innerHTML.includes('fa-heart')) {
                        this.handleLike(button);
                    } else if (button.innerHTML.includes('fa-comment')) {
                        this.handleComment(button);
                    }
                }
            });
        }

        // 活动报名按钮的事件委托
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-secondary') || e.target.classList.contains('btn-primary')) {
                const button = e.target;
                if (button.textContent === '我要报名' || button.textContent === '已报名') {
                    this.handleEventJoin(button);
                }
            }
        });

        // 设置默认日期为今天
        const runDate = document.getElementById('runDate');
        if (runDate) {
            runDate.valueAsDate = new Date();
        }

        console.log('事件监听器设置完成');
    }

    // 提交打卡
    async submitCheckin() {
        console.log('开始提交打卡...');
        
        if (!this.currentUser) {
            alert('请等待登录完成');
            return;
        }

        const runData = {
            date: document.getElementById('runDate').value,
            distance: parseFloat(document.getElementById('runDistance').value),
            duration: parseFloat(document.getElementById('runDuration').value),
            feeling: document.getElementById('runFeeling').value
        };

        if (!runData.date || !runData.distance || !runData.duration) {
            alert('请填写完整的跑步信息');
            return;
        }

        const submitButton = document.getElementById('submitCheckin');
        const originalText = submitButton.textContent;
        submitButton.textContent = '提交中...';
        submitButton.disabled = true;

        try {
            if (this.useLocalStorage) {
                await this.submitCheckinLocal(runData);
            } else {
                await this.submitCheckinCloud(runData);
            }
            
            this.resetCheckinForm();
            this.showPage('动态');
            alert('打卡成功！' + (this.useLocalStorage ? '数据保存在本地' : '数据已保存到云端'));

        } catch (error) {
            console.error('提交打卡失败:', error);
            alert('打卡失败: ' + error.message);
        } finally {
            submitButton.textContent = originalText;
            submitButton.disabled = false;
        }
    }

    // 云端提交
    async submitCheckinCloud(runData) {
        const pace = runData.duration / runData.distance;

        const Run = AV.Object.extend('Run');
        const run = new Run();
        
        await run.save({
            userId: this.currentUser.id,
            userName: this.currentUser.get('username'),
            date: runData.date,
            distance: runData.distance,
            duration: runData.duration,
            pace: pace,
            feeling: runData.feeling || ''
        });

        console.log('云端跑步记录保存成功');
        await this.loadRuns();
    }

    // 本地提交
    async submitCheckinLocal(runData) {
        const pace = runData.duration / runData.distance;
        
        const runRecord = {
            id: 'local_' + Date.now(),
            userId: this.currentUser.id,
            userName: this.currentUser.username,
            date: runData.date,
            distance: runData.distance,
            duration: runData.duration,
            pace: pace,
            feeling: runData.feeling || '',
            timestamp: new Date().toISOString()
        };

        const localRuns = JSON.parse(localStorage.getItem('localRuns') || '[]');
        localRuns.push(runRecord);
        
        try {
            localStorage.setItem('localRuns', JSON.stringify(localRuns));
            this.runs = localRuns;
            console.log('本地跑步记录保存成功');
        } catch (error) {
            throw new Error('本地存储空间不足，请清理浏览器数据');
        }
        
        this.updateFeed();
    }

    // 加载数据
    async loadData() {
        console.log('开始加载数据...');
        try {
            await this.loadRuns();
            await this.updateStats();
            console.log('数据加载完成');
        } catch (error) {
            console.error('加载数据失败:', error);
        }
    }

    // 加载跑步记录
    async loadRuns() {
        if (this.useLocalStorage) {
            const localRuns = JSON.parse(localStorage.getItem('localRuns') || '[]');
            this.runs = localRuns.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            console.log('加载本地跑步记录:', this.runs.length, '条');
        } else {
            try {
                const query = new AV.Query('Run');
                query.descending('createdAt');
                query.limit(50);
                this.runs = await query.find();
                console.log('加载云端跑步记录:', this.runs.length, '条');
            } catch (error) {
                console.error('加载云端跑步记录失败，切换到本地模式:', error);
                this.useLocalStorage = true;
                await this.loadRuns();
                return;
            }
        }
        
        this.updateFeed();
    }

    // 更新统计数据
    async updateStats() {
        try {
            let totalMembers = 1;
            let totalDistance = 0;
            let totalRuns = this.runs.length;

            if (!this.useLocalStorage) {
                try {
                    const userQuery = new AV.Query('_User');
                    totalMembers = await userQuery.count();
                } catch (error) {
                    console.error('获取用户数失败:', error);
                }
            }

            totalDistance = this.runs.reduce((sum, run) => {
                return sum + (run.get?.('distance') || run.distance);
            }, 0);

            const totalMembersElement = document.getElementById('totalMembers');
            const totalDistanceElement = document.getElementById('totalDistance');
            const totalRunsElement = document.getElementById('totalRuns');
            
            if (totalMembersElement) totalMembersElement.textContent = totalMembers;
            if (totalDistanceElement) totalDistanceElement.textContent = totalDistance.toFixed(1);
            if (totalRunsElement) totalRunsElement.textContent = totalRuns;

        } catch (error) {
            console.error('更新统计失败:', error);
        }
    }

    // 页面切换
    showPage(pageName) {
        console.log('切换到页面:', pageName);
        
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${pageName}`) {
                link.classList.add('active');
            }
        });

        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        
        const targetPage = document.getElementById(pageName);
        if (targetPage) {
            targetPage.classList.add('active');
        }

        switch(pageName) {
            case '动态':
                this.updateFeed();
                break;
            case '排行榜':
                this.showLeaderboard('weekly');
                break;
            case '活动':
                if (!this.useLocalStorage) {
                    this.updateEventsDisplay();
                } else {
                    alert('活动功能需要云端支持，当前为本地存储模式');
                }
                break;
            case 'home':
                this.updateStats();
                break;
        }
    }

    // 更新动态流
    updateFeed() {
        const feedContainer = document.getElementById('runFeed');
        if (!feedContainer) return;
        
        if (!this.runs || this.runs.length === 0) {
            feedContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-running fa-3x"></i>
                    <p>还没有打卡记录，快去完成第一次跑步吧！</p>
                </div>
            `;
            return;
        }

        feedContainer.innerHTML = this.runs.map(run => {
            const createdAt = run.createdAt || run.timestamp || new Date();
            const userName = run.get?.('userName') || run.userName;
            const distance = run.get?.('distance') || run.distance;
            const duration = run.get?.('duration') || run.duration;
            const pace = run.get?.('pace') || run.pace;
            const feeling = run.get?.('feeling') || run.feeling;
            
            return `
                <div class="run-card" data-run-id="${run.id}">
                    <div class="run-header">
                        <div class="run-user">
                            <i class="fas fa-user-circle"></i>
                            ${userName}
                        </div>
                        <div class="run-date">
                            ${new Date(createdAt).toLocaleDateString('zh-CN')}
                        </div>
                    </div>
                    <div class="run-stats">
                        <div class="stat-item">
                            <div class="stat-value">${distance}km</div>
                            <div class="stat-label">距离</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${duration}分钟</div>
                            <div class="stat-label">时长</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${pace.toFixed(2)}/km</div>
                            <div class="stat-label">配速</div>
                        </div>
                    </div>
                    ${feeling ? `
                        <div class="run-feeling">
                            <strong>跑步感受：</strong>${feeling}
                        </div>
                    ` : ''}
                    <div class="run-actions">
                        <button class="action-btn">
                            <i class="far fa-heart"></i> 点赞
                        </button>
                        <button class="action-btn">
                            <i class="far fa-comment"></i> 评论
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // 排行榜更新
    async showLeaderboard(type) {
        console.log('更新排行榜:', type);
        
        if (this.useLocalStorage) {
            const leaderboardContainer = document.querySelector('.leaderboard-container');
            if (leaderboardContainer) {
                leaderboardContainer.innerHTML = `
                    <div class="leaderboard">
                        <div class="empty-state">
                            <p>排行榜功能需要云端支持</p>
                            <p>当前为本地存储模式</p>
                        </div>
                    </div>
                `;
            }
            return;
        }
        
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');

        try {
            const query = new AV.Query('Run');
            const runs = await query.find();
            
            const userStats = {};
            runs.forEach(run => {
                const userId = run.get('userId');
                const userName = run.get('userName');
                if (!userStats[userId]) {
                    userStats[userId] = {
                        name: userName,
                        distance: 0,
                        runs: 0
                    };
                }
                userStats[userId].distance += run.get('distance');
                userStats[userId].runs += 1;
            });

            const leaderboardData = Object.values(userStats)
                .sort((a, b) => b.distance - a.distance)
                .slice(0, 10);

            const leaderboardContainer = document.querySelector('.leaderboard-container');
            if (leaderboardContainer) {
                leaderboardContainer.innerHTML = `
                    <div class="leaderboard" id="${type}Leaderboard">
                        ${leaderboardData.length > 0 ? leaderboardData.map((user, index) => `
                            <div class="leaderboard-item">
                                <div class="rank rank-${index + 1}">${index + 1}</div>
                                <div class="user-info">
                                    <div class="user-name">${user.name}</div>
                                    <div class="user-stats">${user.runs}次跑步</div>
                                </div>
                                <div class="distance">${user.distance.toFixed(1)}km</div>
                            </div>
                        `).join('') : `
                            <div class="empty-state">
                                <p>暂无数据</p>
                            </div>
                        `}
                    </div>
                `;
            }

        } catch (error) {
            console.error('加载排行榜失败:', error);
        }
    }

    // 活动报名
    async handleEventJoin(button) {
        if (this.useLocalStorage) {
            alert('活动报名功能需要云端支持，当前为本地存储模式');
            return;
        }
        
        alert('活动报名功能需要配置活动数据，当前为演示模式');
    }

    // 更新活动显示
    updateEventsDisplay() {
        const eventsContainer = document.querySelector('.events-container');
        if (!eventsContainer) return;
        
        eventsContainer.innerHTML = `
            <div class="empty-state">
                <p>活动功能需要配置活动数据</p>
                <p>请联系管理员设置活动信息</p>
            </div>
        `;
    }

    // 其他辅助方法
    calculatePace() {
        const distance = parseFloat(document.getElementById('runDistance').value);
        const duration = parseFloat(document.getElementById('runDuration').value);

        if (distance && duration) {
            const pace = duration / distance;
            document.getElementById('runPace').value = pace.toFixed(2);
        }
    }

    previewPhoto(event) {
        const file = event.target.files[0];
        const preview = document.getElementById('photoPreview');
        
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                preview.innerHTML = `<img src="${e.target.result}" alt="跑步照片">`;
            };
            reader.readAsDataURL(file);
        }
    }

    resetCheckinForm() {
        document.getElementById('runDistance').value = '';
        document.getElementById('runDuration').value = '';
        document.getElementById('runPace').value = '';
        document.getElementById('runFeeling').value = '';
        document.getElementById('runPhoto').value = '';
        document.getElementById('photoPreview').innerHTML = '';
        document.getElementById('runDate').valueAsDate = new Date();
    }

    handleLike(button) {
        if (!this.currentUser) {
            alert('请等待登录完成');
            return;
        }
        
        const icon = button.querySelector('i');
        if (icon.classList.contains('far')) {
            icon.classList.remove('far');
            icon.classList.add('fas');
            button.innerHTML = '<i class="fas fa-heart"></i> 已点赞';
            button.style.color = '#e74c3c';
        } else {
            icon.classList.remove('fas');
            icon.classList.add('far');
            button.innerHTML = '<i class="far fa-heart"></i> 点赞';
            button.style.color = '';
        }
    }

    handleComment(button) {
        if (!this.currentUser) {
            alert('请等待登录完成');
            return;
        }
        
        const comment = prompt('请输入你的评论：');
        if (comment && comment.trim()) {
            alert('评论发表成功！');
        }
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM 加载完成，初始化跑步应用...');
    window.runningApp = new LeanCloudRunningApp();
});