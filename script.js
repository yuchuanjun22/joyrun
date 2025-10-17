// 数据管理
class RunningApp {
    constructor() {
        this.users = JSON.parse(localStorage.getItem('runningUsers')) || [];
        this.runs = JSON.parse(localStorage.getItem('runningData')) || [];
        this.currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
        this.comments = JSON.parse(localStorage.getItem('runningComments')) || {};
        
        // 活动数据初始化
        const storedEvents = localStorage.getItem('runningEvents');
        if (storedEvents) {
            this.events = JSON.parse(storedEvents);
        } else {
            this.events = {
                event1: {
                    id: 'event1',
                    title: '周末长距离拉练',
                    location: '世纪公园集合',
                    time: '每周六 上午 7:00',
                    description: '周末长距离训练，适合各种配速的跑友',
                    participants: [],
                    maxParticipants: 20
                },
                event2: {
                    id: 'event2',
                    title: '间歇跑训练',
                    location: '体育场跑道',
                    time: '每周三 晚上 19:30',
                    description: '提升速度和耐力的间歇训练',
                    participants: [],
                    maxParticipants: 15
                }
            };
            this.saveEvents();
        }
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateUI();
        this.checkLoginStatus();
    }

    // 事件监听器设置
    setupEventListeners() {
        console.log('设置事件监听器'); // 调试信息
        
        // 导航点击事件
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = e.target.getAttribute('href').substring(1);
                this.showPage(target);
            });
        });

        // 首页开始打卡按钮
        document.getElementById('startCheckinBtn').addEventListener('click', () => {
            this.showPage('打卡');
        });

        // 登录相关
        document.getElementById('loginBtn').addEventListener('click', () => this.showLoginModal());
        document.getElementById('confirmLogin').addEventListener('click', () => this.handleLogin());
        document.querySelector('.close').addEventListener('click', () => this.hideLoginModal());

        // 打卡表单
        document.getElementById('submitCheckin').addEventListener('click', () => this.submitCheckin());
        
        // 自动计算配速
        document.getElementById('runDistance').addEventListener('input', () => this.calculatePace());
        document.getElementById('runDuration').addEventListener('input', () => this.calculatePace());

        // 照片预览
        document.getElementById('runPhoto').addEventListener('change', (e) => this.previewPhoto(e));

        // 排行榜标签按钮
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.target.textContent.includes('本周') ? 'weekly' : 
                            e.target.textContent.includes('本月') ? 'monthly' : 'total';
                this.showLeaderboard(type);
            });
        });

        // 动态栏点赞和评论按钮的事件委托
        document.getElementById('runFeed').addEventListener('click', (e) => {
            if (e.target.closest('.action-btn')) {
                const button = e.target.closest('.action-btn');
                if (button.innerHTML.includes('fa-heart')) {
                    this.handleLike(button);
                } else if (button.innerHTML.includes('fa-comment')) {
                    this.handleComment(button);
                }
            }
        });

        // 活动报名按钮的事件委托 - 最简版本
        document.addEventListener('click', (e) => {
            const target = e.target;
            
            // 直接检查按钮文本
            if (target.textContent && (target.textContent.includes('我要报名') || target.textContent.includes('已报名'))) {
                console.log('活动报名按钮被点击了！', target.textContent); // 重要调试信息
                e.preventDefault();
                e.stopPropagation();
                this.handleEventJoin(target);
            }
        });

        // 点击模态框外部关闭
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('loginModal');
            if (e.target === modal) {
                this.hideLoginModal();
            }
        });

        // 设置默认日期为今天
        document.getElementById('runDate').valueAsDate = new Date();
        
        console.log('事件监听器设置完成'); // 调试信息
    }

    // 处理活动报名 - 简化版本
    handleEventJoin(button) {
        console.log('=== 开始处理活动报名 ==='); // 调试信息
        
        if (!this.currentUser) {
            console.log('用户未登录'); // 调试信息
            alert('请先登录');
            this.showLoginModal();
            return;
        }
        
        console.log('当前用户:', this.currentUser.name); // 调试信息
        
        // 找到活动卡片
        const eventCard = button.closest('.event-card');
        if (!eventCard) {
            console.error('未找到活动卡片');
            alert('系统错误：未找到活动信息');
            return;
        }
        
        // 获取活动ID
        const eventId = eventCard.dataset.eventId;
        console.log('活动ID:', eventId); // 调试信息
        
        if (!eventId || !this.events[eventId]) {
            console.error('未找到活动信息:', eventId);
            alert('系统错误：活动信息不存在');
            return;
        }
        
        const event = this.events[eventId];
        console.log('活动标题:', event.title); // 调试信息
        
        // 检查用户是否已经报名
        const isParticipating = event.participants.includes(this.currentUser.id);
        console.log('用户是否已报名:', isParticipating); // 调试信息
        
        if (!isParticipating) {
            // 报名
            if (event.participants.length >= event.maxParticipants) {
                alert('该活动报名人数已满！');
                return;
            }
            
            event.participants.push(this.currentUser.id);
            console.log('报名成功'); // 调试信息
            
            // 立即更新按钮状态
            button.textContent = '已报名';
            button.className = 'btn-primary';
            
            alert('报名成功！');
        } else {
            // 取消报名
            const index = event.participants.indexOf(this.currentUser.id);
            if (index > -1) {
                event.participants.splice(index, 1);
            }
            console.log('取消报名'); // 调试信息
            
            // 立即更新按钮状态
            button.textContent = '我要报名';
            button.className = 'btn-secondary';
            
            alert('已取消报名！');
        }
        
        // 保存数据
        this.saveEvents();
        
        // 更新显示（但保持当前按钮状态）
        this.updateEventsDisplay();
        
        console.log('=== 活动报名处理完成 ==='); // 调试信息
    }

    // 更新活动显示
    updateEventsDisplay() {
        const eventsContainer = document.querySelector('.events-container');
        if (!eventsContainer) {
            console.error('未找到活动容器');
            return;
        }
        
        console.log('更新活动显示'); // 调试信息
        
        eventsContainer.innerHTML = Object.values(this.events).map(event => {
            const isParticipating = this.currentUser ? event.participants.includes(this.currentUser.id) : false;
            const participantNames = event.participants.map(userId => {
                const user = this.users.find(u => u.id === userId);
                return user ? user.name : '未知用户';
            }).join('、');
            
            return `
                <div class="event-card" data-event-id="${event.id}">
                    <div class="event-date">
                        <span class="event-day">${event.time.split(' ')[0]}</span>
                        <span class="event-time">${event.time.split(' ')[1]}</span>
                    </div>
                    <div class="event-info">
                        <h3>${event.title}</h3>
                        <p>📍 ${event.location}</p>
                        <p>${event.description}</p>
                        <p>👥 ${event.participants.length}/${event.maxParticipants} 人报名</p>
                        <div class="participants-list">
                            ${event.participants.length > 0 ? `
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
        
        console.log('活动显示更新完成'); // 调试信息
    }

    // 保存活动数据
    saveEvents() {
        localStorage.setItem('runningEvents', JSON.stringify(this.events));
        console.log('活动数据已保存'); // 调试信息
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

    // 登录处理
    showLoginModal() {
        document.getElementById('loginModal').style.display = 'block';
    }

    hideLoginModal() {
        document.getElementById('loginModal').style.display = 'none';
    }

    handleLogin() {
        const username = document.getElementById('username').value.trim();
        if (!username) {
            alert('请输入昵称');
            return;
        }

        // 查找或创建用户
        let user = this.users.find(u => u.name === username);
        if (!user) {
            user = {
                id: Date.now().toString(),
                name: username,
                joinDate: new Date().toISOString(),
                totalDistance: 0,
                totalRuns: 0
            };
            this.users.push(user);
            this.saveUsers();
        }

        this.currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
        
        this.updateUI();
        this.hideLoginModal();
        document.getElementById('username').value = '';
        
        // 登录后刷新活动显示
        this.updateEventsDisplay();
    }

    checkLoginStatus() {
        if (this.currentUser) {
            this.updateUI();
        } else {
            this.showLoginModal();
        }
    }

    // 其余方法保持不变...
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

    submitCheckin() {
        if (!this.currentUser) {
            alert('请先登录');
            this.showLoginModal();
            return;
        }

        const runData = {
            date: document.getElementById('runDate').value,
            distance: parseFloat(document.getElementById('runDistance').value),
            duration: parseFloat(document.getElementById('runDuration').value),
            feeling: document.getElementById('runFeeling').value,
            photo: document.getElementById('photoPreview').querySelector('img')?.src || null
        };

        if (!runData.date || !runData.distance || !runData.duration) {
            alert('请填写完整的跑步信息');
            return;
        }

        const runRecord = {
            id: Date.now().toString(),
            userId: this.currentUser.id,
            userName: this.currentUser.name,
            ...runData,
            pace: runData.duration / runData.distance,
            timestamp: new Date().toISOString()
        };

        this.runs.push(runRecord);
        this.saveRuns();

        // 更新用户统计数据
        this.updateUserStats(runRecord);

        // 重置表单
        this.resetCheckinForm();

        // 更新UI
        this.updateStats();
        this.showPage('动态');
        
        alert('打卡成功！');
    }

    updateUserStats(runRecord) {
        const user = this.users.find(u => u.id === this.currentUser.id);
        if (user) {
            user.totalDistance = (user.totalDistance || 0) + runRecord.distance;
            user.totalRuns = (user.totalRuns || 0) + 1;
            this.saveUsers();
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

    // 动态流更新
    updateFeed() {
        const feedContainer = document.getElementById('runFeed');
        
        if (this.runs.length === 0) {
            feedContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-running fa-3x"></i>
                    <p>还没有打卡记录，快去完成第一次跑步吧！</p>
                </div>
            `;
            return;
        }

        // 按时间倒序排列
        const sortedRuns = [...this.runs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        feedContainer.innerHTML = sortedRuns.map(run => {
            const runComments = this.comments[run.id] || [];
            return `
                <div class="run-card" data-run-id="${run.id}">
                    <div class="run-header">
                        <div class="run-user">
                            <i class="fas fa-user-circle"></i>
                            ${run.userName}
                        </div>
                        <div class="run-date">
                            ${new Date(run.timestamp).toLocaleDateString('zh-CN')}
                        </div>
                    </div>
                    <div class="run-stats">
                        <div class="stat-item">
                            <div class="stat-value">${run.distance}km</div>
                            <div class="stat-label">距离</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${run.duration}分钟</div>
                            <div class="stat-label">时长</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${run.pace.toFixed(2)}/km</div>
                            <div class="stat-label">配速</div>
                        </div>
                    </div>
                    ${run.feeling ? `
                        <div class="run-feeling">
                            <strong>跑步感受：</strong>${run.feeling}
                        </div>
                    ` : ''}
                    ${run.photo ? `
                        <div class="run-photo">
                            <img src="${run.photo}" alt="跑步照片">
                        </div>
                    ` : ''}
                    
                    <!-- 评论区域 -->
                    <div class="comments-section">
                        ${runComments.length > 0 ? `
                            <div class="comments-list">
                                <strong>评论：</strong>
                                ${runComments.map(comment => `
                                    <div class="comment-item">
                                        <span class="comment-author">${comment.userName}：</span>
                                        <span class="comment-text">${comment.text}</span>
                                        <span class="comment-time">${new Date(comment.timestamp).toLocaleTimeString('zh-CN', {hour: '2-digit', minute:'2-digit'})}</span>
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                    
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
    showLeaderboard(type) {
        // 更新标签按钮状态
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        
        // 找到对应的按钮并激活
        let targetButton;
        if (type === 'weekly') {
            targetButton = document.querySelector('.tab-btn:nth-child(1)');
        } else if (type === 'monthly') {
            targetButton = document.querySelector('.tab-btn:nth-child(2)');
        } else {
            targetButton = document.querySelector('.tab-btn:nth-child(3)');
        }
        
        if (targetButton) {
            targetButton.classList.add('active');
        }

        const now = new Date();
        let startDate;

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

        // 计算用户跑量
        const userStats = {};
        this.runs.forEach(run => {
            const runDate = new Date(run.timestamp);
            if (runDate >= startDate) {
                if (!userStats[run.userId]) {
                    userStats[run.userId] = {
                        name: run.userName,
                        distance: 0,
                        runs: 0
                    };
                }
                userStats[run.userId].distance += run.distance;
                userStats[run.userId].runs += 1;
            }
        });

        // 转换为数组并排序
        const leaderboardData = Object.values(userStats)
            .sort((a, b) => b.distance - a.distance)
            .slice(0, 10);

        const leaderboardContainer = document.querySelector('.leaderboard-container');
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

    // 统计数据更新
    updateStats() {
        const totalMembers = this.users.length;
        const totalDistance = this.runs.reduce((sum, run) => sum + run.distance, 0);
        const totalRuns = this.runs.length;

        document.getElementById('totalMembers').textContent = totalMembers;
        document.getElementById('totalDistance').textContent = totalDistance.toFixed(1);
        document.getElementById('totalRuns').textContent = totalRuns;
    }

    // UI更新
    updateUI() {
        if (this.currentUser) {
            document.getElementById('userName').textContent = this.currentUser.name;
            document.getElementById('loginBtn').textContent = '切换账号';
        } else {
            document.getElementById('userName').textContent = '游客';
            document.getElementById('loginBtn').textContent = '登录';
        }
        this.updateStats();
    }

    // 数据存储
    saveUsers() {
        localStorage.setItem('runningUsers', JSON.stringify(this.users));
    }

    saveRuns() {
        localStorage.setItem('runningData', JSON.stringify(this.runs));
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM加载完成，初始化应用'); // 调试信息
    window.runningApp = new RunningApp();
});
