// 从当前目录的index.html文件中提取破晓红石规则并计算事件
const fs = require('fs');
const path = require('path');

// 读取index.html文件
const htmlContent = fs.readFileSync('index.html', 'utf8');

// 提取规则函数
const getDawnRedstoneLocation = function(date, dayOfWeek) {
    const dayOfMonth = date.getDate();
    
    // 暮土系 (日期: 1,6,11,16,21,26,31)
    if ([1, 6, 11, 16, 21, 26, 31].includes(dayOfMonth)) {
        if (dayOfWeek === 5) return "暮土-黑水港湾";
        if (dayOfWeek === 6) return "暮土-巨兽荒原";
        if (dayOfWeek === 0) return "暮土-失落方舟";
    }
    
    // 禁阁系 (日期: 2,7,12,17,22,27)
    if ([2, 7, 12, 17, 22, 27].includes(dayOfMonth)) {
        if ([5, 6, 0].includes(dayOfWeek)) return "禁阁-星漠海滩";
    }
    
    // 云野系 (日期: 3,8,13,18,23,28)
    if ([3, 8, 13, 18, 23, 28].includes(dayOfMonth)) {
        if (dayOfWeek === 5) return "云野-云顶浮石";
        if (dayOfWeek === 6) return "云野-幽光山洞";
        if (dayOfWeek === 0) return "云野-圣岛";
    }
    
    // 雨林系 (日期: 4,9,14,19,24,29)
    if ([4, 9, 14, 19, 24, 29].includes(dayOfMonth)) {
        if (dayOfWeek === 5) return "雨林-大树屋";
        if (dayOfWeek === 6) return "雨林-雨林神庙";
        if (dayOfWeek === 0) return "雨林-秘密花园";
    }
    
    // 霞谷系 (日期: 5,10,15,20,25,30)
    if ([5, 10, 15, 20, 25, 30].includes(dayOfMonth)) {
        if ([5, 6].includes(dayOfWeek)) return "霞谷-圆梦村";
        if (dayOfWeek === 0) return "霞谷-雪隐峰";
    }
    
    return "未知地点";
};

const getDawnRedstoneTimeSlots = function(date, day) {
    const slots = [];
    
    if (day === 0) {
        slots.push(
            { start: 7*60+8, end: 8*60+0 },
            { start: 13*60+8, end: 14*60+0 },
            { start: 19*60+8, end: 20*60+0 }
        );
    }
    
    if (day === 6 && date >= 1 && date <= 15) {
        slots.push(
            { start: 10*60+8, end: 11*60+0 },
            { start: 14*60+8, end: 15*60+0 },
            { start: 22*60+8, end: 23*60+0 }
        );
    }
    
    if (day === 5 && date >= 16) {
        slots.push(
            { start: 11*60+8, end: 12*60+0 },
            { start: 17*60+8, end: 18*60+0 },
            { start: 23*60+8, end: 24*60+0 }
        );
    }
    
    return slots;
};

// 计算这个月的所有红石事件
function calculateThisMonthEvents() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    // 获取当月天数
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const events = [];
    
    // 遍历当月每一天
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dayOfWeek = date.getDay();
        
        // 获取当天的时间段
        const timeSlots = getDawnRedstoneTimeSlots(day, dayOfWeek);
        
        if (timeSlots.length > 0) {
            const location = getDawnRedstoneLocation(date, dayOfWeek);
            
            // 遍历每个时间段
            timeSlots.forEach(slot => {
                // 转换时间格式
                const startTime = `${Math.floor(slot.start / 60).toString().padStart(2, '0')}:${(slot.start % 60).toString().padStart(2, '0')}`;
                const endTime = `${Math.floor(slot.end / 60).toString().padStart(2, '0')}:${(slot.end % 60).toString().padStart(2, '0')}`;
                
                events.push({
                    date: `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`,
                    dayOfWeek: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][dayOfWeek],
                    location: location,
                    startTime: startTime,
                    endTime: endTime
                });
            });
        }
    }
    
    return events;
}

// 计算并输出结果
const events = calculateThisMonthEvents();
console.log(`===== ${new Date().getFullYear()}年${new Date().getMonth() + 1}月 破晓红石事件安排 =====`);
console.log('日期\t\t星期\t地点\t\t\t开始时间\t结束时间');
console.log('-' . repeat(70));

events.forEach(event => {
    console.log(`${event.date}\t${event.dayOfWeek}\t${event.location.padEnd(16)}\t${event.startTime}\t\t${event.endTime}`);
});

// 将结果写入文件
fs.writeFileSync('dawn_redstone_events.md', `# ${new Date().getFullYear()}年${new Date().getMonth() + 1}月 破晓红石事件安排\n\n` +
    '| 日期 | 星期 | 地点 | 开始时间 | 结束时间 |\n' +
    '|------|------|------|----------|----------|\n' +
    events.map(event => `| ${event.date} | ${event.dayOfWeek} | ${event.location} | ${event.startTime} | ${event.endTime} |`).join('\n'));

console.log('\n事件安排已写入 dawn_redstone_events.md 文件');
