// 池州悦跑俱乐部 - LeanCloud 交互脚本
document.addEventListener('DOMContentLoaded', function() {
    // 导航菜单切换
    const navToggle = document.getElementById('nav-toggle');
    const navMenu = document.getElementById('nav-menu');
    
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
        });
    }
    
    // 导航链接点击事件
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            // 移除所有active类
            navLinks.forEach(l => l.classList.remove('active'));
            // 为当前链接添加active类
            this.classList.add('active');
            
            // 移动端点击后关闭菜单
            if (navMenu.classList.contains('active')) {
                navMenu.classList.remove('active');
            }
        });
    });
    
    // 活动筛选
    const filterBtns = document.querySelectorAll('.filter-btn');
    const activitiesList = document.getElementById('activities-list');
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // 移除所有active类
            filterBtns.forEach(b => b.classList.remove('active'));
            // 为当前按钮添加active类
            this.classList.add('active');
            
            const filter = this.getAttribute('data-filter');
            loadActivities(filter);
        });
    });
    
    // 会员表单提交
    const memberForm = document.getElementById('member-form');
    if (memberForm) {
        memberForm.addEventListener('submit', function(e) {
            e.preventDefault();
            submitMemberForm();
        });
    }
    
    // 初始化加载数据
    loadActivities('all');
    loadGallery();
    
    // 滚动时改变导航栏样式
    window.addEventListener('scroll', function() {
        const navbar = document.querySelector('.navbar');
        if (window.scrollY > 50) {
            navbar.style.padding = '10px 0';
            navbar.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
        } else {
            navbar.style.padding = '15px 0';
            navbar.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
        }
    });
});

// 加载活动数据
function loadActivities(filter = 'all') {
    const activitiesList = document.getElementById('activities-list');
    
    // 显示加载状态
    activitiesList.innerHTML = '<div class="loading">加载中...</div>';
    
    // 查询 LeanCloud 中的活动数据
    const query = new AV.Query('Activity');
    
    // 根据筛选条件添加查询条件
    if (filter !== 'all') {
        query.equalTo('type', filter);
    }
    
    // 按日期排序
    query.descending('date');
    
    query.find().then(function(activities) {
        // 清空列表
        activitiesList.innerHTML = '';
        
        if (activities.length === 0) {
            activitiesList.innerHTML = '<div class="no-data">暂无活动数据</div>';
            return;
        }
        
        // 渲染活动列表
        activities.forEach(function(activity) {
            const activityCard = createActivityCard(activity);
            activitiesList.appendChild(activityCard);
        });
    }).catch(function(error) {
        console.error('获取活动数据失败:', error);
        activitiesList.innerHTML = '<div class="error">加载失败，请稍后重试</div>';
    });
}

// 创建活动卡片
function createActivityCard(activity) {
    const card = document.createElement('div');
    card.className = 'activity-card';
    
    const typeClass = getActivityTypeClass(activity.get('type'));
    
    card.innerHTML = `
        <div class="activity-image">
            ${activity.get('image') ? `<img src="${activity.get('image')}" alt="${activity.get('title')}">` : '活动图片'}
        </div>
        <div class="activity-content">
            <h3 class="activity-title">${activity.get('title') || '未命名活动'}</h3>
            <div class="activity-meta">
                <span>${formatDate(activity.get('date'))}</span>
                <span>${activity.get('location') || '池州'}</span>
            </div>
            <p class="activity-description">${activity.get('description') || '暂无描述'}</p>
            <span class="activity-tag ${typeClass}">${getActivityTypeText(activity.get('type'))}</span>
        </div>
    `;
    
    return card;
}

// 获取活动类型对应的CSS类
function getActivityTypeClass(type) {
    const typeMap = {
        'training': 'tag-training',
        'weekend': 'tag-weekend',
        'race': 'tag-race'
    };
    
    return typeMap[type] || 'tag-default';
}

// 获取活动类型文本
function getActivityTypeText(type) {
    const typeMap = {
        'training': '日常训练',
        'weekend': '周末长跑',
        'race': '赛事活动'
    };
    
    return typeMap[type] || '其他活动';
}

// 格式化日期
function formatDate(date) {
    if (!date) return '日期待定';
    
    const d = new Date(date);
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
}

// 加载图库
function loadGallery() {
    const galleryGrid = document.querySelector('.gallery-grid');
    
    // 显示加载状态
    galleryGrid.innerHTML = '<div class="loading">加载中...</div>';
    
    // 查询 LeanCloud 中的图片数据
    const query = new AV.Query('Gallery');
    query.limit(12); // 限制加载12张图片
    query.descending('createdAt');
    
    query.find().then(function(images) {
        // 清空图库
        galleryGrid.innerHTML = '';
        
        if (images.length === 0) {
            galleryGrid.innerHTML = '<div class="no-data">暂无图片数据</div>';
            return;
        }
        
        // 渲染图片
        images.forEach(function(image) {
            const galleryItem = createGalleryItem(image);
            galleryGrid.appendChild(galleryItem);
        });
    }).catch(function(error) {
        console.error('获取图片数据失败:', error);
        galleryGrid.innerHTML = '<div class="error">加载失败，请稍后重试</div>';
    });
}

// 创建图库项目
function createGalleryItem(image) {
    const item = document.createElement('div');
    item.className = 'gallery-item';
    
    item.innerHTML = image.get('image') ? 
        `<img src="${image.get('image')}" alt="${image.get('title') || '俱乐部活动'}">` : 
        '图片加载中...';
    
    return item;
}

// 提交会员表单
function submitMemberForm() {
    const form = document.getElementById('member-form');
    const formData = new FormData(form);
    
    // 获取表单数据
    const name = document.getElementById('name').value;
    const phone = document.getElementById('phone').value;
    const wechat = document.getElementById('wechat').value;
    const experience = document.getElementById('experience').value;
    const goals = document.getElementById('goals').value;
    
    // 验证表单
    if (!name || !phone || !wechat || !experience) {
        alert('请填写所有必填字段');
        return;
    }
    
    // 创建会员对象
    const Member = AV.Object.extend('Member');
    const member = new Member();
    
    // 设置属性
    member.set('name', name);
    member.set('phone', phone);
    member.set('wechat', wechat);
    member.set('experience', experience);
    member.set('goals', goals);
    member.set('status', 'pending'); // 待审核状态
    
    // 保存到 LeanCloud
    member.save().then(function() {
        alert('申请提交成功！我们会尽快与您联系。');
        form.reset();
    }).catch(function(error) {
        console.error('提交申请失败:', error);
        alert('提交失败，请稍后重试或直接联系我们。');
    });
}

// 添加一些CSS样式用于加载状态和错误提示
const style = document.createElement('style');
style.textContent = `
    .loading, .no-data, .error {
        text-align: center;
        padding: 40px;
        font-size: 1.2rem;
        color: #6c757d;
        grid-column: 1 / -1;
    }
    
    .tag-training {
        background-color: #e8f5e9;
        color: #2e7d32;
    }
    
    .tag-weekend {
        background-color: #e3f2fd;
        color: #1565c0;
    }
    
    .tag-race {
        background-color: #fff3e0;
        color: #ef6c00;
    }
    
    .tag-default {
        background-color: #f5f5f5;
        color: #616161;
    }
`;
document.head.appendChild(style);