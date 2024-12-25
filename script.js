// 状态管理
let state = {
    isAdmin: false,
    results: [],
    customerServices: [],
    recommendedItems: new Set(),
    filters: {
        city: 'all',
        district: 'all',
        gradeLevel: 'all',
        subject: 'all'
    }
};

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    loadFromLocalStorage();
    setupEventListeners();
    updateUI();
});

// 本地存储操作
function loadFromLocalStorage() {
    const savedResults = localStorage.getItem('tutorResults');
    const savedCustomerServices = localStorage.getItem('customerServices');
    const savedRecommended = localStorage.getItem('recommendedItems');

    if (savedResults) state.results = JSON.parse(savedResults);
    if (savedCustomerServices) state.customerServices = JSON.parse(savedCustomerServices);
    if (savedRecommended) state.recommendedItems = new Set(JSON.parse(savedRecommended));
}

function saveToLocalStorage() {
    localStorage.setItem('tutorResults', JSON.stringify(state.results));
    localStorage.setItem('customerServices', JSON.stringify(state.customerServices));
    localStorage.setItem('recommendedItems', JSON.stringify([...state.recommendedItems]));
}

// 事件监听器设置
function setupEventListeners() {
    // 管理员登录相关
    document.getElementById('adminEntryBtn')?.addEventListener('click', showAdminLogin);
    document.getElementById('adminLoginBtn')?.addEventListener('click', handleAdminLogin);
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);

    // 文件上传相关
    const dropZone = document.getElementById('dropZone');
    if (dropZone) {
        dropZone.addEventListener('dragover', handleDragOver);
        dropZone.addEventListener('dragleave', handleDragLeave);
        dropZone.addEventListener('drop', handleDrop);
    }
    document.getElementById('fileUpload')?.addEventListener('change', handleFileUpload);

    // 其他按钮事件
    document.getElementById('analyzeBtn')?.addEventListener('click', handleAnalyzeAndAdd);
    document.getElementById('clearBtn')?.addEventListener('click', () => {
        document.getElementById('inputText').value = '';
    });
    document.getElementById('addCsBtn')?.addEventListener('click', handleAddCustomerService);
}

// UI更新函数
function updateUI() {
    const adminPanel = document.getElementById('adminPanel');
    const userPanel = document.getElementById('userPanel');
    const adminLoginPanel = document.getElementById('adminLoginPanel');
    const adminEntryContainer = document.getElementById('adminEntryContainer');

    if (!adminPanel || !userPanel || !adminLoginPanel || !adminEntryContainer) return;

    if (state.isAdmin === null) {
        adminLoginPanel.classList.remove('hidden');
        adminPanel.classList.add('hidden');
        userPanel.classList.add('hidden');
        adminEntryContainer.classList.add('hidden');
    } else if (state.isAdmin) {
        adminLoginPanel.classList.add('hidden');
        adminPanel.classList.remove('hidden');
        userPanel.classList.add('hidden');
        adminEntryContainer.classList.add('hidden');
        updateCustomerServiceList();
    } else {
        adminLoginPanel.classList.add('hidden');
        adminPanel.classList.add('hidden');
        userPanel.classList.remove('hidden');
        adminEntryContainer.classList.remove('hidden');
    }

    updateResultsList();
}

// 管理员登录相关函数
function showAdminLogin() {
    state.isAdmin = null;
    updateUI();
}

function handleAdminLogin() {
    const username = document.getElementById('adminUsername')?.value || '';
    const password = document.getElementById('adminPassword')?.value || '';
    const errorElement = document.getElementById('loginError');

    if (username === 'admin' && password === 'admin') {
        state.isAdmin = true;
        if (errorElement) errorElement.classList.add('hidden');
        updateUI();
    } else {
        if (errorElement) {
            errorElement.textContent = '用户名或密码错误';
            errorElement.classList.remove('hidden');
        }
    }
}

function handleLogout() {
    state.isAdmin = false;
    updateUI();
}

// 文件处理相关函数
function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    handleFiles(files);
}

function handleFileUpload(e) {
    const files = e.target.files;
    handleFiles(files);
}

async function handleFiles(files) {
    const textArea = document.getElementById('inputText');
    if (!textArea) return;

    let allContent = [];

    for (const file of files) {
        const extension = file.name.split('.').pop().toLowerCase();
        
        if (!['txt', 'docx', 'csv'].includes(extension)) {
            alert(`文件 ${file.name} 格式不支持，仅支持 .txt、.docx 或 .csv 格式`);
            continue;
        }

        try {
            let content = '';
            if (extension === 'csv') {
                content = await handleCsvFile(file);
            } else {
                content = await file.text();
            }
            allContent.push(`【文件：${file.name}】\n${content}`);
        } catch (error) {
            console.error('文件读取错误:', error);
            alert(`文件 ${file.name} 读取失败`);
        }
    }

    textArea.value = allContent.join('\n\n');
}

// CSV文件处理
async function handleCsvFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                resolve(jsonData.map(row => row.join('\t')).join('\n'));
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

