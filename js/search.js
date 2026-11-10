async function searchByAPIAndKeyWord(apiId, query) {
    try {
        let apiUrl, apiName, apiBaseUrl;
        
        // 处理自定义API
        if (apiId.startsWith('custom_')) {
            const customIndex = apiId.replace('custom_', '');
            const customApi = getCustomApiInfo(customIndex);
            if (!customApi) return [];
            
            apiBaseUrl = customApi.url;
            apiUrl = apiBaseUrl + API_CONFIG.search.path + encodeURIComponent(query);
            apiName = customApi.name;
        } else {
            // 内置API
            if (!API_SITES[apiId]) return [];
            apiBaseUrl = API_SITES[apiId].api;
            apiUrl = apiBaseUrl + API_CONFIG.search.path + encodeURIComponent(query);
            apiName = API_SITES[apiId].name;
        }
        
        // 添加超时处理
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        // 添加鉴权参数到代理URL
        const proxiedUrl = await window.ProxyAuth?.addAuthToProxyUrl ? 
            await window.ProxyAuth.addAuthToProxyUrl(PROXY_URL + encodeURIComponent(apiUrl)) :
            PROXY_URL + encodeURIComponent(apiUrl);
        
        const response = await fetch(proxiedUrl, {
            headers: API_CONFIG.search.headers,
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            return [];
        }
        
        const data = await response.json();
        
        if (!data || !data.list || !Array.isArray(data.list) || data.list.length === 0) {
            return [];
        }
        
        // 处理第一页结果
        const results = data.list.map(item => ({
            ...item,
            source_name: apiName,
            source_code: apiId,
            api_url: apiId.startsWith('custom_') ? getCustomApiInfo(apiId.replace('custom_', ''))?.url : undefined
        }));
        
        // ⚠️ 重要修正：不再拉取第2页及以后的分页
        // 这批采集站的搜索接口一旦带上 pg 参数就会丢掉关键词（pg>1 直接返回全库列表），
        // 导致搜索结果里混进大量与关键词无关的影片。第 1 页是严格按关键词过滤的，所以只取第 1 页。
        const pagesToFetch = 0;
        
        // ⚠️ 相关性过滤：采集站的搜索是逐字模糊匹配（搜“庆余年”会连“重庆森林”“宝庆码头”一起返回），
        // 这里只保留标题命中关键词的结果；若一条都没命中，则保留原始结果兜底（避免偏僻片名搜不到）。
        const keywordNorm = String(query || '').replace(/\s+/g, '').toLowerCase();
        if (keywordNorm) {
            const matched = results.filter(item => {
                const title = String(item.vod_name || '').replace(/\s+/g, '').toLowerCase();
                return title.includes(keywordNorm);
            });
            if (matched.length > 0) {
                return matched;
            }
        }
        
        return results;
    } catch (error) {
        console.warn(`API ${apiId} 搜索失败:`, error);
        return [];
    }
}