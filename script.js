// 数据管理
class RunningApp {
    constructor() {
        this.users = JSON.parse(localStorage.getItem('runningUsers')) || [];
        this.runs = JSON.parse(localStorage.getItem('runningData')) || [];
        this.currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
        this.comments = JSON.parse(localStorage.getItem('runningComments')) || {};
        
        // 活动数据初始化
        this.events = JSON.parse(localStorage.getItem('runningEvents')) || {
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

        // 活动报名按钮的事件委托 - 修复版本
        document.addEventListener('click', (e) => {
            // 检查点击的是否是活动报名按钮
            const button = e.target;
            if (button.classList.contains('btn-secondary') || button.classList.contains('btn-primary')) {
                if (button.textContent === '我要报名' || button.textContent === '已报名') {
                    console.log('检测到活动报名按钮点击'); // 调试信息
                    this.handleEventJoin(button);
                }
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

    // 处理活动报名 - 完全重写的版本
    handleEventJoin(button) {
        console.log('开始处理活动报名'); // 调试信息
        
        if (!this.currentUser) {
            console.log('用户未登录，显示登录弹窗'); // 调试信息
            alert('请先登录');
            this.showLoginModal();
            return;
        }
        
        console.log('当前用户:', this.currentUser.name); // 调试信息
        
        // 找到活动卡片
        const eventCard = button.closest('.event-card');
        if (!eventCard) {
            console.error('未找到活动卡片');
            return;
        }
        
        // 获取活动ID
        const eventId = eventCard.dataset.eventId;
        console.log('活动ID:', eventId); // 调试信息
        
        if (!eventId || !this.events[eventId]) {
            console.error('未找到活动信息:', eventId);
            return;
        }
        
        const event = this.events[eventId];
        console.log('活动信息:', event); // 调试信息
        
        // 检查用户是否已经报名
        const isParticipating = event.participants.includes(this.currentUser.id);
        console.log('用户是否已报名:', isParticipating); // 调试信息
        
        if (!isParticipating) {
            // 报名
            if (event.participants.length >= event.maxParticipants) {
                alert('该活动报名人数已满！');
                return;
            }
            
            // 添加用户到参与者列表
            event.participants.push(this.currentUser.id);
            console.log('报名成功，当前参与者:', event.participants); // 调试信息
            
            // 更新按钮状态
            button.textContent = '已报名';
            button.classList.remove('btn-secondary');
            button.classList.add('btn-primary');
            
            alert('报名成功！');
        } else {
            // 取消报名
            const index = event.participants.indexOf(this.currentUser.id);
            if (index > -1) {
                event.participants.splice(index, 1);
            }
            console.log('取消报名，当前参与者:', event.participants); // 调试信息
            
            // 更新按钮状态
            button.textContent = '我要报名';
            button.classList.remove('btn-primary');
            button.classList.add('btn-secondary');
            
            alert('已取消报名！');
        }
        
        // 保存数据并更新显示
        this.saveEvents();
        this.updateEventsDisplay();
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

    // 其余方法保持不变...
    // 包括：登录处理、打卡功能、动态流更新、排行榜更新等
    // 这些方法的代码与之前相同，这里为了简洁省略
    // 在实际替换时，请确保包含所有方法
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    // 原有的示例数据初始化代码
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
            }
        ];
        localStorage.setItem('runningUsers', JSON.stringify(sampleUsers));
    }
    
    window.runningApp = new RunningApp();
});
