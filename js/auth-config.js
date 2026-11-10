// 认证配置文件 - 自动从主配置同步
// 不需要手动修改此文件，所有配置都从 config/master-config.js 读取

// 动态导入主配置
let masterConfig = null;

// 尝试导入主配置
async function loadMasterConfig() {
    // 等待主配置加载（最多等待5秒）
    let attempts = 0;
    while (!window.MASTER_CONFIG && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    if (window.MASTER_CONFIG) {
        masterConfig = window.MASTER_CONFIG;
        console.log('✅ 主配置已加载到 auth-config.js');
        
        // 等待密码哈希计算完成
        if (!masterConfig.auth.passwordHash) {
            console.log('⏳ 等待密码哈希计算完成...');
            // 监听主配置就绪事件
            window.addEventListener('masterConfigReady', () => {
                console.log('✅ 收到主配置就绪通知，密码哈希:', masterConfig.auth.passwordHash);
            });
        }
    } else {
        console.error('❌ 无法加载主配置，使用默认配置');
        // 使用统一的默认配置
        masterConfig = {
            auth: {
                enabled: true,
                username: 'admin',
                password: 'Li141609!',  // 🔥 修改这里设置自定义密码
                passwordHash: null,
                sessionDuration: 90 * 24 * 60 * 60 * 1000,
                maxLoginAttempts: 5,
                lockoutDuration: 30 * 60 * 1000
            },
            ui: {
                loginTitle: 'LibreTV 访问验证',
                loginPrompt: '请输入访问密码'
            }
        };
        
        // 计算默认密码哈希
        if (masterConfig.auth.password) {
            generatePasswordHash(masterConfig.auth.password).then(hash => {
                masterConfig.auth.passwordHash = hash;
                console.log('✅ 默认配置密码哈希计算完成');
            }).catch(error => {
                console.error('❌ 默认配置密码哈希计算失败:', error);
            });
        }
    }
}

// 监听主配置就绪事件
if (typeof window !== 'undefined') {
    window.addEventListener('masterConfigReady', (event) => {
        console.log('✅ 收到主配置就绪通知，更新认证配置');
        masterConfig = event.detail.config;
        
        // 确保密码哈希已生成
        if (!masterConfig.auth.passwordHash && masterConfig.auth.password) {
            initPasswordHash();
        }
    });
}

// 立即加载配置（异步）
loadMasterConfig().then(() => {
    console.log('✅ 主配置加载完成');
}).catch(error => {
    console.error('❌ 主配置加载失败:', error);
});

// 从主配置构建AUTH_CONFIG（保持向后兼容）
const AUTH_CONFIG = new Proxy({}, {
    get(target, prop) {
        if (!masterConfig) {
            return undefined;
        }
        
        // 映射属性到主配置
        switch (prop) {
            case 'enabled':
                return masterConfig.auth.enabled;
            case 'username':
                return masterConfig.auth.username;
            case 'password':
                return masterConfig.auth.password;
            case 'passwordHash':
                return masterConfig.auth.passwordHash;
            case 'sessionDuration':
                return masterConfig.auth.sessionDuration;
            case 'localStorageKey':
                return 'authSession';
            case 'loginTitle':
                return masterConfig.ui?.loginTitle || 'LibreTV 访问验证';
            case 'loginPrompt':
                return masterConfig.ui?.loginPrompt || '请输入访问密码';
            case 'maxLoginAttempts':
                return masterConfig.auth.maxLoginAttempts;
            case 'lockoutDuration':
                return masterConfig.auth.lockoutDuration;
            default:
                return masterConfig.auth[prop];
        }
    }
});

// 工具函数：生成密码哈希
async function generatePasswordHash(password) {
    if (window.generatePasswordHash) {
        return await window.generatePasswordHash(password);
    }
    
    // 后备实现
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 自动初始化密码哈希
(async function initPasswordHash() {
    // 等待主配置加载
    let attempts = 0;
    while (!masterConfig && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    if (masterConfig && masterConfig.auth.password) {
        try {
            masterConfig.auth.passwordHash = await generatePasswordHash(masterConfig.auth.password);
            console.log('🔐 认证配置已同步，密码哈希已生成');
        } catch (error) {
            console.error('❌ 生成密码哈希失败:', error);
        }
    }
})();

// 导出配置和工具函数
window.AUTH_CONFIG = AUTH_CONFIG;
window.generatePasswordHash = generatePasswordHash;

// 提供一个获取哈希值的函数，确保异步初始化完成
window.getPasswordHash = async function() {
    // 等待主配置加载
    let attempts = 0;
    while (!masterConfig && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    if (!masterConfig) {
        console.error('❌ 主配置未加载，无法获取密码哈希');
        return null;
    }
    
    // 等待密码哈希计算完成
    attempts = 0;
    while (!masterConfig.auth.passwordHash && attempts < 100) {
        // 如果没有哈希值，尝试计算
        if (masterConfig.auth.password && attempts === 0) {
            console.log('🔐 开始计算密码哈希...');
            try {
                masterConfig.auth.passwordHash = await generatePasswordHash(masterConfig.auth.password);
                console.log('✅ 密码哈希计算完成:', masterConfig.auth.passwordHash);
                break;
            } catch (error) {
                console.error('❌ 生成密码哈希失败:', error);
                return null;
            }
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    if (!masterConfig.auth.passwordHash) {
        console.error('❌ 密码哈希计算超时');
        return null;
    }
    
    console.log('🔐 返回密码哈希:', masterConfig.auth.passwordHash);
    return masterConfig.auth.passwordHash;
};

// 控制台输出配置信息（仅在调试模式下）
if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    setTimeout(() => {
        if (masterConfig) {
            console.log('🔧 LibreTV 认证配置已从主配置同步');
            console.log('👤 用户名:', masterConfig.auth.username);
            console.log('🔒 密码保护:', masterConfig.auth.enabled ? '已启用' : '已禁用');
        }
    }, 500);
}
