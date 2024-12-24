// 全局变量声明
let autoSaveTimeout;
let allResults = [];
let filteredResults = [];

function initializeFilters() {
    // 初始化全选功�?    $('#selectAll').on('change', function() {
        const isChecked = $(this).prop('checked');
        $('.card-select').prop('checked', isChecked);
        updateSelectedCount();
        updateBatchActionsVisibility();
    });
    
    // 初始化单个选择框的事件
    $(document).on('change', '.card-select', function() {
        updateSelectedCount();
        updateBatchActionsVisibility();
        updateSelectAllState();
    });
    
    // 初始化批量复制按钮事�?    $('#batchCopy').on('click', batchCopy);
    
    // 显示总数
    updateTotalCount();
}

// 更新总数显示
function updateTotalCount() {
    const totalCount = allResults.length;
    $('#totalCount').text(totalCount);
}

// 更新选中数量显示
function updateSelectedCount() {
    const selectedCount = $('.card-select:checked').length;
    $('#selectedCount').text(selectedCount);
}

// 更新全选框状�?function updateSelectAllState() {
    const totalCheckboxes = $('.card-select').length;
    const checkedCheckboxes = $('.card-select:checked').length;
    
    $('#selectAll').prop({
        checked: totalCheckboxes > 0 && totalCheckboxes === checkedCheckboxes,
        indeterminate: checkedCheckboxes > 0 && checkedCheckboxes < totalCheckboxes
    });
}

// 更新批量操作栏可见�?function updateBatchActionsVisibility() {
    const selectedCount = $('.card-select:checked').length;
    if (selectedCount > 0) {
        $('#batchActions').slideDown();
    } else {
        $('#batchActions').slideUp();
    }
}

// 在数据变化时更新显示
function updateFiltersAfterDataChange() {
    // 更新筛选选项
    updateFilterOptions();
    // 应用当前的筛选条�?    applyFilters();
    // 更新总数显示
    updateTotalCount();
    // 更新选中状�?    updateSelectedCount();
    updateSelectAllState();
    updateBatchActionsVisibility();
    // 保存数据
    saveDataToStorage();
}

// 确保�?DOM 加载完成后再调用
document.addEventListener('DOMContentLoaded', function() {
    initializeFilters();
});

// 处理输入框值变化时的样�?function updateInputStyle(input) {
    const wrapper = input.closest('.location-input');
    if (input.value) {
        wrapper.classList.add('has-value');
    } else {
        wrapper.classList.remove('has-value');
    }
}

// 年级模式
const GRADE_PATTERNS_NEW = {
    '初中': {
        pattern: /初中|初[一二三]|初[123]|[一�����������������三]年级/
    },
    '高中': {
        pattern: /高中|高[一二三]|高[123]/
    },
    '小学': {
        pattern: /小学|[一二三四五六]年级|小[一二三四五六]|小[123456]/
    },
    '幼儿': {
        pattern: /幼儿园|小班|中班|大班|幼儿/
    },
    '成人': {
        pattern: /成人|大学�?
    }
};

// 科目列表
const SUBJECTS = ['语文', '数学', '英语', '物理', '化学', '生物', '政治', '历史', '地理', '作业辅导', '钢琴'];

// 科目组合映射
const SUBJECT_COMBINATIONS = {
    '全科': ['语文', '数学', '英语'],
    '文综': ['政治', '历史', '地理'],
    '理综': ['物理', '化学', '生物']
};

// 等待 DOM 加载完成
$(document).ready(function() {
    initializeFilters();
    
    // 确保现有数据都有ID
    allResults = ensureDataHasIds(allResults || []);
    
    // 初始化编辑模态框
    initializeEditModal();
    
    // 初始化筛选器
    initializeFilters();
    
    // 从localStorage加载数据
    const savedData = localStorage.getItem('tutorData');
    if (savedData) {
        try {
            allResults = JSON.parse(savedData);
            displayResults(allResults);
            updateFilterOptions();
            updateSelectedCount();
            updateBatchActionsVisibility();
        } catch (e) {
            console.error('Error loading saved data:', e);
        }
    }
    
    // 初始化批量操作按钮事�?    $('#batchCopy').off('click').on('click', batchCopy);
    $('#batchDelete').off('click').on('click', batchDelete);
    $('#batchExport').off('click').on('click', exportText);
    
    // 初始化筛选器事件
    $('#filterCity, #filterGrade, #filterSubject').off('change').on('change', applyFilters);
    $('#searchInput').off('input').on('input', applyFilters);
    
    // 初始化日期选择�?    const today = new Date().toISOString().split('T')[0];
    $('#dateStart, #dateEnd').val(today);
    
    // 更新总数显示
    $('#totalCount').text(allResults.length);
    
    // 为确定按钮添加点击事件（确保只绑定一次）
    $('.modal .btn-primary').off('click').on('click', function() {
        const modal = $(this).closest('.modal');
        const bsModal = bootstrap.Modal.getInstance(modal[0]);
        if (bsModal) {
            bsModal.hide();
        }
    });
});

// 解析文本
function parseText(text) {
    // 使用两个或更多换行符分割文本，保留原始格�?    const tutorings = text.split(/\n\s*\n+/).filter(t => t.trim());
    
    const results = tutorings.map(tutoring => {
        const result = {
            id: generateUniqueId(),
            raw: tutoring,
            city: '',
            district: '',
            grade: '',
            subjects: [],
            salary: '',
            salaryUnit: '',
            isValid: false,
            createTime: new Date().toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            })
        };

        // 处理标题部分
        const titleMatch = tutoring.match(/【s([^】]+)�?);
        if (titleMatch) {
            const titleContent = titleMatch[1];
            
            // 先检查区域，因为区域名可能包含在地址�?            for (const [city, districts] of Object.entries(window.CITY_TO_DISTRICTS)) {
                for (const district of districts) {
                    if (titleContent.includes(district)) {
                        result.city = city;
                        result.district = district;
                        break;
                    }
                }
                if (result.city) break;
            }

            // 如果找到了区域但没找到城市，再检查城�?            if (!result.city) {
                for (const city of ['北京', '上海', '广州', '深圳', '成都', '杭州', '重庆', '武汉', '西安', '苏州', '南京', '天津', '长沙', '郑州', '东莞', '佛山', '宁波', '青岛', '沈阳', '昆明']) {
                    if (titleContent.includes(city)) {
                        result.city = city;
                        break;
                    }
                }
            }
        }

        // 果标题中没找到，全文中继续寻�?        if (!result.city || !result.district) {
            // 先检查区�?            for (const [city, districts] of Object.entries(window.CITY_TO_DISTRICTS)) {
                for (const district of districts) {
                    if (tutoring.includes(district)) {
                        result.city = city;
                        result.district = district;
                        break;
                    }
                }
                if (result.city) break;
            }

            // 如果只找到城市没找到区域，继续找区域
            if (result.city && !result.district) {
                const districts = window.CITY_TO_DISTRICTS[result.city] || [];
                for (const district of districts) {
                    if (tutoring.includes(district)) {
                        result.district = district;
                        break;
                    }
                }
            }
            
            // 如果还没找到城市，单找城�?            if (!result.city) {
                for (const city of ['北京', '上海', '广州', '深圳', '成都', '杭州', '重庆', '武汉', '西安', '苏州', '�?, '天津', '长沙', '郑州', '东莞', '佛山', '宁波', '青岛', '沈阳', '昆明']) {
                    if (tutoring.includes(city)) {
                        result.city = city;
                        // 找到城市后再找一次区�?                        const districts = window.CITY_TO_DISTRICTS[city];
                        for (const district of districts) {
                            if (tutoring.includes(district)) {
                                result.district = district;
                                break;
                            }
                        }
                        break;
                    }
                }
            }
        }

        // 处理线上课程
        if (tutoring.includes('线上') || tutoring.includes('网课') || tutoring.includes('在线') || tutoring.toLowerCase().includes('online')) {
            result.district = '线上';
            if (!result.city) {
                result.city = '全国';
            }
        }

        // 处理年级
        for (const [gradeLevel, gradeInfo] of Object.entries(GRADE_PATTERNS_NEW)) {
            if (gradeInfo.pattern.test(tutoring)) {
                result.grade = gradeLevel;
                break;
            }
        }

        // 处理科目
        for (const [combination, subjects] of Object.entries(SUBJECT_COMBINATIONS)) {
            if (tutoring.includes(combination)) {
                result.subjects.push(...subjects);
            }
        }

        for (const subject of SUBJECTS) {
            if (tutoring.includes(subject) && !result.subjects.includes(subject)) {
                result.subjects.push(subject);
            }
        }

        // 提取薪酬信息
        const { salary, salaryUnit } = extractSalaryInfo(tutoring);
        result.salary = salary;
        result.salaryUnit = salaryUnit;

        result.isValid = result.city && result.grade && result.subjects.length > 0;
        return result;
    });

    // 更新全局数据
    const newResults = ensureDataHasIds(results);
    allResults = [...allResults, ...newResults];
    
    // 更新筛选器和显�?    updateFiltersAfterDataChange();
    
    return results;
}

// 确保所有数据都有ID
function ensureDataHasIds(data) {
    if (!Array.isArray(data)) {
        console.error('Invalid data array:', data);
        return [];
    }
    return data.map(item => {
        if (!item) {
            console.error('Invalid item in data array');
            return null;
        }
        if (!item.id) {
            return { ...item, id: generateUniqueId() };
        }
        return item;
    }).filter(item => item !== null);
}

// 处理文件内容
function processFileContent(content) {
    try {
        // 割每一�?        const lines = content.split('\n').filter(line => line.trim());
        
        // 处理每一�?        const results = lines.map(line => {
            const result = {
                id: generateUniqueId(),
                raw: line,
                city: '',
                district: '',
                grade: '',
                subjects: []
            };

            // 尝试匹配城市
            for (const city of Object.keys(CITY_TO_DISTRICTS)) {
                if (line.includes(city)) {
                    result.city = city;
                    // 尝试匹配该城市的区域
                    const districts = CITY_TO_DISTRICTS[city];
                    for (const district of districts) {
                        if (line.includes(district)) {
                            result.district = district;
                            break;
                        }
                    }
                    break;
                }
            }

            // 尝试匹配年级
            for (const grade of Object.keys(GRADE_PATTERNS_NEW)) {
                const patterns = GRADE_PATTERNS_NEW[grade];
                if (patterns.some(pattern => line.includes(pattern))) {
                    result.grade = grade;
                    break;
                }
            }

            // 尝试匹配科目
            result.subjects = SUBJECTS.filter(subject => line.includes(subject));

            return result;
        });

        // 更新全局数据
        allResults = ensureDataHasIds(results);
        
        // 更新筛选器和显�?        updateFiltersAfterDataChange();
        
        console.log('成功处理文件内容，共处理 ' + results.length + ' 条记�?);
    } catch (error) {
        console.error('处理文件内容时出�?', error);
    }
}

// 从文件加载数�?function loadFromFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        processFileContent(e.target.result);
    };
    reader.onerror = function(e) {
        console.error('读取文件时出�?', e);
    };
    reader.readAsText(file);
}

// 更新城市下拉列表
function updateCityDropdown(input) {
    const dropdown = document.getElementById('editCityDropdown');
    if (!dropdown) return;
    
    dropdown.innerHTML = '';
    const value = input.value.toLowerCase();
    
    cities.filter(city => city.toLowerCase().includes(value))
        .forEach(city => {
            const item = document.createElement('div');
            item.className = 'dropdown-item';
            item.textContent = city;
            item.onclick = () => {
                input.value = city;
                dropdown.classList.remove('show');
                // 清空并更新区域选择
                const districtInput = document.getElementById('editDistrict');
                if (districtInput) {
                    districtInput.value = '';
                    updateDistrictDropdown(districtInput, city);
                }
            };
            dropdown.appendChild(item);
        });
    
    dropdown.classList.add('show');
}

// 更新区域下拉列表
function updateDistrictDropdown(input, city) {
    const dropdown = document.getElementById('editDistrictDropdown');
    if (!dropdown) return;
    
    dropdown.innerHTML = '';
    if (!city || !cityData[city]) return;
    
    const value = input.value.toLowerCase();
    cityData[city].filter(district => district.toLowerCase().includes(value))
        .forEach(district => {
            const item = document.createElement('div');
            item.className = 'dropdown-item';
            item.textContent = district;
            item.onclick = () => {
                input.value = district;
                dropdown.classList.remove('show');
            };
            dropdown.appendChild(item);
        });
    
    dropdown.classList.add('show');
}

// 初始化编辑模态框的监�?function initializeEditModalEvents() {
    const cityInput = document.getElementById('editCity');
    const districtInput = document.getElementById('editDistrict');
    const cityDropdown = document.getElementById('cityDropdown');
    const districtDropdown = document.getElementById('districtDropdown');
    const clearCityBtn = document.getElementById('clearCity');
    const clearDistrictBtn = document.getElementById('clearDistrict');
    const editModal = document.getElementById('editModal');

    // 预加载城市列�?    let citiesList = null;
    function loadCitiesList() {
        if (!citiesList) {
            citiesList = Object.keys(CITY_TO_DISTRICTS);
        }
        return citiesList;
    }

    // 预加载城市的区域列表
    const districtCache = {};
    function getDistrictsForCity(city) {
        if (!districtCache[city]) {
            districtCache[city] = CITY_TO_DISTRICTS[city] || [];
        }
        return districtCache[city];
    }

    // 编辑态框打开时预加载城市列表
    editModal.addEventListener('show.bs.modal', function() {
        loadCitiesList();
    });

    if (cityInput) {
        // 城输入框事件
        cityInput.addEventListener('input', function() {
            const value = this.value.toLowerCase();
            const dropdownContent = cityDropdown.querySelector('.dropdown-content');
            dropdownContent.innerHTML = '';

            // 使用预加载的城市列表
            citiesList
                .filter(city => city.toLowerCase().includes(value))
                .forEach(city => {
                    const item = document.createElement('div');
                    item.className = 'dropdown-item';
                    item.textContent = city;
                    item.onclick = () => {
                        cityInput.value = city;
                        cityDropdown.style.display = 'none';
                        // 清空并更新区域选择
                        districtInput.value = '';
                        const districts = getDistrictsForCity(city);
                        updateDistrictDropdownContent(districts);
                        if (districts.length > 0) {
                            districtDropdown.style.display = 'block';
                        }
                    };
                    dropdownContent.appendChild(item);
                });

            cityDropdown.style.display = dropdownContent.children.length > 0 ? 'block' : 'none';
        });

        cityInput.addEventListener('focus', function() {
            const dropdownContent = cityDropdown.querySelector('.dropdown-content');
            dropdownContent.innerHTML = '';
            
            // 显示所有城�?            citiesList.forEach(city => {
                const item = document.createElement('div');
                item.className = 'dropdown-item';
                item.textContent = city;
                item.onclick = () => {
                    cityInput.value = city;
                    cityDropdown.style.display = 'none';
                    // 清空并更新区域选择
                    districtInput.value = '';
                    const districts = getDistrictsForCity(city);
                    updateDistrictDropdownContent(districts);
                    if (districts.length > 0) {
                        districtDropdown.style.display = 'block';
                    }
                };
                dropdownContent.appendChild(item);
            });
            
            cityDropdown.style.display = 'block';
        });
    }

    if (districtInput) {
        // 区域输入框事�?        districtInput.addEventListener('input', function() {
            const selectedCity = cityInput.value;
            if (!selectedCity) return;

            const value = this.value.toLowerCase();
            const districts = getDistrictsForCity(selectedCity);
            
            const filteredDistricts = districts.filter(district => 
                district.toLowerCase().includes(value)
            );
            
            updateDistrictDropdownContent(filteredDistricts);
            districtDropdown.style.display = filteredDistricts.length > 0 ? 'block' : 'none';
        });

        districtInput.addEventListener('focus', function() {
            const selectedCity = cityInput.value;
            if (!selectedCity) return;

            const districts = getDistrictsForCity(selectedCity);
            updateDistrictDropdownContent(districts);
            if (districts.length > 0) {
                districtDropdown.style.display = 'block';
            }
        });
    }

    // 更新区域下拉内容的辅助函�?    function updateDistrictDropdownContent(districts) {
        const dropdownContent = districtDropdown.querySelector('.dropdown-content');
        dropdownContent.innerHTML = '';
        
        districts.forEach(district => {
            const item = document.createElement('div');
            item.className = 'dropdown-item';
            item.textContent = district;
            item.onclick = () => {
                districtInput.value = district;
                districtDropdown.style.display = 'none';
            };
            dropdownContent.appendChild(item);
        });
    }

    // 清除按钮事件
    if (clearCityBtn) {
        clearCityBtn.addEventListener('click', function() {
            cityInput.value = '';
            districtInput.value = '';
            cityDropdown.style.display = 'none';
            districtDropdown.style.display = 'none';
        });
    }

    if (clearDistrictBtn) {
        clearDistrictBtn.addEventListener('click', function() {
            districtInput.value = '';
            districtDropdown.style.display = 'none';
        });
    }

    // 点击其他地方关闭下拉�?    document.addEventListener('click', function(e) {
        if (!cityInput.contains(e.target) && !cityDropdown.contains(e.target)) {
            cityDropdown.style.display = 'none';
        }
        if (!districtInput.contains(e.target) && !districtDropdown.contains(e.target)) {
            districtDropdown.style.display = 'none';
        }
    });
}

