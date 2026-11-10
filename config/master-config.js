// 主配置文件 - 所有密码和核心配置的唯一来源
// 只需要在这里修改，其他文件会自动同步

const MASTER_CONFIG = {
    // 🔐 核心认证配置（只需要在这里修改）
    auth: {
        username: 'admin',                    // 用户名
        password: 'Li141609!',            // 🔥 修改这里设置自定义密码
        enabled: true,                        // 是否启用密码保护
        sessionDuration: 90 * 24 * 60 * 60 * 1000,  // 90天
        maxLoginAttempts: 5,                  // 最大尝试次数
        lockoutDuration: 30 * 60 * 1000       // 锁定时间30分钟
    },
    
    // 🌐 代理服务配置
    proxy: {
        debug: false,                         // 调试模式
        cacheEnabled: true,                   // 启用缓存
        cacheTTL: 86400,                      // 缓存时间(秒)
        maxRecursion: 5,                      // 最大递归层数
        timeout: 10000,                       // 请求超时(毫秒)
        userAgents: [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ]
    },
    
    // 📱 UI配置
    ui: {
        title: 'LibreTV',
        loginTitle: 'LibreTV 访问验证',
        loginPrompt: '请输入访问密码',
        theme: 'dark'
    },
    
    // ⚙️ 应用配置
    app: {
        version: '2.0.0',
        environment: 'production'
    }
};

// 自动生成密码哈希的工具函数
async function generatePasswordHash(password) {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
        // 浏览器环境
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } else if (typeof require !== 'undefined') {
        // Node.js 环境
        const crypto = require('crypto');
        return crypto.createHash('sha256').update(password).digest('hex');
    } else {
        throw new Error('无法访问加密功能');
    }
}

// 初始化配置（自动计算密码哈希）
async function initializeConfig() {
    if (!MASTER_CONFIG.auth.password) {
        console.error('❌ 主配置中未设置密码');
        return;
    }
    
    try {
        console.log('🔐 开始计算密码哈希，密码:', MASTER_CONFIG.auth.password);
        MASTER_CONFIG.auth.passwordHash = await generatePasswordHash(MASTER_CONFIG.auth.password);
        console.log('✅ 密码哈希计算完成:', MASTER_CONFIG.auth.passwordHash);
        
        // 通知其他模块配置已就绪
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('masterConfigReady', { 
                detail: { config: MASTER_CONFIG } 
            }));
        }
    } catch (error) {
        console.error('❌ 密码哈希计算失败:', error);
        console.error('详细错误:', error.stack);
        
        // 尝试其他方法生成哈希
        try {
            if (typeof window !== 'undefined' && window.crypto && crypto.subtle) {
                const encoder = new TextEncoder();
                const data = encoder.encode(MASTER_CONFIG.auth.password);
                const hashBuffer = await crypto.subtle.digest('SHA-256', data);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                MASTER_CONFIG.auth.passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
                console.log('✅ 使用Web Crypto API计算密码哈希成功:', MASTER_CONFIG.auth.passwordHash);
            } else {
                throw new Error('无可用的哈希计算方法');
            }
        } catch (fallbackError) {
            console.error('❌ 后备哈希计算也失败:', fallbackError);
            // 最后的后备方案，但这不应该发生
            MASTER_CONFIG.auth.passwordHash = null;
        }
    }
}

// 获取配置的便捷函数
function getAuthConfig() {
    return MASTER_CONFIG.auth;
}

function getProxyConfig() {
    return MASTER_CONFIG.proxy;
}

function getUIConfig() {
    return MASTER_CONFIG.ui;
}

function getAppConfig() {
    return MASTER_CONFIG.app;
}

// 获取密码（明文）- 仅供服务端使用
function getPassword() {
    return MASTER_CONFIG.auth.password;
}

// 获取密码哈希（异步）
async function getPasswordHash() {
    if (!MASTER_CONFIG.auth.passwordHash) {
        await initializeConfig();
    }
    return MASTER_CONFIG.auth.passwordHash;
}

