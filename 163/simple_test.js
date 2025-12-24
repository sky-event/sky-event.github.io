// 简单的测试脚本，直接测试修复后的代码

// 模拟TimeZoneUtils对象（使用与index.html中相同的实现）
const TimeZoneUtils = {
    // 判断当前是否处于太平洋夏令时 - 固定返回false，使用标准时转换（+16小时）
    isPDT() {
        return false;
    },
    
    // 太平洋时间到北京时间的转换
    PDTtoCST(pdtDate) {
        const offset = this.isPDT() ? 15 : 16; // 太平洋时间到北京时间：夏令时+15小时，标准时间+16小时
        return new Date(pdtDate.getTime() + offset * 60 * 60 * 1000);
    },
    
    // 北京时间到太平洋时间的转换
    CSTtoPDT(cstDate) {
        const offset = this.isPDT() ? 15 : 16;
        return new Date(cstDate.getTime() - offset * 60 * 60 * 1000);
    }
};

// 模拟convertToMilliseconds函数
function convertToMilliseconds(value, unit) {
    const conversions = {
        'minutes': 60 * 1000,
        'hours': 60 * 60 * 1000,
        'days': 24 * 60 * 60 * 1000
    };
    return value * (conversions[unit] || 1000);
}

// 模拟formatCountdown函数
function formatCountdown(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
        return `${hours}小时${minutes % 60}分钟`;
    } else if (minutes > 0) {
        return `${minutes}分钟${seconds % 60}秒`;
    } else {
        return `${seconds}秒`;
    }
}

// 修复后的getNextOccurrence函数（只保留daily部分）
function getNextOccurrence(task, nowCST) {
    // 获取开始时间（太平洋时间）
    let startTimeStr = task.startTime;
    // 对于daily、weekly和monthly类型的任务，使用recurrence.startTimes中的第一个时间
    if (!startTimeStr && task.recurrence.startTimes && task.recurrence.startTimes.length > 0) {
        startTimeStr = task.recurrence.startTimes[0];
    }
    // 对于monthly类型的任务，使用recurrence.startTime（兼容旧格式）
    if (!startTimeStr && task.recurrence.startTime) {
        startTimeStr = task.recurrence.startTime;
    }
    // 默认时间为00:00
    startTimeStr = startTimeStr || "00:00";
    
    let startHour, startMinute;
    
    // 确保startTimeStr是字符串
    if (startTimeStr instanceof Date) {
        // 如果是Date对象，先转换为PDT时间，然后再提取小时和分钟
        const pdtDate = TimeZoneUtils.CSTtoPDT(startTimeStr);
        startHour = pdtDate.getHours();
        startMinute = pdtDate.getMinutes();
    } else {
        // 如果是字符串，直接解析
        const [h, m] = startTimeStr.split(':').map(Number);
        startHour = h;
        startMinute = m;
    }
    
    // 获取开始日期
    let startDateStr = task.startDate;
    // 默认日期为当前日期
    startDateStr = startDateStr || new Date().toISOString().split('T')[0];
    const [startYear, startMonth, startDay] = startDateStr.split('-').map(Number);
    
    // 创建nowPDT变量表示当前太平洋时间
    const nowPDT = TimeZoneUtils.CSTtoPDT(nowCST);
    
    // 创建nextTimePDT对象，使用正确的PDT时间
    let nextTimePDT = new Date(nowPDT);
    nextTimePDT.setHours(startHour, startMinute, 0, 0);
    
    // 创建initialStartPDT对象，使用正确的PDT时间
    const initialStartPDT = new Date(startYear, startMonth - 1, startDay, startHour, startMinute, 0, 0);
    
    if (task.recurrence.type === "daily") {
        // 每天重复
        // 获取所有时间点，如果没有则使用当前的startHour和startMinute
        const timePoints = task.recurrence.startTimes && task.recurrence.startTimes.length > 0 ? 
            task.recurrence.startTimes.map(timeStr => {
                const [h, m] = timeStr.split(':').map(Number);
                return { hour: h, minute: m };
            }) : [{ hour: startHour, minute: startMinute }];
        
        // 计算今天和明天的所有时间点组合
        const today = new Date(nowPDT);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const candidates = [];
        
        // 检查今天的所有时间点
        for (const { hour, minute } of timePoints) {
            const testDatePDT = new Date(today);
            testDatePDT.setHours(hour, minute, 0, 0);
            if (testDatePDT > nowPDT) {
                candidates.push(testDatePDT);
            }
        }
        
        // 如果今天没有找到合适的时间点，检查明天的所有时间点
        if (candidates.length === 0) {
            for (const { hour, minute } of timePoints) {
                const testDatePDT = new Date(tomorrow);
                testDatePDT.setHours(hour, minute, 0, 0);
                candidates.push(testDatePDT);
            }
        }
        
        // 选择最近的时间点
        candidates.sort((a, b) => a - b);
        
        // 检查是否正在进行中（需要检查所有时间点，包括今天已经发生过的时间点）
        const durationMs = convertToMilliseconds(task.recurrence.duration, task.recurrence.durationUnit);
        
        // 首先检查今天的所有时间点（包括已经发生过的），看是否有正在进行中的事件
        for (const { hour, minute } of timePoints) {
            const testDatePDT = new Date(today);
            testDatePDT.setHours(hour, minute, 0, 0);
            const candidateCST = TimeZoneUtils.PDTtoCST(testDatePDT);
            console.log(`检查时间点: ${hour}:${minute}`);
            console.log(`PDT时间: ${testDatePDT}`);
            console.log(`CST时间: ${candidateCST}`);
            console.log(`当前CST时间: ${nowCST}`);
            console.log(`结束时间: ${new Date(candidateCST.getTime() + durationMs)}`);
            console.log(`是否在时间范围内: ${candidateCST <= nowCST && nowCST < candidateCST.getTime() + durationMs}`);
            if (candidateCST <= nowCST && nowCST < candidateCST.getTime() + durationMs) {
                console.log(`找到正在进行的事件！`);
                return {
                    startTime: candidateCST,
                    location: ""
                };
            }
        }
        
        // 如果没有正在进行中的事件，返回最近的时间点
        console.log(`没有找到正在进行的事件，返回最近的时间点: ${candidates[0]}`);
        const nextTimeCST = TimeZoneUtils.PDTtoCST(candidates[0]);
        return {
            startTime: nextTimeCST,
            location: ""
        };
    }

    return null;
}

