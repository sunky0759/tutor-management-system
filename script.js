// 全局变量声明
// autoSaveTimeout: 用于自动保存的定时器
// allResults: 存储所有的家教信息记录
// filteredResults: 存储经过筛选后的家教信息记录
let autoSaveTimeout;
let allResults = [];
let filteredResults = [];

// 年级匹配模式定义
// 使用正则表达式匹配不同学段的描述文本
const GRADE_PATTERNS_NEW = {
    '小学': { 
        // 匹配"小学"、"小一"到"小六"、"一年级"到"六年级"等格式
        pattern: /小学|小[一二三四五六]|[一二三四五六]年级|[1-6]年级|(?:小学)[一二三四五六]年级/ 
    },
    '初中': {
        // 匹配"初中"、"初一"到"初三"、"七年级"到"九年级"等格式
        pattern: /(?:初中|初)[一二三]|[七八九]年级|[7-9]年级|(?<!小)三年级(?!小学)/ 
    },
    '高中': {
        // 匹配"高中"、"高一"到"高三"等格式
        pattern: /(?:高中|高)[一二三]|高三?年级/ 
    },
    '幼儿': {
        // 匹配幼儿园相关描述
        pattern: /幼儿园|幼小|学前班/ 
    },
    '成人': {
        // 匹配成人教育相关描��
        pattern: /成人|在职|上班族|大学生/ 
    }
};

// 可选科目列表
// 定义系统支持的所有科目选项
const SUBJECT_LIST = [
    '语文', '数学', '英语', '物理', '化学', '生物', 
    '政治', '历史', '地理', '全科', '作业辅导', '��数',
    '编程', '声乐', '美术', '数理化', '钢琴'
];

// 生成唯一标识符
// 使用时间戳和随机数组合生成不重复的 ID
function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 数据持久化：保存到本地存储
function saveDataToStorage() {
    try {
        localStorage.setItem('tutorData', JSON.stringify(allResults));
        console.log('数据保存成功');
    } catch (e) {
        console.error('保存数据失败:', e);
    }
}

// 数据加载：从本地存储加载数据
function loadData() {
    try {
        const savedData = localStorage.getItem('tutorData');
        if (savedData) {
            // 解析存储的数据并更新界面
            allResults = JSON.parse(savedData);
            displayResults(allResults);
            updateFilterOptions();
            updateTotalCount();
            console.log('成功加载数据:', allResults.length, '条记录');
        }
    } catch (e) {
        console.error('加载数据失��:', e);
        allResults = [];
    }
}

// 薪资信息提取
// 从文本中解析出薪资金额和单位
function extractSalaryInfo(text) {
    // 将文本按行分割以便处理
    const lines = text.split('\n');
    
    // 优先查找带有【】标识的薪酬相关
    let salaryLine = lines.find(line => {
        // 提取【】中的内容
        const matches = line.match(/【([^】]+)】/g);
        if (!matches) return false;
        
        // 检查任意【】中的内容是否包含薪酬相关关键词
        return matches.some(match => {
            const content = match.replace(/[【】]/g, '');
            return content.includes('课费') ||
                   content.includes('薪酬') ||
                   content.includes('课酬') ||
                   content.includes('课时费') ||
                   content.includes('薪资');
        });
    });

    // 如果没找到带标识的行，查找其他可能包含薪酬信息的行
    if (!salaryLine) {
        salaryLine = lines.find(line => 
            line.includes('课酬') || 
            line.includes('薪酬') || 
            line.includes('课费') ||
            line.includes('课时费') ||
            (line.includes('工资') && !line.includes('工资条')) ||
            line.includes('报酬') ||
            /\d+[\-~到至]\d+\/[2]?(?:小时|h|hr|hour|课时|节课|课|次|月)/.test(line) ||
            /\d+\/[2]?(?:小时|h|hr|hour|课时|节课|课|次|月)/.test(line)
        );
    }
    
    // 如果未找到薪资信息，返回空对象
    if (!salaryLine) return { salary: '', salaryUnit: '' };
    
    // 薪酬匹配模式数组，按优先级排序
    const salaryPatterns = [
        // 匹配 xxx-xxx/2小时 格式
        {
            pattern: /(\d+)(?:\s*[-~到至]\s*)(\d+)\s*[\/每]?\s*2\s*(?:小时|h|hr|hour)/i,
            handler: (match) => ({
                salary: `${match[1]}-${match[2]}`,
                salaryUnit: '2小时'
            })
        },
        // 匹配 xxx/2小时 格式
        {
            pattern: /(\d+)\s*[\/每]?\s*2\s*(?:小时|h|hr|hour)/i,
            handler: (match) => ({
                salary: match[1],
                salaryUnit: '2小时'
            })
        },
        // 匹配其他范围格式
        {
            pattern: /(\d+)(?:\s*[-~到至]\s*)(\d+)\s*元?\s*[\/每]?\s*(小时|h|hr|hour|课时|节课|课|次|月)/i,
            handler: (match) => ({
                salary: `${match[1]}-${match[2]}`,
                salaryUnit: standardizeUnit(match[3])
            })
        },
        // 匹配其他单值格式
        {
            pattern: /(\d+)\s*元?\s*[\/每]?\s*(小时|h|hr|hour|课时|节课|课|次|月)/i,
            handler: (match) => ({
                salary: match[1],
                salaryUnit: standardizeUnit(match[2])
            })
        }
    ];

    // 遍历匹配模式尝试提取薪资信息
    for (const {pattern, handler} of salaryPatterns) {
        const match = salaryLine.match(pattern);
        if (match) {
            return handler(match);
        }
    }
    
    return { salary: '', salaryUnit: '' };
}