// 初始化编辑模态框
function initializeEditModal() {
    const $editGradeLevel = $('#editGradeLevel');
    $editGradeLevel.empty();
    Object.keys(GRADE_PATTERNS_NEW).forEach(grade => {
        const option = document.createElement('option');
        option.value = grade;
        option.textContent = grade;
        $editGradeLevel.append(option);
    });

    const $editSubjects = $('#editSubjects');
    $editSubjects.empty();
    
    // 添加常组�?    Object.entries(SUBJECT_COMBINATIONS).forEach(([groupName, subjects]) => {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'subject-group';
        
        const groupCheckbox = document.createElement('input');
        groupCheckbox.type = 'checkbox';
        groupCheckbox.className = 'subject-group-checkbox';
        groupCheckbox.id = `group-${groupName}`;
        
        const groupLabel = document.createElement('label');
        groupLabel.htmlFor = `group-${groupName}`;
        groupLabel.textContent = groupName;
        
        groupDiv.appendChild(groupCheckbox);
        groupDiv.appendChild(groupLabel);
        $editSubjects.append(groupDiv);

        // 组合选择事件
        groupCheckbox.addEventListener('change', function() {
            subjects.forEach(subject => {
                const subjectCheckbox = document.getElementById(`subject-${subject}`);
                if (subjectCheckbox) {
                    subjectCheckbox.checked = this.checked;
                }
            });
        });
    });

    // 添加单个科目
    SUBJECTS.forEach(subject => {
        const subjectDiv = document.createElement('div');
        subjectDiv.className = 'subject-item';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'subject-checkbox';
        checkbox.id = `subject-${subject}`;
        checkbox.value = subject;
        
        const label = document.createElement('label');
        label.htmlFor = `subject-${subject}`;
        label.textContent = subject;
        
        subjectDiv.appendChild(checkbox);
        subjectDiv.appendChild(label);
        $editSubjects.append(subjectDiv);

        // 单个科目选择事件
        checkbox.addEventListener('change', function() {
            // 检查组合是否需要被选中
            Object.entries(SUBJECT_COMBINATIONS).forEach(([groupName, groupSubjects]) => {
                const groupCheckbox = document.getElementById(`group-${groupName}`);
                if (groupCheckbox) {
                    const allChecked = groupSubjects.every(subject => 
                        document.getElementById(`subject-${subject}`)?.checked
                    );
                    groupCheckbox.checked = allChecked;
                }
            });
        });
    });

    // 清除科目选择按钮事件
    $('#clearSubjects').on('click', function() {
        $editSubjects.find('input[type="checkbox"]').prop('checked', false);
    });
}

// 显示解析结果
function displayResults(results) {
    const $resultsContainer = $('#results');
    $resultsContainer.empty();
    
    // 更新搜索结果总数
    $('#searchResultCount').text(results.length);
    
    if (!results || results.length === 0) {
        $resultsContainer.html('<div class="alert alert-info">没有找到匹配的结�?/div>');
        return;
    }
    
    results.forEach(result => {
        const card = createResultCard(result);
        $resultsContainer.append(card);
    });
    
    // 更新选中状�?    updateSelectedCount();
    updateBatchActionsVisibility();
}

// 应用筛选器
function applyFilters() {
    const searchText = $('#searchInput').val().toLowerCase();
    const selectedCity = $('#filterCity').val();
    const selectedGrade = $('#filterGrade').val();
    const selectedSubject = $('#filterSubject').val();
    const selectedDateRange = $('#filterDate').val();
    const dateStart = $('#dateStart').val();
    const dateEnd = $('#dateEnd').val();
    
    const filteredResults = allResults.filter(result => {
        // 文本搜索
        const matchesSearch = !searchText || 
            result.raw.toLowerCase().includes(searchText) ||
            (result.city && result.city.toLowerCase().includes(searchText)) ||
            (result.district && result.district.toLowerCase().includes(searchText)) ||
            (result.grade && result.grade.toLowerCase().includes(searchText)) ||
            (result.subjects && result.subjects.some(s => s.toLowerCase().includes(searchText)));
            
        // 城市筛�?        const matchesCity = !selectedCity || result.city === selectedCity;
        
        // 年级筛�?        const matchesGrade = !selectedGrade || result.grade === selectedGrade;
        
        // 科目筛�?        const matchesSubject = !selectedSubject || 
            (result.subjects && result.subjects.includes(selectedSubject));
            
        // 日期筛�?        const matchesDate = checkDateFilter(result.createTime, selectedDateRange, dateStart, dateEnd);
            
        return matchesSearch && matchesCity && matchesGrade && matchesSubject && matchesDate;
    });
    
    displayResults(filteredResults);
}

// 检查日期是否在筛选范围内
function checkDateFilter(createTime, selectedRange, startDate, endDate) {
    if (!selectedRange) return true;
    
    // 将日期字符串转换为日期对�?    const createDate = new Date(createTime.replace(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/, '$1/$2/$3'));
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // 设置今天的开始和结束时间
    const todayStart = new Date(today);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);
    
    // 设置昨天的开始和结束时间
    const yesterdayStart = new Date(yesterday);
    const yesterdayEnd = new Date(yesterday);
    yesterdayEnd.setHours(23, 59, 59, 999);
    
    switch (selectedRange) {
        case 'today':
            return createDate >= todayStart && createDate <= todayEnd;
            
        case 'yesterday':
            return createDate >= yesterdayStart && createDate <= yesterdayEnd;
            
        case 'week':
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            return createDate >= weekAgo;
            
        case 'month':
            const monthAgo = new Date(today);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return createDate >= monthAgo;
            
        case 'halfYear':
            const halfYearAgo = new Date(today);
            halfYearAgo.setMonth(halfYearAgo.getMonth() - 6);
            return createDate >= halfYearAgo;
            
        case 'custom':
            if (!startDate || !endDate) return true;
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999); // 设置为当天的最后一毫秒
            return createDate >= start && createDate <= end;
            
        default:
            return true;
    }
}

// 在页面加载时初始化日期筛选相关事�?$(document).ready(function() {
    // 设置日期输入框的默认值为当前日期
    const today = new Date().toISOString().split('T')[0];
    $('#dateStart').val(today);
    $('#dateEnd').val(today);

    // 初始化日期筛选事�?    $('#filterDate').on('mousedown', function(e) {
        const $option = $(e.target);
        if ($option.val() === 'custom') {
            e.preventDefault();
            $('#customDateRange').show();
            return false;
        }
    }).on('change', function() {
        const selectedValue = $(this).val();
        if (selectedValue !== 'custom') {
            $('#customDateRange').hide();
            applyFilters();
        }
    });
    
    // 点击其他区域时隐藏自定义时间段选择�?    $(document).on('click', function(e) {
        if (!$(e.target).closest('.dropdown').length && 
            !$(e.target).closest('#customDateRange').length) {
            $('#customDateRange').hide();
        }
    });
    
    // 重置按钮事件
    $('#resetDateRange').on('click', function() {
        // 重置为当前日�?        const today = new Date().toISOString().split('T')[0];
        $('#dateStart').val(today);
        $('#dateEnd').val(today);
        
        // 重置下拉框选项
        $('#filterDate').val('');
        
        // 隐藏自定义日期范围框
        $('#customDateRange').hide();
        
        // 应用筛�?        applyFilters();
    });
    
    // 自定义日期范围应用按钮事�?    $('#applyDateRange').on('click', function() {
        const startDate = $('#dateStart').val();
        const endDate = $('#dateEnd').val();
        
        if (!startDate || !endDate) {
            alert('请选择完整的时间范�?);
            return;
        }
        
        if (new Date(startDate) > new Date(endDate)) {
            alert('开始日期不能大于结束日�?);
            return;
        }
        
        $('#filterDate').val('custom');
        applyFilters();
        $('#customDateRange').hide();
    });

    // 为日期输入框添加点击事件
    $('#dateStart, #dateEnd').on('click', function() {
        // 移除readonly属性，允许弹出日历
        $(this).removeAttr('readonly');
    });
});

// 生成唯一ID
function generateUniqueId() {
    return Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// 保存数据到localStorage
function saveDataToStorage() {
    try {
        localStorage.setItem('tutorData', JSON.stringify(allResults));
        console.log('数据已保存到localStorage:', allResults.length, '条记�?);
    } catch (e) {
        console.error('保存数据到localStorage失败:', e);
    }
}

// 从localStorage加载数据
function loadDataFromStorage() {
    try {
        const savedData = localStorage.getItem('tutorData');
        if (savedData) {
            allResults = JSON.parse(savedData);
            console.log('从localStorage加载数据:', allResults.length, '条记�?);
            return true;
        }
    } catch (e) {
        console.error('从localStorage加载数据失败:', e);
    }
    return false;
}

// 添加保存数据的函�?function saveData() {
    const textContent = document.getElementById('textArea').value;
    if (!textContent.trim()) {
        alert('请输入内�?);
        return;
    }

    const results = parseText(textContent);
    if (results && results.length > 0) {
        // 添加到全局数据
        allResults = allResults.concat(results);
        // 更新显示
        updateFiltersAfterDataChange();
        // 清空输入
        document.getElementById('textArea').value = '';
    } else {
        alert('未能识别出有效信�?);
    }
}

// 修改 updateFiltersAfterDataChange 函数
function updateFiltersAfterDataChange() {
    updateFilterOptions();
    applyFilters();
    updateTotalCount();
    updateSelectedCount();
    updateSelectAllState();
    updateBatchActionsVisibility();
    // 保存数据
    saveDataToStorage();
}

// 全�?取消全�?function toggleSelectAll() {
    const isChecked = $('#selectAll').prop('checked');
    $('.card-select').prop('checked', isChecked);
    updateSelectedCount();
}

// 更新选中数量显示
function updateSelectedCount() {
    const selectedCount = $('.card-select:checked').length;
    $('#selectedCount').text(selectedCount);
    updateBatchActionsVisibility();
    updateSelectAllState();
}

// 更新全选框状�?function updateSelectAllState() {
    const $selectAll = $('#selectAll');
    const totalCards = $('.card-select').length;
    const selectedCards = $('.card-select:checked').length;
    
    if (totalCards === 0) {
        $selectAll.prop('checked', false);
        $selectAll.prop('disabled', true);
    } else {
        $selectAll.prop('disabled', false);
        $selectAll.prop('checked', totalCards === selectedCards);
    }
}

// 更新批量操作栏可见�?function updateBatchActionsVisibility() {
    const selectedCount = $('.card-select:checked').length;
    const $batchActions = $('#batchActions');
    
    if (selectedCount > 0) {
        $batchActions.show();
    } else {
        $batchActions.hide();
    }
}

// 批量复制
function batchCopy() {
    const selectedItems = getSelectedItems();
    if (selectedItems.length === 0) {
        alert('请先选择要复制的项目');
        return;
    }

    if (selectedItems.length > 8) {
        // 显示选择复制方式的对话框
        const batchCopyModal = new bootstrap.Modal(document.getElementById('batchCopyModal'));
        batchCopyModal.show();

        // 分批复制按钮事件
        $('#batchCopyBtn').off('click').on('click', function() {
            batchCopyModal.hide();
            startBatchCopy(selectedItems);
        });

        // 全部复制按钮事件
        $('#copyAllBtn').off('click').on('click', function() {
            batchCopyModal.hide();
            copyAllText(selectedItems);
        });
    } else {
        // 直接复制
        copyAllText(selectedItems);
    }
}

// 开始分批复�?function startBatchCopy(items, startIndex = 0) {
    const BATCH_SIZE = 8;
    const currentBatch = items.slice(startIndex, startIndex + BATCH_SIZE);
    const remainingCount = items.length - (startIndex + BATCH_SIZE);

    // 复制当前批次
    copyAllText(currentBatch);

    // 如果还有剩余项目，显示继续复制对话框
    if (remainingCount > 0) {
        const continueCopyModal = new bootstrap.Modal(document.getElementById('continueCopyModal'));
        $('#remainingCount').text(remainingCount);
        
        // 继续复制按钮事件
        $('#continueCopyBtn').off('click').on('click', function() {
            continueCopyModal.hide();
            startBatchCopy(items, startIndex + BATCH_SIZE);
        });

        continueCopyModal.show();
    } else {
        // 所有批次复制完�?        setTimeout(() => {
            alert('所有记录已复制完成�?);
        }, 100);
    }
}

// 取选中的项�?function getSelectedItems() {
    return Array.from(document.querySelectorAll('.result-card input[type="checkbox"]:checked'))
        .map(checkbox => {
            const card = checkbox.closest('.result-card');
            return {
                city: card.querySelector('.tag-city')?.textContent || '',
                district: card.querySelector('.tag-district')?.textContent || '',
                grade: card.querySelector('.tag-grade')?.textContent || '',
                subjects: Array.from(card.querySelectorAll('.tag-subject')).map(tag => tag.textContent),
                raw: card.querySelector('.raw-content')?.textContent || ''
            };
        });
}

// 复制全部文本
function copyAllText(items) {
    const texts = items.map(item => {
        let text = item.raw || '';
        // 如果raw为空，则使用标签信息组合
        if (!text.trim()) {
            text = `${item.city} ${item.district} ${item.grade} ${item.subjects.join('/')}`;
        }
        return text;
    });

    const tempTextArea = document.createElement('textarea');
    tempTextArea.value = texts.join('\n\n');
    document.body.appendChild(tempTextArea);
    tempTextArea.select();
    
    try {
        document.execCommand('copy');
        setTimeout(() => {
            alert('复制成功�?);
        }, 100);
    } catch (err) {
        alert('复制失败，请重试');
        console.error('复制失败:', err);
    } finally {
        document.body.removeChild(tempTextArea);
    }
}

// 重置筛选条�?function resetFilters() {
    // 重置所有筛选条�?    $('#searchInput').val('');
    $('#filterCity').val('');
    $('#filterGrade').val('');
    $('#filterSubject').val('');
    $('#filterDate').val('');
    $('#dateStart').val('');
    $('#dateEnd').val('');
    
    // 重置筛选结�?    filteredResults = [...allResults];
    
    // 更新显示
    displayResults(filteredResults);
    
    // 更新筛选选项
    updateFilterOptions();
}

