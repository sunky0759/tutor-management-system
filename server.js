const dotenv = require('dotenv');
const path = require('path');

// 根据环境加载不同的配置文件
const envFile = process.env.NODE_ENV === 'development' ? '.env.development' : '.env';
dotenv.config({ path: path.resolve(__dirname, envFile) });

const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const logger = require('./utils/logger');

// 只在非开发环境下加载 edge-store
let edgeStore;
if (!process.env.DISABLE_VERCEL_TOOLS) {
    edgeStore = require('./utils/edge-store');
    
    // 检查环境变量
    if (!process.env.EDGE_CONFIG_ID || !process.env.EDGE_CONFIG_TOKEN) {
        logger.error('Edge Config credentials not found in environment variables');
        process.exit(1);
    }
}

const app = express();
const port = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());

// 设置所有 JavaScript 文件的 MIME 类型
app.use((req, res, next) => {
    const ext = path.extname(req.url);
    if (ext === '.js' || ext === '.mjs') {
        res.type('application/javascript; charset=UTF-8');
    }
    next();
});

// 静态文件中间件配置
app.use(express.static(path.join(__dirname), {
    setHeaders: (res, filePath) => {
        const ext = path.extname(filePath);
        if (ext === '.js' || ext === '.mjs') {
            res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
        }
    }
}));

// 错误处理中间件
app.use((err, req, res, next) => {
    logger.error('Error:', err);
    res.status(500).json({ error: '服务器内部错误' });
});

// API 路由
if (edgeStore) {
    app.post('/api/tutoring', async (req, res) => {
        try {
            const id = await edgeStore.saveTutoringInfo(req.body);
            res.json({ id });
        } catch (error) {
            logger.error('Error saving tutoring info:', error);
            res.status(500).json({ error: '保存失败' });
        }
    });

    app.get('/api/tutoring', async (req, res) => {
        try {
            const { city, district, grade, subject } = req.query;
            const data = await edgeStore.queryTutoringInfo({ city, district, grade, subject });
            res.json(data);
        } catch (error) {
            logger.error('Error querying tutoring info:', error);
            res.status(500).json({ error: '查询失败' });
        }
    });

    app.put('/api/tutoring/:id', async (req, res) => {
        try {
            await edgeStore.updateTutoringInfo(req.params.id, req.body);
            res.json({ success: true });
        } catch (error) {
            logger.error('Error updating tutoring info:', error);
            res.status(500).json({ error: '更新失败' });
        }
    });

    app.delete('/api/tutoring/:id', async (req, res) => {
        try {
            await edgeStore.deleteTutoringInfo(req.params.id);
            res.json({ success: true });
        } catch (error) {
            logger.error('Error deleting tutoring info:', error);
            res.status(500).json({ error: '删除失败' });
        }
    });

    // 备份路由
    app.post('/api/backup', async (req, res) => {
        try {
            const backup = await edgeStore.backup();
            res.json(backup);
        } catch (error) {
            logger.error('Error creating backup:', error);
            res.status(500).json({ error: '备份失败' });
        }
    });

    app.post('/api/restore/:timestamp', async (req, res) => {
        try {
            await edgeStore.restoreBackup(req.params.timestamp);
            res.json({ success: true });
        } catch (error) {
            logger.error('Error restoring backup:', error);
            res.status(500).json({ error: '恢复失败' });
        }
    });

    // 定时备份任务
    cron.schedule('0 3 * * *', async () => {
        try {
            await edgeStore.backup();
            logger.info('Automatic backup completed');
        } catch (error) {
            logger.error('Automatic backup failed:', error);
        }
    });
}

// 启动服务器
app.listen(port, () => {
    logger.info(`Server is running on port ${port}`);
});