// 配置参数
const CDN_BASE = 'https://cdn.jsdelivr.net/gh/kangningyuan/scholarship-query@main';
const CHUNK_COUNT = 10; // 根据实际分片数量修改
const DEBOUNCE_TIME = 400; // 防抖时间(ms)

// 全局变量
let allData = [];
let isLoading = false;

// 初始化加载
async function initialize() {
    showLoading();
    await loadAllData();
    hideLoading();
    document.getElementById('searchInput').focus();
}

// 加载所有分片数据
async function loadAllData() {
    try {
        const promises = [];
        for (let i = 0; i < CHUNK_COUNT; i++) {
            const chunkId = i.toString().padStart(3, '0');
            promises.push(
                fetch(`${CDN_BASE}/data/chunk_${chunkId}.json`)
                    .then(r => r.json())
            );
        }
        const chunks = await Promise.all(promises);
        allData = chunks.flat();
        updateStats();
        document.getElementById('searchButton').disabled = false;
    } catch (error) {
        console.error('数据加载失败:', error);
        showError('数据加载失败，请刷新重试');
        document.getElementById('searchButton').disabled = true;
    }
}

// 输入标准化函数
function normalizeInput(input) {
    return input
        .trim()
        .toLowerCase()
        .replace(/[\s·]/g, '') // 移除空格和拼音分隔符
        .replace(/[^a-z0-9\u4e00-\u9fa5]/g, ''); // 保留中文、数字、字母
}

// 增强版搜索功能
function search(keyword) {
    const cleanInput = normalizeInput(keyword);
    if (!cleanInput) return [];

    return allData.filter(item => {
        // 标准化目标数据
        const targets = {
            chinese: item.name.toLowerCase(),
            id: item.base_id.toString(), // 确保转为字符串
            pinyin: item.pinyin.replace(/ /g, ''),
            initials: item.pinyin_initials.toLowerCase()
        };

        // 直接匹配逻辑
        const directMatch = [
            targets.chinese,
            targets.id,
            targets.pinyin,
            targets.initials
        ].some(value => value.includes(cleanInput));

        return directMatch || checkMixedInput(cleanInput, targets);
    });
}

// 混合输入检测（支持中文+拼音组合）
function checkMixedInput(input, { chinese, pinyin, initials }) {
    // 分离输入中的中文和拼音部分
    const chinesePart = input.match(/[\u4e00-\u9fa5]/g)?.join('') || '';
    const pinyinPart = input.replace(/[\u4e00-\u9fa5]/g, '');

    // 中文部分匹配
    const chineseMatch = chinesePart ? chinese.includes(chinesePart) : true;
    
    // 拼音部分匹配（全拼或首字母）
    const pinyinMatch = pinyinPart ? 
        (pinyin.includes(pinyinPart) || 
        initials.includes(pinyinPart.toLowerCase())) : true;

    return chineseMatch && pinyinMatch;
}

// 统一搜索函数
function performSearch() {
    const keyword = document.getElementById('searchInput').value;
    const results = search(keyword);
    displayResults(results);
}

// 加载状态控制
function showLoading() {
    isLoading = true;
    document.getElementById('loading').style.display = 'block';
    document.getElementById('searchButton').disabled = true;
}

function hideLoading() {
    isLoading = false;
    document.getElementById('loading').style.display = 'none';
    document.getElementById('searchButton').disabled = false;
}

// 展示结果
function displayResults(results) {
    const container = document.getElementById('results');
    container.innerHTML = results.map(item => `
        <div class="result-card">
            <h3>${item.name} <span class="id-tag">${item.full_id}</span></h3>
            <p>🏫 ${item.school || '未知学校'}</p>
            <p>📅 ${item.year || '未知年份'} 年获奖 | 期数：${item.period}</p>
        </div>
    `).join('');

    updateStats(results.length);
}

// 更新统计信息
function updateStats(resultCount) {
    const statsEl = document.getElementById('stats');
    statsEl.innerHTML = `共加载 ${allData.length} 条记录，找到 ${resultCount || 0} 条结果`;
}

// 错误提示
function showError(msg) {
    const container = document.getElementById('results');
    container.innerHTML = `<div class="error-box">⚠️ ${msg}</div>`;
}

// 事件监听
document.getElementById('searchButton').addEventListener('click', performSearch);
document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') performSearch();
});

// 启动系统
initialize();