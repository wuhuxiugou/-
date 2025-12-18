// 全局变量
let productionRecords = []; // 生产记录数组
let settings = {
    circleDailyTarget: 50000,
    flatDailyTarget: 110000,
    workHours: 8,
    lunchBreak: 30,
    circleHourlyRate: 6250,
    flatHourlyRate: 13750,
    circleSetupPenalty: 0.25,
    flatSetupPenalty: 0.5
};

// 当前编辑状态
let isEditing = false;
let editingRecordId = null;
let editingRecordIndex = null;

// 其他全局变量
let currentDate = new Date();
let recordToDelete = null;
let deleteMode = null;
let recordsToDelete = [];

// DOM 元素引用
const elements = {
    // 导航相关
    navLinks: document.querySelectorAll('.nav-link'),
    recordTab: document.getElementById('record-tab'),
    historyTab: document.getElementById('history-tab'),
    
    // 表单相关
    productionForm: document.getElementById('production-form'),
    machineType: document.getElementById('machine-type'),
    productName: document.getElementById('product-name'),
    startTime: document.getElementById('start-time'),
    endTime: document.getElementById('end-time'),
    setupTime: document.getElementById('setup-time'),
    cuts: document.getElementById('cuts'),
    completedPerCut: document.getElementById('completedPerCut'),
    remarks: document.getElementById('remarks'),
    
    // 按钮相关
    confirmProductBtn: document.getElementById('confirm-product'),
    cancelConfirmBtn: document.getElementById('cancel-confirm'),
    resetFormBtn: document.getElementById('reset-form'),
    settingsBtn: document.getElementById('settings-btn'),
    closeSettingsBtn: document.getElementById('close-settings'),
    saveSettingsBtn: document.getElementById('save-settings'),
    resetSettingsBtn: document.getElementById('reset-settings'),
    cancelDeleteBtn: document.getElementById('cancel-delete'),
    confirmDeleteBtn: document.getElementById('confirm-delete'),
    deleteAllBtn: document.getElementById('delete-all-btn'),
    deleteMonthBtn: document.getElementById('delete-month-btn'),
    exportRecordsBtn: document.getElementById('export-records-btn'),
    importRecordsBtn: document.getElementById('import-records-btn'),
    importFileInput: document.getElementById('import-file-input'),
    
    // 显示相关
    todayRecords: document.getElementById('today-records'),
    historyRecords: document.getElementById('history-records'),
    currentDateTime: document.getElementById('current-date-time'),
    historyMachineFilter: document.getElementById('history-machine-filter'),
    historyMonthFilter: document.getElementById('history-month-filter'),
    
    // 统计相关
    circleMachineCount: document.getElementById('circle-machine-count'),
    flatMachineCount: document.getElementById('flat-machine-count'),
    circleMachineProgress: document.getElementById('circle-machine-progress'),
    flatMachineProgress: document.getElementById('flat-machine-progress'),
    totalCuts: document.getElementById('total-cuts'),
    overtimeHours: document.getElementById('overtime-hours'),
    circleMachineCountMobile: document.getElementById('circle-machine-count-mobile'),
    flatMachineCountMobile: document.getElementById('flat-machine-count-mobile'),
    totalCutsMobile: document.getElementById('total-cuts-mobile'),
    overtimeHoursMobile: document.getElementById('overtime-hours-mobile'),
    
    // 模态框相关
    settingsModal: document.getElementById('settings-modal'),
    deleteModal: document.getElementById('delete-modal'),
    notification: document.getElementById('notification'),
    notificationTitle: document.getElementById('notification-title'),
    notificationMessage: document.getElementById('notification-message'),
    notificationIcon: document.getElementById('notification-icon'),
    closeNotificationBtn: document.getElementById('close-notification')
};

// 工具函数
function formatNumber(num) {
    if (typeof num !== 'number' || isNaN(num)) {
        return '0.00';
    }
    return num.toFixed(2);
}

function formatInteger(num) {
    if (typeof num !== 'number' || isNaN(num)) {
        return '0.00';
    }
    return Math.round(num).toFixed(2);
}

function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return dateString;
        }
        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
        });
    } catch (error) {
        return dateString;
    }
}

// 数据初始化函数
function initializeData() {
    try {
        console.log('=== 开始初始化数据 ===');
        
        // 初始化生产记录
        const storedRecords = localStorage.getItem('productionRecords');
        if (storedRecords) {
            try {
                const parsedRecords = JSON.parse(storedRecords);
                if (Array.isArray(parsedRecords)) {
                    productionRecords = parsedRecords;
                    console.log('成功加载', productionRecords.length, '条生产记录');
                } else {
                    console.warn('本地存储中的生产记录格式不正确，已重置为空数组');
                    productionRecords = [];
                }
            } catch (parseError) {
                console.error('解析生产记录失败:', parseError);
                productionRecords = [];
                showNotification('警告', '加载生产记录失败，已重置为空', 'warning');
            }
        }
        
        // 初始化设置
        const storedSettings = localStorage.getItem('settings');
        if (storedSettings) {
            try {
                const parsedSettings = JSON.parse(storedSettings);
                if (typeof parsedSettings === 'object' && parsedSettings !== null) {
                    settings = { ...settings, ...parsedSettings };
                    console.log('成功加载设置:', settings);
                }
            } catch (parseError) {
                console.error('解析设置失败:', parseError);
                showNotification('警告', '加载设置失败，使用默认设置', 'warning');
            }
        }
        
        // 初始化记录编号计数器
        let recordCounter = parseInt(localStorage.getItem('recordCounter')) || 0;
        const maxExistingNumber = Math.max(...productionRecords.map(r => r.recordNumber || 0), 0);
        if (maxExistingNumber > recordCounter) {
            recordCounter = maxExistingNumber;
            localStorage.setItem('recordCounter', recordCounter.toString());
        }
        
        console.log('=== 数据初始化完成 ===');
    } catch (error) {
        console.error('初始化数据时发生严重错误:', error);
        productionRecords = [];
        showNotification('错误', '系统初始化失败，请刷新页面重试', 'error');
    }
}

// 保存记录到本地存储
function saveRecords() {
    try {
        localStorage.setItem('productionRecords', JSON.stringify(productionRecords));
        console.log('生产记录已保存，当前记录数:', productionRecords.length);
        return true;
    } catch (error) {
        console.error('保存生产记录失败:', error);
        showNotification('错误', '保存数据失败，请检查浏览器存储权限', 'error');
        return false;
    }
}

