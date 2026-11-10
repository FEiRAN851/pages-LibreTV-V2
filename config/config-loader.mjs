// Node.js 环境的配置加载器
// 为服务端代理文件提供主配置访问

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 读取主配置文件
let masterConfigContent = null;
let masterConfig = null;

function loadMasterConfig() {
    try {
        if (!masterConfigContent) {
            const configPath = join(__dirname, 'master-config.js');
            masterConfigContent = readFileSync(configPath, 'utf8');
            
            // 简单的配置解析（提取MASTER_CONFIG对象）
            const configMatch = masterConfigContent.match(/const MASTER_CONFIG = ({[\s\S]*?});/);
            if (configMatch) {
                // 安全地评估配置对象
                const configStr = configMatch[1];
                masterConfig = eval(`(${configStr})`);
            }
        }
        
        if (!masterConfig) {
            throw new Error('无法解析主配置');
        }
        
        return masterConfig;
    } catch (error) {
        console.error('❌ 无法加载主配置，使用默认配置:', error.message);
        // 返回统一的默认配置
        return {
            auth: {
                enabled: true,
                username: 'admin',
                password: 'Li141609!',  // 🔥 修改这里设置自定义密码
                sessionDuration: 90 * 24 * 60 * 60 * 1000,
                maxLoginAttempts: 5,
                lockoutDuration: 30 * 60 * 1000
            },
            proxy: {
                debug: false,
                cacheEnabled: true,
                cacheTTL: 86400,
                maxRecursion: 5,
                timeout: 10000,
                userAgents: [
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                ]
            }
        };
    }
}

// 生成密码哈希
function generatePasswordHash(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// 获取配置的便捷函数
export function getPassword() {
    const config = loadMasterConfig();
    // 优先使用主配置中的密码，环境变量作为覆盖选项
    return config.auth.password || process.env.PASSWORD;
}

export function getPasswordHash() {
    const password = getPassword();
    return generatePasswordHash(password);
}

export function getProxyConfig() {
    const config = loadMasterConfig();
    return {
        debug: process.env.DEBUG === 'true' || config.proxy.debug,
        cacheEnabled: config.proxy.cacheEnabled,
        cacheTTL: parseInt(process.env.CACHE_TTL || config.proxy.cacheTTL.toString()),
        maxRecursion: parseInt(process.env.MAX_RECURSION || config.proxy.maxRecursion.toString()),
        timeout: parseInt(process.env.REQUEST_TIMEOUT || config.proxy.timeout.toString()),
        userAgents: config.proxy.userAgents
    };
}

export function getAuthConfig() {
    const config = loadMasterConfig();
    return {
        ...config.auth,
        password: getPassword(),
        passwordHash: getPasswordHash()
    };
}

// 获取用户代理列表
export function getUserAgents() {
    try {
        if (process.env.USER_AGENTS_JSON) {
            const parsedAgents = JSON.parse(process.env.USER_AGENTS_JSON);
            if (Array.isArray(parsedAgents) && parsedAgents.length > 0) {
                return parsedAgents;
            }
        }
    } catch (e) {
        console.error('解析USER_AGENTS_JSON环境变量失败:', e.message);
    }
    
    const config = loadMasterConfig();
    return config.proxy.userAgents;
}

// 日志函数
export function logDebug(message) {
    const config = getProxyConfig();
    if (config.debug) {
        console.log(`[主配置代理] ${message}`);
    }
}

// 默认导出
export default {
    getPassword,
    getPasswordHash,
    getProxyConfig,
    getAuthConfig,
    getUserAgents,
    logDebug
};
