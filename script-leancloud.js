// LeanCloud 版本的跑步应用
class LeanCloudRunningApp {
    constructor() {
        this.currentUser = null;
        this.runs = [];
        this.events = [];
        this.users = [];
        this.comments = {};
        
        this.init();
    }

    async init() {
        // 先设置事件监听器
        this.setupEventListeners();
        
        // 然后检查登录状态
        await this.checkLoginStatus();
        
        // 最后更新UI
        this.updateUI();
    }

    // 检查登录状态
    async checkLoginStatus() {
        console.log('检查登录状态...');
        
        // 获取当前用户
        this.currentUser = AV.User.current();
        
        if (!this.currentUser) {
            console.log('用户未登录，进行匿名登录...');
            // 匿名登录
            try {
                this.currentUser = await AV.User.loginWithAuthData({}, 'anonymous');
                console.log('匿名登录成功:', this.currentUser.id);
                
                // 设置默认用户名
                const username = `跑友${this.currentUser.id.slice(-4)}`;
                this.currentUser.set('username', username);
                await this.currentUser.save();
                
                console.log('用户名设置成功:', username);
                
            } catch (error) {
                console.error('登录失败:', error);
                alert('登录失败，请刷新页面重试');
                return;
            }
        } else {
            console.log('用户已登录:', this.currentUser.id);
        }
        
        // 加载数据
        await this.loadData();
    }

    // 加载所有数据
    async loadData() {
        console.log('开始加载数据...');
        try {
            await this.loadRuns();
            await this.loadEvents();
            await this.loadUsers();
            await this.updateStats();
            console.log('数据加载完成');
        } catch (error) {
            console.error('加载数据失败:', error);
        }
    }

    // 加载跑步记录
    async loadRuns() {
        try {
            const query = new AV.Query('Run');
            query.include('user'); // 包含用户信息
            query.descending('createdAt');
            query.limit(50);
            this.runs = await query.find();
            console.log('加载跑步记录:', this.runs.length, '条');
            
            this.updateFeed();
            
        } catch (error) {
            console.error('加载跑步记录失败:', error);
            // 如果 Run Class 不存在，先创建一些示例数据
            if (error.code === 101) {
                console.log('Run Class 不存在，将在首次打卡时自动创建');
                this.runs = [];
            }
        }
    }

    // 加载活动数据
    async loadEvents() {
        try {
            const query = new AV.Query('Event');
            this.events = await query.find();
            console.log('加载活动数据:', this.events.length, '个');
            
            if (this.events.length === 0) {
                console.log('没有活动数据，初始化默认活动...');
                await this.initializeDefaultEvents();
            } else {
                this.updateEventsDisplay();
            }
            
        } catch (error) {
            console.error('加载活动数据失败:', error);
            if (error.code === 101) {
                console.log('Event Class 不存在，初始化默认活动...');
                await this.initializeDefaultEvents();
            }
        }
    }

    // 加载用户数据
    async loadUsers() {
        try {
            const query = new AV.Query('_User');
            query.limit(100);
            this.users = await query.find();
            console.log('加载用户数据:', this.users.length, '个');
            
        } catch (error) {
            console.error('加载用户数据失败:', error);
        }
    }

    // 初始化默认活动
    async initializeDefaultEvents() {
        console.log('正在创建默认活动...');
        
        const defaultEvents = [
            {
                title: '周末长距离拉练',
                location: '世纪公园集合',
                time: '每周六 上午 7:00',
                description: '周末长距离训练，适合各种配速的跑友',
                participants: [],
                maxParticipants: 20
            },
            {
                title: '间歇跑训练',
                location: '体育场跑道',
                time: '每周三 晚上 19:30',
                description: '提升速度和耐力的间歇训练',
                participants: [],
                maxParticipants: 15
            }
        ];

        try {
            for (const eventData of defaultEvents) {
                const Event = AV.Object.extend('Event');
                const event = new Event();
                await event.save(eventData);
                console.log('创建活动:', eventData.title);
            }
            
            // 重新加载活动数据
            await this.loadEvents();
            
        } catch (error) {
            console.error('初始化默认活动失败:', error);
        }
    }

    // 事件监听器
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
                    const username = this.currentUser.get('username') || '匿名用户';
                    alert(`当前用户: ${username}\n用户ID: ${this.currentUser.id}\n数据已云端同步到 LeanCloud`);
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
                    console.log('检测到活动报名按钮点击');
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