// 应用筛选条�?function applyFilters() {
    const searchText = $('#searchInput').val().toLowerCase();
    const selectedCity = $('#filterCity').val();
    const selectedGrade = $('#filterGrade').val();
    const selectedSubject = $('#filterSubject').val();
    const selectedDate = $('#filterDate').val();
    const dateStart = $('#dateStart').val();
    const dateEnd = $('#dateEnd').val();

    // 从所有结果开始筛�?    filteredResults = [...allResults];

    // 应用搜索文本筛�?    if (searchText) {
        filteredResults = filteredResults.filter(result => 
            result.raw.toLowerCase().includes(searchText)
        );
    }

    // 应用城市筛�?    if (selectedCity) {
        filteredResults = filteredResults.filter(result => 
            result.city === selectedCity
        );
    }

    // 应用年级筛�?    if (selectedGrade) {
        filteredResults = filteredResults.filter(result => 
            result.grade === selectedGrade
        );
    }

    // 应用科目筛�?    if (selectedSubject) {
        filteredResults = filteredResults.filter(result => 
            result.subjects.includes(selectedSubject)
        );
    }

    // 应用日期筛�?    if (selectedDate || (dateStart && dateEnd)) {
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
                    if (!startDate || !endDate) return true;
                    const start = new Date(startDate);
                    const end = new Date(endDate);
                    end.setHours(23, 59, 59, 999); // 设置为当天的最后一毫秒
                    return createDate >= start && createDate <= end;
                }
                default:
                    return true;
            }
        });
    }

    // 显示筛选后的结�?    displayResults(filteredResults);
}

// 初始化事件监�?function initializeFilters() {
    // 监听筛选条件变�?    $('#searchInput').on('input', applyFilters);
    $('#filterCity').on('change', applyFilters);
    $('#filterGrade').on('change', applyFilters);
    $('#filterSubject').on('change', applyFilters);
    $('#filterDate').on('change', function() {
        if (this.value !== 'custom') {
            $('#customDateRange').hide();
            applyFilters();
        }
    });
    
    // 重置按钮事件
    $('#resetDateRange').on('click', function() {
        $('#dateStart').val('');
        $('#dateEnd').val('');
        $('#filterDate').val('');
        applyFilters();
        $('#customDateRange').hide();
    });
    
    // 应用自定义日期范�?    $('#applyDateRange').on('click', function() {
        applyFilters();
        $('#customDateRange').hide();
    });
    
    // 初始化时显示所有结�?    resetFilters();
}

// 更新筛选选项
function updateFilterOptions() {
    // 获取所有唯一的城市、年级和科目
    const cities = new Set();
    const grades = new Set();
    const subjects = new Set();

    allResults.forEach(result => {
        if (result.city) cities.add(result.city);
        if (result.grade) grades.add(result.grade);
        if (result.subjects && Array.isArray(result.subjects)) {
            result.subjects.forEach(subject => subjects.add(subject));
        }
    });

    // 更新城市下拉列表
    const filterCity = document.getElementById('filterCity');
    filterCity.innerHTML = '<option value="">所有城�?/option>';
    Array.from(cities).sort().forEach(city => {
        filterCity.innerHTML += `<option value="${city}">${city}</option>`;
    });

    // 更新年级下拉列表
    const filterGrade = document.getElementById('filterGrade');
    filterGrade.innerHTML = '<option value="">所有年�?/option>';
    Array.from(grades).sort().forEach(grade => {
        filterGrade.innerHTML += `<option value="${grade}">${grade}</option>`;
    });

    // 更新科目下拉列表
    const filterSubject = document.getElementById('filterSubject');
    filterSubject.innerHTML = '<option value="">所有科�?/option>';
    Array.from(subjects).sort().forEach(subject => {
        filterSubject.innerHTML += `<option value="${subject}">${subject}</option>`;
    });
}

// 在页面加载完成后初始化确定按钮的点击事件
$(document).ready(function() {
    // 为确��按钮添加点击事件
    $('.modal .btn-primary').on('click', function() {
        const modal = $(this).closest('.modal');
        const modalInstance = bootstrap.Modal.getInstance(modal[0]);
        if (modalInstance) {
            modalInstance.hide();
        } else {
            modal.modal('hide');
        }
    });

    // 监听确认模态框的隐藏事�?    $('#confirmModal').on('hidden.bs.modal', function() {
        // 清除所有选中状�?        $('.card-select').prop('checked', false);
        $('#selectAll').prop('checked', false);
        updateSelectedCount();
        updateBatchActionsVisibility();
    });
});

