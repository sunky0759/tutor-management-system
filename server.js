// 导入必要的 Node.js 模块
// express: Web 应用框架
// cors: 跨域资源共享中间件
// fs: 文件系统操作
// path: 路径处理工具
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();

// 配置中间件
// 启用 CORS 以允许跨域请求
// 启用 JSON 解析以处理 JSON 格式的请求体
app.use(cors());
app.use(express.json());

// 配置静态文件服务，允许访问当前目录下的静态文件（如 HTML、CSS、JS）
app.use(express.static(__dirname));

// 定义数据存储相关的常量
// DATA_FILE: JSON 数据文件的完整路径
// DATA_DIR: 数据目录的路径
const DATA_FILE = path.join(__dirname, 'data', 'tutoring_data.json');
const DATA_DIR = path.join(__dirname, 'data');

// 初始化数据存储
// 检查并创建数据目录（如果不存在）
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}

// 检查并创建数据文件（如果不存在）
// 初始化为空数组的 JSON 文件
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([]));
}

// API 路由：获取所有数据
// GET /api/data
app.get('/api/data', (req, res) => {
    try {
        // 读取数据文件并解析为 JSON
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        console.error('读取数据失败:', error);
        res.status(500).json({ error: '读取数据失败' });
    }
});

// API 路由：保存数据
// POST /api/data
app.post('/api/data', (req, res) => {
    try {
        // 将请求体数据格式化为 JSON 字符串（使用 2 空格缩进）
        const data = JSON.stringify(req.body, null, 2);
        // 写入数据文件
        fs.writeFileSync(DATA_FILE, data);
        res.json({ message: '数据保存成功' });
    } catch (error) {
        console.error('保存数据失败:', error);
        res.status(500).json({ error: '保存数据失败' });
    }
});

// 数据自动备份功能
function createBackup() {
    try {
        // 生成时间戳作为备份文件名的一部分
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(DATA_DIR, 'backups');
        
        // 确保备份目录存在
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir);
        }
        
        // 读取当前数据并创建备份
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        const backupFile = path.join(backupDir, `backup_${timestamp}.json`);
        fs.writeFileSync(backupFile, data);
        
        // 管理备份文件数量
        // 只保留最近的 10 个备份，删除最旧的备份
        const backups = fs.readdirSync(backupDir);
        if (backups.length > 10) {
            const oldestBackup = backups.sort()[0];
            fs.unlinkSync(path.join(backupDir, oldestBackup));
        }
    } catch (error) {
        console.error('创建备份失败:', error);
    }
}

// 设置定时备份
// 每 24 小时（一天）执行一次备份
setInterval(createBackup, 24 * 60 * 60 * 1000);

// 启动服务器
// 监听 3000 端口
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
    console.log(`数据文件路径: ${DATA_FILE}`);
});