// 模拟getTaskStatus函数
function getTaskStatus(task, nowCST) {
    // 缓存重复计算的值
    const thresholdMs = convertToMilliseconds(task.displayThreshold, task.displayThresholdUnit);
    const durationMs = convertToMilliseconds(task.recurrence.duration, task.recurrence.durationUnit);
    
    try {
        // 普通事件处理
        const nextOccurrence = getNextOccurrence(task, nowCST);
        if (!nextOccurrence || !nextOccurrence.startTime) {
            return { status: "future", timeText: "未来事件", countdownMs: 0, countdownText: "--" };
        }
        
        const nextStartCST = nextOccurrence.startTime;
        const location = nextOccurrence.location || "";
        const endTimeCST = new Date(nextStartCST.getTime() + durationMs);
        const displayStartTimeCST = new Date(nextStartCST.getTime() - thresholdMs);
        
        const isInDisplayRange = nowCST >= displayStartTimeCST;
        const isOngoing = nowCST >= nextStartCST && nowCST < endTimeCST;
        const timeUntilStart = nextStartCST - nowCST;
        
        // 单次事件且已结束
        if (task.recurrence.type === "none" && nowCST > endTimeCST) {
            return {
                status: "completed",
                timeText: "已完成",
                countdownMs: 0,
                countdownText: "已完成",
                startTime: nextStartCST,
                endTime: endTimeCST
            };
        }
        
        if (isOngoing) {
            const timeLeft = endTimeCST - nowCST;
            return {
                status: "ongoing",
                timeText: `正在进行`,
                countdownMs: timeLeft,
                countdownText: formatCountdown(timeLeft),
                startTime: nextStartCST,
                endTime: endTimeCST
            };
        } else if (isInDisplayRange) {
            const converted = convertFromMilliseconds(timeUntilStart);
            return {
                status: "upcoming",
                timeText: `${converted.value}${converted.text}后开始`,
                countdownMs: timeUntilStart,
                countdownText: formatCountdown(timeUntilStart),
                startTime: nextStartCST,
                endTime: endTimeCST
            };
        } else {
            const converted = convertFromMilliseconds(timeUntilStart);
            return {
                status: "future",
                timeText: `${converted.value}${converted.text}后开始`,
                countdownMs: timeUntilStart,
                countdownText: formatCountdown(timeUntilStart),
                startTime: nextStartCST,
                endTime: endTimeCST
            };
        }
    } catch (e) {
        console.error('计算任务状态出错:', e);
        return { status: "future", timeText: "时间计算中", countdownMs: 0, countdownText: "--" };
    }
}