// 导出文本
function exportText() {
    const selectedCheckboxes = $('.card-select:checked');
    if (selectedCheckboxes.length === 0) {
        alert('请先选择要导出的项目');
        return;
    }

    // 获取选中项的原始文本和城市区域信�?    const selectedTexts = [];
    const cities = new Set();
    const districts = new Set();
    let commonCity = null;
    
    selectedCheckboxes.each(function() {
        const id = $(this).attr('data-id');
        const result = allResults.find(r => r.id === id);
        if (result && result.raw) {
            selectedTexts.push(result.raw.trim());
            if (result.city) {
                cities.add(result.city);
                if (result.district) {
                    districts.add(result.district);
                }
            }
        }
    });

    if (selectedTexts.length === 0) {
        alert('没有找到可导出的内容');
        return;
    }

    // 使用双换行符连接�?    const textToExport = selectedTexts.join('\n\n') + '\n';
    
    // 生成文件�?    let fileName = '';
    const date = new Date().toLocaleDateString().replace(/\//g, '-');
    
    if (cities.size === 1) {
        // 只有一个城�?        const city = Array.from(cities)[0];
        if (districts.size === 1) {
            // 一个城市一个区�?            const district = Array.from(districts)[0];
            fileName = `${city}${district}家教_${date}.txt`;
        } else {
            // 一个城市多个区�?            fileName = `${city}家教_${date}.txt`;
        }
    } else {
        // 多个城市
        fileName = `家教信息导出_${date}.txt`;
    }
    
    // 创建Blob对象
    const blob = new Blob([textToExport], { type: 'text/plain;charset=utf-8' });
    
    // 创建下载链接
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    
    // 触发下载
    document.body.appendChild(a);
    a.click();
    
    // 清理
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
}

// 处理薪酬信息
function extractSalaryInfo(text) {
    // 将文本按行分�?    const lines = text.split('\n');
    
    // 找到包含薪酬关键词的�?    const salaryLine = lines.find(line => 
        line.includes('薪酬') || 
        line.includes('价格') || 
        line.includes('薪资') || 
        line.includes('课费')
    );
    
    if (!salaryLine) return { salary: '', salaryUnit: '' };
    
    // 薪酬匹配模式，按照优先级排序
    const salaryPatterns = [
        // 匹配范围格式，如 "350-400/�? "350~400�?�? "350�?00每次"
        /(\d+)[-~到至](\d+)\s*[元]?\s*[\/每]?\s*(小时|h|hr|hour)/i,
        /(\d+)[-~到至](\d+)\s*[元]?\s*[\/每]?\s*(课时|节课|�?/i,
        /(\d+)[-~到至](\d+)\s*[元]?\s*[\/每]?\s*(�?/i,
        /(\d+)[-~到至](\d+)\s*[元]?\s*[\/每]?\s*(�?/i,
        /(\d+)[-~到至](\d+)\s*�?i,
        
        // 匹配单个数值格�?        /(\d+)\s*[元]?\s*[\/每]?\s*(小时|h|hr|hour)/i,
        /(\d+)\s*[元]?\s*[\/每]?\s*(课时|节课|�?/i,
        /(\d+)\s*[元]?\s*[\/每]?\s*(�?/i,
        /(\d+)\s*[元]?\s*[\/每]?\s*(�?/i,
        /(\d+)\s*�?i
    ];

    // 尝试所有匹配模�?    for (const pattern of salaryPatterns) {
        const match = salaryLine.match(pattern);
        if (match) {
            // 如果是范围格式（有三个捕获组�?            if (match.length > 3) {
                const minSalary = match[1];
                const maxSalary = match[2];
                const unit = match[3]?.toLowerCase() || '�?;
                const salary = `${minSalary}-${maxSalary}`;
                
                // 统一薪酬单位显示
                let standardUnit;
                switch(unit) {
                    case 'h':
                    case 'hr':
                    case 'hour':
                    case '小时':
                        standardUnit = '小时';
                        break;
                    case '课时':
                    case '节课':
                    case '�?:
                        standardUnit = '�?;
                        break;
                    case '�?:
                        standardUnit = '�?;
                        break;
                    default:
                        standardUnit = '�?;
                }
                
                return { salary, salaryUnit: standardUnit };
            } else {
                // 单个数值格�?                const salary = match[1];
                const unit = match[2]?.toLowerCase() || '�?;
                
                // 统一薪酬单位显示
                let standardUnit;
                switch(unit) {
                    case 'h':
                    case 'hr':
                    case 'hour':
                    case '小时':
                        standardUnit = '小时';
                        break;
                    case '课时':
                    case '节课':
                    case '�?:
                        standardUnit = '�?;
                        break;
                    case '�?:
                        standardUnit = '�?;
                        break;
                    default:
                        standardUnit = '�?;
                }
                
                return { salary, salaryUnit: standardUnit };
            }
        }
    }
    
    return { salary: '', salaryUnit: '' };
}

// 在页面加载时初始化数�?$(document).ready(function() {
    // 初始化为空数�?    allResults = [];
    
    // 初始化编辑模态��?    initializeEditModal();
    
    // 初始化筛选器
    initializeFilters();
    
    // 初始化批量操作按钮事�?    $('#batchCopy').off('click').on('click', batchCopy);
    $('#batchDelete').off('click').on('click', batchDelete);
    $('#batchExport').off('click').on('click', exportText);
    
    // 初始化筛选器事件
    $('#filterCity, #filterGrade, #filterSubject').off('change').on('change', applyFilters);
    $('#searchInput').off('input').on('input', applyFilters);
    
    // 从文件加载数�?    loadData();
    
    // 初始化识别文本按钮的点击事件
    $('#parseBtn').off('click').on('click', function() {
        const textInput = $('#textInput').val().trim();
        if (!textInput) {
            alert('请输入要识别的文�?);
            return;
        }
        
        console.log('开始解析文�?', textInput);
        
        // 解析文本
        const newResults = parseText(textInput);
        console.log('解析结果:', newResults);
        
        if (newResults.length === 0) {
            alert('未能识别出有效的家教信息，请检查文本格�?);
            return;
        }
        
        // 更新全局数据
        allResults = [...allResults, ...newResults];
        console.log('更新后的总数�?', allResults.length, '条记�?);
        
        // 保存数据
        saveDataToStorage();
        
        // 更新显示
        displayResults(allResults);
        updateFilterOptions();
        updateTotalCount();
        
        // 显示成功消息
        alert(`成功识别 ${newResults.length} 条家教信息`);
        
        // 清空输入�?        $('#textInput').val('');
        
        // 关闭模态框
        const addModal = bootstrap.Modal.getInstance(document.getElementById('addModal'));
        if (addModal) {
            addModal.hide();
        }
    });
});

// 添加文件拖放功能
function initializeFileDropZone() {
    const dropZone = document.createElement('div');
    dropZone.id = 'fileDropZone';
    dropZone.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px;
        border: 2px dashed #ccc;
        border-radius: 8px;
        background: #f8f9fa;
        cursor: pointer;
        z-index: 1000;
    `;
    dropZone.innerHTML = '拖放数据文件到这�?br>或点击选择文件';
    
    // 创建文件输入�?    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.style.display = 'none';
    
    dropZone.appendChild(fileInput);
    document.body.appendChild(dropZone);
    
    // 处理拖放事件
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#0d6efd';
        dropZone.style.background = '#e9ecef';
    });
    
    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#ccc';
        dropZone.style.background = '#f8f9fa';
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#ccc';
        dropZone.style.background = '#f8f9fa';
        
        const file = e.dataTransfer.files[0];
        if (file && file.name.endsWith('.json')) {
            loadDataFromFile(file);
        }
    });
    
    // 处理点击选择文件
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });
    
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.name.endsWith('.json')) {
            loadDataFromFile(file);
        }
    });
}

// 从文件加载数�?function loadDataFromFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            allResults = ensureDataHasIds(data);
            displayResults(allResults);
            updateFilterOptions();
            updateTotalCount();
            // 保存�?localStorage 作为备份
            localStorage.setItem('tutorData', JSON.stringify(allResults));
        } catch (error) {
            console.error('解析数据文件失败:', error);
            alert('数据文件格式不正确，请检查文件内�?);
        }
    };
    reader.onerror = function(e) {
        console.error('读取文件失败:', e);
        alert('读取文件失败，请重试');
    };
    reader.readAsText(file);
}

// 添加自动保存功能
function autoSave() {
    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(() => {
        saveDataToFile();
    }, 5000); // 5秒后自动保存
}

// 修改保存数据的函�?async function saveDataToFile() {
    try {
        // 创建要保存的数据
        const data = JSON.stringify(allResults, null, 2);
        
        // 创建 Blob 对象
        const blob = new Blob([data], { type: 'application/json' });
        
        // 创建下载链接
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'tutoring_data.json';
        
        // 触发下载
        document.body.appendChild(a);
        a.click();
        
        // 清理
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
        
        // 同时保存�?localStorage 作为备份
        localStorage.setItem('tutorData', data);
        
    } catch (error) {
        console.error('保存数据失败:', error);
        // 如果保存到文件失败，至少保存�?localStorage
        localStorage.setItem('tutorData', JSON.stringify(allResults));
    }
}

// 批量复制功能
function batchCopy() {
    const selectedItems = getSelectedItems();
    if (selectedItems.length === 0) {
        alert('请先选择要复制的项目');
        return;
    }

    if (selectedItems.length > 8) {
        // 显示选择复制方式的对话框
        const batchCopyModal = new bootstrap.Modal(document.getElementById('batchCopyModal'));
        batchCopyModal.show();

        // 分批复制按钮事件
        $('#batchCopyBtn').off('click').on('click', function() {
            batchCopyModal.hide();
            startBatchCopy(selectedItems);
        });

        // 全部复制按钮事件
        $('#copyAllBtn').off('click').on('click', function() {
            batchCopyModal.hide();
            copyAllText(selectedItems);
        });
    } else {
        // 直接复制
        copyAllText(selectedItems);
    }
}

// 开始分批复�?function startBatchCopy(items, startIndex = 0) {
    const BATCH_SIZE = 8;
    const currentBatch = items.slice(startIndex, startIndex + BATCH_SIZE);
    const remainingCount = items.length - (startIndex + BATCH_SIZE);

    // 复制当前批次
    copyAllText(currentBatch);

    // 如果还有剩余项目，显示继续复制对话框
    if (remainingCount > 0) {
        const continueCopyModal = new bootstrap.Modal(document.getElementById('continueCopyModal'));
        $('#remainingCount').text(remainingCount);
        
        // 继续复制按钮事件
        $('#continueCopyBtn').off('click').on('click', function() {
            continueCopyModal.hide();
            startBatchCopy(items, startIndex + BATCH_SIZE);
        });

        continueCopyModal.show();
    } else {
        // 所有批次复制完�?        setTimeout(() => {
            alert('所有记录已复制完成�?);
        }, 100);
    }
}

// 取选中的项�?function getSelectedItems() {
    return Array.from(document.querySelectorAll('.result-card input[type="checkbox"]:checked'))
        .map(checkbox => {
            const card = checkbox.closest('.result-card');
            return {
                city: card.querySelector('.tag-city')?.textContent || '',
                district: card.querySelector('.tag-district')?.textContent || '',
                grade: card.querySelector('.tag-grade')?.textContent || '',
                subjects: Array.from(card.querySelectorAll('.tag-subject')).map(tag => tag.textContent),
                raw: card.querySelector('.raw-content')?.textContent || ''
            };
        });
}

// 复制全部文本
function copyAllText(items) {
    const texts = items.map(item => {
        let text = item.raw || '';
        // 如果raw为空，则使用标签信息组合
        if (!text.trim()) {
            text = `${item.city} ${item.district} ${item.grade} ${item.subjects.join('/')}`;
        }
        return text;
    });

    const tempTextArea = document.createElement('textarea');
    tempTextArea.value = texts.join('\n\n');
    document.body.appendChild(tempTextArea);
    tempTextArea.select();
    
    try {
        document.execCommand('copy');
        setTimeout(() => {
            alert('复制成功�?);
        }, 100);
    } catch (err) {
        alert('复制失败，请重试');
        console.error('复制失败:', err);
    } finally {
        document.body.removeChild(tempTextArea);
    }
}

// 重置筛选条�?function resetFilters() {
    // 重置所有筛选条�?    $('#searchInput').val('');
    $('#filterCity').val('');
    $('#filterGrade').val('');
    $('#filterSubject').val('');
    $('#filterDate').val('');
    $('#dateStart').val('');
    $('#dateEnd').val('');
    
    // 重置筛选结�?    filteredResults = [...allResults];
    
    // 更新显示
    displayResults(filteredResults);
    
    // 更新筛选选项
    updateFilterOptions();
}

// 应用筛选条�?function applyFilters() {
    const searchText = $('#searchInput').val().toLowerCase();
    const selectedCity = $('#filterCity').val();
    const selectedGrade = $('#filterGrade').val();
    const selectedSubject = $('#filterSubject').val();
    const selectedDate = $('#filterDate').val();
    const dateStart = $('#dateStart').val();
    const dateEnd = $('#dateEnd').val();

    // 从所有结果开始筛�?    filteredResults = [...allResults];

    // 应用搜索文本筛�?    if (searchText) {
        filteredResults = filteredResults.filter(result => 
            result.raw.toLowerCase().includes(searchText)
        );
    }

    // 应用城市筛�?    if (selectedCity) {
        filteredResults = filteredResults.filter(result => 
            result.city === selectedCity
        );
    }

    // 应用年级筛�?    if (selectedGrade) {
        filteredResults = filteredResults.filter(result => 
            result.grade === selectedGrade
        );
    }

    // 应用科目筛�?    if (selectedSubject) {
        filteredResults = filteredResults.filter(result => 
            result.subjects.includes(selectedSubject)
        );
    }

    // 应用日期筛�?    if (selectedDate || (dateStart && dateEnd)) {
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
                    if (!startDate || !endDate) return true;
                    const start = new Date(startDate);
                    const end = new Date(endDate);
                    end.setHours(23, 59, 59, 999); // 设置为当天的最后一毫秒
                    return createDate >= start && createDate <= end;
                }
                default:
                    return true;
            }
        });
    }

    // 显示筛选后的结�?    displayResults(filteredResults);
}

// 初始化事件监�?function initializeFilters() {
    // 监听筛选条件变�?    $('#searchInput').on('input', applyFilters);
    $('#filterCity').on('change', applyFilters);
    $('#filterGrade').on('change', applyFilters);
    $('#filterSubject').on('change', applyFilters);
    $('#filterDate').on('change', function() {
        if (this.value !== 'custom') {
            $('#customDateRange').hide();
            applyFilters();
        }
    });
    
    // 重置按钮事件
    $('#resetDateRange').on('click', function() {
        $('#dateStart').val('');
        $('#dateEnd').val('');
        $('#filterDate').val('');
        applyFilters();
        $('#customDateRange').hide();
    });
    
    // 应用自定义日期范�?    $('#applyDateRange').on('click', function() {
        applyFilters();
        $('#customDateRange').hide();
    });
    
    // 初始化时显示所有结�?    resetFilters();
}

// 更新筛选选项
function updateFilterOptions() {
    // 获取所有唯一的城市、年级和科目
    const cities = new Set();
    const grades = new Set();
    const subjects = new Set();

    allResults.forEach(result => {
        if (result.city) cities.add(result.city);
        if (result.grade) grades.add(result.grade);
        if (result.subjects && Array.isArray(result.subjects)) {
            result.subjects.forEach(subject => subjects.add(subject));
        }
    });

    // 更新城市下拉列表
    const filterCity = document.getElementById('filterCity');
    filterCity.innerHTML = '<option value="">所有城�?/option>';
    Array.from(cities).sort().forEach(city => {
        filterCity.innerHTML += `<option value="${city}">${city}</option>`;
    });

    // 更新年级下拉列表
    const filterGrade = document.getElementById('filterGrade');
    filterGrade.innerHTML = '<option value="">所有年�?/option>';
    Array.from(grades).sort().forEach(grade => {
        filterGrade.innerHTML += `<option value="${grade}">${grade}</option>`;
    });

    // 更新科目下拉列表
    const filterSubject = document.getElementById('filterSubject');
    filterSubject.innerHTML = '<option value="">所有科�?/option>';
    Array.from(subjects).sort().forEach(subject => {
        filterSubject.innerHTML += `<option value="${subject}">${subject}</option>`;
    });
}

// 在页面加载完成后初始化确定按钮的点击事件
$(document).ready(function() {
    // 为确��按钮添加点击事件
    $('.modal .btn-primary').on('click', function() {
        const modal = $(this).closest('.modal');
        const modalInstance = bootstrap.Modal.getInstance(modal[0]);
        if (modalInstance) {
            modalInstance.hide();
        } else {
            modal.modal('hide');
        }
    });

    // 监听确认模态框的隐藏事�?    $('#confirmModal').on('hidden.bs.modal', function() {
        // 清除所有选中状�?        $('.card-select').prop('checked', false);
        $('#selectAll').prop('checked', false);
        updateSelectedCount();
        updateBatchActionsVisibility();
    });
});

// 导出文本
function exportText() {
    const selectedCheckboxes = $('.card-select:checked');
    if (selectedCheckboxes.length === 0) {
        alert('请先选择要导出的项目');
        return;
    }

    // 获取选中项的原始文本和城市区域信�?    const selectedTexts = [];
    const cities = new Set();
    const districts = new Set();
    let commonCity = null;
    
    selectedCheckboxes.each(function() {
        const id = $(this).attr('data-id');
        const result = allResults.find(r => r.id === id);
        if (result && result.raw) {
            selectedTexts.push(result.raw.trim());
            if (result.city) {
                cities.add(result.city);
                if (result.district) {
                    districts.add(result.district);
                }
            }
        }
    });

    if (selectedTexts.length === 0) {
        alert('没有找到可导出的内容');
        return;
    }

    // 使用双换行符连接�?    const textToExport = selectedTexts.join('\n\n') + '\n';
    
    // 生成文件�?    let fileName = '';
    const date = new Date().toLocaleDateString().replace(/\//g, '-');
    
    if (cities.size === 1) {
        // 只有一个城�?        const city = Array.from(cities)[0];
        if (districts.size === 1) {
            // 一个城市一个区�?            const district = Array.from(districts)[0];
            fileName = `${city}${district}家教_${date}.txt`;
        } else {
            // 一个城市多个区�?            fileName = `${city}家教_${date}.txt`;
        }
    } else {
        // 多个城市
        fileName = `家教信息导出_${date}.txt`;
    }
    
    // 创建Blob对象
    const blob = new Blob([textToExport], { type: 'text/plain;charset=utf-8' });
    
    // 创建下载链接
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    
    // 触发下载
    document.body.appendChild(a);
    a.click();
    
    // 清理
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
}

// 处理薪酬信息
function extractSalaryInfo(text) {
    // 将文本按行分�?    const lines = text.split('\n');
    
    // 找到包含薪酬关键词的�?    const salaryLine = lines.find(line => 
        line.includes('薪酬') || 
        line.includes('价格') || 
        line.includes('薪资') || 
        line.includes('课费')
    );
    
    if (!salaryLine) return { salary: '', salaryUnit: '' };
    
    // 薪酬匹配模式，按照优先级排序
    const salaryPatterns = [
        // 匹配范围格式，如 "350-400/�? "350~400�?�? "350�?00每次"
        /(\d+)[-~到至](\d+)\s*[元]?\s*[\/每]?\s*(小时|h|hr|hour)/i,
        /(\d+)[-~到至](\d+)\s*[元]?\s*[\/每]?\s*(课时|节课|�?/i,
        /(\d+)[-~到至](\d+)\s*[元]?\s*[\/每]?\s*(�?/i,
        /(\d+)[-~到至](\d+)\s*[元]?\s*[\/每]?\s*(�?/i,
        /(\d+)[-~到至](\d+)\s*�?i,
        
        // 匹配单个数值格�?        /(\d+)\s*[元]?\s*[\/每]?\s*(小时|h|hr|hour)/i,
        /(\d+)\s*[元]?\s*[\/每]?\s*(课时|节课|�?/i,
        /(\d+)\s*[元]?\s*[\/每]?\s*(�?/i,
        /(\d+)\s*[元]?\s*[\/每]?\s*(�?/i,
        /(\d+)\s*�?i
    ];

    // 尝试所有匹配模�?    for (const pattern of salaryPatterns) {
        const match = salaryLine.match(pattern);
        if (match) {
            // 如果是范围格式（有三个捕获组�?            if (match.length > 3) {
                const minSalary = match[1];
                const maxSalary = match[2];
                const unit = match[3]?.toLowerCase() || '�?;
                const salary = `${minSalary}-${maxSalary}`;
                
                // 统一薪酬单位显示
                let standardUnit;
                switch(unit) {
                    case 'h':
                    case 'hr':
                    case 'hour':
                    case '小时':
                        standardUnit = '小时';
                        break;
                    case '课时':
                    case '节课':
                    case '�?:
                        standardUnit = '�?;
                        break;
                    case '�?:
                        standardUnit = '�?;
                        break;
                    default:
                        standardUnit = '�?;
                }
                
                return { salary, salaryUnit: standardUnit };
            } else {
                // 单个数值格�?                const salary = match[1];
                const unit = match[2]?.toLowerCase() || '�?;
                
                // 统一薪酬单位显示
                let standardUnit;
                switch(unit) {
                    case 'h':
                    case 'hr':
                    case 'hour':
                    case '小时':
                        standardUnit = '小时';
                        break;
                    case '课时':
                    case '节课':
                    case '�?:
                        standardUnit = '�?;
                        break;
                    case '�?:
                        standardUnit = '�?;
                        break;
                    default:
                        standardUnit = '�?;
                }
                
                return { salary, salaryUnit: standardUnit };
            }
        }
    }
    
    return { salary: '', salaryUnit: '' };
}

// 在页面加载时初始化数�?$(document).ready(function() {
    // 初始化为空数�?    allResults = [];
    
    // 初始化编辑模态��?    initializeEditModal();
    
    // 初始化筛选器
    initializeFilters();
    
    // 初始化批量操作按钮事�?    $('#batchCopy').off('click').on('click', batchCopy);
    $('#batchDelete').off('click').on('click', batchDelete);
    $('#batchExport').off('click').on('click', exportText);
    
    // 初始化筛选器事件
    $('#filterCity, #filterGrade, #filterSubject').off('change').on('change', applyFilters);
    $('#searchInput').off('input').on('input', applyFilters);
    
    // 从文件加载数�?    loadData();
    
    // 初始化识别文本按钮的点击事件
    $('#parseBtn').off('click').on('click', function() {
        const textInput = $('#textInput').val().trim();
        if (!textInput) {
            alert('请输入要识别的文�?);
            return;
        }
        
        console.log('开始解析文�?', textInput);
        
        // 解析文本
        const newResults = parseText(textInput);
        console.log('解析结果:', newResults);
        
        if (newResults.length === 0) {
            alert('未能识别出有效的家教信息，请检查文本格�?);
            return;
        }
        
        // 更新全局数据
        allResults = [...allResults, ...newResults];
        console.log('更新后的总数�?', allResults.length, '条记�?);
        
        // 保存数据
        saveDataToStorage();
        
        // 更新显示
        displayResults(allResults);
        updateFilterOptions();
        updateTotalCount();
        
        // 显示成功消息
        alert(`成功识别 ${newResults.length} 条家教信息`);
        
        // 清空输入�?        $('#textInput').val('');
        
        // 关闭模态框
        const addModal = bootstrap.Modal.getInstance(document.getElementById('addModal'));
        if (addModal) {
            addModal.hide();
        }
    });
});

// 添加文件拖放功能
function initializeFileDropZone() {
    const dropZone = document.createElement('div');
    dropZone.id = 'fileDropZone';
    dropZone.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px;
        border: 2px dashed #ccc;
        border-radius: 8px;
        background: #f8f9fa;
        cursor: pointer;
        z-index: 1000;
    `;
    dropZone.innerHTML = '拖放数据文件到这�?br>或点击选择文件';
    
    // 创建文件输入�?    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.style.display = 'none';
    
    dropZone.appendChild(fileInput);
    document.body.appendChild(dropZone);
    
    // 处理拖放事件
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#0d6efd';
        dropZone.style.background = '#e9ecef';
    });
    
    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#ccc';
        dropZone.style.background = '#f8f9fa';
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#ccc';
        dropZone.style.background = '#f8f9fa';
        
        const file = e.dataTransfer.files[0];
        if (file && file.name.endsWith('.json')) {
            loadDataFromFile(file);
        }
    });
    
    // 处理点击选择文件
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });
    
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.name.endsWith('.json')) {
            loadDataFromFile(file);
        }
    });
}

// 从文件加载数�?function loadDataFromFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            allResults = ensureDataHasIds(data);
            displayResults(allResults);
            updateFilterOptions();
            updateTotalCount();
            // 保存�?localStorage 作为备份
            localStorage.setItem('tutorData', JSON.stringify(allResults));
        } catch (error) {
            console.error('解析数据文件失败:', error);
            alert('数据文件格式不正确，请检查文件内�?);
        }
    };
    reader.onerror = function(e) {
        console.error('读取文件失败:', e);
        alert('读取文件失败，请重试');
    };
    reader.readAsText(file);
}

// 添加自动保存功能
function autoSave() {
    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(() => {
        saveDataToFile();
    }, 5000); // 5秒后自动保存
}

// 修改保存数据的函�?async function saveDataToFile() {
    try {
        // 创建要保存的数据
        const data = JSON.stringify(allResults, null, 2);
        
        // 创建 Blob 对象
        const blob = new Blob([data], { type: 'application/json' });
        
        // 创建下载链接
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'tutoring_data.json';
        
        // 触发下载
        document.body.appendChild(a);
        a.click();
        
        // 清理
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
        
        // 同时保存�?localStorage 作为备份
        localStorage.setItem('tutorData', data);
        
    } catch (error) {
        console.error('保存数据失败:', error);
        // 如果保存到文件失败，至少保存�?localStorage
        localStorage.setItem('tutorData', JSON.stringify(allResults));
    }
}

// 批量复制功能
function batchCopy() {
    const selectedItems = getSelectedItems();
    if (selectedItems.length === 0) {
        alert('请先选择要复制的项目');
        return;
    }

    if (selectedItems.length > 8) {
        // 显示选择复制方式的对话框
        const batchCopyModal = new bootstrap.Modal(document.getElementById('batchCopyModal'));
        batchCopyModal.show();

        // 分批复制按钮事件
        $('#batchCopyBtn').off('click').on('click', function() {
            batchCopyModal.hide();
            startBatchCopy(selectedItems);
        });

        // 全部复制按钮事件
        $('#copyAllBtn').off('click').on('click', function() {
            batchCopyModal.hide();
            copyAllText(selectedItems);
        });
    } else {
        // 直接复制
        copyAllText(selectedItems);
    }
}

