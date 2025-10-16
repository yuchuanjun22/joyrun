// 数据管理
class RunningApp {
    constructor() {
        this.users = JSON.parse(localStorage.getItem('runningUsers')) || [];
        this.runs = JSON.parse(localStorage.getItem('runningData')) || [];
        this.currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateUI();
        this.checkLoginStatus();
    }

    // 事件监听器设置
    setupEventListeners() {
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

        // 活动报名按钮
        document.querySelectorAll('.btn-secondary').forEach(btn => {
            if (btn.textContent === '我要报名') {
                btn.addEventListener('click', (e) => {
                    this.handleEventJoin(e.target);
                });
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
    }

    // 处理点赞功能
    handleLike(button) {
        if (!this.currentUser) {
            alert('请先登录');
            this.showLoginModal();
            return;
        }
        
        const icon = button.querySelector('i');
        if (icon.classList.contains('far')) {
            // 未点赞 -> 已点赞
            icon.classList.remove('far');
            icon.classList.add('fas');
            button.innerHTML = '<i class="fas fa-heart"></i> 已点赞';
            button.style.color = '#e74c3c';
        } else {
            // 已点赞 -> 取消点赞
            icon.classList.remove('fas');
            icon.classList.add('far');
            button.innerHTML = '<i class="far fa-heart"></i> 点赞';
            button.style.color = '';
        }
    }

    // 处理评论功能
    handleComment(button) {
        if (!this.currentUser) {
            alert('请先登录');
            this.showLoginModal();
            return;
        }
        
        const comment = prompt('请输入你的评论：');
        if (comment && comment.trim()) {
            alert('评论发表成功！');
            // 在实际应用中，这里应该将评论保存到数据中
        }
    }

    // 处理活动报名
    handleEventJoin(button) {
        if (!this.currentUser) {
            alert('请先登录');
            this.showLoginModal();
            return;
        }
        
        const eventCard = button.closest('.event-card');
        const participantInfo = eventCard.querySelector('.event-info p:last-child');
        const currentCount = parseInt(participantInfo.textContent.match(/\d+/)[0]);
        
        if (button.textContent === '我要报名') {
            button.textContent = '已报名';
            button.classList.remove('btn-secondary');
            button.classList.add('btn-primary');
            participantInfo.textContent = `👥 已有 ${currentCount + 1} 人报名`;
            alert('报名成功！');
        } else {
            button.textContent = '我要报名';
            button.classList.remove('btn-primary');
            button.classList.add('btn-secondary');
            participantInfo.textContent = `👥 已有 ${currentCount - 1} 人报名`;
            alert('已取消报名！');
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
    }

    checkLoginStatus() {
        if (this.currentUser) {
            this.updateUI();
        } else {
            this.showLoginModal();
        }
    }

    // 打卡功能
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
        
        feedContainer.innerHTML = sortedRuns.map(run => `
            <div class="run-card">
                <div class="run-header">
                    <div class="run-user">
                        <i class="fas fa-user-circle"></i>
                        ${run.userName}
                    </div>
                    <div class="run-date">
                        ${new Date(run.date).toLocaleDateString('zh-CN')}
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
                <div class="run-actions">
                    <button class="action-btn">
                        <i class="far fa-heart"></i> 点赞
                    </button>
                    <button class="action-btn">
                        <i class="far fa-comment"></i> 评论
                    </button>
                </div>
            </div>
        `).join('');
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
            const runDate = new Date(run.date);
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

// 添加一些示例数据
function addSampleData() {
    const storedRuns = localStorage.getItem('runningData');
    if (!storedRuns || JSON.parse(storedRuns).length === 0) {
        const sampleRuns = [
            {
                id: '1',
                userId: 'sample1',
                userName: '跑步达人',
                date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
                distance: 5.2,
                duration: 28,
                pace: 5.38,
                feeling: '今天状态不错，晨跑感觉特别舒服！',
                timestamp: new Date(Date.now() - 86400000).toISOString()
            },
            {
                id: '2',
                userId: 'sample2',
                userName: '运动爱好者',
                date: new Date(Date.now() - 172800000).toISOString().split('T')[0],
                distance: 10.5,
                duration: 55,
                pace: 5.24,
                feeling: '完成了第一个10公里，继续加油！',
                timestamp: new Date(Date.now() - 172800000).toISOString()
            }
        ];
        localStorage.setItem('runningData', JSON.stringify(sampleRuns));

        const sampleUsers = [
            {
                id: 'sample1',
                name: '跑步达人',
                joinDate: new Date(Date.now() - 86400000).toISOString(),
                totalDistance: 5.2,
                totalRuns: 1
            },
            {
                id: 'sample2',
                name: '运动爱好者',
                joinDate: new Date(Date.now() - 172800000).toISOString(),
                totalDistance: 10.5,
                totalRuns: 1
            }
        ];
        localStorage.setItem('runningUsers', JSON.stringify(sampleUsers));
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    addSampleData();
    window.runningApp = new RunningApp();
});

// 添加PWA支持
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js')
            .then(function(registration) {
                console.log('ServiceWorker 注册成功: ', registration.scope);
            })
            .catch(function(error) {
                console.log('ServiceWorker 注册失败: ', error);
            });
    });
}
