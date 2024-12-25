// 常量定义
const CITIES_AND_DISTRICTS = {
    '北京': ['朝阳', '海淀', '东城', '西城', '丰台', '石景山', '通州', '昌平', '大兴', '顺义', '房山', '门头沟', '平谷', '怀柔', '密云', '延庆'],
    '上海': ['浦东', '黄浦', '徐汇', '长宁', '静安', '普陀', '虹口', '杨浦', '宝山', '闵行', '嘉定', '金山', '松江', '青浦', '奉贤', '崇明'],
    '广州': ['越秀', '海珠', '荔湾', '天河', '白云', '黄埔', '番禺', '花都', '南沙', '从化', '增城'],
    '深圳': ['福田', '罗湖', '南山', '盐田', '宝安', '龙岗', '龙华', '坪山', '光明', '大鹏'],
    '杭州': ['上城', '下城', '江干', '拱墅', '西湖', '滨江', '萧山', '余杭', '富阳', '临安', '建德', '桐庐', '淳安'],
};

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
    document.getElementById('adminEntryBtn').addEventListener('click', showAdminLogin);
    document.getElementById('adminLoginBtn').addEventListener('click', handleAdminLogin);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    // 文件上传相关
    const dropZone = document.getElementById('dropZone');
    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('drop', handleDrop);
    document.getElementById('fileUpload').addEventListener('change', handleFileUpload);

    // 其他按钮事件
    document.getElementById('analyzeBtn').addEventListener('click', handleAnalyzeAndAdd);
    document.getElementById('clearBtn').addEventListener('click', () => {
        document.getElementById('inputText').value = '';
    });
    document.getElementById('addCsBtn').addEventListener('click', handleAddCustomerService);
}

// UI更新函数
function updateUI() {
    const adminPanel = document.getElementById('adminPanel');
    const userPanel = document.getElementById('userPanel');
    const adminLoginPanel = document.getElementById('adminLoginPanel');
    const adminEntryContainer = document.getElementById('adminEntryContainer');

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
    const username = document.getElementById('adminUsername').value;
    const password = document.getElementById('adminPassword').value;
    const errorElement = document.getElementById('loginError');

    if (username === 'admin' && password === 'admin') {
        state.isAdmin = true;
        errorElement.classList.add('hidden');
        updateUI();
    } else {
        errorElement.textContent = '用户名或密码错误';
        errorElement.classList.remove('hidden');
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
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
            resolve(jsonData.map(row => row.join('\t')).join('\n'));
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

// 导出为Excel
function exportToExcel() {
    const ws = XLSX.utils.json_to_sheet(state.results);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "家教信息");
    XLSX.writeFile(wb, "家教信息.xlsx");
}

// 其他辅助函数...
// (这里需要添加分析文本、添加结果、更新结果列表等其他必要的函数) 