// 开始分批复�?function startBatchCopy(items, startIndex = 0) {
    const BATCH_SIZE = 8;
    const currentBatch = items.slice(startIndex, startIndex + BATCH_SIZE);
    const remainingCount = items.length - (startIndex + BATCH_SIZE);

    // 复制当前批次
    copyAllText(currentBatch);

    // 如果还有剩余项目，显示继续复制对话框
    if (remainingCount > 0) {
        const continueCopyModal = new bootstrap.Modal(document.getElementById('continueCopyModal'));
        $('#remainingCount').text(remainingCount);
        
        // 继续复制按钮事件
        $('#continueCopyBtn').off('click').on('click', function() {
            continueCopyModal.hide();
            startBatchCopy(items, startIndex + BATCH_SIZE);
        });

        continueCopyModal.show();
    } else {
        // 所有批次复制完�?        setTimeout(() => {
            alert('所有记录已复制完成�?);
        }, 100);
    }
}

// 取选中的项�?function getSelectedItems() {
    return Array.from(document.querySelectorAll('.result-card input[type="checkbox"]:checked'))
        .map(checkbox => {
            const card = checkbox.closest('.result-card');
            return {
                city: card.querySelector('.tag-city')?.textContent || '',
                district: card.querySelector('.tag-district')?.textContent || '',
                grade: card.querySelector('.tag-grade')?.textContent || '',
                subjects: Array.from(card.querySelectorAll('.tag-subject')).map(tag => tag.textContent),
                raw: card.querySelector('.raw-content')?.textContent || ''
            };
        });
}

// 复制全部文本
function copyAllText(items) {
    const texts = items.map(item => {
        let text = item.raw || '';
        // 如果raw为空，则使用标签信息组合
        if (!text.trim()) {
            text = `${item.city} ${item.district} ${item.grade} ${item.subjects.join('/')}`;
        }
        return text;
    });

    const tempTextArea = document.createElement('textarea');
    tempTextArea.value = texts.join('\n\n');
    document.body.appendChild(tempTextArea);
    tempTextArea.select();
    
    try {
        document.execCommand('copy');
        setTimeout(() => {
            alert('复制成功�?);
        }, 100);
    } catch (err) {
        alert('复制失败，请重试');
        console.error('复制失败:', err);
    } finally {
        document.body.removeChild(tempTextArea);
    }
}

// 重置筛选条�?function resetFilters() {
    // 重置所有筛选条�?    $('#searchInput').val('');
    $('#filterCity').val('');
    $('#filterGrade').val('');
    $('#filterSubject').val('');
    $('#filterDate').val('');
    $('#dateStart').val('');
    $('#dateEnd').val('');
    
    // 重置筛选结�?    filteredResults = [...allResults];
    
    // 更新显示
    displayResults(filteredResults);
    
    // 更新筛选选项
    updateFilterOptions();
}

// 应用筛选条�?function applyFilters() {
    const searchText = $('#searchInput').val().toLowerCase();
    const selectedCity = $('#filterCity').val();
    const selectedGrade = $('#filterGrade').val();
    const selectedSubject = $('#filterSubject').val();
    const selectedDate = $('#filterDate').val();
    const dateStart = $('#dateStart').val();
    const dateEnd = $('#dateEnd').val();

    // 从所有结果开始筛�?    filteredResults = [...allResults];

    // 应用搜索文本筛�?    if (searchText) {
        filteredResults = filteredResults.filter(result => 
            result.raw.toLowerCase().includes(searchText)
        );
    }

    // 应用城市筛�?    if (selectedCity) {
        filteredResults = filteredResults.filter(result => 
            result.city === selectedCity
        );
    }

    // 应用年级筛�?    if (selectedGrade) {
        filteredResults = filteredResults.filter(result => 
            result.grade === selectedGrade
        );
    }

    // 应用科目筛�?    if (selectedSubject) {
        filteredResults = filteredResults.filter(result => 
            result.subjects.includes(selectedSubject)
        );
    }

    // 应用日期筛�?    if (selectedDate || (dateStart && dateEnd)) {
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
                    if (!startDate || !endDate) return true;
                    const start = new Date(startDate);
                    const end = new Date(endDate);
                    end.setHours(23, 59, 59, 999); // 设置为当天的最后一毫秒
                    return createDate >= start && createDate <= end;
                }
                default:
                    return true;
            }
        });
    }

    // 显示筛选后的结�?    displayResults(filteredResults);
}

// 初始化事件监�?function initializeFilters() {
    // 监听筛选条件变�?    $('#searchInput').on('input', applyFilters);
    $('#filterCity').on('change', applyFilters);
    $('#filterGrade').on('change', applyFilters);
    $('#filterSubject').on('change', applyFilters);
    $('#filterDate').on('change', function() {
        if (this.value !== 'custom') {
            $('#customDateRange').hide();
            applyFilters();
        }
    });
    
    // 重置按钮事件
    $('#resetDateRange').on('click', function() {
        $('#dateStart').val('');
        $('#dateEnd').val('');
        $('#filterDate').val('');
        applyFilters();
        $('#customDateRange').hide();
    });
    
    // 应用自定义日期范�?    $('#applyDateRange').on('click', function() {
        applyFilters();
        $('#customDateRange').hide();
    });
    
    // 初始化时显示所有结�?    resetFilters();
}

// 更新筛选选项
function updateFilterOptions() {
    // 获取所有唯一的城市、年级和科目
    const cities = new Set();
    const grades = new Set();
    const subjects = new Set();

    allResults.forEach(result => {
        if (result.city) cities.add(result.city);
        if (result.grade) grades.add(result.grade);
        if (result.subjects && Array.isArray(result.subjects)) {
            result.subjects.forEach(subject => subjects.add(subject));
        }
    });

    // 更新城市下拉列表
    const filterCity = document.getElementById('filterCity');
    filterCity.innerHTML = '<option value="">所有城�?/option>';
    Array.from(cities).sort().forEach(city => {
        filterCity.innerHTML += `<option value="${city}">${city}</option>`;
    });

    // 更新年级下拉列表
    const filterGrade = document.getElementById('filterGrade');
    filterGrade.innerHTML = '<option value="">所有年�?/option>';
    Array.from(grades).sort().forEach(grade => {
        filterGrade.innerHTML += `<option value="${grade}">${grade}</option>`;
    });

    // 更新科目下拉列表
    const filterSubject = document.getElementById('filterSubject');
    filterSubject.innerHTML = '<option value="">所有科�?/option>';
    Array.from(subjects).sort().forEach(subject => {
        filterSubject.innerHTML += `<option value="${subject}">${subject}</option>`;
    });
}

// 在页面加载完成后初始化确定按钮的点击事件
$(document).ready(function() {
    // 为确��按钮添加点击事件
    $('.modal .btn-primary').on('click', function() {
        const modal = $(this).closest('.modal');
        const modalInstance = bootstrap.Modal.getInstance(modal[0]);
        if (modalInstance) {
            modalInstance.hide();
        } else {
            modal.modal('hide');
        }
    });

    // 监听确认模态框的隐藏事�?    $('#confirmModal').on('hidden.bs.modal', function() {
        // 清除所有选中状�?        $('.card-select').prop('checked', false);
        $('#selectAll').prop('checked', false);
        updateSelectedCount();
        updateBatchActionsVisibility();
    });
});