// 分析文本内容
function analyzeContent(content) {
    // 学科匹配规则
    const subjects = [
        '语文', '数学', '英语', '物理', '化学', 
        '生物', '历史', '地理', '政治', '科学',
        '美术', '音乐'
    ].filter(subject => content.includes(subject));

    // 年级段匹配规则
    const gradeLevelPatterns = [
        { patterns: [/幼儿园/, /幼师/, /早教/], level: '幼儿' },
        { patterns: [/小学/, /[一二三四五六]年级/, /小[一二三四五六]/], level: '小学' },
        { patterns: [/初中/, /初[一二三]/], level: '初中' },
        { patterns: [/高中/, /高[一二三]/, /中考/], level: '高中' },
        { patterns: [/成人/, /考研/, /考证/, /自考/, /专升本/], level: '成人' },
    ];

    // 识别年级段
    let gradeLevel = '未识别';
    for (const { patterns, level } of gradeLevelPatterns) {
        if (patterns.some(pattern => pattern.test(content))) {
            gradeLevel = level;
            break;
        }
    }

    // 识别城市和区域
    let city = '未识别';
    let district = '未识别';
    
    const locationMatch = content.match(/【([^】]+)】/);
    if (locationMatch) {
        const location = locationMatch[1];
        
        // 先尝试匹配完整的城市名
        for (const [cityName, districts] of Object.entries(CITIES_AND_DISTRICTS)) {
            if (location.includes(cityName)) {
                city = cityName;
                // 在该城市的区域中查找匹配
                for (const dist of districts) {
                    if (location.includes(dist)) {
                        district = dist;
                        break;
                    }
                }
                break;
            }
        }
        
        // 如果只找到区域没找到城市，反向查找城市
        if (district === '未识别') {
            for (const [cityName, districts] of Object.entries(CITIES_AND_DISTRICTS)) {
                if (districts.some(dist => location.includes(dist))) {
                    city = cityName;
                    district = districts.find(dist => location.includes(dist)) || '未识别';
                    break;
                }
            }
        }
    }

    return {
        content,
        subjects: subjects.length > 0 ? subjects : ['未识别'],
        gradeLevel,
        city,
        district,
    };
}

// 处理添加家教单
function handleAnalyzeAndAdd() {
    const inputText = document.getElementById('inputText')?.value;
    if (!inputText?.trim()) {
        return;
    }

    const newEntries = inputText
        .split(/\n\s*\n/)  // 按空行分割多个家教单
        .filter(text => text.trim())  // 过滤空内容
        .map(text => analyzeContent(text.trim()));  // 分析每个家教单

    state.results = [
        ...state.results,
        ...newEntries.map(entry => {
            if (state.customerServices.length > 0) {
                const csIndex = state.results.length % state.customerServices.length;
                return { ...entry, customerService: state.customerServices[csIndex] };
            }
            return entry;
        })
    ];

    const inputElement = document.getElementById('inputText');
    if (inputElement) inputElement.value = '';
    
    saveToLocalStorage();
    updateUI();
    
    // 显示成功提示
    const confirmModal = new bootstrap.Modal(document.getElementById('confirmModal'));
    confirmModal.show();
}

// 更新客服列表
function updateCustomerServiceList() {
    const container = document.getElementById('customerServiceList');
    if (!container) return;
    
    container.innerHTML = '';
    
    state.customerServices.forEach((cs, index) => {
        const div = document.createElement('div');
        div.className = 'flex items-center justify-between p-2 bg-gray-100 rounded';
        div.innerHTML = `
            <span>${cs.name} (${cs.wechatId})</span>
            <button onclick="handleRemoveCustomerService(${index})" class="text-red-500 hover:text-red-700">删除</button>
        `;
        container.appendChild(div);
    });
}

// 更新结果列表
function updateResultsList() {
    const container = document.getElementById('resultsList');
    if (!container) return;

    container.innerHTML = '';

    const filteredResults = state.results.filter(result => {
        const matchesCity = state.filters.city === 'all' || result.city === state.filters.city;
        const matchesDistrict = state.filters.district === 'all' || result.district === state.filters.district;
        const matchesGradeLevel = state.filters.gradeLevel === 'all' || result.gradeLevel === state.filters.gradeLevel;
        const matchesSubject = state.filters.subject === 'all' || result.subjects.includes(state.filters.subject);

        return matchesCity && matchesDistrict && matchesGradeLevel && matchesSubject;
    });

    filteredResults.forEach((result, index) => {
        const isRecommended = state.recommendedItems.has(index);
        const div = document.createElement('div');
        div.className = `result-card ${isRecommended ? 'recommended' : ''}`;
        
        div.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <div class="flex flex-wrap items-center gap-2">
                    ${isRecommended ? '<span class="badge badge-red animate-pulse">加急</span>' : ''}
                    <span class="badge badge-blue">${result.city}</span>
                    <span class="badge badge-blue">${result.district}</span>
                    <span class="badge badge-green">${result.gradeLevel}</span>
                    ${result.subjects.map(subject => 
                        `<span class="badge badge-purple">${subject}</span>`
                    ).join('')}
                </div>
            </div>
            <p class="whitespace-pre-wrap">${result.content}</p>
            ${result.customerService ? `
                <div class="mt-4 flex items-center space-x-2 text-sm text-gray-600">
                    <span>投递简历请加微信</span>
                    <span>${result.customerService.name}：</span>
                    <span class="font-mono bg-gray-100 p-1 rounded">${result.customerService.wechatId}</span>
                    <button onclick="handleCopyWechatId('${result.customerService.wechatId}')" 
                            class="text-blue-500 hover:text-blue-700">
                        复制
                    </button>
                </div>
            ` : ''}
        `;
        
        container.appendChild(div);
    });
}

// 处理复制微信号
function handleCopyWechatId(wechatId) {
    navigator.clipboard.writeText(wechatId).then(() => {
        const confirmModal = new bootstrap.Modal(document.getElementById('confirmModal'));
        confirmModal.show();
    }).catch(() => {
        alert('复制失败，请手动复制微信号');
    });
}

// 导出为Excel
function exportToExcel() {
    const ws = XLSX.utils.json_to_sheet(state.results);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "家教信息");
    XLSX.writeFile(wb, "家教信息.xlsx");
}