// 初始化位置选择器
// 设置城市和区域选择器的联动关系
function initializeLocationSelectors() {
    const filterCity = document.getElementById('filterCity');
    const filterDistrict = document.getElementById('filterDistrict');

    // 当城市选择发生变化时更新区域选项
    filterCity.addEventListener('change', function() {
        const selectedCity = this.value;
        // 重置区域选择器
        filterDistrict.innerHTML = '<option value="">所有区域</option>';
        
        if (selectedCity && cityData[selectedCity]) {
            // 添加线上选项
            filterDistrict.innerHTML += '<option value="线上">线上</option>';
            
            // 添加选中城市的所有区域
            cityData[selectedCity].sort().forEach(district => {
                filterDistrict.innerHTML += `<option value="${district}">${district}</option>`;
            });
        }
    });
}

// ... 其他代码 ...

// 初始化事件监听
function initializeFilters() {
    // 监听筛选条件变化
    $('#searchInput').off('input').on('input', applyFilters);
    
    // 初始化位置选择器
    initializeLocationSelectors();
    
    // 其他筛选器的事件监听
    $('#filterGrade').off('change').on('change', applyFilters);
    $('#filterSubject').off('change').on('change', applyFilters);
    $('#filterDate').off('change').on('change', applyFilters);
    
    // 初始化时显示所有结果
    resetFilters();
}

// 格式化日期为 YYYY-MM-DD
function formatDate(date) {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
}

// 重置筛选条件
function resetFilters() {
    // 重置所有筛选条
    $('#searchInput').val('');
    $('#filterCity').val('');
    $('#filterDistrict').val('');
    $('#filterGrade').val('');
    $('#filterSubject').val('');
    $('#filterDate').val('');
    $('#dateStart').val('');
    $('#dateEnd').val('');
    
    // 置筛选结果
    filteredResults = [...allResults];
    
    // 更新显示
    displayResults(filteredResults);
    
    // 更新筛选选项
    updateFilterOptions();
}

// 应用筛选条件
function applyFilters() {
    const searchText = $('#searchInput').val().toLowerCase();
    const selectedCity = $('#filterCity').val();
    const selectedDistrict = $('#filterDistrict').val();
    const selectedGrade = $('#filterGrade').val();
    const selectedSubject = $('#filterSubject').val();
    const selectedDate = $('#filterDate').val();
    const dateStart = $('#dateStart').val();
    const dateEnd = $('#dateEnd').val();

    // 从所有开始筛选
    filteredResults = [...allResults];

    // 应用搜索文本筛选
    if (searchText) {
        filteredResults = filteredResults.filter(result => 
            result.raw.toLowerCase().includes(searchText)
        );
    }

    // 应用城市筛选
    if (selectedCity) {
        filteredResults = filteredResults.filter(result => 
            result.city && result.city.includes(selectedCity)
        );
    }

    // 应用区域筛选
    if (selectedDistrict) {
        filteredResults = filteredResults.filter(result => 
            result.district && result.district.includes(selectedDistrict)
        );
    }

    // 应用年级筛选
    if (selectedGrade) {
        filteredResults = filteredResults.filter(result => 
            result.grade === selectedGrade
        );
    }

    // 应用科目筛选
    if (selectedSubject) {
        filteredResults = filteredResults.filter(result => 
            result.subjects && result.subjects.includes(selectedSubject)
        );
    }

    // 应用日期筛选
    if (selectedDate || (dateStart && dateEnd)) {
        filteredResults = filteredResults.filter(result => {
            if (!result.createTime) return false;
            
            const createDate = new Date(result.createTime);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            switch (selectedDate) {
                case 'today':
                    return createDate >= today;
                case 'yesterday': {
                    const yesterday = new Date(today);
                    yesterday.setDate(yesterday.getDate() - 1);
                    return createDate >= yesterday && createDate < today;
                }
                case 'week': {
                    const weekAgo = new Date(today);
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return createDate >= weekAgo;
                }
                case 'month': {
                    const monthAgo = new Date(today);
                    monthAgo.setMonth(monthAgo.getMonth() - 1);
                    return createDate >= monthAgo;
                }
                case 'halfYear': {
                    const halfYearAgo = new Date(today);
                    halfYearAgo.setMonth(halfYearAgo.getMonth() - 6);
                    return createDate >= halfYearAgo;
                }
                case 'custom': {
                    if (dateStart && dateEnd) {
                        const start = new Date(dateStart);
                        const end = new Date(dateEnd);
                        end.setHours(23, 59, 59, 999);
                        return createDate >= start && createDate <= end;
                    }
                    return true;
                }
                default:
                    return true;
            }
        });
    }

    // 显示筛选后的结果
    displayResults(filteredResults);
}