// 导出文本
function exportText() {
    const selectedCheckboxes = $('.card-select:checked');
    if (selectedCheckboxes.length === 0) {
        alert('请先选择要导出的项目');
        return;
    }

    // 获取选中项的原始文本和城市区域信�?    const selectedTexts = [];
    const cities = new Set();
    const districts = new Set();
    let commonCity = null;
    
    selectedCheckboxes.each(function() {
        const id = $(this).attr('data-id');
        const result = allResults.find(r => r.id === id);
        if (result && result.raw) {
            selectedTexts.push(result.raw.trim());
            if (result.city) {
                cities.add(result.city);
                if (result.district) {
                    districts.add(result.district);
                }
            }
        }
    });

    if (selectedTexts.length === 0) {
        alert('没有找到可导出的内容');
        return;
    }

    // 使用双换行符连接�?    const textToExport = selectedTexts.join('\n\n') + '\n';
    
    // 生成文件�?    let fileName = '';
    const date = new Date().toLocaleDateString().replace(/\//g, '-');
    
    if (cities.size === 1) {
        // 只有一个城�?        const city = Array.from(cities)[0];
        if (districts.size === 1) {
            // 一个城市一个区�?            const district = Array.from(districts)[0];
            fileName = `${city}${district}家教_${date}.txt`;
        } else {
            // 一个城市多个区�?            fileName = `${city}家教_${date}.txt`;
        }
    } else {
        // 多个城市
        fileName = `家教信息导出_${date}.txt`;
    }
    
    // 创建Blob对象
    const blob = new Blob([textToExport], { type: 'text/plain;charset=utf-8' });
    
    // 创建下载链接
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    
    // 触发下载
    document.body.appendChild(a);
    a.click();
    
    // 清理
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
}

// 处理薪酬信息
function extractSalaryInfo(text) {
    // 将文本按行分�?    const lines = text.split('\n');
    
    // 找到包含薪酬关键词的�?    const salaryLine = lines.find(line => 
        line.includes('薪酬') || 
        line.includes('价格') || 
        line.includes('薪资') || 
        line.includes('课费')
    );
    
    if (!salaryLine) return { salary: '', salaryUnit: '' };
    
    // 薪酬匹配模式，按照优先级排序
    const salaryPatterns = [
        // 匹配范围格式，如 "350-400/�? "350~400�?�? "350�?00每次"
        /(\d+)[-~到至](\d+)\s*[元]?\s*[\/每]?\s*(小时|h|hr|hour)/i,
        /(\d+)[-~到至](\d+)\s*[元]?\s*[\/每]?\s*(课时|节课|�?/i,
        /(\d+)[-~到至](\d+)\s*[元]?\s*[\/每]?\s*(�?/i,
        /(\d+)[-~到至](\d+)\s*[元]?\s*[\/每]?\s*(�?/i,
        /(\d+)[-~到至](\d+)\s*�?i,
        
        // 匹配单个数值格�?        /(\d+)\s*[元]?\s*[\/每]?\s*(小时|h|hr|hour)/i,
        /(\d+)\s*[元]?\s*[\/每]?\s*(课时|节课|�?/i,
        /(\d+)\s*[元]?\s*[\/每]?\s*(�?/i,
        /(\d+)\s*[元]?\s*[\/每]?\s*(�?/i,
        /(\d+)\s*�?i
    ];

    // 尝试所有匹配模�?    for (const pattern of salaryPatterns) {
        const match = salaryLine.match(pattern);
        if (match) {
            // 如果是范围格式（有三个捕获组�?            if (match.length > 3) {
                const minSalary = match[1];
                const maxSalary = match[2];
                const unit = match[3]?.toLowerCase() || '�?;
                const salary = `${minSalary}-${maxSalary}`;
                
                // 统一薪酬单位显示
                let standardUnit;
                switch(unit) {
                    case 'h':
                    case 'hr':
                    case 'hour':
                    case '小时':
                        standardUnit = '小时';
                        break;
                    case '课时':
                    case '节课':
                    case '�?:
                        standardUnit = '�?;
                        break;
                    case '�?:
                        standardUnit = '�?;
                        break;
                    default:
                        standardUnit = '�?;
                }
                
                return { salary, salaryUnit: standardUnit };
            } else {
                // 单个数值格�?                const salary = match[1];
                const unit = match[2]?.toLowerCase() || '�?;
                
                // 统一薪酬单位显示
                let standardUnit;
                switch(unit) {
                    case 'h':
                    case 'hr':
                    case 'hour':
                    case '小时':
                        standardUnit = '小时';
                        break;
                    case '课时':
                    case '节课':
                    case '�?:
                        standardUnit = '�?;
                        break;
                    case '�?:
                        standardUnit = '�?;
                        break;
                    default:
                        standardUnit = '�?;
                }
                
                return { salary, salaryUnit: standardUnit };
            }
        }
    }
    
    return { salary: '', salaryUnit: '' };
}

// 在页面加载时初始化数�?$(document).ready(function() {
    // 初始化为空数�?    allResults = [];
    
    // 初始化编辑模态��?    initializeEditModal();
    
    // 初始化筛选器
    initializeFilters();
    
    // 初始化批量操作按钮事�?    $('#batchCopy').off('click').on('click', batchCopy);
    $('#batchDelete').off('click').on('click', batchDelete);
    $('#batchExport').off('click').on('click', exportText);
    
    // 初始化筛选器事件
    $('#filterCity, #filterGrade, #filterSubject').off('change').on('change', applyFilters);
    $('#searchInput').off('input').on('input', applyFilters);
    
    // 从文件加载数�?    loadData();
    
    // 初始化识别文本按钮的点击事件
    $('#parseBtn').off('click').on('click', function() {
        const textInput = $('#textInput').val().trim();
        if (!textInput) {
            alert('请输入要识别的文�?);
            return;
        }
        
        console.log('开始解析文�?', textInput);
        
        // 解析文本
        const newResults = parseText(textInput);
        console.log('解析结果:', newResults);
        
        if (newResults.length === 0) {
            alert('未能识别出有效的家教信息，请检查文本格�?);
            return;
        }
        
        // 更新全局数据
        allResults = [...allResults, ...newResults];
        console.log('更新后的总数�?', allResults.length, '条记�?);
        
        // 保存数据
        saveDataToStorage();
        
        // 更新显示
        displayResults(allResults);
        updateFilterOptions();
        updateTotalCount();
        
        // 显示成功消息
        alert(`成功识别 ${newResults.length} 条家教信息`);
        
        // 清空输入�?        $('#textInput').val('');
        
        // 关闭模态框
        const addModal = bootstrap.Modal.getInstance(document.getElementById('addModal'));
        if (addModal) {
            addModal.hide();
        }
    });
});

// 添加文件拖放功能
function initializeFileDropZone() {
    const dropZone = document.createElement('div');
    dropZone.id = 'fileDropZone';
    dropZone.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px;
        border: 2px dashed #ccc;
        border-radius: 8px;
        background: #f8f9fa;
        cursor: pointer;
        z-index: 1000;
    `;
    dropZone.innerHTML = '拖放数据文件到这�?br>或点击选择文件';
    
    // 创建文件输入�?    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.style.display = 'none';
    
    dropZone.appendChild(fileInput);
    document.body.appendChild(dropZone);
    
    // 处理拖放事件
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#0d6efd';
        dropZone.style.background = '#e9ecef';
    });
    
    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#ccc';
        dropZone.style.background = '#f8f9fa';
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#ccc';
        dropZone.style.background = '#f8f9fa';
        
        const file = e.dataTransfer.files[0];
        if (file && file.name.endsWith('.json')) {
            loadDataFromFile(file);
        }
    });
    
    // 处理点击选择文件
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });
    
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.name.endsWith('.json')) {
            loadDataFromFile(file);
        }
    });
}

// 从文件加载数�?function loadDataFromFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            allResults = ensureDataHasIds(data);
            displayResults(allResults);
            updateFilterOptions();
            updateTotalCount();
            // 保存�?localStorage 作为备份
            localStorage.setItem('tutorData', JSON.stringify(allResults));
        } catch (error) {
            console.error('解析数据文件失败:', error);
            alert('数据文件格式不正确，请检查文件内�?);
        }
    };
    reader.onerror = function(e) {
        console.error('读取文件失败:', e);
        alert('读取文件失败，请重试');
    };
    reader.readAsText(file);
}

// 添加自动保存功能
function autoSave() {
    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(() => {
        saveDataToFile();
    }, 5000); // 5秒后自动保存
}

// 修改保存数据的函�?async function saveDataToFile() {
    try {
        // 创建要保存的数据
        const data = JSON.stringify(allResults, null, 2);
        
        // 创建 Blob 对象
        const blob = new Blob([data], { type: 'application/json' });
        
        // 创建下载链接
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'tutoring_data.json';
        
        // 触发下载
        document.body.appendChild(a);
        a.click();
        
        // 清理
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
        
        // 同时保存�?localStorage 作为备份
        localStorage.setItem('tutorData', data);
        
    } catch (error) {
        console.error('保存数据失败:', error);
        // 如果保存到文件失败，至少保存�?localStorage
        localStorage.setItem('tutorData', JSON.stringify(allResults));
    }
}

// 批量复制功能
function batchCopy() {
    const selectedItems = getSelectedItems();
    if (selectedItems.length === 0) {
        alert('请先选择要复制的项目');
        return;
    }

    if (selectedItems.length > 8) {
        // 显示选择复制方式的对话框
        const batchCopyModal = new bootstrap.Modal(document.getElementById('batchCopyModal'));
        batchCopyModal.show();

        // 分批复制按钮事件
        $('#batchCopyBtn').off('click').on('click', function() {
            batchCopyModal.hide();
            startBatchCopy(selectedItems);
        });

        // 全部复制按钮事件
        $('#copyAllBtn').off('click').on('click', function() {
            batchCopyModal.hide();
            copyAllText(selectedItems);
        });
    } else {
        // 直接复制
        copyAllText(selectedItems);
    }
}

// 开始分批复�?function startBatchCopy(items, startIndex = 0) {
    const BATCH_SIZE = 8;
    const currentBatch = items.slice(startIndex, startIndex + BATCH_SIZE);
    const remainingCount = items.length - (startIndex + BATCH_SIZE);

    // 复制当前批次
    copyAllText(currentBatch);

    // 如果还有剩余项目，显示继续复制对话框
    if (remainingCount > 0) {
        const continueCopyModal = new bootstrap.Modal(document.getElementById('continueCopyModal'));
        $('#remainingCount').text(remainingCount);
        
        // 继续复制按钮事件
        $('#continueCopyBtn').off('click').on('click', function() {
            continueCopyModal.hide();
            startBatchCopy(items, startIndex + BATCH_SIZE);
        });

        continueCopyModal.show();
    } else {
        // 所有批次复制完�?        setTimeout(() => {
            alert('所有记录已复制完成�?);
        }, 100);
    }
}

// 取选中的项�?function getSelectedItems() {
    return Array.from(document.querySelectorAll('.result-card input[type="checkbox"]:checked'))
        .map(checkbox => {
            const card = checkbox.closest('.result-card');
            return {
                city: card.querySelector('.tag-city')?.textContent || '',
                district: card.querySelector('.tag-district')?.textContent || '',
                grade: card.querySelector('.tag-grade')?.textContent || '',
                subjects: Array.from(card.querySelectorAll('.tag-subject')).map(tag => tag.textContent),
                raw: card.querySelector('.raw-content')?.textContent || ''
            };
        });
}

// 复制全部文本
function copyAllText(items) {
    const texts = items.map(item => {
        let text = item.raw || '';
        // 如果raw为空，则使用标签信息组合
        if (!text.trim()) {
            text = `${item.city} ${item.district} ${item.grade} ${item.subjects.join('/')}`;
        }
        return text;
    });

    const tempTextArea = document.createElement('textarea');
    tempTextArea.value = texts.join('\n\n');
    document.body.appendChild(tempTextArea);
    tempTextArea.select();
    
    try {
        document.execCommand('copy');
        setTimeout(() => {
            alert('复制成功�?);
        }, 100);
    } catch (err) {
        alert('复制失败，请重试');
        console.error('复制失败:', err);
    } finally {
        document.body.removeChild(tempTextArea);
    }
}

// 重置筛选条�?function resetFilters() {
    // 重置所有筛选条�?    $('#searchInput').val('');
    $('#filterCity').val('');
    $('#filterGrade').val('');
    $('#filterSubject').val('');
    $('#filterDate').val('');
    $('#dateStart').val('');
    $('#dateEnd').val('');
    
    // 重置筛选结�?    filteredResults = [...allResults];
    
    // 更新显示
    displayResults(filteredResults);
    
    // 更新筛选选项
    updateFilterOptions();
}

// 应用筛选条�?function applyFilters() {
    const searchText = $('#searchInput').val().toLowerCase();
    const selectedCity = $('#filterCity').val();
    const selectedGrade = $('#filterGrade').val();
    const selectedSubject = $('#filterSubject').val();
    const selectedDate = $('#filterDate').val();
    const dateStart = $('#dateStart').val();
    const dateEnd = $('#dateEnd').val();

    // 从所有结果开始筛�?    filteredResults = [...allResults];

    // 应用搜索文本筛�?    if (searchText) {
        filteredResults = filteredResults.filter(result => 
            result.raw.toLowerCase().includes(searchText)
        );
    }

    // 应用城市筛�?    if (selectedCity) {
        filteredResults = filteredResults.filter(result => 
            result.city === selectedCity
        );
    }

    // 应用年级筛�?    if (selectedGrade) {
        filteredResults = filteredResults.filter(result => 
            result.grade === selectedGrade
        );
    }

    // 应用科目筛�?    if (selectedSubject) {
        filteredResults = filteredResults.filter(result => 
            result.subjects.includes(selectedSubject)
        );
    }

    // 应用日期筛�?    if (selectedDate || (dateStart && dateEnd)) {
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
                    if (!startDate || !endDate) return true;
                    const start = new Date(startDate);
                    const end = new Date(endDate);
                    end.setHours(23, 59, 59, 999); // 设置为当天的最后一毫秒
                    return createDate >= start && createDate <= end;
                }
                default:
                    return true;
            }
        });
    }

    // 显示筛选后的结�?    displayResults(filteredResults);
}

// 初始化事件监�?function initializeFilters() {
    // 监听筛选条件变�?    $('#searchInput').on('input', applyFilters);
    $('#filterCity').on('change', applyFilters);
    $('#filterGrade').on('change', applyFilters);
    $('#filterSubject').on('change', applyFilters);
    $('#filterDate').on('change', function() {
        if (this.value !== 'custom') {
            $('#customDateRange').hide();
            applyFilters();
        }
    });
    
    // 重置按钮事件
    $('#resetDateRange').on('click', function() {
        $('#dateStart').val('');
        $('#dateEnd').val('');
        $('#filterDate').val('');
        applyFilters();
        $('#customDateRange').hide();
    });
    
    // 应用自定义日期范�?    $('#applyDateRange').on('click', function() {
        applyFilters();
        $('#customDateRange').hide();
    });
    
    // 初始化时显示所有结�?    resetFilters();
}

// 更新筛选选项
function updateFilterOptions() {
    // 获取所有唯一的城市、年级和科目
    const cities = new Set();
    const grades = new Set();
    const subjects = new Set();

    allResults.forEach(result => {
        if (result.city) cities.add(result.city);
        if (result.grade) grades.add(result.grade);
        if (result.subjects && Array.isArray(result.subjects)) {
            result.subjects.forEach(subject => subjects.add(subject));
        }
    });

    // 更新城市下拉列表
    const filterCity = document.getElementById('filterCity');
    filterCity.innerHTML = '<option value="">所有城�?/option>';
    Array.from(cities).sort().forEach(city => {
        filterCity.innerHTML += `<option value="${city}">${city}</option>`;
    });

    // 更新年级下拉列表
    const filterGrade = document.getElementById('filterGrade');
    filterGrade.innerHTML = '<option value="">所有年�?/option>';
    Array.from(grades).sort().forEach(grade => {
        filterGrade.innerHTML += `<option value="${grade}">${grade}</option>`;
    });

    // 更新科目下拉列表
    const filterSubject = document.getElementById('filterSubject');
    filterSubject.innerHTML = '<option value="">所有科�?/option>';
    Array.from(subjects).sort().forEach(subject => {
        filterSubject.innerHTML += `<option value="${subject}">${subject}</option>`;
    });
}

// 在页面加载完成后初始化确定按钮的点击事件
$(document).ready(function() {
    // 为确��按钮添加点击事件
    $('.modal .btn-primary').on('click', function() {
        const modal = $(this).closest('.modal');
        const modalInstance = bootstrap.Modal.getInstance(modal[0]);
        if (modalInstance) {
            modalInstance.hide();
        } else {
            modal.modal('hide');
        }
    });

    // 监听确认模态框的隐藏事�?    $('#confirmModal').on('hidden.bs.modal', function() {
        // 清除所有选中状�?        $('.card-select').prop('checked', false);
        $('#selectAll').prop('checked', false);
        updateSelectedCount();
        updateBatchActionsVisibility();
    });
});

// 导出文本
function exportText() {
    const selectedCheckboxes = $('.card-select:checked');
    if (selectedCheckboxes.length === 0) {
        alert('请先选择要导出的项目');
        return;
    }

    // 获取选中项的原始文本和城市区域信�?    const selectedTexts = [];
    const cities = new Set();
    const districts = new Set();
    let commonCity = null;
    
    selectedCheckboxes.each(function() {
        const id = $(this).attr('data-id');
        const result = allResults.find(r => r.id === id);
        if (result && result.raw) {
            selectedTexts.push(result.raw.trim());
            if (result.city) {
                cities.add(result.city);
                if (result.district) {
                    districts.add(result.district);
                }
            }
        }
    });

    if (selectedTexts.length === 0) {
        alert('没有找到可导出的内容');
        return;
    }

    // 使用双换行符连接�?    const textToExport = selectedTexts.join('\n\n') + '\n';
    
    // 生成文件�?    let fileName = '';
    const date = new Date().toLocaleDateString().replace(/\//g, '-');
    
    if (cities.size === 1) {
        // 只有一个城�?        const city = Array.from(cities)[0];
        if (districts.size === 1) {
            // 一个城市一个区�?            const district = Array.from(districts)[0];
            fileName = `${city}${district}家教_${date}.txt`;
        } else {
            // 一个城市多个区�?            fileName = `${city}家教_${date}.txt`;
        }
    } else {
        // 多个城市
        fileName = `家教信息导出_${date}.txt`;
    }
    
    // 创建Blob对象
    const blob = new Blob([textToExport], { type: 'text/plain;charset=utf-8' });
    
    // 创建下载链接
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    
    // 触发下载
    document.body.appendChild(a);
    a.click();
    
    // 清理
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
}

// 处理薪酬信息
function extractSalaryInfo(text) {
    // 将文本按行分�?    const lines = text.split('\n');
    
    // 找到包含薪酬关键词的�?    const salaryLine = lines.find(line => 
        line.includes('薪酬') || 
        line.includes('价格') || 
        line.includes('薪资') || 
        line.includes('课费')
    );
    
    if (!salaryLine) return { salary: '', salaryUnit: '' };
    
    // 薪酬匹配模式，按照优先级排序
    const salaryPatterns = [
        // 匹配范围格式，如 "350-400/�? "350~400�?�? "350�?00每次"
        /(\d+)[-~到至](\d+)\s*[元]?\s*[\/每]?\s*(小时|h|hr|hour)/i,
        /(\d+)[-~到至](\d+)\s*[元]?\s*[\/每]?\s*(课时|节课|�?/i,
        /(\d+)[-~到至](\d+)\s*[元]?\s*[\/每]?\s*(�?/i,
        /(\d+)[-~到至](\d+)\s*[元]?\s*[\/每]?\s*(�?/i,
        /(\d+)[-~到至](\d+)\s*�?i,
        
        // 匹配单个数值格�?        /(\d+)\s*[元]?\s*[\/每]?\s*(小时|h|hr|hour)/i,
        /(\d+)\s*[元]?\s*[\/每]?\s*(课时|节课|�?/i,
        /(\d+)\s*[元]?\s*[\/每]?\s*(�?/i,
        /(\d+)\s*[元]?\s*[\/每]?\s*(�?/i,
        /(\d+)\s*�?i
    ];

    // 尝试所有匹配模�?    for (const pattern of salaryPatterns) {
        const match = salaryLine.match(pattern);
        if (match) {
            // 如果是范围格式（有三个捕获组�?            if (match.length > 3) {
                const minSalary = match[1];
                const maxSalary = match[2];
                const unit = match[3]?.toLowerCase() || '�?;
                const salary = `${minSalary}-${maxSalary}`;
                
                // 统一薪酬单位显示
                let standardUnit;
                switch(unit) {
                    case 'h':
                    case 'hr':
                    case 'hour':
                    case '小时':
                        standardUnit = '小时';
                        break;
                    case '课时':
                    case '节课':
                    case '�?:
                        standardUnit = '�?;
                        break;
                    case '�?:
                        standardUnit = '�?;
                        break;
                    default:
                        standardUnit = '�?;
                }
                
                return { salary, salaryUnit: standardUnit };
            } else {
                // 单个数值格�?                const salary = match[1];
                const unit = match[2]?.toLowerCase() || '�?;
                
                // 统一薪酬单位显示
                let standardUnit;
                switch(unit) {
                    case 'h':
                    case 'hr':
                    case 'hour':
                    case '小时':
                        standardUnit = '小时';
                        break;
                    case '课时':
                    case '节课':
                    case '�?:
                        standardUnit = '�?;
                        break;
                    case '�?:
                        standardUnit = '�?;
                        break;
                    default:
                        standardUnit = '�?;
                }
                
                return { salary, salaryUnit: standardUnit };
            }
        }
    }
    
    return { salary: '', salaryUnit: '' };
}

// 在页面加载时初始化数�?$(document).ready(function() {
    // 初始化为空数�?    allResults = [];
    
    // 初始化编辑模态��?    initializeEditModal();
    
    // 初始化筛选器
    initializeFilters();
    
    // 初始化批量操作按钮事�?    $('#batchCopy').off('click').on('click', batchCopy);
    $('#batchDelete').off('click').on('click', batchDelete);
    $('#batchExport').off('click').on('click', exportText);
    
    // 初始化筛选器事件
    $('#filterCity, #filterGrade, #filterSubject').off('change').on('change', applyFilters);
    $('#searchInput').off('input').on('input', applyFilters);
    
    // 从文件加载数�?    loadData();
    
    // 初始化识别文本按钮的点击事件
    $('#parseBtn').off('click').on('click', function() {
        const textInput = $('#textInput').val().trim();
        if (!textInput) {
            alert('请输入要识别的文�?);
            return;
        }
        
        console.log('开始解析文�?', textInput);
        
        // 解析文本
        const newResults = parseText(textInput);
        console.log('解析结果:', newResults);
        
        if (newResults.length === 0) {
            alert('未能识别出有效的家教信息，请检查文本格�?);
            return;
        }
        
        // 更新全局数据
        allResults = [...allResults, ...newResults];
        console.log('更新后的总数�?', allResults.length, '条记�?);
        
        // 保存数据
        saveDataToStorage();
        
        // 更新显示
        displayResults(allResults);
        updateFilterOptions();
        updateTotalCount();
        
        // 显示成功消息
        alert(`成功识别 ${newResults.length} 条家教信息`);
        
        // 清空输入�?        $('#textInput').val('');
        
        // 关闭模态框
        const addModal = bootstrap.Modal.getInstance(document.getElementById('addModal'));
        if (addModal) {
            addModal.hide();
        }
    });
});

// 添加文件拖放功能
function initializeFileDropZone() {
    const dropZone = document.createElement('div');
    dropZone.id = 'fileDropZone';
    dropZone.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px;
        border: 2px dashed #ccc;
        border-radius: 8px;
        background: #f8f9fa;
        cursor: pointer;
        z-index: 1000;
    `;
    dropZone.innerHTML = '拖放数据文件到这�?br>或点击选择文件';
    
    // 创建文件输入�?    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.style.display = 'none';
    
    dropZone.appendChild(fileInput);
    document.body.appendChild(dropZone);
    
    // 处理拖放事件
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#0d6efd';
        dropZone.style.background = '#e9ecef';
    });
    
    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#ccc';
        dropZone.style.background = '#f8f9fa';
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#ccc';
        dropZone.style.background = '#f8f9fa';
        
        const file = e.dataTransfer.files[0];
        if (file && file.name.endsWith('.json')) {
            loadDataFromFile(file);
        }
    });
    
    // 处理点击选择文件
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });
    
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.name.endsWith('.json')) {
            loadDataFromFile(file);
        }
    });
}