// 立即初始化（如果在支持的环境中）
if (typeof window !== 'undefined') {
    // 浏览器环境，立即初始化，不等待DOMContentLoaded
    console.log('🔧 开始初始化主配置...');
    
    // 先设置为false，等待初始化完成
    window.MASTER_CONFIG_READY = false;
    
    initializeConfig().then(() => {
        console.log('🎉 主配置初始化完成');
        window.MASTER_CONFIG_READY = true;
        
        // 触发配置就绪事件
        window.dispatchEvent(new CustomEvent('masterConfigReady', { 
            detail: { config: MASTER_CONFIG } 
        }));
    }).catch(error => {
        console.error('❌ 主配置初始化失败:', error);
        
        // 尝试后备哈希计算
        try {
            if (MASTER_CONFIG.auth.password) {
                console.log('🔄 尝试后备密码哈希计算...');
                const encoder = new TextEncoder();
                const data = encoder.encode(MASTER_CONFIG.auth.password);
                crypto.subtle.digest('SHA-256', data).then(hashBuffer => {
                    const hashArray = Array.from(new Uint8Array(hashBuffer));
                    MASTER_CONFIG.auth.passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
                    console.log('✅ 后备密码哈希计算完成:', MASTER_CONFIG.auth.passwordHash);
                    window.MASTER_CONFIG_READY = true;
                    
                    // 触发配置就绪事件
                    window.dispatchEvent(new CustomEvent('masterConfigReady', { 
                        detail: { config: MASTER_CONFIG } 
                    }));
                }).catch(fallbackError => {
                    console.error('❌ 后备哈希计算也失败:', fallbackError);
                    // 即使失败也设置ready状态，避免无限等待
                    window.MASTER_CONFIG_READY = true;
                });
            } else {
                console.error('❌ 主配置中没有密码，无法计算哈希');
                window.MASTER_CONFIG_READY = true;
            }
        } catch (fallbackError) {
            console.error('❌ 后备哈希计算准备失败:', fallbackError);
            window.MASTER_CONFIG_READY = true;
        }
    });
} else if (typeof global !== 'undefined') {
    // Node.js环境，立即初始化
    initializeConfig();
}

// 导出配置（兼容浏览器和Node.js）
if (typeof module !== 'undefined' && module.exports) {
    // Node.js 环境
    module.exports = {
        MASTER_CONFIG,
        getAuthConfig,
        getProxyConfig,
        getUIConfig,
        getAppConfig,
        getPassword,
        getPasswordHash,
        generatePasswordHash
    };
} else {
    // 浏览器环境
    window.MASTER_CONFIG = MASTER_CONFIG;
    window.getAuthConfig = getAuthConfig;
    window.getProxyConfig = getProxyConfig;
    window.getUIConfig = getUIConfig;
    window.getAppConfig = getAppConfig;
    window.getPassword = getPassword;
    window.getPasswordHash = getPasswordHash;
    window.generatePasswordHash = generatePasswordHash;
    
    // 动态更新密码的函数
    window.updateMasterPassword = async function(newPassword) {
        if (MASTER_CONFIG && MASTER_CONFIG.auth) {
            const oldPassword = MASTER_CONFIG.auth.password;
            MASTER_CONFIG.auth.password = newPassword;
            
            // 重新计算哈希
            try {
                const newHash = await generatePasswordHash(newPassword);
                MASTER_CONFIG.auth.passwordHash = newHash;
                console.log('✅ 密码和哈希已更新');
                
                // 派发密码更新事件
                window.dispatchEvent(new CustomEvent('passwordUpdated', {
                    detail: { 
                        oldPassword: oldPassword,
                        newPassword: newPassword,
                        newHash: newHash
                    }
                }));
                
                return { success: true, newHash: newHash };
            } catch (error) {
                console.error('❌ 哈希计算失败:', error);
                return { success: false, error: error.message };
            }
        }
        return { success: false, error: '配置对象不存在' };
    };
    
    // 获取当前密码信息
    window.getCurrentPasswordInfo = function() {
        if (MASTER_CONFIG && MASTER_CONFIG.auth) {
            return {
                password: MASTER_CONFIG.auth.password,
                hash: MASTER_CONFIG.auth.passwordHash,
                username: MASTER_CONFIG.auth.username
            };
        }
        return null;
    };
}

// 开发环境下的调试信息
if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    console.log('🔧 LibreTV 主配置已加载');
    console.log('👤 用户名:', MASTER_CONFIG.auth.username);
    console.log('🔒 密码保护:', MASTER_CONFIG.auth.enabled ? '已启用' : '已禁用');
    console.log('🌐 代理调试:', MASTER_CONFIG.proxy.debug ? '已启用' : '已禁用');
}