// 保存设置到本地存储
function saveSettingsToStorage() {
    try {
        localStorage.setItem('settings', JSON.stringify(settings));
        console.log('设置已保存:', settings);
        return true;
    } catch (error) {
        console.error('保存设置失败:', error);
        showNotification('错误', '保存设置失败，请检查浏览器存储权限', 'error');
        return false;
    }
}

// 通知函数
function showNotification(title, message, type = 'info') {
    if (!elements.notification || !elements.notificationTitle || !elements.notificationMessage || !elements.notificationIcon) {
        console.warn('通知元素未找到');
        return;
    }
    
    elements.notificationTitle.textContent = title;
    elements.notificationMessage.textContent = message;
    
    // 设置图标和颜色
    switch (type) {
        case 'success':
            elements.notificationIcon.className = 'fa fa-check-circle text-green-500 text-xl';
            elements.notification.classList.remove('border-red-500', 'border-yellow-500', 'border-blue-500');
            elements.notification.classList.add('border-green-500');
            break;
        case 'error':
            elements.notificationIcon.className = 'fa fa-exclamation-circle text-red-500 text-xl';
            elements.notification.classList.remove('border-green-500', 'border-yellow-500', 'border-blue-500');
            elements.notification.classList.add('border-red-500');
            break;
        case 'warning':
            elements.notificationIcon.className = 'fa fa-exclamation-triangle text-yellow-500 text-xl';
            elements.notification.classList.remove('border-green-500', 'border-red-500', 'border-blue-500');
            elements.notification.classList.add('border-yellow-500');
            break;
        default:
            elements.notificationIcon.className = 'fa fa-info-circle text-blue-500 text-xl';
            elements.notification.classList.remove('border-green-500', 'border-red-500', 'border-yellow-500');
            elements.notification.classList.add('border-blue-500');
    }
    
    // 显示通知
    elements.notification.classList.remove('translate-x-full');
    elements.notification.classList.add('translate-x-0');
    
    // 3秒后自动隐藏
    setTimeout(() => {
        elements.notification.classList.remove('translate-x-0');
        elements.notification.classList.add('translate-x-full');
    }, 3000);
}

// 更新当前日期时间
function updateCurrentDateTime() {
    if (!elements.currentDateTime) return;
    
    const now = new Date();
    elements.currentDateTime.textContent = now.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    setTimeout(updateCurrentDateTime, 1000);
}

// 设置当前日期时间输入框
function setCurrentDateTimeInputs() {
    if (!elements.startTime || !elements.endTime) return;
    
    const now = new Date();
    const dateTimeString = now.toISOString().slice(0, 16);
    elements.startTime.value = dateTimeString;
    elements.endTime.value = dateTimeString;
}

// 设置历史记录月份筛选器
function setHistoryMonthFilter() {
    if (!elements.historyMonthFilter) return;
    
    const now = new Date();
    const yearMonth = now.toISOString().slice(0, 7);
    elements.historyMonthFilter.value = yearMonth;
}

// 计算目标产能
function calculateDailyTarget(machineType, records, totalAvailableHours, totalWorkHours) {
    const K = machineType === 'circle' ? settings.circleSetupPenalty : settings.flatSetupPenalty;
    const G = machineType === 'circle' ? settings.circleHourlyRate : settings.flatHourlyRate;
    
    const sameTypeRecords = records.filter(r => r.machineType === machineType);
    const sameTypeWorkHours = sameTypeRecords.reduce((sum, r) => sum + ((r.workDuration || 0) - ((r.lunchBreakMinutes || 30) / 60)), 0);
    
    let machineAvailableHours = 0;
    
    if (totalWorkHours > 0) {
        const timeRatio = sameTypeWorkHours / totalWorkHours;
        machineAvailableHours = totalAvailableHours * timeRatio;
    } else {
        machineAvailableHours = totalAvailableHours / 2;
    }
    
    const dailyTarget = Math.max(0, (machineAvailableHours - K * sameTypeRecords.length)) * G;
    return dailyTarget;
}

// 计算加班时间
function calculateOvertime(workDuration, lunchBreakMinutes = 30) {
    const lunchBreakHours = lunchBreakMinutes / 60;
    const actualWorkHours = workDuration - lunchBreakHours;
    const shouldWorkHours = 8; // 基础工作时间8小时
    return Math.max(0, actualWorkHours - shouldWorkHours);
}

// 从备注中提取时间扣除
function extractRemarksTimeDeduction(remarks, machineType) {
    if (!remarks || typeof remarks !== 'string') return 0;
    
    let deduction = 0;
    
    try {
        // 提取分钟格式
        const minuteMatch = remarks.match(/(\d+)\s*分(钟)?/);
        if (minuteMatch && minuteMatch[1]) {
            deduction += parseInt(minuteMatch[1]) / 60;
        }
        
        // 提取小时格式
        const hourMatch = remarks.match(/(\d+(?:\.\d+)?)\s*小时?/);
        if (hourMatch && hourMatch[1]) {
            deduction += parseFloat(hourMatch[1]);
        }
        
        // 提取纯数字
        const numberMatches = remarks.match(/\b(\d+)\b/g);
        if (numberMatches) {
            numberMatches.forEach(match => {
                const num = parseInt(match);
                if (!isNaN(num)) {
                    // 检查是否已经被时间格式匹配
                    const isAlreadyMatched = (minuteMatch && minuteMatch[1] == num) || 
                                           (hourMatch && parseInt(hourMatch[1]) == num);
                    
                    if (!isAlreadyMatched) {
                        if (machineType === 'circle') {
                            deduction += num / 60; // 圆模切机：数字直接转换为分钟
                        } else if (machineType === 'flat') {
                            deduction += (num / 2) / 60; // 平压模切机：数字除以2转换为分钟
                        }
                    }
                }
            });
        }
    } catch (error) {
        console.error('提取备注时间扣除失败:', error);
    }
    
    return deduction;
}