// 更新筛选选项
function updateFilterOptions() {
    // 获取所有城市、区域、年级和科目
    const cities = new Set();
    const districts = new Set();
    const grades = new Set();
    const subjects = new Set();

    allResults.forEach(result => {
        if (result.city) cities.add(result.city);
        if (result.district) districts.add(result.district);
        if (result.grade) grades.add(result.grade);
        if (result.subjects && Array.isArray(result.subjects)) {
            result.subjects.forEach(subject => subjects.add(subject));
        }
    });

    // 更新城市筛选下拉列表
    const filterCity = document.getElementById('filterCity');
    filterCity.innerHTML = '<option value="">所有城市</option>';
    
    // 先添加"全国"选项（如果存在）
    if (cities.has('全国')) {
        filterCity.innerHTML += `<option value="全国">全国</option>`;
        cities.delete('全国');
    }
    
    // 添加其他城市
    Array.from(cities).sort().forEach(city => {
        filterCity.innerHTML += `<option value="${city}">${city}</option>`;
    });

    // 更新区域筛选下拉列表
    const filterDistrict = document.getElementById('filterDistrict');
    filterDistrict.innerHTML = '<option value="">所有区域</option>';
    
    // 先添加"线上"选项（如果存在）
    if (districts.has('线上')) {
        filterDistrict.innerHTML += `<option value="线上">线上</option>`;
        districts.delete('线上');
    }
    
    // 添加其他区域
    Array.from(districts).sort().forEach(district => {
        filterDistrict.innerHTML += `<option value="${district}">${district}</option>`;
    });

    // 更新年级和科目筛选
    updateGradeAndSubjectFilters(grades, subjects);
}

// 更新年级和科目筛选
function updateGradeAndSubjectFilters(grades, subjects) {
    // 更新年级拉列表
    const filterGrade = document.getElementById('filterGrade');
    filterGrade.innerHTML = '<option value="">所有年级</option>';
    Array.from(grades).sort().forEach(grade => {
        filterGrade.innerHTML += `<option value="${grade}">${grade}</option>`;
    });

    // 更新科目下拉列表
    const filterSubject = document.getElementById('filterSubject');
    filterSubject.innerHTML = '<option value="">所有科目</option>';
    Array.from(subjects).sort().forEach(subject => {
        filterSubject.innerHTML += `<option value="${subject}">${subject}</option>`;
    });
}

// 导入城市数据
import cityData from './cityData.js';

// 提取城市区域信息
function extractCityAndDistrict(text) {
    console.log('开始提取城市区域信息:', text); // 调试日志
    
    // 检查是否为线上课程
    if (/线上|网课|远程|在线|视频|网络/.test(text)) {
        return {
            city: '全国',
            district: '线上'
        };
    }

    let foundCity = null;
    let foundDistrict = null;

    // 先尝试匹配区域，因为区域信息通常更具体
    for (const [city, districts] of Object.entries(cityData)) {
        for (const district of districts) {
            // 检查完整的区域名称或简称
            const districtWithoutSuffix = district.replace(/[区市县镇]$/, '');
            console.log('检查区域:', district, districtWithoutSuffix); // 调试日志
            if (text.includes(district) || text.includes(districtWithoutSuffix)) {
                foundCity = city;
                foundDistrict = district;
                console.log('找到区域匹配:', city, district); // 调试日志
                break;
            }
        }
        if (foundCity) break;
    }

    // 如果没找到区域，尝试匹配城市
    if (!foundCity) {
        for (const city of Object.keys(cityData)) {
            const cityWithoutSuffix = city.replace(/[市]$/, '');
            console.log('检查城市:', city, cityWithoutSuffix); // 调试日志
            if (text.includes(city) || text.includes(cityWithoutSuffix)) {
                foundCity = city;
                // 找到城市后，再次尝试匹配该城市的区域
                for (const district of cityData[city]) {
                    const districtWithoutSuffix = district.replace(/[区市县镇]$/, '');
                    if (text.includes(district) || text.includes(districtWithoutSuffix)) {
                        foundDistrict = district;
                        console.log('找到城市和区域匹配:', city, district); // 调试日志
                        break;
                    }
                }
                break;
            }
        }
    }

    // 如果找到了城市但没找到区域，再次尝试更宽松的匹配
    if (foundCity && !foundDistrict) {
        const districts = cityData[foundCity];
        for (const district of districts) {
            const districtWithoutSuffix = district.replace(/[区市县镇]$/, '');
            // 更宽松的匹配，允许部分匹配和忽略大小写
            if (text.toLowerCase().includes(districtWithoutSuffix.toLowerCase())) {
                foundDistrict = district;
                console.log('找到宽松匹配:', district); // 调试日志
                break;
            }
        }
    }

    console.log('提取结果:', { city: foundCity, district: foundDistrict }); // 调试日志
    return {
        city: foundCity || '',
        district: foundDistrict || ''
    };
}