        try {
            // 计算配速
            const pace = runData.duration / runData.distance;

            // 创建跑步记录
            const Run = AV.Object.extend('Run');
            const run = new Run();
            
            await run.save({
                userId: this.currentUser.id,
                userName: this.currentUser.get('username'),
                date: runData.date,
                distance: runData.distance,
                duration: runData.duration,
                pace: pace,
                feeling: runData.feeling || '',
                user: this.currentUser // 关联用户对象
            });

            console.log('跑步记录保存成功');

            // 更新用户统计
            await this.updateUserStats(runData.distance);

            // 重置表单
            this.resetCheckinForm();

            // 重新加载数据
            await this.loadRuns();
            
            this.showPage('动态');
            alert('打卡成功！数据已保存到 LeanCloud 云端');

        } catch (error) {
            console.error('提交打卡失败:', error);
            alert('打卡失败，请重试。错误: ' + error.message);
        }
    }

    // 更新用户统计
    async updateUserStats(distance) {
        try {
            const currentDistance = this.currentUser.get('totalDistance') || 0;
            const currentRuns = this.currentUser.get('totalRuns') || 0;
            
            this.currentUser.set('totalDistance', currentDistance + distance);
            this.currentUser.set('totalRuns', currentRuns + 1);
            this.currentUser.set('lastActivity', new Date());
            
            await this.currentUser.save();
            console.log('用户统计更新成功');
            
        } catch (error) {
            console.error('更新用户统计失败:', error);
        }
    }

    // 处理活动报名
    async handleEventJoin(button) {
        console.log('处理活动报名...');
        
        if (!this.currentUser) {
            alert('请等待登录完成');
            return;
        }
        
        const eventCard = button.closest('.event-card');
        if (!eventCard) {
            console.error('未找到活动卡片');
            return;
        }
        
        const eventId = eventCard.dataset.eventId;
        console.log('活动ID:', eventId);
        
        const event = this.events.find(e => e.id === eventId);
        if (!event) {
            console.error('未找到活动信息');
            return;
        }
        
        const participants = event.get('participants') || [];
        const isParticipating = participants.includes(this.currentUser.id);
        console.log('用户是否已报名:', isParticipating);
        
        try {
            if (!isParticipating) {
                // 报名
                if (participants.length >= event.get('maxParticipants')) {
                    alert('该活动报名人数已满！');
                    return;
                }
                
                // 更新参与者列表
                participants.push(this.currentUser.id);
                event.set('participants', participants);
                await event.save();
                
                console.log('报名成功');
                alert('报名成功！');
            } else {
                // 取消报名
                const index = participants.indexOf(this.currentUser.id);
                if (index > -1) {
                    participants.splice(index, 1);
                }
                
                event.set('participants', participants);
                await event.save();
                
                console.log('取消报名成功');
                alert('已取消报名！');
            }
            
            // 重新加载活动数据
            await this.loadEvents();
            
        } catch (error) {
            console.error('处理活动报名失败:', error);
            alert('操作失败，请重试。错误: ' + error.message);
        }
    }

    // 更新活动显示
    updateEventsDisplay() {
        const eventsContainer = document.querySelector('.events-container');
        if (!eventsContainer) {
            console.error('未找到活动容器');
            return;
        }
        
        console.log('更新活动显示，活动数量:', this.events.length);
        
        eventsContainer.innerHTML = this.events.map(event => {
            const participants = event.get('participants') || [];
            const isParticipating = this.currentUser ? participants.includes(this.currentUser.id) : false;
            
            // 获取参与者用户名
            const participantNames = participants.map(userId => {
                const user = this.users.find(u => u.id === userId);
                return user ? (user.get('username') || `用户${userId.slice(-4)}`) : `用户${userId.slice(-4)}`;
            }).join('、');
            
            return `
                <div class="event-card" data-event-id="${event.id}">
                    <div class="event-date">
                        <span class="event-day">${event.get('time').split(' ')[0]}</span>
                        <span class="event-time">${event.get('time').split(' ')[1]}</span>
                    </div>
                    <div class="event-info">
                        <h3>${event.get('title')}</h3>
                        <p>📍 ${event.get('location')}</p>
                        <p>${event.get('description')}</p>
                        <p>👥 ${participants.length}/${event.get('maxParticipants')} 人报名</p>
                        <div class="participants-list">
                            ${participants.length > 0 ? `
                                <strong>报名名单：</strong>${participantNames}
                            ` : '暂无报名'}
                        </div>
                    </div>
                    <button class="${isParticipating ? 'btn-primary' : 'btn-secondary'}">
                        ${isParticipating ? '已报名' : '我要报名'}
                    </button>
                </div>
            `;
        }).join('');
        
        console.log('活动显示更新完成');
    }

    // 更新统计数据
    async updateStats() {
        try {
            // 总用户数
            const userQuery = new AV.Query('_User');
            const totalMembers = await userQuery.count();

            // 总跑量和跑步次数
            const runQuery = new AV.Query('Run');
            const runs = await runQuery.find();
            const totalDistance = runs.reduce((sum, run) => sum + run.get('distance'), 0);
            const totalRuns = runs.length;

            // 更新页面显示
            const totalMembersElement = document.getElementById('totalMembers');
            const totalDistanceElement = document.getElementById('totalDistance');
            const totalRunsElement = document.getElementById('totalRuns');
            
            if (totalMembersElement) totalMembersElement.textContent = totalMembers;
            if (totalDistanceElement) totalDistanceElement.textContent = totalDistance.toFixed(1);
            if (totalRunsElement) totalRunsElement.textContent = totalRuns;

            console.log('统计数据更新: 用户数=', totalMembers, '总距离=', totalDistance.toFixed(1), '总次数=', totalRuns);

        } catch (error) {
            console.error('更新统计失败:', error);
        }
    }

    // 页面切换
    showPage(pageName) {
        console.log('切换到页面:', pageName);
        
        // 更新导航激活状态
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${pageName}`) {
                link.classList.add('active');
            }
        });

        // 显示对应页面
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        
        const targetPage = document.getElementById(pageName);
        if (targetPage) {
            targetPage.classList.add('active');
        } else {
            console.error('页面未找到:', pageName);
        }

        // 更新页面特定内容
        switch(pageName) {
            case '动态':
                this.updateFeed();
                break;
            case '排行榜':
                this.showLeaderboard('weekly');
                break;
            case '活动':
                this.updateEventsDisplay();
                break;
            case 'home':
                this.updateStats();
                break;
        }
    }

    // 更新动态流
    updateFeed() {
        const feedContainer = document.getElementById('runFeed');
        if (!feedContainer) {
            console.error('未找到动态流容器');
            return;
        }
        
        if (!this.runs || this.runs.length === 0) {
            feedContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-running fa-3x"></i>
                    <p>还没有打卡记录，快去完成第一次跑步吧！</p>
                </div>
            `;
            return;
        }

        console.log('更新动态流，记录数量:', this.runs.length);
        
        feedContainer.innerHTML = this.runs.map(run => {
            const createdAt = run.createdAt || new Date();
            return `
                <div class="run-card" data-run-id="${run.id}">
                    <div class="run-header">
                        <div class="run-user">
                            <i class="fas fa-user-circle"></i>
                            ${run.get('userName')}
                        </div>
                        <div class="run-date">
                            ${new Date(createdAt).toLocaleDateString('zh-CN')}
                        </div>
                    </div>
                    <div class="run-stats">
                        <div class="stat-item">
                            <div class="stat-value">${run.get('distance')}km</div>
                            <div class="stat-label">距离</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${run.get('duration')}分钟</div>
                            <div class="stat-label">时长</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${run.get('pace').toFixed(2)}/km</div>
                            <div class="stat-label">配速</div>
                        </div>
                    </div>
                    ${run.get('feeling') ? `
                        <div class="run-feeling">
                            <strong>跑步感受：</strong>${run.get('feeling')}
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
        
        // 更新标签按钮状态
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');

        let startDate;
        const now = new Date();

        switch(type) {
            case 'weekly':
                startDate = new Date(now.setDate(now.getDate() - 7));
                break;
            case 'monthly':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'total':
                startDate = new Date(0);
                break;
        }

        try {
            const query = new AV.Query('Run');
            if (type !== 'total') {
                query.greaterThanOrEqualTo('createdAt', startDate);
            }
            
            const runs = await query.find();
            console.log('排行榜查询结果:', runs.length, '条记录');
            
            // 计算用户跑量
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

            // 转换为数组并排序
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

    // UI更新
    updateUI() {
        if (this.currentUser) {
            const username = this.currentUser.get('username') || '匿名用户';
            document.getElementById('userName').textContent = username;
            document.getElementById('loginBtn').textContent = '用户信息';
        } else {
            document.getElementById('userName').textContent = '加载中...';
            document.getElementById('loginBtn').textContent = '登录';
        }
        
        console.log('UI更新完成');
    }

    // 计算配速
    calculatePace() {
        const distance = parseFloat(document.getElementById('runDistance').value);
        const duration = parseFloat(document.getElementById('runDuration').value);

        if (distance && duration) {
            const pace = duration / distance;
            document.getElementById('runPace').value = pace.toFixed(2);
        }
    }

    // 照片预览
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

    // 重置表单
    resetCheckinForm() {
        document.getElementById('runDistance').value = '';
        document.getElementById('runDuration').value = '';
        document.getElementById('runPace').value = '';
        document.getElementById('runFeeling').value = '';
        document.getElementById('runPhoto').value = '';
        document.getElementById('photoPreview').innerHTML = '';
        document.getElementById('runDate').valueAsDate = new Date();
    }

    // 处理点赞
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

    // 处理评论
    handleComment(button) {
        if (!this.currentUser) {
            alert('请等待登录完成');
            return;
        }
        
        const comment = prompt('请输入你的评论：');
        if (comment && comment.trim()) {
            alert('评论发表成功！');
            // 在实际应用中，这里应该将评论保存到 LeanCloud
        }
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM 加载完成，初始化跑步应用...');
    window.runningApp = new LeanCloudRunningApp();
});

// 添加错误处理
window.addEventListener('error', (event) => {
    console.error('全局错误:', event.error);
});