// 表单验证函数
function validateForm(formData) {
    const errors = [];
    
    // 验证机器类型
    if (!formData.machineType) {
        errors.push('请选择机器类型');
    }
    
    // 验证产品名称
    if (!formData.productName || formData.productName.trim() === '') {
        errors.push('请输入产品名称');
    }
    
    // 验证时间
    if (!formData.startTime) {
        errors.push('请选择开机时间');
    }
    
    if (!formData.endTime) {
        errors.push('请选择结束时间');
    }
    
    if (formData.startTime && formData.endTime) {
        const startTime = new Date(formData.startTime);
        const endTime = new Date(formData.endTime);
        
        if (isNaN(startTime.getTime())) {
            errors.push('开机时间格式无效');
        }
        
        if (isNaN(endTime.getTime())) {
            errors.push('结束时间格式无效');
        }
        
        if (!isNaN(startTime.getTime()) && !isNaN(endTime.getTime())) {
            if (endTime <= startTime) {
                errors.push('结束时间不能早于或等于开始时间');
            }
        }
    }
    
    // 验证数字字段
    if (formData.setupTime === null || formData.setupTime === undefined || formData.setupTime === '') {
        errors.push('请输入调机时间');
    } else {
        const setupTime = parseInt(formData.setupTime);
        if (isNaN(setupTime) || setupTime < 0) {
            errors.push('调机时间必须为非负数');
        }
    }
    
    if (formData.cuts === null || formData.cuts === undefined || formData.cuts === '') {
        errors.push('请输入模切刀数');
    } else {
        const cuts = parseInt(formData.cuts);
        if (isNaN(cuts) || cuts < 0) {
            errors.push('模切刀数必须为非负数');
        }
    }
    
    if (formData.completedPerCut === null || formData.completedPerCut === undefined || formData.completedPerCut === '') {
        errors.push('请输入每刀完成数');
    } else {
        const completedPerCut = parseInt(formData.completedPerCut);
        if (isNaN(completedPerCut) || completedPerCut < 1) {
            errors.push('每刀完成数必须大于0');
        }
    }
    
    return errors;
}

// 处理表单提交
function handleFormSubmit(e) {
    e.preventDefault();
    
    try {
        console.log('=== 开始处理表单提交 ===');
        
        // 获取表单数据
        const formData = {
            machineType: elements.machineType ? elements.machineType.value : '',
            productName: elements.productName ? elements.productName.value.trim() : '',
            startTime: elements.startTime ? elements.startTime.value : '',
            endTime: elements.endTime ? elements.endTime.value : '',
            setupTime: elements.setupTime ? elements.setupTime.value : '',
            cuts: elements.cuts ? elements.cuts.value : '',
            completedPerCut: elements.completedPerCut ? elements.completedPerCut.value : '1',
            remarks: elements.remarks ? elements.remarks.value : ''
        };
        
        console.log('表单数据:', formData);
        
        // 验证表单
        const validationErrors = validateForm(formData);
        if (validationErrors.length > 0) {
            showNotification('错误', validationErrors[0], 'error');
            return;
        }
        
        // 转换数据类型
        const setupTime = parseInt(formData.setupTime);
        const cuts = parseInt(formData.cuts);
        const completedPerCut = parseInt(formData.completedPerCut);
        const startTime = new Date(formData.startTime);
        const endTime = new Date(formData.endTime);
        
        // 计算工作时间
        const workDuration = (endTime - startTime) / (1000 * 60 * 60);
        
        // 提取备注时间扣除
        const remarksTimeDeduction = extractRemarksTimeDeduction(formData.remarks, formData.machineType);
        
        // 计算调机时间（小时）
        const setupTimeHours = setupTime / 60;
        
        // 计算有效工作时间
        const lunchBreakMinutes = settings.lunchBreak;
        const lunchBreakHours = lunchBreakMinutes / 60;
        const effectiveWorkTime = workDuration - lunchBreakHours;
        
        // 计算加班时间
        const overtime = calculateOvertime(workDuration, lunchBreakMinutes);
        
        // 创建记录对象
        const record = {
            id: Date.now().toString(),
            recordNumber: isEditing ? productionRecords[editingRecordIndex].recordNumber : ++recordCounter,
            machineType: formData.machineType,
            productName: formData.productName,
            startTime: formData.startTime,
            setupTime: setupTime,
            cuts: cuts,
            completedPerCut: completedPerCut,
            endTime: formData.endTime,
            remarks: formData.remarks,
            date: startTime.toISOString().split('T')[0],
            createdAt: new Date().toISOString(),
            workDuration: workDuration,
            effectiveWorkTime: Math.max(0, effectiveWorkTime),
            remarksTimeDeduction: remarksTimeDeduction,
            lunchBreakMinutes: lunchBreakMinutes,
            setupTimeHours: setupTimeHours,
            overtime: overtime
        };
        
        console.log('创建的记录对象:', record);
        
        // 保存记录
        if (isEditing) {
            // 更新现有记录
            productionRecords[editingRecordIndex] = record;
        } else {
            // 添加新记录
            productionRecords.push(record);
            // 更新记录计数器
            localStorage.setItem('recordCounter', recordCounter.toString());
        }
        
        // 保存到本地存储
        const saveResult = saveRecords();
        
        if (saveResult) {
            showNotification('成功', isEditing ? '生产记录已更新' : '生产记录已保存', 'success');
            
            // 重置表单和状态
            resetFormAndState();
            
            // 刷新显示
            renderTodayRecords();
            renderHistoryRecords();
            updateDashboard();
        } else {
            // 保存失败，回滚操作
            if (!isEditing) {
                productionRecords.pop();
            }
            showNotification('错误', '保存记录失败，请重试', 'error');
        }
        
    } catch (error) {
        console.error('处理表单提交时发生错误:', error);
        showNotification('错误', '处理数据时发生错误', 'error');
    }
}

// 重置表单和状态
function resetFormAndState() {
    if (elements.productionForm) {
        elements.productionForm.reset();
    }
    
    setCurrentDateTimeInputs();
    
    // 重置按钮状态
    if (elements.startTime) elements.startTime.disabled = false;
    if (elements.confirmProductBtn) elements.confirmProductBtn.disabled = false;
    if (elements.cancelConfirmBtn) elements.cancelConfirmBtn.disabled = true;
    
    // 重置编辑状态
    isEditing = false;
    editingRecordId = null;
    editingRecordIndex = null;
    
    // 恢复提交按钮状态
    const submitBtn = document.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.textContent = '保存记录';
        submitBtn.classList.remove('bg-blue-600');
        submitBtn.classList.add('bg-primary');
    }
}