// 解析文本
function parseText(text) {
    if (!text) return [];
    
    console.log('开始解析文本:', text);
    
    // 将文本按连续两个或以上换行符分割，得到多个家教信息
    const tutorTexts = text.split(/\n\s*\n+/).filter(text => text.trim());
    const results = [];
    
    tutorTexts.forEach(tutorText => {
        // 为每条家教信息创建一个结果对象
        const result = {
            id: generateUniqueId(),
            raw: tutorText.trim(),
            city: '',
            district: '',
            grade: '',
            subjects: [],
            salary: '',
            salaryUnit: '',
            isTop: false,
            createTime: new Date().toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            })
        };
        
        // 提取城市和区域信息
        const locationInfo = extractCityAndDistrict(tutorText);
        result.city = locationInfo.city;
        result.district = locationInfo.district;
        
        // 提取年级信息
        result.grade = extractGrade(tutorText);
        
        // 提取科目信息
        const subjects = new Set();
        SUBJECT_LIST.forEach(subject => {
            if (tutorText.includes(subject)) {
                subjects.add(subject);
            }
        });
        result.subjects = Array.from(subjects);
        
        // 提取薪资信息
        const salaryInfo = extractSalaryInfo(tutorText);
        result.salary = salaryInfo.salary;
        result.salaryUnit = salaryInfo.salaryUnit;
        
        results.push(result);
    });
    
    return results;
}

// 初始化编辑模态框
function initializeEditModal() {
    // 初始化编辑模态框的事件监听
    const editModal = document.getElementById('editModal');
    if (!editModal) return;

    // 绑定保存按钮事件
    const saveButton = editModal.querySelector('.btn-primary');
    if (saveButton) {
        saveButton.addEventListener('click', saveEdit);
    }

    // 初化科目选择
    const subjectsContainer = document.getElementById('editSubjects');
    if (subjectsContainer) {
        subjectsContainer.innerHTML = SUBJECT_LIST.map(subject => `
            <div class="form-check form-check-inline">
                <input class="form-check-input" type="checkbox" id="subject-${subject}" value="${subject}">
                <label class="form-check-label" for="subject-${subject}">${subject}</label>
            </div>
        `).join('');
    }

    // 初化年级选择
    const gradeSelect = document.getElementById('editGradeLevel');
    if (gradeSelect) {
        gradeSelect.innerHTML = Object.keys(GRADE_PATTERNS_NEW).map(grade => 
            `<option value="${grade}">${grade}</option>`
        ).join('');
    }
}

// 保存编辑
function saveEdit() {
    const id = $('#editModal').data('editId');
    const result = allResults.find(r => r.id === id);
    
    if (!result) {
        console.error('未找到要编辑的记录');
        return;
    }

    // 更新数据
    result.raw = $('#editRawContent').val().trim();
    result.city = $('#editCity').val().trim();
    result.district = $('#editDistrict').val().trim();
    result.grade = $('#editGradeLevel').val();
    
    // 收集选中的科目
    result.subjects = [];
    $('#editSubjects input[type="checkbox"]:checked').each(function() {
        result.subjects.push($(this).val());
    });
    
    // 重新解析薪资信息
    const salaryInfo = extractSalaryInfo(result.raw);
    result.salary = salaryInfo.salary;
    result.salaryUnit = salaryInfo.salaryUnit;
    
    // 保存数据
    saveDataToStorage();
    
    // 更新显示
    displayResults(allResults);
    updateFilterOptions();
    
    // 关闭模态框
    const editModal = bootstrap.Modal.getInstance(document.getElementById('editModal'));
    if (editModal) {
        editModal.hide();
    }

    // 显示成功提示
    alert('编辑成功！');
}