// 从文件加载数�?function loadDataFromFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            allResults = ensureDataHasIds(data);
            displayResults(allResults);
            updateFilterOptions();
            updateTotalCount();
            // 保存�?localStorage 作为备份
            localStorage.setItem('tutorData', JSON.stringify(allResults));
        } catch (error) {
            console.error('解析数据文件失败:', error);
            alert('数据文件格式不正确，请检查文件内�?);
        }
    };
    reader.onerror = function(e) {
        console.error('读取文件失败:', e);
        alert('读取文件失败，请重试');
    };
    reader.readAsText(file);
}

// 添加自动保存功能
function autoSave() {
    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(() => {
        saveDataToFile();
    }, 5000); // 5秒后自动保存
}

// 修改保存数据的函�?async function saveDataToFile() {
    try {
        // 创建要保存的数据
        const data = JSON.stringify(allResults, null, 2);
        
        // 创建 Blob 对象
        const blob = new Blob([data], { type: 'application/json' });
        
        // 创建下载链接
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'tutoring_data.json';
        
        // 触发下载
        document.body.appendChild(a);
        a.click();
        
        // 清理
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
        
        // 同时保存�?localStorage 作为备份
        localStorage.setItem('tutorData', data);
        
    } catch (error) {
        console.error('保存数据失败:', error);
        // 如果保存到文件失败，至少保存�?localStorage
        localStorage.setItem('tutorData', JSON.stringify(allResults));
    }
}

// 批量复制功能
function batchCopy() {
    const selectedItems = getSelectedItems();
    if (selectedItems.length === 0) {
        alert('请先选择要复制的项目');
        return;
    }

    if (selectedItems.length > 8) {
        // 显示选择复制方式的对话框
        const batchCopyModal = new bootstrap.Modal(document.getElementById('batchCopyModal'));
        batchCopyModal.show();

        // 分批复制按钮事件
        $('#batchCopyBtn').off('click').on('click', function() {
            batchCopyModal.hide();
            startBatchCopy(selectedItems);
        });

        // 全部复制按钮事件
        $('#copyAllBtn').off('click').on('click', function() {
            batchCopyModal.hide();
            copyAllText(selectedItems);
        });
    } else {
        // 直接复制
        copyAllText(selectedItems);
    }
}

// 开始分批复�?function startBatchCopy(items, startIndex = 0) {
    const BATCH_SIZE = 8;
    const currentBatch = items.slice(startIndex, startIndex + BATCH_SIZE);
    const remainingCount = items.length - (startIndex + BATCH_SIZE);

    // 复制当前批次
    copyAllText(currentBatch);

    // 如果还有剩余项目，显示继续复制对话框
    if (remainingCount > 0) {
        const continueCopyModal = new bootstrap.Modal(document.getElementById('continueCopyModal'));
        $('#remainingCount').text(remainingCount);
        
        // 继续复制按钮事件
        $('#continueCopyBtn').off('click').on('click', function() {
            continueCopyModal.hide();
            startBatchCopy(items, startIndex + BATCH_SIZE);
        });

        continueCopyModal.show();
    } else {
        // 所有批次复制完�?        setTimeout(() => {
            alert('所有记录已复制完成�?);
        }, 100);
    }
}

// 取选中的项�?function getSelectedItems() {
    return Array.from(document.querySelectorAll('.result-card input[type="checkbox"]:checked'))
        .map(checkbox => {
            const card = checkbox.closest('.result-card');
            return {
                city: card.querySelector('.tag-city')?.textContent || '',
                district: card.querySelector('.tag-district')?.textContent || '',
                grade: card.querySelector('.tag-grade')?.textContent || '',
                subjects: Array.from(card.querySelectorAll('.tag-subject')).map(tag => tag.textContent),
                raw: card.querySelector('.raw-content')?.textContent || ''
            };
        });
}

// 复制全部文本
function copyAllText(items) {
    const texts = items.map(item => {
        let text = item.raw || '';
        // 如果raw为空，则使用标签信息组合
        if (!text.trim()) {
            text = `${item.city} ${item.district} ${item.grade} ${item.subjects.join('/')}`;
        }
        return text;
    });

    const tempTextArea = document.createElement('textarea');
    tempTextArea.value = texts.join('\n\n');
    document.body.appendChild(tempTextArea);
    tempTextArea.select();
    
    try {
        document.execCommand('copy');
        setTimeout(() => {
            alert('复制成功�?);
        }, 100);
    } catch (err) {
        alert('复制失败，请重试');
        console.error('复制失败:', err);
    } finally {
        document.body.removeChild(tempTextArea);
    }
}

// 重置筛选条�?function resetFilters() {
    // 重置所有筛选条�?    $('#searchInput').val('');
    $('#filterCity').val('');
    $('#filterGrade').val('');
    $('#filterSubject').val('');
    $('#filterDate').val('');
    $('#dateStart').val('');
    $('#dateEnd').val('');
    
    // 重置筛选结�?    filteredResults = [...allResults];
    
    // 更新显示
    displayResults(filteredResults);
    
    // 更新筛选选项
    updateFilterOptions();
}

// 应用筛选条�?function applyFilters() {
    const searchText = $('#searchInput').val().toLowerCase();
    const selectedCity = $('#filterCity').val();
    const selectedGrade = $('#filterGrade').val();
    const selectedSubject = $('#filterSubject').val();
    const selectedDate = $('#filterDate').val();
    const dateStart = $('#dateStart').val();
    const dateEnd = $('#dateEnd').val();

    // 从所有结果开始筛�?    filteredResults = [...allResults];

    // 应用搜索文本筛�?    if (searchText) {
        filteredResults = filteredResults.filter(result => 
            result.raw.toLowerCase().includes(searchText)
        );
    }

    // 应用城市筛�?    if (selectedCity) {
        filteredResults = filteredResults.filter(result => 
            result.city === selectedCity
        );
    }

    // 应用年级筛�?    if (selectedGrade) {
        filteredResults = filteredResults.filter(result => 
            result.grade === selectedGrade
        );
    }

    // 应用科目筛�?    if (selectedSubject) {
        filteredResults = filteredResults.filter(result => 
            result.subjects.includes(selectedSubject)
        );
    }

    // 应用日期筛�?    if (selectedDate || (dateStart && dateEnd)) {
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
                    if (!startDate || !endDate) return true;
                    const start = new Date(startDate);
                    const end = new Date(endDate);
                    end.setHours(23, 59, 59, 999); // 设置为当天的最后一毫秒
                    return createDate >= start && createDate <= end;
                }
                default:
                    return true;
            }
        });
    }

    // 显示筛选后的结�?    displayResults(filteredResults);
}

// 初始化事件监�?function initializeFilters() {
    // 监听筛选条件变�?    $('#searchInput').on('input', applyFilters);
    $('#filterCity').on('change', applyFilters);
    $('#filterGrade').on('change', applyFilters);
    $('#filterSubject').on('change', applyFilters);
    $('#filterDate').on('change', function() {
        if (this.value !== 'custom') {
            $('#customDateRange').hide();
            applyFilters();
        }
    });
    
    // 重置按钮事件
    $('#resetDateRange').on('click', function() {
        $('#dateStart').val('');
        $('#dateEnd').val('');
        $('#filterDate').val('');
        applyFilters();
        $('#customDateRange').hide();
    });
    
    // 应用自定义日期范�?    $('#applyDateRange').on('click', function() {
        applyFilters();
        $('#customDateRange').hide();
    });
    
    // 初始化时显示所有结�?    resetFilters();
}

// 更新筛选选项
function updateFilterOptions() {
    // 获取所有唯一的城市、年级和科目
    const cities = new Set();
    const grades = new Set();
    const subjects = new Set();

    allResults.forEach(result => {
        if (result.city) cities.add(result.city);
        if (result.grade) grades.add(result.grade);
        if (result.subjects && Array.isArray(result.subjects)) {
            result.subjects.forEach(subject => subjects.add(subject));
        }
    });

    // 更新城市下拉列表
    const filterCity = document.getElementById('filterCity');
    filterCity.innerHTML = '<option value="">所有城�?/option>';
    Array.from(cities).sort().forEach(city => {
        filterCity.innerHTML += `<option value="${city}">${city}</option>`;
    });

    // 更新年级下拉列表
    const filterGrade = document.getElementById('filterGrade');
    filterGrade.innerHTML = '<option value="">所有年�?/option>';
    Array.from(grades).sort().forEach(grade => {
        filterGrade.innerHTML += `<option value="${grade}">${grade}</option>`;
    });

    // 更新科目下拉列表
    const filterSubject = document.getElementById('filterSubject');
    filterSubject.innerHTML = '<option value="">所有科�?/option>';
    Array.from(subjects).sort().forEach(subject => {
        filterSubject.innerHTML += `<option value="${subject}">${subject}</option>`;
    });
}

// 在页面加载完成后初始化确定按钮的点击事件
$(document).ready(function() {
    // 为确��按钮添加点击事件
    $('.modal .btn-primary').on('click', function() {
        const modal = $(this).closest('.modal');
        const modalInstance = bootstrap.Modal.getInstance(modal[0]);
        if (modalInstance) {
            modalInstance.hide();
        } else {
            modal.modal('hide');
        }
    });

    // 监听确认模态框的隐藏事�?    $('#confirmModal').on('hidden.bs.modal', function() {
        // 清除所有选中状�?        $('.card-select').prop('checked', false);
        $('#selectAll').prop('checked', false);
        updateSelectedCount();
        updateBatchActionsVisibility();
    });
});