// 编辑记录
function editRecord(recordId) {
    console.log('开始编辑记录:', recordId);
    
    // 查找记录
    const recordIndex = productionRecords.findIndex(r => r.id === recordId);
    if (recordIndex === -1) {
        showNotification('错误', '未找到要编辑的记录', 'error');
        return;
    }
    
    const record = productionRecords[recordIndex];
    
    // 填充表单数据
    if (elements.machineType) elements.machineType.value = record.machineType;
    if (elements.productName) elements.productName.value = record.productName;
    if (elements.startTime) elements.startTime.value = record.startTime;
    if (elements.endTime) elements.endTime.value = record.endTime;
    if (elements.setupTime) elements.setupTime.value = record.setupTime;
    if (elements.cuts) elements.cuts.value = record.cuts;
    if (elements.completedPerCut) elements.completedPerCut.value = record.completedPerCut || 1;
    if (elements.remarks) elements.remarks.value = record.remarks || '';
    
    // 锁定开机时间
    if (elements.startTime) elements.startTime.disabled = true;
    if (elements.confirmProductBtn) elements.confirmProductBtn.disabled = true;
    if (elements.cancelConfirmBtn) elements.cancelConfirmBtn.disabled = false;
    
    // 设置编辑状态
    isEditing = true;
    editingRecordId = recordId;
    editingRecordIndex = recordIndex;
    
    // 更改表单提交按钮文本
    const submitBtn = document.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.textContent = '更新记录';
        submitBtn.classList.remove('bg-primary');
        submitBtn.classList.add('bg-blue-600');
    }
    
    // 滚动到表单位置
    elements.productionForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    showNotification('提示', '请修改记录信息，完成后点击"更新记录"', 'info');
}

// 删除记录
function deleteRecord() {
    if (!recordToDelete) return;
    
    const recordIndex = productionRecords.findIndex(r => r.id === recordToDelete);
    if (recordIndex !== -1) {
        productionRecords.splice(recordIndex, 1);
        saveRecords();
        
        showNotification('成功', '记录已删除', 'success');
        
        // 刷新显示
        renderTodayRecords();
        renderHistoryRecords();
        updateDashboard();
    }
    
    // 关闭模态框
    elements.deleteModal.classList.add('hidden');
    recordToDelete = null;
}

// 确认删除记录
function confirmDeleteRecord(recordId) {
    recordToDelete = recordId;
    deleteMode = null;
    recordsToDelete = [];
    
    elements.deleteModal.classList.remove('hidden');
}

// 确认删除当日记录
function confirmDeleteDayRecords(date) {
    const dayRecords = productionRecords.filter(record => record.date === date);
    if (dayRecords.length === 0) return;
    
    recordsToDelete = dayRecords.map(record => record.id);
    deleteMode = 'day';
    
    elements.deleteModal.classList.remove('hidden');
}

// 确认删除所有记录
function confirmDeleteAllRecords() {
    if (productionRecords.length === 0) {
        showNotification('提示', '没有记录可以删除', 'info');
        return;
    }
    
    recordsToDelete = productionRecords.map(record => record.id);
    deleteMode = 'all';
    
    elements.deleteModal.classList.remove('hidden');
}

// 确认删除本月记录
function confirmDeleteMonthRecords() {
    const monthFilter = elements.historyMonthFilter ? elements.historyMonthFilter.value : '';
    if (!monthFilter) {
        showNotification('错误', '请选择要删除的月份', 'error');
        return;
    }
    
    const monthRecords = productionRecords.filter(record => record.date && record.date.startsWith(monthFilter));
    if (monthRecords.length === 0) {
        showNotification('提示', '所选月份没有记录', 'info');
        return;
    }
    
    recordsToDelete = monthRecords.map(record => record.id);
    deleteMode = 'month';
    
    elements.deleteModal.classList.remove('hidden');
}

// 执行删除操作
function executeDelete() {
    if (recordsToDelete.length === 0) return;
    
    productionRecords = productionRecords.filter(record => !recordsToDelete.includes(record.id));
    saveRecords();
    
    showNotification('成功', `已删除 ${recordsToDelete.length} 条记录`, 'success');
    
    // 刷新显示
    renderTodayRecords();
    renderHistoryRecords();
    updateDashboard();
    
    // 关闭模态框
    elements.deleteModal.classList.add('hidden');
    recordsToDelete = [];
    deleteMode = null;
}