// 在页面加载时初始化
$(document).ready(function() {
    // 初始化空数组
    allResults = [];

    // 初始化编辑模态框
    initializeEditModal();
    
    // 初始化筛选器
    initializeFilters();
    
    // 初始化批量操作按钮事件
    $('#batchCopy').off('click').on('click', batchCopy);
    $('#batchDelete').off('click').on('click', batchDelete);
    $('#batchExport').off('click').on('click', exportText);
    
    // 初始化识别文本按钮事件
    $('#parseBtn').off('click').on('click', function() {
        const textInput = $('#textInput').val().trim();
        if (!textInput) {
            alert('请输入要识别的文本');
            return;
        }
        
        // 解析文本并检查重复
        const newResults = parseText(textInput);
        const duplicates = [];
        const uniqueResults = [];
        
        // 检查重复
        newResults.forEach(newResult => {
            const isDuplicate = allResults.some(existingResult => 
                existingResult.raw.replace(/\s+/g, '') === newResult.raw.replace(/\s+/g, '')
            );
            
            if (isDuplicate) {
                duplicates.push(newResult.raw);
            } else {
                uniqueResults.push(newResult);
            }
        });
        
        // 如果有重复的文本，显示提示
        if (duplicates.length > 0) {
            alert(`发现 ${duplicates.length} 条重复的家教信息：\n\n${duplicates.join('\n\n')}`);
        }
        
        if (uniqueResults.length > 0) {
            // 更新全局数据
            allResults = [...allResults, ...uniqueResults];
            
            // 保存数据
            saveDataToStorage();
            
            // 更新显示
            displayResults(allResults);
            updateFilterOptions();
            updateTotalCount();
            
            // 显示成功消息
            alert(`成功识别 ${uniqueResults.length} 条家教信息${duplicates.length > 0 ? '，已过重复内容' : ''}`);
            
            // 清空输入框
            $('#textInput').val('');
            
            // 关闭模态框
            const addModal = bootstrap.Modal.getInstance(document.getElementById('addModal'));
            if (addModal) {
                addModal.hide();
            }
        } else if (duplicates.length > 0) {
            alert('所有家教信息都已存在，请添加新记录');
        }
    });
    
    // 从存储加载数据
    loadData();
    
    // 初始化全选功能
    $('#selectAll').off('change').on('change', function() {
        const isChecked = $(this).prop('checked');
        $('.card-select').prop('checked', isChecked);
        updateSelectedCount();
        updateBatchActionsVisibility();
    });
    
    // 监听单个选择框的变化
    $(document).on('change', '.card-select', function() {
        updateSelectedCount();
        updateBatchActionsVisibility();
    });
    
    // 初始化文件拖放和粘贴功能
    initializeFileHandling();
});

// 初始化文件处理
function initializeFileHandling() {
    const textInput = document.getElementById('textInput');
    const dragOverlay = document.querySelector('.drag-overlay');
    if (!textInput) return;

    // 添加拖放事件监听
    textInput.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        textInput.classList.add('dragover');
        dragOverlay.style.display = 'flex';
    });

    textInput.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        textInput.classList.remove('dragover');
        dragOverlay.style.display = 'none';
    });

    textInput.addEventListener('drop', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        textInput.classList.remove('dragover');
        dragOverlay.style.display = 'none';

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            await handleFiles(files);
        }
    });

    // 添加粘贴事件监听
    textInput.addEventListener('paste', async (e) => {
        const files = e.clipboardData.files;
        if (files.length > 0) {
            e.preventDefault();
            await handleFiles(files);
        }
    });
}

// 处理文件
async function handleFiles(files) {
    for (const file of files) {
        try {
            // 检查文件类型
            if (!isValidFileType(file)) {
                alert('只支持 .txt 和 .doc/.docx 文件');
                continue;
            }

            let text = '';
            if (file.type === 'text/plain') {
                // 处理 txt 文件
                text = await readTextFile(file);
            } else {
                // 处理 word 文件
                text = await readWordFile(file);
            }

            // 将文本添加到输入框
            const textInput = document.getElementById('textInput');
            const currentText = textInput.value;
            textInput.value = currentText ? `${currentText}\n\n${text}` : text;

        } catch (error) {
            console.error('读取文件失败:', error);
            alert(`读取文件 ${file.name} 失败: ${error.message}`);
        }
    }
}

// 检查文件类型是否有效
function isValidFileType(file) {
    const validTypes = [
        'text/plain',                                                    // .txt
        'application/msword',                                           // .doc
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'  // .docx
    ];
    return validTypes.includes(file.type);
}

// 读取文本文件
function readTextFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(new Error('读取文本件失败'));
        reader.readAsText(file);
    });
}

// 读取 Word 文件
async function readWordFile(file) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return result.value;
    } catch (error) {
        throw new Error('读取 Word 文件失败，请确保文件格式正确');
    }
}

// 显示结果
function displayResults(results) {
    const $resultsContainer = $('#results');
    $resultsContainer.empty();
    
    // 更新搜索结果数
    $('#searchResultCount').text(results.length);
    
    if (!results || results.length === 0) {
        $resultsContainer.html('<div class="alert alert-info">没有找到匹配的结果</div>');
        return;
    }
    
    // 对结果进行排序：置顶的在前，然后按创建时间倒序排列
    const sortedResults = [...results].sort((a, b) => {
        if (a.isTop && !b.isTop) return -1;
        if (!a.isTop && b.isTop) return 1;
        return new Date(b.createTime) - new Date(a.createTime);
    });
    
    sortedResults.forEach(result => {
        const card = createResultCard(result);
        $resultsContainer.append(card);
    });
    
    // 更新选中状态
    updateSelectedCount();
    updateBatchActionsVisibility();
}

