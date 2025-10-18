// LeanCloud 版本的跑步应用
class LeanCloudRunningApp {
    constructor() {
        this.currentUser = null;
        this.runs = [];
        this.events = [];
        this.users = [];
        this.comments = {};
        this.isLoggingIn = false; // 添加登录状态标志
        
        this.init();
    }

    async init() {
        console.log('初始化应用...');
        
        // 先设置事件监听器
        this.setupEventListeners();
        
        // 显示加载状态
        this.showLoadingState();
        
        // 然后检查登录状态
        await this.checkLoginStatus();
    }

    // 显示加载状态
    showLoadingState() {
        document.getElementById('userName').textContent = '登录中...';
        document.getElementById('loginBtn').textContent = '登录中';
    }

    // 检查登录状态 - 修复版本
    async checkLoginStatus() {
        console.log('检查登录状态...');
        
        try {
            // 获取当前用户
            this.currentUser = AV.User.current();
            console.log('当前用户状态:', this.currentUser ? '已登录' : '未登录');
            
            if (!this.currentUser) {
                console.log('用户未登录，进行匿名登录...');
                this.isLoggingIn = true;
                
                // 匿名登录
                this.currentUser = await AV.User.loginWithAuthData({}, 'anonymous');
                console.log('匿名登录成功:', this.currentUser.id);
                
                // 设置默认用户名
                const username = `跑友${this.currentUser.id.slice(-4)}`;
                this.currentUser.set('username', username);
                await this.currentUser.save();
                
                console.log('用户名设置成功:', username);
                
                this.isLoggingIn = false;
            } else {
                console.log('用户已登录:', this.currentUser.id, '用户名:', this.currentUser.get('username'));
            }
            
            // 更新UI
            this.updateUI();
            
            // 加载数据
            await this.loadData();
            
        } catch (error) {
            console.error('登录失败:', error);
            this.isLoggingIn = false;
            
            // 即使登录失败，也更新UI显示错误状态
            this.updateUI();
            alert('登录失败，请刷新页面重试。错误: ' + error.message);
        }
    }

    // 更新UI - 修复版本
    updateUI() {
        if (this.currentUser) {
            const username = this.currentUser.get('username') || '匿名用户';
            document.getElementById('userName').textContent = username;
            document.getElementById('loginBtn').textContent = '用户信息';
            console.log('UI更新: 用户已登录 -', username);
        } else if (this.isLoggingIn) {
            document.getElementById('userName').textContent = '登录中...';
            document.getElementById('loginBtn').textContent = '登录中';
            console.log('UI更新: 登录中');
        } else {
            document.getElementById('userName').textContent = '未登录';
            document.getElementById('loginBtn').textContent = '登录';
            console.log('UI更新: 未登录');
        }
    }

    // 提交打卡 - 修复版本
    async submitCheckin() {
        console.log('开始提交打卡...');
        console.log('当前用户状态:', this.currentUser ? '已登录' : '未登录');
        console.log('登录中状态:', this.isLoggingIn);
        
        // 检查登录状态
        if (!this.currentUser) {
            if (this.isLoggingIn) {
                alert('正在登录中，请稍等几秒钟再试');
            } else {
                alert('登录状态异常，请刷新页面重新登录');
            }
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

        // 显示提交中状态
        const submitButton = document.getElementById('submitCheckin');
        const originalText = submitButton.textContent;
        submitButton.textContent = '提交中...';
        submitButton.disabled = true;

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
        } finally {
            // 恢复按钮状态
            submitButton.textContent = originalText;
            submitButton.disabled = false;
        }
    }

    // 添加登录状态检查的辅助方法
    checkUserLogin() {
        if (!this.currentUser) {
            console.warn('用户未登录，当前用户:', this.currentUser);
            return false;
        }
        
        if (this.isLoggingIn) {
            console.warn('用户登录中...');
            return false;
        }
        
        return true;
    }

    // 在需要登录的操作前调用这个方法
    requireLogin(actionName = '此操作') {
        if (!this.checkUserLogin()) {
            if (this.isLoggingIn) {
                alert(`正在登录中，请稍等几秒钟再${actionName}`);
            } else {
                alert(`请先登录再${actionName}`);
            }
            return false;
        }
        return true;
    }

    // 修改其他需要登录的方法
    async handleEventJoin(button) {
        console.log('处理活动报名...');
        
        if (!this.requireLogin('报名活动')) {
            return;
        }
        
        // 原有的活动报名逻辑...
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

    // 修改点赞和评论方法
    handleLike(button) {
        if (!this.requireLogin('点赞')) {
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
        if (!this.requireLogin('评论')) {
            return;
        }
        
        const comment = prompt('请输入你的评论：');
        if (comment && comment.trim()) {
            alert('评论发表成功！');
            // 在实际应用中，这里应该将评论保存到 LeanCloud
        }
    }

    // 原有的其他方法保持不变...
    // loadData, loadRuns, loadEvents, loadUsers, initializeDefaultEvents, setupEventListeners 等
    // 这些方法的代码与之前相同

    // 页面切换
    showPage(pageName) {
        console.log('切换到页面:', pageName);
        console.log('切换页面时用户状态:', this.currentUser ? '已登录' : '未登录');
        
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
        
        if (!this.requireLogin('查看排行榜')) {
            return;
        }
        
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

    // 其他辅助方法保持不变...
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