// 渲染今日记录
function renderTodayRecords() {
    if (!elements.todayRecords) return;
    
    console.log('开始渲染今日记录，总记录数:', productionRecords.length);
    
    // 获取今日日期
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // 过滤今日记录
    const todayRecords = productionRecords.filter(record => record.date === todayStr);
    
    console.log('今日记录数:', todayRecords.length);
    
    if (todayRecords.length === 0) {
        elements.todayRecords.innerHTML = `
            <div class="text-center text-gray-500 py-8">
                <i class="fa fa-clipboard text-4xl mb-2"></i>
                <p>今日暂无生产记录</p>
                <p class="text-xs text-gray-400 mt-1">总记录数: ${productionRecords.length}</p>
            </div>
        `;
        return;
    }
    
    // 计算今日汇总数据
    const totalSetupTime = todayRecords.reduce((sum, r) => sum + ((r.setupTime || 0) / 60), 0);
    const totalRemarksDeduction = todayRecords.reduce((sum, r) => sum + (r.remarksTimeDeduction || 0), 0);
    const totalAvailableHours = Math.max(0, 8 - totalSetupTime - totalRemarksDeduction);
    
    const circleRecords = todayRecords.filter(r => r.machineType === 'circle');
    const flatRecords = todayRecords.filter(r => r.machineType === 'flat');
    
    const circleTotalWorkHours = circleRecords.reduce((sum, r) => sum + ((r.workDuration || 0) - ((r.lunchBreakMinutes || 30) / 60)), 0);
    const flatTotalWorkHours = flatRecords.reduce((sum, r) => sum + ((r.workDuration || 0) - ((r.lunchBreakMinutes || 30) / 60)), 0);
    const totalWorkHours = circleTotalWorkHours + flatTotalWorkHours;
    
    const recordsHTML = todayRecords.map(record => {
        const machineTypeText = record.machineType === 'circle' ? '圆模切机' : '平压模切机';
        const machineTypeClass = record.machineType === 'circle' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800';
        
        // 格式化时间
        const startTime = new Date(record.startTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        const endTime = new Date(record.endTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        
        // 计算目标完成率
        const dailyTarget = calculateDailyTarget(record.machineType, todayRecords, totalAvailableHours, totalWorkHours);
        const completionRate = dailyTarget > 0 ? (record.cuts / dailyTarget) * 100 : 0;
        
        let progressClass = 'progress-success';
        if (completionRate < 50) progressClass = 'progress-danger';
        else if (completionRate < 80) progressClass = 'progress-warning';
        
        return `
            <div class="bg-gray-50 rounded-lg p-4 card-hover">
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <h3 class="text-lg font-medium text-gray-900">${record.productName}</h3>
                        <div class="flex items-center mt-1">
                            <span class="badge ${machineTypeClass}">${machineTypeText}</span>
                            <span class="text-sm text-gray-500 ml-2">${startTime} - ${endTime}</span>
                        </div>
                    </div>
                    <div class="flex items-center space-x-2">
                        <button class="text-blue-500 hover:text-blue-600 edit-record-btn" data-record-id="${record.id}" title="编辑记录">
                            <i class="fa fa-pencil"></i>
                        </button>
                        <button class="text-red-500 hover:text-red-600 delete-record-btn" data-record-id="${record.id}">
                            <i class="fa fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    <div>
                        <p class="text-xs text-gray-500">模切刀数</p>
                        <p class="text-sm font-medium">${formatInteger(record.cuts)}</p>
                    </div>
                    <div>
                        <p class="text-xs text-gray-500">完成数量</p>
                        <p class="text-sm font-medium">${formatInteger(record.cuts * record.completedPerCut)}</p>
                    </div>
                    <div>
                        <p class="text-xs text-gray-500">调机时间</p>
                        <p class="text-sm font-medium">${record.setupTime} 分钟</p>
                    </div>
                    <div>
                        <p class="text-xs text-gray-500">加班时长</p>
                        <p class="text-sm font-medium ${record.overtime > 0 ? 'text-secondary font-semibold' : ''}">
                            ${record.overtime.toFixed(2)} 小时
                        </p>
                    </div>
                </div>
                <div class="mb-2 flex justify-between items-center">
                    <span class="text-xs font-medium text-gray-700">目标完成率</span>
                    <span class="text-xs font-medium ${completionRate >= 100 ? 'text-green-600' : 'text-gray-700'}">${completionRate.toFixed(2)}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-value ${progressClass}" style="width: ${Math.min(completionRate, 100)}%"></div>
                </div>
                ${record.remarks ? `<p class="text-xs text-gray-500 mt-3">备注: ${record.remarks}</p>` : ''}
            </div>
        `;
    }).join('');
    
    elements.todayRecords.innerHTML = recordsHTML;
}

// 渲染历史记录
function renderHistoryRecords() {
    if (!elements.historyRecords) return;
    
    console.log('开始渲染历史记录，总记录数:', productionRecords.length);
    
    // 获取筛选条件
    const machineFilter = elements.historyMachineFilter ? elements.historyMachineFilter.value : 'all';
    const monthFilter = elements.historyMonthFilter ? elements.historyMonthFilter.value : '';
    
    console.log('筛选条件 - 机器类型:', machineFilter, '月份:', monthFilter);
    
    // 筛选记录
    let filteredRecords = [...productionRecords];
    
    if (machineFilter !== 'all') {
        filteredRecords = filteredRecords.filter(record => record.machineType === machineFilter);
    }
    
    if (monthFilter) {
        filteredRecords = filteredRecords.filter(record => record.date && record.date.startsWith(monthFilter));
    }
    
    // 按日期分组
    const recordsByDate = {};
    filteredRecords.forEach(record => {
        if (!record.date) {
            record.date = new Date(record.startTime).toISOString().split('T')[0];
        }
        
        if (!recordsByDate[record.date]) {
            recordsByDate[record.date] = [];
        }
        recordsByDate[record.date].push(record);
    });
    
    // 按日期排序（降序）
    const sortedDates = Object.keys(recordsByDate).sort((a, b) => new Date(b) - new Date(a));
    
    if (sortedDates.length === 0) {
        elements.historyRecords.innerHTML = `
            <div class="text-center text-gray-500 py-8">
                <i class="fa fa-history text-4xl mb-2"></i>
                <p>暂无历史记录</p>
            </div>
        `;
        return;
    }
    
    elements.historyRecords.innerHTML = sortedDates.map(date => {
        const dayRecords = recordsByDate[date];
        const formattedDate = formatDate(date);
        
        // 计算当日汇总数据
        const totalCuts = dayRecords.reduce((sum, record) => sum + record.cuts, 0);
        const totalOvertime = dayRecords.reduce((sum, record) => sum + record.overtime, 0);
        const circleRecords = dayRecords.filter(r => r.machineType === 'circle');
        const flatRecords = dayRecords.filter(r => r.machineType === 'flat');
        
        // 计算当日目标
        const totalSetupTime = dayRecords.reduce((sum, r) => sum + ((r.setupTime || 0) / 60), 0);
        const totalRemarksDeduction = dayRecords.reduce((sum, r) => sum + (r.remarksTimeDeduction || 0), 0);
        const totalAvailableHours = Math.max(0, 8 - totalSetupTime - totalRemarksDeduction);
        
        const circleTotalWorkHours = circleRecords.reduce((sum, r) => sum + ((r.workDuration || 0) - ((r.lunchBreakMinutes || 30) / 60)), 0);
        const flatTotalWorkHours = flatRecords.reduce((sum, r) => sum + ((r.workDuration || 0) - ((r.lunchBreakMinutes || 30) / 60)), 0);
        const totalWorkHours = circleTotalWorkHours + flatTotalWorkHours;
        
        const circleDailyTarget = calculateDailyTarget('circle', dayRecords, totalAvailableHours, totalWorkHours);
        const flatDailyTarget = calculateDailyTarget('flat', dayRecords, totalAvailableHours, totalWorkHours);
        
        // 计算目标差异
        const circleActualCuts = circleRecords.reduce((sum, r) => sum + r.cuts, 0);
        const flatActualCuts = flatRecords.reduce((sum, r) => sum + r.cuts, 0);
        const circleTargetDifference = circleActualCuts - circleDailyTarget;
        const flatTargetDifference = flatActualCuts - flatDailyTarget;
        
        return `
            <div class="border border-gray-200 rounded-lg overflow-hidden mb-4">
                <div class="collapsible-header" data-date="${date}">
                    <div>
                        <h3 class="text-base font-medium text-gray-900">${formattedDate}</h3>
                        <div class="flex items-center mt-1 space-x-3">
                            <span class="text-sm text-gray-600">
                                <i class="fa fa-cutlery mr-1"></i>
                                总刀数: ${formatInteger(totalCuts)}
                            </span>
                            <span class="text-sm text-gray-600">
                                <i class="fa fa-clock-o mr-1"></i>
                                加班: ${totalOvertime.toFixed(2)}小时
                            </span>
                            ${circleRecords.length > 0 ? `
                            <span class="text-sm ${circleTargetDifference >= 0 ? 'text-green-600' : 'text-red-600'}">
                                <i class="fa fa-circle-o mr-1"></i>
                                圆模差异: ${circleTargetDifference >= 0 ? '+' : ''}${formatInteger(circleTargetDifference)}
                            </span>
                            ` : ''}
                            ${flatRecords.length > 0 ? `
                            <span class="text-sm ${flatTargetDifference >= 0 ? 'text-green-600' : 'text-red-600'}">
                                <i class="fa fa-square-o mr-1"></i>
                                平压差异: ${flatTargetDifference >= 0 ? '+' : ''}${formatInteger(flatTargetDifference)}
                            </span>
                            ` : ''}
                        </div>
                    </div>
                    <div class="flex items-center space-x-2">
                        <button class="text-red-500 hover:text-red-600 delete-day-btn" data-date="${date}" title="删除当日所有记录">
                            <i class="fa fa-calendar-times-o"></i>
                        </button>
                        <i class="fa fa-chevron-down text-gray-500 transition-transform duration-300"></i>
                    </div>
                </div>
                <div class="collapsible-content" id="content-${date}">
                    <div class="space-y-3">
                        ${dayRecords.map(record => {
                            const machineTypeText = record.machineType === 'circle' ? '圆模切机' : '平压模切机';
                            const machineTypeClass = record.machineType === 'circle' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800';
                            const startTime = new Date(record.startTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
                            const endTime = new Date(record.endTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
                            
                            return `
                                <div class="bg-gray-50 rounded-lg p-3">
                                    <div class="flex justify-between items-start">
                                        <div>
                                            <h4 class="text-sm font-medium text-gray-900">${record.productName}</h4>
                                            <div class="flex items-center mt-1">
                                                <span class="badge ${machineTypeClass}">${machineTypeText}</span>
                                                <span class="text-xs text-gray-500 ml-2">${startTime} - ${endTime}</span>
                                            </div>
                                        </div>
                                        <div class="flex items-center space-x-2">
                                            <button class="text-blue-500 hover:text-blue-600 edit-record-btn" data-record-id="${record.id}" title="编辑记录">
                                                <i class="fa fa-pencil"></i>
                                            </button>
                                            <button class="text-red-500 hover:text-red-600 delete-record-btn" data-record-id="${record.id}">
                                                <i class="fa fa-trash"></i>
                                            </button>
                                        </div>
                                    </div>
                                    <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                                        <div>
                                            <p class="text-xs text-gray-500">模切刀数</p>
                                            <p class="text-sm">${formatInteger(record.cuts)}</p>
                                        </div>
                                        <div>
                                            <p class="text-xs text-gray-500">完成数量</p>
                                            <p class="text-sm">${formatInteger(record.cuts * record.completedPerCut)}</p>
                                        </div>
                                        <div>
                                            <p class="text-xs text-gray-500">调机时间</p>
                                            <p class="text-sm">${record.setupTime} 分钟</p>
                                        </div>
                                        <div>
                                            <p class="text-xs text-gray-500">加班时长</p>
                                            <p class="text-sm ${record.overtime > 0 ? 'text-secondary' : ''}">
                                                ${record.overtime.toFixed(2)} 小时
                                            </p>
                                        </div>
                                    </div>
                                    ${record.remarks ? `<p class="text-xs text-gray-500 mt-2">备注: ${record.remarks}</p>` : ''}
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // 添加折叠功能
    document.querySelectorAll('.collapsible-header').forEach(header => {
        header.addEventListener('click', () => {
            const date = header.getAttribute('data-date');
            const content = document.getElementById(`content-${date}`);
            const icon = header.querySelector('i.fa-chevron-down');
            
            content.classList.toggle('open');
            icon.style.transform = content.classList.contains('open') ? 'rotate(180deg)' : 'rotate(0)';
        });
        
        // 默认展开第一个
        if (header === document.querySelectorAll('.collapsible-header')[0]) {
            const date = header.getAttribute('data-date');
            const content = document.getElementById(`content-${date}`);
            const icon = header.querySelector('i.fa-chevron-down');
            
            content.classList.add('open');
            icon.style.transform = 'rotate(180deg)';
        }
    });
}

// 更新仪表板
function updateDashboard() {
    const today = new Date().toISOString().split('T')[0];
    const todayRecords = productionRecords.filter(record => record.date === today);
    
    // 圆模切机统计
    const circleRecords = todayRecords.filter(record => record.machineType === 'circle');
    const circleCount = circleRecords.length;
    const circleTotalCuts = circleRecords.reduce((sum, record) => sum + record.cuts, 0);
    
    // 平压模切机统计
    const flatRecords = todayRecords.filter(record => record.machineType === 'flat');
    const flatCount = flatRecords.length;
    const flatTotalCuts = flatRecords.reduce((sum, record) => sum + record.cuts, 0);
    
    // 计算总目标
    const totalSetupPenalty = settings.circleSetupPenalty * circleCount + settings.flatSetupPenalty * flatCount;
    const totalTarget = settings.workHours * settings.circleHourlyRate + settings.workHours * settings.flatHourlyRate;
    
    // 计算进度百分比
    const circleProgress = (circleTotalCuts / totalTarget) * 100;
    const flatProgress = (flatTotalCuts / totalTarget) * 100;
    
    // 更新圆模切机显示
    if (elements.circleMachineCount) elements.circleMachineCount.textContent = circleCount;
    if (elements.circleMachineProgress) {
        elements.circleMachineProgress.style.width = `${Math.min(circleProgress, 100)}%`;
        
        if (circleProgress < 25) {
            elements.circleMachineProgress.className = 'progress-value progress-danger';
        } else if (circleProgress < 40) {
            elements.circleMachineProgress.className = 'progress-value progress-warning';
        } else {
            elements.circleMachineProgress.className = 'progress-value progress-success';
        }
    }
    
    // 更新平压模切机显示
    if (elements.flatMachineCount) elements.flatMachineCount.textContent = flatCount;
    if (elements.flatMachineProgress) {
        elements.flatMachineProgress.style.width = `${Math.min(flatProgress, 100)}%`;
        
        if (flatProgress < 25) {
            elements.flatMachineProgress.className = 'progress-value progress-danger';
        } else if (flatProgress < 40) {
            elements.flatMachineProgress.className = 'progress-value progress-warning';
        } else {
            elements.flatMachineProgress.className = 'progress-value progress-success';
        }
    }
    
    // 总生产刀数
    const totalCuts = circleTotalCuts + flatTotalCuts;
    if (elements.totalCuts) elements.totalCuts.textContent = formatInteger(totalCuts);
    
    // 总加班时长
    const totalOvertime = todayRecords.reduce((sum, record) => sum + record.overtime, 0);
    if (elements.overtimeHours) elements.overtimeHours.textContent = `${totalOvertime.toFixed(2)}h`;
    
    // 更新移动端概览数据
    if (elements.circleMachineCountMobile) elements.circleMachineCountMobile.textContent = circleCount;
    if (elements.flatMachineCountMobile) elements.flatMachineCountMobile.textContent = flatCount;
    if (elements.totalCutsMobile) elements.totalCutsMobile.textContent = formatInteger(totalCuts);
    if (elements.overtimeHoursMobile) elements.overtimeHoursMobile.textContent = `${totalOvertime.toFixed(2)}h`;
}

// 导出记录
function exportRecords() {
    if (productionRecords.length === 0) {
        showNotification('提示', '没有记录可以导出', 'info');
        return;
    }
    
    try {
        const data = {
            records: productionRecords,
            settings: settings,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `production_records_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification('成功', `已导出 ${productionRecords.length} 条记录`, 'success');
    } catch (error) {
        console.error('导出记录失败:', error);
        showNotification('错误', '导出记录失败', 'error');
    }
}

// 导入记录
async function importRecords(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (!data.records || !Array.isArray(data.records)) {
                    throw new Error('无效的文件格式：缺少记录数据');
                }
                
                // 验证记录格式
                const validRecords = data.records.filter(record => {
                    return record.id && record.machineType && record.productName && 
                           record.startTime && record.endTime && record.cuts !== undefined;
                });
                
                if (validRecords.length === 0) {
                    throw new Error('文件中没有有效的记录');
                }
                
                // 合并记录
                const originalCount = productionRecords.length;
                const importedCount = validRecords.length;
                
                productionRecords = [...productionRecords, ...validRecords];
                
                // 更新记录编号
                let maxRecordNumber = Math.max(...productionRecords.map(r => r.recordNumber || 0), 0);
                localStorage.setItem('recordCounter', maxRecordNumber.toString());
                
                // 保存设置（如果有）
                if (data.settings && typeof data.settings === 'object') {
                    settings = { ...settings, ...data.settings };
                    saveSettingsToStorage();
                }
                
                // 保存记录
                saveRecords();
                
                resolve({
                    success: true,
                    imported: importedCount,
                    total: productionRecords.length
                });
                
            } catch (error) {
                reject(error);
            }
        };
        
        reader.onerror = () => {
            reject(new Error('读取文件失败'));
        };
        
        reader.readAsText(file);
    });
}

// 加载设置
function loadSettings() {
    const settingsForm = document.getElementById('settings-form');
    if (!settingsForm) return;
    
    const fields = [
        'circleDailyTarget', 'flatDailyTarget', 'workHours', 'lunchBreak',
        'circleHourlyRate', 'flatHourlyRate', 'circleSetupPenalty', 'flatSetupPenalty'
    ];
    
    fields.forEach(field => {
        const element = document.getElementById(field);
        if (element && settings[field] !== undefined) {
            element.value = settings[field];
        }
    });
}

// 保存设置
function saveSettings() {
    const settingsForm = document.getElementById('settings-form');
    if (!settingsForm) return;
    
    const formData = new FormData(settingsForm);
    
    const newSettings = {
        circleDailyTarget: parseInt(formData.get('circleDailyTarget')) || 50000,
        flatDailyTarget: parseInt(formData.get('flatDailyTarget')) || 110000,
        workHours: parseFloat(formData.get('workHours')) || 8,
        lunchBreak: parseInt(formData.get('lunchBreak')) || 30,
        circleHourlyRate: parseInt(formData.get('circleHourlyRate')) || 6250,
        flatHourlyRate: parseInt(formData.get('flatHourlyRate')) || 13750,
        circleSetupPenalty: parseFloat(formData.get('circleSetupPenalty')) || 0.25,
        flatSetupPenalty: parseFloat(formData.get('flatSetupPenalty')) || 0.5
    };
    
    // 验证设置
    const validationErrors = [];
    if (newSettings.workHours <= 0) validationErrors.push('工作时间必须大于0');
    if (newSettings.lunchBreak < 0) validationErrors.push('午休时间不能为负数');
    if (newSettings.circleHourlyRate <= 0) validationErrors.push('圆模切机每小时产能必须大于0');
    if (newSettings.flatHourlyRate <= 0) validationErrors.push('平压模切机每小时产能必须大于0');
    
    if (validationErrors.length > 0) {
        showNotification('错误', validationErrors[0], 'error');
        return;
    }
    
    settings = newSettings;
    
    if (saveSettingsToStorage()) {
        showNotification('成功', '设置已保存', 'success');
        elements.settingsModal.classList.add('hidden');
        
        // 刷新显示
        renderTodayRecords();
        renderHistoryRecords();
        updateDashboard();
    }
}

// 重置设置
function resetSettings() {
    const defaultSettings = {
        circleDailyTarget: 50000,
        flatDailyTarget: 110000,
        workHours: 8,
        lunchBreak: 30,
        circleHourlyRate: 6250,
        flatHourlyRate: 13750,
        circleSetupPenalty: 0.25,
        flatSetupPenalty: 0.5
    };
    
    settings = defaultSettings;
    
    // 更新表单
    loadSettings();
    
    showNotification('提示', '已恢复默认设置，请点击保存', 'info');
}

// 设置事件监听器
function setupEventListeners() {
    console.log('=== 设置事件监听器 ===');
    
    // 导航切换
    elements.navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = link.getAttribute('data-tab');
            
            // 更新导航链接状态
            elements.navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            // 显示对应标签内容
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
            });
            document.getElementById(`${tabId}-tab`).classList.add('active');
        });
    });
    
    // 表单提交
    if (elements.productionForm) {
        elements.productionForm.addEventListener('submit', handleFormSubmit);
    }
    
    // 产品名称确认
    if (elements.confirmProductBtn) {
        elements.confirmProductBtn.addEventListener('click', () => {
            const productName = elements.productName ? elements.productName.value.trim() : '';
            if (!productName) {
                showNotification('错误', '请输入产品名称', 'error');
                return;
            }
            
            // 锁定开机时间
            if (elements.startTime) elements.startTime.disabled = true;
            if (elements.confirmProductBtn) elements.confirmProductBtn.disabled = true;
            if (elements.cancelConfirmBtn) elements.cancelConfirmBtn.disabled = false;
            
            showNotification('成功', '开机时间已锁定，产品名称仍可编辑', 'success');
        });
    }
    
    // 取消产品名称确认
    if (elements.cancelConfirmBtn) {
        elements.cancelConfirmBtn.addEventListener('click', () => {
            // 解锁开机时间
            if (elements.startTime) elements.startTime.disabled = false;
            if (elements.confirmProductBtn) elements.confirmProductBtn.disabled = false;
            if (elements.cancelConfirmBtn) elements.cancelConfirmBtn.disabled = true;
            
            showNotification('提示', '已取消确认，开机时间已解锁', 'info');
        });
    }
    
    // 重置表单
    if (elements.resetFormBtn) {
        elements.resetFormBtn.addEventListener('click', resetFormAndState);
    }
    
    // 设置按钮
    if (elements.settingsBtn) {
        elements.settingsBtn.addEventListener('click', () => {
            loadSettings();
            elements.settingsModal.classList.remove('hidden');
        });
    }
    
    if (elements.closeSettingsBtn) {
        elements.closeSettingsBtn.addEventListener('click', () => {
            elements.settingsModal.classList.add('hidden');
        });
    }
    
    if (elements.saveSettingsBtn) {
        elements.saveSettingsBtn.addEventListener('click', saveSettings);
    }
    
    if (elements.resetSettingsBtn) {
        elements.resetSettingsBtn.addEventListener('click', resetSettings);
    }
    
    // 删除确认
    if (elements.cancelDeleteBtn) {
        elements.cancelDeleteBtn.addEventListener('click', () => {
            elements.deleteModal.classList.add('hidden');
            recordToDelete = null;
            deleteMode = null;
            recordsToDelete = [];
        });
    }
    
    if (elements.confirmDeleteBtn) {
        elements.confirmDeleteBtn.addEventListener('click', () => {
            if (deleteMode && recordsToDelete.length > 0) {
                executeDelete();
            } else {
                deleteRecord();
            }
        });
    }
    
    // 关闭通知
    if (elements.closeNotificationBtn) {
        elements.closeNotificationBtn.addEventListener('click', () => {
            elements.notification.classList.remove('translate-x-0');
            elements.notification.classList.add('translate-x-full');
        });
    }
    
    // 删除按钮
    if (elements.deleteAllBtn) {
        elements.deleteAllBtn.addEventListener('click', confirmDeleteAllRecords);
    }
    
    if (elements.deleteMonthBtn) {
        elements.deleteMonthBtn.addEventListener('click', confirmDeleteMonthRecords);
    }
    
    // 导出记录
    if (elements.exportRecordsBtn) {
        elements.exportRecordsBtn.addEventListener('click', exportRecords);
    }
    
    // 导入记录
    if (elements.importRecordsBtn && elements.importFileInput) {
        elements.importRecordsBtn.addEventListener('click', () => {
            elements.importFileInput.click();
        });
        
        elements.importFileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            try {
                showNotification('信息', '正在导入记录，请稍候...', 'info');
                
                const result = await importRecords(file);
                
                if (result.success) {
                    showNotification('成功', `成功导入 ${result.imported} 条记录，总计 ${result.total} 条记录`, 'success');
                    
                    // 刷新显示
                    renderTodayRecords();
                    renderHistoryRecords();
                    updateDashboard();
                }
            } catch (error) {
                console.error('导入失败:', error);
                showNotification('错误', '导入失败：' + error.message, 'error');
            } finally {
                // 清空文件输入
                elements.importFileInput.value = '';
            }
        });
    }
    
    // 历史记录筛选
    if (elements.historyMachineFilter) {
        elements.historyMachineFilter.addEventListener('change', renderHistoryRecords);
    }
    
    if (elements.historyMonthFilter) {
        elements.historyMonthFilter.addEventListener('change', renderHistoryRecords);
    }
    
    // 点击模态框外部关闭
    if (elements.settingsModal) {
        elements.settingsModal.addEventListener('click', (e) => {
            if (e.target === elements.settingsModal) {
                elements.settingsModal.classList.add('hidden');
            }
        });
    }
    
    if (elements.deleteModal) {
        elements.deleteModal.addEventListener('click', (e) => {
            if (e.target === elements.deleteModal) {
                elements.deleteModal.classList.add('hidden');
                recordToDelete = null;
            }
        });
    }
    
    // 为动态生成的按钮添加事件委托
    document.addEventListener('click', function(e) {
        // 编辑记录
        if (e.target.closest('.edit-record-btn')) {
            const btn = e.target.closest('.edit-record-btn');
            const recordId = btn.getAttribute('data-record-id');
            if (recordId) {
                editRecord(recordId);
            }
        }
        
        // 删除单条记录
        if (e.target.closest('.delete-record-btn')) {
            const btn = e.target.closest('.delete-record-btn');
            const recordId = btn.getAttribute('data-record-id');
            if (recordId) {
                confirmDeleteRecord(recordId);
            }
        }
        
        // 删除当日记录
        if (e.target.closest('.delete-day-btn')) {
            const btn = e.target.closest('.delete-day-btn');
            const date = btn.getAttribute('data-date');
            if (date) {
                confirmDeleteDayRecords(date);
            }
        }
    });
    
    console.log('=== 事件监听器设置完成 ===');
}

// 初始化记录计数器
let recordCounter = 0;

// 初始化函数
function init() {
    console.log('=== 开始初始化系统 ===');
    
    // 初始化数据
    initializeData();
    
    // 初始化记录计数器
    recordCounter = parseInt(localStorage.getItem('recordCounter')) || 0;
    
    // 更新当前日期时间
    updateCurrentDateTime();
    
    // 设置当前日期时间输入框
    setCurrentDateTimeInputs();
    
    // 设置历史记录月份筛选器
    setHistoryMonthFilter();
    
    // 设置事件监听器
    setupEventListeners();
    
    // 渲染界面
    renderTodayRecords();
    renderHistoryRecords();
    updateDashboard();
    
    console.log('=== 系统初始化完成 ===');
    showNotification('成功', '系统初始化完成', 'success');
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}