// 创建结果卡片
function createResultCard(result) {
    const card = $('<div>').addClass('card result-card mb-2');
    if (result.isTop) {
        card.addClass('topped');
    }
    
    const cardBody = $('<div>').addClass('card-body');
    
    // 添加复选框
    const checkbox = $('<div>').addClass('form-check float-end');
    const checkboxInput = $('<input>')
        .addClass('form-check-input card-select')
        .attr({
            type: 'checkbox',
            'data-id': result.id
        });
    checkbox.append(checkboxInput);
    cardBody.append(checkbox);
    
    // 添加标题行
    const titleRow = $('<div>').addClass('d-flex justify-content-between align-items-center mb-2');
    
    // 创建市区域和薪资的器
    const locationContainer = $('<div>').addClass('d-flex align-items-center');
    
    // 添加置顶标记（如果已置顶）
    if (result.isTop) {
        const topTag = $('<span>')
            .addClass('tag tag-top me-2')
            .html('<i class="bi bi-pin-angle-fill"></i> 置顶');
        locationContainer.append(topTag);
    }
    
    // 添加城市区域（加显示）
    const location = $('<h5>')
        .addClass('card-title mb-0 me-2 fw-bold')
        .text(result.city + (result.district ? ' ' + result.district : ''));
    locationContainer.append(location);
    
    // 添加薪资信息（紧跟在城市区域后面）
    if (result.salary) {
        const salary = $('<span>')
            .addClass('salary-info text-success')
            .text(result.salary + (result.salaryUnit ? '/' + result.salaryUnit : '元'));
        locationContainer.append(salary);
    }
    
    titleRow.append(locationContainer);
    cardBody.append(titleRow);
    
    // 添加标签器
    const tagsContainer = $('<div>').addClass('tags-container');
    
    // 添加年级标签
    if (result.grade) {
        const gradeTag = $('<span>')
            .addClass('tag tag-grade')
            .text(result.grade);
        tagsContainer.append(gradeTag);
    }
    
    // 添加科目标签
    if (result.subjects && result.subjects.length > 0) {
        result.subjects.forEach(subject => {
            const subjectTag = $('<span>')
                .addClass('tag tag-subject')
                .text(subject);
            tagsContainer.append(subjectTag);
        });
    }
    cardBody.append(tagsContainer);
    
    // 添加原始文本
    const rawText = $('<p>')
        .addClass('card-text')
        .css('white-space', 'pre-wrap')
        .text(result.raw);
    cardBody.append(rawText);
    
    // 添加创建时间和操作按钮
    const bottomRow = $('<div>')
        .addClass('d-flex justify-content-between align-items-center mt-2');
    
    // 添加创建时间
    if (result.createTime) {
        const createTime = $('<small>')
            .addClass('text-muted')
            .css('font-size', '0.85em')
            .text(result.createTime);
        bottomRow.append(createTime);
    }
    
    // 添加操作按钮
    const actionButtons = $('<div>')
        .addClass('btn-group btn-group-sm');
    
    // 置顶/取消置顶按钮
    const topButton = $('<button>')
        .addClass(`btn btn-sm ${result.isTop ? 'btn-warning' : 'btn-outline-warning'}`)
        .html(`<i class="bi bi-pin-angle${result.isTop ? '' : '-fill'}"></i>`)
        .attr('title', result.isTop ? '取消置顶' : '置顶')
        .on('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            toggleTop(result.id);
            return false;
        });
    actionButtons.append(topButton);
    
    // 编辑按钮
    const editButton = $('<button>')
        .addClass('btn btn-outline-primary btn-sm')
        .html('<i class="bi bi-pencil"></i> 编辑')
        .on('click', () => openEditModal(result));
    actionButtons.append(editButton);
    
    // 删除按钮
    const deleteButton = $('<button>')
        .addClass('btn btn-outline-danger btn-sm')
        .html('<i class="bi bi-trash"></i> 删除')
        .on('click', () => deleteRecord(result.id));
    actionButtons.append(deleteButton);
    
    bottomRow.append(actionButtons);
    cardBody.append(bottomRow);
    
    card.append(cardBody);
    return card;
}

// 打开编辑模态框
function openEditModal(result) {
    const editModal = document.getElementById('editModal');
    if (!editModal) return;

    // 设置编辑ID
    editModal.dataset.editId = result.id;
    
    // 初始化城市和区域输入框
    initializeCityInput();
    initializeDistrictInput();
    
    // 充表单
    document.getElementById('editRawContent').value = result.raw;
    document.getElementById('editCity').value = result.city;
    document.getElementById('editDistrict').value = result.district;
    document.getElementById('editGradeLevel').value = result.grade;
    
    // 重置目选择
    const subjectCheckboxes = editModal.querySelectorAll('#editSubjects input[type="checkbox"]');
    subjectCheckboxes.forEach(checkbox => checkbox.checked = false);
    
    // 选中已有科目
    if (result.subjects && result.subjects.length > 0) {
        result.subjects.forEach(subject => {
            const checkbox = editModal.querySelector(`#subject-${subject}`);
            if (checkbox) checkbox.checked = true;
        });
    }
    
    // 使用 Bootstrap 的方法打开模态框
    const modal = new bootstrap.Modal(editModal);
    modal.show();
}