// 导出文本
function exportText() {
    const selectedCheckboxes = $('.card-select:checked');
    if (selectedCheckboxes.length === 0) {
        alert('请先选择要导出的项目');
        return;
    }

    // 获取选中项的原始文本和城市区域信�?    const selectedTexts = [];
    const cities = new Set();
    const districts = new Set();
    let commonCity = null;
    
    selectedCheckboxes.each(function() {
        const id = $(this).attr('data-id');
        const result = allResults.find(r => r.id === id);
        if (result && result.raw) {
            selectedTexts.push(result.raw.trim());
            if (result.city) {
                cities.add(result.city);
                if (result.district) {
                    districts.add(result.district);
                }
            }
        }
    });

    if (selectedTexts.length === 0) {
        alert('没有找到可导出的内容');
        return;
    }

    // 使用双换行符连接�?    const textToExport = selectedTexts.join('\n\n') + '\n';
    
    // 生成文件�?    let fileName = '';
    const date = new Date().toLocaleDateString().replace(/\//g, '-');
    
    if (cities.size === 1) {
        // 只有一个城�?        const city = Array.from(cities)[0];
        if (districts.size === 1) {
            // 一个城市一个区�?            const district = Array.from(districts)[0];
            fileName = `${city}${district}家教_${date}.txt`;
        } else {
            // 一个城市多个区�?            fileName = `${city}家教_${date}.txt`;
        }
    } else {
        // 多个城市
        fileName = `家教信息导出_${date}.txt`;
    }
    
    // 创建Blob对象
    const blob = new Blob([textToExport], { type: 'text/plain;charset=utf-8' });
    
    // 创建下载链接
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    
    // 触发下载
    document.body.appendChild(a);
    a.click();
    
    // 清理
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
}

// 处理薪酬信息
function extractSalaryInfo(text) {
    // 将文本按行分�?    const lines = text.split('\n');
    
    // 找到包含薪酬关键词的�?    const salaryLine = lines.find(line => 
        line.includes('薪酬') || 
        line.includes('价格') || 
        line.includes('薪资') || 
        line.includes('课费')
    );
    
    if (!salaryLine) return { salary: '', salaryUnit: '' };
    
    // 薪酬匹配模式，按照优先级排序
    const salaryPatterns = [
        // 匹配范围格式，如 "350-400/�? "350~400�?�? "350�?00每次"
        /(\d+)[-~到至](\d+)\s*[元]?\s*[\/每]?\s*(小时|h|hr|hour)/i,
        /(\d+)[-~到至](\d+)\s*[元]?\s*[\/每]?\s*(课时|节课|�?/i,
        /(\d+)[-~到至](\d+)\s*[元]?\s*[\/每]?\s*(�?/i,
        /(\d+)[-~到至](\d+)\s*[元]?\s*[\/每]?\s*(�?/i,
        /(\d+)[-~到至](\d+)\s*�?i,
        
        // 匹配单个数值格�?        /(\d+)\s*[元]?\s*[\/每]?\s*(小时|h|hr|hour)/i,
        /(\d+)\s*[元]?\s*[\/每]?\s*(课时|节课|�?/i,
        /(\d+)\s*[元]?\s*[\/每]?\s*(�?/i,
        /(\d+)\s*[元]?\s*[\/每]?\s*(�?/i,
        /(\d+)\s*�?i
    ];

    // 尝试所有匹配模�?    for (const pattern of salaryPatterns) {
        const match = salaryLine.match(pattern);
        if (match) {
            // 如果是范围格式（有三个捕获组�?            if (match.length > 3) {
                const minSalary = match[1];
                const maxSalary = match[2];
                const unit = match[3]?.toLowerCase() || '�?;
                const salary = `${minSalary}-${maxSalary}`;
                
                // 统一薪酬单位显示
                let standardUnit;
                switch(unit) {
                    case 'h':
                    case 'hr':
                    case 'hour':
                    case '小时':
                        standardUnit = '小时';
                        break;
                    case '课时':
                    case '节课':
                    case '�?:
                        standardUnit = '�?;
                        break;
                    case '�?:
                        standardUnit = '�?;
                        break;
                    default:
                        standardUnit = '�?;
                }
                
                return { salary, salaryUnit: standardUnit };
            } else {
                // 单个数值格�?                const salary = match[1];
                const unit = match[2]?.toLowerCase() || '�?;
                
                // 统一薪酬单位显示
                let standardUnit;
                switch(unit) {
                    case 'h':
                    case 'hr':
                    case 'hour':
                    case '小时':
                        standardUnit = '小时';
                        break;
                    case '课时':
                    case '节课':
                    case '�?:
                        standardUnit = '�?;
                        break;
                    case '�?:
                        standardUnit = '�?;
                        break;
                    default:
                        standardUnit = '�?;
                }
                
                return { salary, salaryUnit: standardUnit };
            }
        }
    }
    
    return { salary: '', salaryUnit: '' };
}

// 在页面加载时初始化数�?$(document).ready(function() {
    // 初始化为空数�?    allResults = [];
    
    // 初始化编辑模态��?    initializeEditModal();
    
    // 初始化筛选器
    initializeFilters();
    
    // 初始化批量操作按钮事�?    $('#batchCopy').off('click').on('click', batchCopy);
    $('#batchDelete').off('click').on('click', batchDelete);
    $('#batchExport').off('click').on('click', exportText);
    
    // 初始化筛选器事件
    $('#filterCity, #filterGrade, #filterSubject').off('change').on('change', applyFilters);
    $('#searchInput').off('input').on('input', applyFilters);
    
    // 从文件加载数�?    loadData();
    
    // 初始化识别文本按钮的点击事件
    $('#parseBtn').off('click').on('click', function() {
        const textInput = $('#textInput').val().trim();
        if (!textInput) {
            alert('请输入要识别的文�?);
            return;
        }
        
        console.log('开始解析文�?', textInput);
        
        // 解析文本
        const newResults = parseText(textInput);
        console.log('解析结果:', newResults);
        
        if (newResults.length === 0) {
            alert('未能识别出有效的家教信息，请检查文本格�?);
            return;
        }
        
        // 更新全局数据
        allResults = [...allResults, ...newResults];
        console.log('更新后的总数�?', allResults.length, '条记�?);
        
        // 保存数据
        saveDataToStorage();
        
        // 更新显示
        displayResults(allResults);
        updateFilterOptions();
        updateTotalCount();
        
        // 显示成功消息
        alert(`成功识别 ${newResults.length} 条家教信息`);
        
        // 清空输入�?        $('#textInput').val('');
        
        // 关闭模态框
        const addModal = bootstrap.Modal.getInstance(document.getElementById('addModal'));
        if (addModal) {
            addModal.hide();
        }
    });
});

// 添加文件拖放功能
function initializeFileDropZone() {
    const dropZone = document.createElement('div');
    dropZone.id = 'fileDropZone';
    dropZone.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px;
        border: 2px dashed #ccc;
        border-radius: 8px;
        background: #f8f9fa;
        cursor: pointer;
        z-index: 1000;
    `;
    dropZone.innerHTML = '拖放数据文件到这�?br>或点击选择文件';
    
    // 创建文件输入�?    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.style.display = 'none';
    
    dropZone.appendChild(fileInput);
    document.body.appendChild(dropZone);
    
    // 处理拖放事件
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#0d6efd';
        dropZone.style.background = '#e9ecef';
    });
    
    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#ccc';
        dropZone.style.background = '#f8f9fa';
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#ccc';
        dropZone.style.background = '#f8f9fa';
        
        const file = e.dataTransfer.files[0];
        if (file && file.name.endsWith('.json')) {
            loadDataFromFile(file);
        }
    });
    
    // 处理点击选择文件
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });
    
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.name.endsWith('.json')) {
            loadDataFromFile(file);
        }
    });
}

// 从文件加载数�?function loadDataFromFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            allResults = ensureDataHasIds(data);
            displayResults(allResults);
            updateFilterOptions();
            updateTotalCount();
            // 保存�?localStorage 作为备份
            localStorage.setItem('tutorData', JSON.stringify(allResults));
        } catch (error) {
            console.error('解析数据文件失败:', error);
            alert('数据文件格式不正确，请检查文件内�?);
        }
    };
    reader.onerror = function(e) {
        console.error('读取文件失败:', e);
        alert('读取文件失败，请重试');
    };
    reader.readAsText(file);
}

// 添加自动保存功能
function autoSave() {
    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(() => {
        saveDataToFile();
    }, 5000); // 5秒后自动保存
}

// 修改保存数据的函�?async function saveDataToFile() {
    try {
        // 创建要保存的数据
        const data = JSON.stringify(allResults, null, 2);
        
        // 创建 Blob 对象
        const blob = new Blob([data], { type: 'application/json' });
        
        // 创建下载链接
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'tutoring_data.json';
        
        // 触发下载
        document.body.appendChild(a);
        a.click();
        
        // 清理
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
        
        // 同时保存�?localStorage 作为备份
        localStorage.setItem('tutorData', data);
        
    } catch (error) {
        console.error('保存数据失败:', error);
        // 如果保存到文件失败，至少保存�?localStorage
        localStorage.setItem('tutorData', JSON.stringify(allResults));
    }
}

// 批量复制功能
function batchCopy() {
    const selectedItems = getSelectedItems();
    if (selectedItems.length === 0) {
        alert('请先选择要复制的项目');
        return;
    }

    if (selectedItems.length > 8) {
        // 显示选择复制方式的对话框
        const batchCopyModal = new bootstrap.Modal(document.getElementById('batchCopyModal'));
        batchCopyModal.show();

        // 分批复制按钮事件
        $('#batchCopyBtn').off('click').on('click', function() {
            batchCopyModal.hide();
            startBatchCopy(selectedItems);
        });

        // 全部复制按钮事件
        $('#copyAllBtn').off('click').on('click', function() {
            batchCopyModal.hide();
            copyAllText(selectedItems);
        });
    } else {
        // 直接复制
        copyAllText(selectedItems);
    }
}

// 开始分批复�?function startBatchCopy(items, startIndex = 0) {
    const BATCH_SIZE = 8;
    const currentBatch = items.slice(startIndex, startIndex + BATCH_SIZE);
    const remainingCount = items.length - (startIndex + BATCH_SIZE);

    // 复制当前批次
    copyAllText(currentBatch);

    // 如果还有剩余项目，显示继续复制对话框
    if (remainingCount > 0) {
        const continueCopyModal = new bootstrap.Modal(document.getElementById('continueCopyModal'));
        $('#remainingCount').text(remainingCount);
        
        // 继续复制按钮事件
        $('#continueCopyBtn').off('click').on('click', function() {
            continueCopyModal.hide();
            startBatchCopy(items, startIndex + BATCH_SIZE);
        });

        continueCopyModal.show();
    } else {
        // 所有批次复制完�?        setTimeout(() => {
            alert('所有记录已复制完成�?);
        }, 100);
    }
}

// 取选中的项�?function getSelectedItems() {
    return Array.from(document.querySelectorAll('.result-card input[type="checkbox"]:checked'))
        .map(checkbox => {
            const card = checkbox.closest('.result-card');
            return {
                city: card.querySelector('.tag-city')?.textContent || '',
                district: card.querySelector('.tag-district')?.textContent || '',
                grade: card.querySelector('.tag-grade')?.textContent || '',
                subjects: Array.from(card.querySelectorAll('.tag-subject')).map(tag => tag.textContent),
                raw: card.querySelector('.raw-content')?.textContent || ''
            };
        });
}

// 复制全部文本
function copyAllText(items) {
    const texts = items.map(item => {
        let text = item.raw || '';
        // 如果raw为空，则使用标签信息组合
        if (!text.trim()) {
            text = `${item.city} ${item.district} ${item.grade} ${item.subjects.join('/')}`;
        }
        return text;
    });

    const tempTextArea = document.createElement('textarea');
    tempTextArea.value = texts.join('\n\n');
    document.body.appendChild(tempTextArea);
    tempTextArea.select();
    
    try {
        document.execCommand('copy');
        setTimeout(() => {
            alert('复制成功�?);
        }, 100);
    } catch (err) {
        alert('复制失败，请重试');
        console.error('复制失败:', err);
    } finally {
        document.body.removeChild(tempTextArea);
    }
}

// 重置筛选条�?function resetFilters() {
    // 重置所有筛选条�?    $('#searchInput').val('');
    $('#filterCity').val('');
    $('#filterGrade').val('');
    $('#filterSubject').val('');
    $('#filterDate').val('');
    $('#dateStart').val('');
    $('#dateEnd').val('');
    
    // 重置筛选结�?    filteredResults = [...allResults];
    
    // 更新显示
    displayResults(filteredResults);
    
    // 更新筛选选项
    updateFilterOptions();
}

// 应用筛选条�?function applyFilters() {
    const searchText = $('#searchInput').val().toLowerCase();
    const selectedCity = $('#filterCity').val();
    const selectedGrade = $('#filterGrade').val();
    const selectedSubject = $('#filterSubject').val();
    const selectedDate = $('#filterDate').val();
    const dateStart = $('#dateStart').val();
    const dateEnd = $('#dateEnd').val();

    // 从所有结果开始筛�?    filteredResults = [...allResults];

    // 应用搜索文本筛�?    if (searchText) {
        filteredResults = filteredResults.filter(result => 
            result.raw.toLowerCase().includes(searchText)
        );
    }

    // 应用城市筛�?    if (selectedCity) {
        filteredResults = filteredResults.filter(result => 
            result.city === selectedCity
        );
    }

    // 应用年级筛�?    if (selectedGrade) {
        filteredResults = filteredResults.filter(result => 
            result.grade === selectedGrade
        );
    }

    // 应用科目筛�?    if (selectedSubject) {
        filteredResults = filteredResults.filter(result => 
            result.subjects.includes(selectedSubject)
        );
    }

    // 应用日期筛�?    if (selectedDate || (dateStart && dateEnd)) {
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
                    if (!startDate || !endDate) return true;
                    const start = new Date(startDate);
                    const end = new Date(endDate);
                    end.setHours(23, 59, 59, 999); // 设置为当天的最后一毫秒
                    return createDate >= start && createDate <= end;
                }
                default:
                    return true;
            }
        });
    }

    // 显示筛选后的结�?    displayResults(filteredResults);
}

// 初始化事件监�?function initializeFilters() {
    // 监听筛选条件变�?    $('#searchInput').on('input', applyFilters);
    $('#filterCity').on('change', applyFilters);
    $('#filterGrade').on('change', applyFilters);
    $('#filterSubject').on('change', applyFilters);
    $('#filterDate').on('change', function() {
        if (this.value !== 'custom') {
            $('#customDateRange').hide();
            applyFilters();
        }
    });
    
    // 重置按钮事件
    $('#resetDateRange').on('click', function() {
        $('#dateStart').val('');
        $('#dateEnd').val('');
        $('#filterDate').val('');
        applyFilters();
        $('#customDateRange').hide();
    });
    
    // 应用自定义日期范�?    $('#applyDateRange').on('click', function() {
        applyFilters();
        $('#customDateRange').hide();
    });
    
    // 初始化时显示所有结�?    resetFilters();
}

// 更新筛选选项
function updateFilterOptions() {
    // 获取所有唯一的城市、年级和科目
    const cities = new Set();
    const grades = new Set();
    const subjects = new Set();

    allResults.forEach(result => {
        if (result.city) cities.add(result.city);
        if (result.grade) grades.add(result.grade);
        if (result.subjects && Array.isArray(result.subjects)) {
            result.subjects.forEach(subject => subjects.add(subject));
        }
    });

    // 更新城市下拉列表
    const filterCity = document.getElementById('filterCity');
    filterCity.innerHTML = '<option value="">所有城�?/option>';
    Array.from(cities).sort().forEach(city => {
        filterCity.innerHTML += `<option value="${city}">${city}</option>`;
    });

    // 更新年级下拉列表
    const filterGrade = document.getElementById('filterGrade');
    filterGrade.innerHTML = '<option value="">所有年�?/option>';
    Array.from(grades).sort().forEach(grade => {
        filterGrade.innerHTML += `<option value="${grade}">${grade}</option>`;
    });

    // 更新科目下拉列表
    const filterSubject = document.getElementById('filterSubject');
    filterSubject.innerHTML = '<option value="">所有科�?/option>';
    Array.from(subjects).sort().forEach(subject => {
        filterSubject.innerHTML += `<option value="${subject}">${subject}</option>`;
    });
}

// 在页面加载完成后初始化确定按钮的点击事件
$(document).ready(function() {
    // 为确��按钮添加点击事件
    $('.modal .btn-primary').on('click', function() {
        const modal = $(this).closest('.modal');
        const modalInstance = bootstrap.Modal.getInstance(modal[0]);
        if (modalInstance) {
            modalInstance.hide();
        } else {
            modal.modal('hide');
        }
    });

    // 监听确认模态框的隐藏事�?    $('#confirmModal').on('hidden.bs.modal', function() {
        // 清除所有选中状�?        $('.card-select').prop('checked', false);
        $('#selectAll').prop('checked', false);
        updateSelectedCount();
        updateBatchActionsVisibility();
    });
});

// 导出文本
function exportText() {
    const selectedCheckboxes = $('.card-select:checked');
    if (selectedCheckboxes.length === 0) {
        alert('请先选择要导出的项目');
        return;
    }

    // 获取选中项的原始文本和城市区域信�?    const selectedTexts = [];
    const cities = new Set();
    const districts = new Set();
    let commonCity = null;
    
    selectedCheckboxes.each(function() {
        const id = $(this).attr('data-id');
        const result = allResults.find(r => r.id === id);
        if (result && result.raw) {
            selectedTexts.push(result.raw.trim());
            if (result.city) {
                cities.add(result.city);
                if (result.district) {
                    districts.add(result.district);
                }
            }
        }
    });

    if (selectedTexts.length === 0) {
        alert('没有找到可导出的内容');
        return;
    }

    // 使用双换行符连接�?    const textToExport = selectedTexts.join('\n\n') + '\n';
    
    // 生成文件�?    let fileName = '';
    const date = new Date().toLocaleDateString().replace(/\//g, '-');
    
    if (cities.size === 1) {
        // 只有一个城�?        const city = Array.from(cities)[0];
        if (districts.size === 1) {
            // 一个城市一个区�?            const district = Array.from(districts)[0];
            fileName = `${city}${district}家教_${date}.txt`;
        } else {
            // 一个城市多个区�?            fileName = `${city}家教_${date}.txt`;
        }
    } else {
        // 多个城市
        fileName = `家教信息导出_${date}.txt`;
    }
    
    // 创建Blob对象
    const blob = new Blob([textToExport], { type: 'text/plain;charset=utf-8' });
    
    // 创建下载链接
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    
    // 触发下载
    document.body.appendChild(a);
    a.click();
    
    // 清理
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
}

// 处理薪酬信息
function extractSalaryInfo(text) {
    // 将文本按行分�?    const lines = text.split('\n');
    
    // 找到包含薪酬关键词的�?    const salaryLine = lines.find(line => 
        line.includes('薪酬') || 
        line.includes('价格') || 
        line.includes('薪资') || 
        line.includes('课费')
    );
    
    if (!salaryLine) return { salary: '', salaryUnit: '' };
    
    // 薪酬匹配模式，按照优先级排序
    const salaryPatterns = [
        // 匹配范围格式，如 "350-400/�? "350~400�?�? "350�?00每次"
        /(\d+)[-~到至](\d+)\s*[元]?\s*[\/每]?\s*(小时|h|hr|hour)/i,
        /(\d+)[-~到至](\d+)\s*[元]?\s*[\/每]?\s*(课时|节课|�?/i,
        /(\d+)[-~到至](\d+)\s*[元]?\s*[\/每]?\s*(�?/i,
        /(\d+)[-~到至](\d+)\s*[元]?\s*[\/每]?\s*(�?/i,
        /(\d+)[-~到至](\d+)\s*�?i,
        
        // 匹配单个数值格�?        /(\d+)\s*[元]?\s*[\/每]?\s*(小时|h|hr|hour)/i,
        /(\d+)\s*[元]?\s*[\/每]?\s*(课时|节课|�?/i,
        /(\d+)\s*[元]?\s*[\/每]?\s*(�?/i,
        /(\d+)\s*[元]?\s*[\/每]?\s*(�?/i,
        /(\d+)\s*�?i
    ];

    // 尝试所有匹配模�?    for (const pattern of salaryPatterns) {
        const match = salaryLine.match(pattern);
        if (match) {
            // 如果是范围格式（有三个捕获组�?            if (match.length > 3) {
                const minSalary = match[1];
                const maxSalary = match[2];
                const unit = match[3]?.toLowerCase() || '�?;
                const salary = `${minSalary}-${maxSalary}`;
                
                // 统一薪酬单位显示
                let standardUnit;
                switch(unit) {
                    case 'h':
                    case 'hr':
                    case 'hour':
                    case '小时':
                        standardUnit = '小时';
                        break;
                    case '课时':
                    case '节课':
                    case '�?:
                        standardUnit = '�?;
                        break;
                    case '�?:
                        standardUnit = '�?;
                        break;
                    default:
                        standardUnit = '�?;
                }
                
                return { salary, salaryUnit: standardUnit };
            } else {
                // 单个数值格�?                const salary = match[1];
                const unit = match[2]?.toLowerCase() || '�?;
                
                // 统一薪酬单位显示
                let standardUnit;
                switch(unit) {
