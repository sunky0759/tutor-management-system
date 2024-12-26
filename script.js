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
document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    setupEventListeners();
    updateUI();
});

// 从服务器加载数据
async function loadData() {
    try {
        const [results, services] = await Promise.all([
            fetch('/api/tutorRequests').then(res => res.json()),
            fetch('/api/customerService').then(res => res.json())
        ]);

        state.results = results || [];
        state.customerServices = services || [];
        state.recommendedItems = new Set(
            results.filter(item => item.is_recommended).map(item => item.id)
        );
        
        updateUI();
    } catch (error) {
        console.error('加载数据失败:', error);
        alert('加载数据失败，请刷新页面重试');
    }
}

// 保存数据到服务器
async function saveData() {
    try {
        const results = state.results.map(item => ({
            ...item,
            is_recommended: state.recommendedItems.has(item.id)
        }));

        // 批量更新所有记录
        await Promise.all(
            results.map(item =>
                fetch('/api/tutorRequests', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(item)
                })
            )
        );
    } catch (error) {
        console.error('保存数据失败:', error);
        alert('保存数据失败，请重试');
    }
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

    // 文件输入相关
    document.getElementById('fileInput')?.addEventListener('change', handleFileUpload);

    // 录家教按钮
    document.getElementById('parseBtn')?.addEventListener('click', handleAnalyzeAndAdd);
    
    // 导出按钮
    document.getElementById('exportBtn')?.addEventListener('click', exportToExcel);
    
    // 导出按钮
    document.getElementById('exportDataBtn')?.addEventListener('click', exportData);
    
    // 导出本地存储数据到文件按钮
    document.getElementById('exportToFileBtn')?.addEventListener('click', exportLocalStorageToFile);
    
    // 导入按钮
    const importDataInput = document.getElementById('importDataInput');
    if (importDataInput) {
        importDataInput.addEventListener('change', (e) => {
            const file = e.target.files?.[0];
            if (file) importData(file);
        });
    }
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
    const textArea = document.getElementById('textInput');
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
async function handleAnalyzeAndAdd() {
    const inputContent = document.getElementById('inputContent');
    if (!inputContent) {
        console.error('Input element not found');
        return;
    }

    const content = inputContent.value.trim();
    if (!content) {
        alert('请输入内容');
        return;
    }

    try {
        const result = analyzeContent(content);
        if (!result) {
            alert('内容格式不正确');
            return;
        }

        // 准备要保存的数据
        const requestData = {
            content: content,
            subjects: result.subjects,
            grade: result.gradeLevel,
            location: result.city + (result.district ? ` ${result.district}` : ''),
            status: 'pending'
        };

        // 发送到服务器
        const response = await fetch('/api/tutorRequests', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify([requestData])
        });

        if (!response.ok) {
            throw new Error('保存失败');
        }

        // 清空输入框
        inputContent.value = '';
        
        // 重新加载数据
        await loadData();
        
        // 更新UI
        updateResultsList();
        
        alert('添加成功！');
    } catch (error) {
        console.error('Error in handleAnalyzeAndAdd:', error);
        alert('添加失败：' + error.message);
    }
}

// 更新客服列表
async function updateCustomerServiceList() {
    try {
        const response = await fetch('/api/customerService');
        const services = await response.json();
        state.customerServices = services;
        
        const customerServiceList = document.getElementById('customerServiceList');
        customerServiceList.innerHTML = services.map(cs => `
            <div class="customer-service-item">
                <span>${cs.name}</span>
                <span class="wechat-id" onclick="handleCopyWechatId('${cs.wechat_id}')">${cs.wechat_id}</span>
                ${state.isAdmin ? `<button onclick="deleteCustomerService('${cs.id}')">删除</button>` : ''}
            </div>
        `).join('');
    } catch (error) {
        console.error('更新客服列表失败:', error);
    }
}

// 删除客服
async function deleteCustomerService(id) {
    if (!confirm('确定要删除这个客服吗？')) return;

    try {
        await fetch(`/api/customerService?id=${id}`, { method: 'DELETE' });
        state.customerServices = state.customerServices.filter(cs => cs.id !== id);
        updateCustomerServiceList();
    } catch (error) {
        console.error('删除客服失败:', error);
        alert('删除失败，请重试');
    }
}

// 添加客服
async function addCustomerService(name, wechatId) {
    try {
        const response = await fetch('/api/customerService', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, wechat_id: wechatId })
        });

        if (!response.ok) throw new Error('添加失败');

        const newService = await response.json();
        state.customerServices.push(newService);
        updateCustomerServiceList();
    } catch (error) {
        console.error('添加客服失败:', error);
        alert('添加失败，请重试');
    }
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
        const isRecommended = state.recommendedItems.has(result.id);
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

// 数据导出功能
async function exportData() {
    try {
        const [results, services] = await Promise.all([
            fetch('/api/tutorRequests').then(res => res.json()),
            fetch('/api/customerService').then(res => res.json())
        ]);

        const data = {
            customerServices: services,
            results: results,
            recommendedItems: Array.from(state.recommendedItems)
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `家教数据_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('导出数据失败:', error);
        alert('导出失败，请重试');
    }
}

// 导出本地存储数据到文件
function exportLocalStorageToFile() {
    const data = {
        tutorRequests: state.results,
        customerServices: state.customerServices
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tutoring_data_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// 导入数据
async function importData(file) {
    try {
        const content = await file.text();
        const data = JSON.parse(content);

        // 导入客服数据
        await Promise.all(
            data.customerServices.map(cs =>
                fetch('/api/customerService', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(cs)
                })
            )
        );

        // 导入家教需求
        await Promise.all(
            data.results.map(item =>
                fetch('/api/tutorRequests', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(item)
                })
            )
        );

        // 更新状态
        state.recommendedItems = new Set(data.recommendedItems);
        await loadData(); // 重新加载数据
        alert('数据导入成功');
    } catch (error) {
        console.error('导入数据失败:', error);
        alert('导入失败，请确保文件格式正确');
    }
}

// 自动备份功能
function setupAutoBackup() {
    // 每天自动备份一次
    const BACKUP_INTERVAL = 24 * 60 * 60 * 1000; // 24小时
    
    setInterval(() => {
        const lastBackup = localStorage.getItem('lastBackupTime');
        const now = new Date().getTime();
        
        if (!lastBackup || now - parseInt(lastBackup) >= BACKUP_INTERVAL) {
            exportData();
            localStorage.setItem('lastBackupTime', now.toString());
        }
    }, 60 * 60 * 1000); // 每小时检查一次
}