// 初始化区域输入框
function initializeDistrictInput() {
    const districtInput = document.getElementById('editDistrict');
    const districtDatalist = document.createElement('datalist');
    districtDatalist.id = 'districtList';
    
    // 添加事件监听
    districtInput.addEventListener('input', function() {
        const searchText = this.value.toLowerCase();
        const selectedCity = document.getElementById('editCity').value;
        
        districtDatalist.innerHTML = '';
        
        // 先添加"线上"选项
        if ('线上'.toLowerCase().includes(searchText)) {
            const option = document.createElement('option');
            option.value = '线上';
            districtDatalist.appendChild(option);
        }
        
        // 如果选择了城市，只显示该城市的区域
        if (selectedCity && cityData[selectedCity]) {
            cityData[selectedCity]
                .filter(district => district.toLowerCase().includes(searchText))
                .forEach(district => {
                    const option = document.createElement('option');
                    option.value = district;
                    districtDatalist.appendChild(option);
                });
        }
    });
    
    // 设置datalist
    districtInput.setAttribute('list', 'districtList');
    document.body.appendChild(districtDatalist);
}

// 删除单条记录
function deleteRecord(id) {
    if (!confirm('确定要删除这条记录吗？')) {
        return;
    }

    // 数组中删除记录
    allResults = allResults.filter(result => result.id !== id);
    
    // 保存更新后的数据
    saveDataToStorage();
    
    // 更新显示
    displayResults(allResults);
    updateFilterOptions();
    updateTotalCount();
}

// 复制到剪贴板
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        alert('复制成功');
    } catch (error) {
        console.error('复制失败:', error);
        // 降级方案
        try {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            alert('复制成功！');
        } catch (fallbackError) {
            console.error('降级复制也失败:', fallbackError);
            alert('复制失败，请动复制文本');
        }
    }
}

// 导出选中的文本
function exportText() {
    try {
        const selectedCheckboxes = $('.card-select:checked');
        if (selectedCheckboxes.length === 0) {
            alert('请选择要导出的项目');
            return;
        }

        const selectedTexts = [];
        const cities = new Set();  // 收集城市信息
        const grades = new Set();  // 收集年级信息
        const subjects = new Set(); // 收集科目信息
        
        selectedCheckboxes.each(function() {
            const id = $(this).data('id');
            const result = allResults.find(r => r.id === id);
            if (result) {
                selectedTexts.push(result.raw);
                if (result.city) {
                    cities.add(result.city);
                }
                if (result.grade) {
                    grades.add(result.grade);
                }
                if (result.subjects && result.subjects.length > 0) {
                    result.subjects.forEach(subject => subjects.add(subject));
                }
            }
        });
        
        if (selectedTexts.length === 0) {
            throw new Error('没有找到要导出的文本');
        }
        
        const text = selectedTexts.join('\n\n');
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        
        // 生成文件名
        const currentDate = new Date().toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).replace(/\//g, '');
        
        // 构建文件名
        let fileNameParts = [];
        
        // 添加城市信息
        const citiesArray = Array.from(cities);
        if (citiesArray.length === 1) {
            fileNameParts.push(citiesArray[0]);
        } else if (citiesArray.length > 1) {
            fileNameParts.push('多城市');
        }
        
        // 添加年级信息
        const gradesArray = Array.from(grades);
        if (gradesArray.length === 1) {
            fileNameParts.push(gradesArray[0]);
        }
        
        // 添加科目信息
        const subjectsArray = Array.from(subjects);
        if (subjectsArray.length === 1) {
            fileNameParts.push(subjectsArray[0]);
        }
        
        // 添加"家教信息"和日期
        fileNameParts.push('家教信息');
        fileNameParts.push(currentDate);
        
        // 组合文件名
        const fileName = fileNameParts.join('_') + '.txt';
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // 显示成功提示
        alert('导出成功！');
    } catch (error) {
        console.error('导出失败:', error);
        alert('导出失败，请稍后重试');
    }
}

// 更新总数
function updateTotalCount() {
    $('#totalCount').text(allResults.length);
}

// 更新选中数量
function updateSelectedCount() {
    const selectedCount = $('.card-select:checked').length;
    $('#selectedCount').text(selectedCount);
    
    // 新全选框状态
    const totalCount = $('.card-select').length;
    $('#selectAll').prop('checked', selectedCount > 0 && selectedCount === totalCount);
}

// 更新批量操作栏可见性
function updateBatchActionsVisibility() {
    const selectedCount = $('.card-select:checked').length;
    const $batchActions = $('#batchActions');
    
    if (selectedCount > 0) {
        $batchActions.slideDown(200);
    } else {
        $batchActions.slideUp(200);
    }
    
    // 更新选中数量显示
    $('#selectedCount').text(selectedCount);
    $('#totalCount').text($('.card-select').length);
}

