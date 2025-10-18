// LeanCloud 配置
(function() {
    // 初始化 LeanCloud SDK
    var APP_ID = 'ejQnn9XbgYeggY6EX1wGkBPx-gzGzoHsz';
    var APP_KEY = '65pXFuLgUFNjesFc0OFATryX';
    var SERVER_URL = 'https://ejqnn9xb.lc-cn-n1-shared.com';
    
    // 初始化
    AV.init({
        appId: APP_ID,
        appKey: APP_KEY,
        serverURL: SERVER_URL
    });
    
    console.log('LeanCloud 初始化完成');
    
    // 全局变量
    window.LEANCLOUD_APP = {
        AV: AV,
        APP_ID: APP_ID,
        APP_KEY: APP_KEY,
        SERVER_URL: SERVER_URL
    };
})();