// 辅助函数
function convertFromMilliseconds(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
        return { value: days, text: '天' };
    } else if (hours > 0) {
        return { value: hours, text: '小时' };
    } else if (minutes > 0) {
        return { value: minutes, text: '分钟' };
    } else {
        return { value: seconds, text: '秒' };
    }
}

// 测试代码
console.log('=== 测试事件显示修复 ===\n');

// 创建测试任务：每天10:00、14:00、18:00重复，持续3小时
const testTask = {
    displayThreshold: 2,
    displayThresholdUnit: "hours",
    recurrence: {
        type: "daily",
        startTimes: ["10:00", "14:00", "18:00"],
        duration: 3,
        durationUnit: "hours"
    }
};

// 测试不同的当前时间（使用正确的时区转换）
// 注意：这里的时间都是CST（中国标准时间）
const testTimes = [
    // 情况1：当前时间在10:00-13:00之间（应该显示正在进行）
    { name: "情况1：当前时间在10:00-13:00之间", time: new Date(Date.UTC(2023, 11, 12, 3, 30, 0, 0)) }, // UTC+8是11:30
    // 情况2：当前时间在14:00-17:00之间（应该显示正在进行）
    { name: "情况2：当前时间在14:00-17:00之间", time: new Date(Date.UTC(2023, 11, 12, 7, 30, 0, 0)) }, // UTC+8是15:30
    // 情况3：当前时间在18:00-21:00之间（应该显示正在进行）
    { name: "情况3：当前时间在18:00-21:00之间", time: new Date(Date.UTC(2023, 11, 12, 11, 30, 0, 0)) }, // UTC+8是19:30
    // 情况4：当前时间在13:00-14:00之间（应该显示即将开始）
    { name: "情况4：当前时间在13:00-14:00之间", time: new Date(Date.UTC(2023, 11, 12, 5, 30, 0, 0)) } // UTC+8是13:30
];

// 运行测试
testTimes.forEach((testCase, index) => {
    console.log(`\n--- ${testCase.name} ---`);
    console.log(`当前时间: ${testCase.time.toLocaleString()}`);
    
    const result = getTaskStatus(testTask, testCase.time);
    
    console.log(`事件状态: ${result.status}`);
    console.log(`时间文本: ${result.timeText}`);
    console.log(`倒计时: ${result.countdownText}`);
    if (result.startTime) console.log(`开始时间: ${result.startTime.toLocaleString()}`);
    if (result.endTime) console.log(`结束时间: ${result.endTime.toLocaleString()}`);
    
    // 检查结果是否符合预期
    let expectedStatus = "upcoming";
    const testHour = testCase.time.getHours();
    if ((testHour >= 10 && testHour < 13) || (testHour >= 14 && testHour < 17) || (testHour >= 18 && testHour < 21)) {
        expectedStatus = "ongoing";
    }
    
    if (result.status === expectedStatus) {
        console.log("✅ 测试通过！");
    } else {
        console.log(`❌ 测试失败！预期状态: ${expectedStatus}`);
    }
});

console.log('\n=== 测试完成 ===');