// 批量删除
function batchDelete() {
    const selectedCheckboxes = $('.card-select:checked');
    if (selectedCheckboxes.length === 0) {
        alert('请先选择要删除的项目');
        return;
    }
    
    if (!confirm(`确定要删除选中的 ${selectedCheckboxes.length} 条记录？`)) {
        return;
    }
    
    const selectedIds = new Set();
    selectedCheckboxes.each(function() {
        selectedIds.add($(this).data('id'));
    });
    
    // 过滤掉要删除的记录
    allResults = allResults.filter(result => !selectedIds.has(result.id));
    
    // 保存更新后的数据
    saveDataToStorage();
    
    // 更新显示
    displayResults(allResults);
    updateFilterOptions();
    updateTotalCount();
}

// 批量复制
function batchCopy() {
    const selectedCheckboxes = $('.card-select:checked');
    if (selectedCheckboxes.length === 0) {
        alert('请先选择要复制的项');
        return;
    }
    
    const selectedTexts = [];
    selectedCheckboxes.each(function() {
        const id = $(this).data('id');
        const result = allResults.find(r => r.id === id);
        if (result) {
            selectedTexts.push(result.raw);
        }
    });
    
    // 如果选中的记录超过8条，提示用户选择复制方式
    if (selectedTexts.length > 8) {
        const BATCH_SIZE = 8;
        const totalBatches = Math.ceil(selectedTexts.length / BATCH_SIZE);
        
        if (confirm(`已选择 ${selectedTexts.length} 条记录，超过8条能不便于阅读。\n点击"确定"进行分批复制（共 ${totalBatches} 批，每批8条），点击"取消"进行全复制。`)) {
            // 分批复制
            for (let i = 0; i < selectedTexts.length; i += BATCH_SIZE) {
                const currentBatch = Math.floor(i / BATCH_SIZE) + 1;
                const batch = selectedTexts.slice(i, i + BATCH_SIZE);
                const text = batch.join('\n\n');
                copyToClipboard(text);
                
                if (i + BATCH_SIZE < selectedTexts.length) {
                    if (!confirm(`已复制 ${currentBatch} 批（共 ${totalBatches} 批）记录。\n是否继续复制下一批？`)) {
                        break;
                    }
                } else {
                    alert(`已完成所有 ${totalBatches} 批记录的复制。`);
                }
            }
        } else {
            // 全部复制
            const text = selectedTexts.join('\n\n');
            copyToClipboard(text);
        }
    } else {
        // 直接复制
        const text = selectedTexts.join('\n\n');
        copyToClipboard(text);
    }
}

// 更新输入框样式
function updateInputStyle(input) {
    const value = input.value.trim();
    if (value) {
        input.classList.add('has-value');
    } else {
        input.classList.remove('has-value');
    }
}

// 提取年级信息
function extractGrade(text) {
    // 优先匹配完整的年级描述
    const fullGradeMatch = text.match(/小学[一二三四五六]年级|小[一二三四五]年级/);
    if (fullGradeMatch) {
        return '小学';
    }

    // 如果包含"小"字且后��跟数字，则判定为小学
    const smallNumberMatch = text.match(/小[一二三四五六]/);
    if (smallNumberMatch) {
        return '小学';
    }

    // 匹高中相关关键词
    if (/高中|高一|高二|高三|国际高中|alv课程/.test(text)) {
        return '高中';
    }

    // 检查是否是大生要求的情况
    if (text.includes('学生') && (text.includes('要') || text.includes('薪酬'))) {
        return '';
    }

    // 检查是否是成人教育的情况
    if (/成人|在职|上班族/.test(text)) {
        return '成人';
    }

    // 其他情况按照正常模式匹配
    for (const [grade, pattern] of Object.entries(GRADE_PATTERNS_NEW)) {
        if (pattern.pattern.test(text)) {
            // 如果匹配到成人，但文本中包含"大学生"且是作为要求，则跳过
            if (grade === '成人' && text.includes('大学生') && (text.includes('要求') || text.includes('薪酬'))) {
                continue;
            }
            return grade;
        }
    }

    return '';
}

// 切换置顶状态
function toggleTop(id) {
    const result = allResults.find(r => r.id === id);
    if (result) {
        result.isTop = !result.isTop;
        saveDataToStorage();
        
        // 更新过滤后的结果
        filteredResults = filteredResults.map(r => 
            r.id === id ? {...r, isTop: result.isTop} : r
        );
        
        // 使用 history.go(0) 实现更快的页面刷新
        history.go(0);
    }
}

/**
 * 更新筛选选项
 * 根当前数据集中的实际数据动态更新筛选器的可选项
 * 包括：城市、区域、年级、科目等的更新
 */
function updateFilterOptions() {
    // 收集所有唯一的筛选选项
    const cities = new Set();
    const districts = new Set();
    const grades = new Set();
    const subjects = new Set();
    
    // 遍历所有结果，收集筛选选项
    allResults.forEach(result => {
        if (result.city) cities.add(result.city);
        if (result.district) districts.add(result.district);
        if (result.grade) grades.add(result.grade);
        if (result.subjects && Array.isArray(result.subjects)) {
            result.subjects.forEach(subject => subjects.add(subject));
        }
    });
    
    // 更新年级和科目的筛选选项
    updateGradeAndSubjectFilters(grades, subjects);
}
