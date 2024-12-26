import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { tutorRequestsAPI, customerServicesAPI } from './utils/redis.js';
import logger from './utils/logger.js';

// 加载环境变量
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// 错误处理中间件
app.use((err, req, res, next) => {
    logger.error('Server error:', err);
    res.status(500).json({ error: '服务器内部错误' });
});

// API路由
// 获取所有家教请求
app.get('/api/tutorRequests', async (req, res) => {
    try {
        const requests = await tutorRequestsAPI.getAll();
        res.json(requests);
    } catch (error) {
        logger.error('Error fetching tutor requests:', error);
        res.status(500).json({ error: '获取家教请求失败' });
    }
});

// 添加或更新家教请求
app.post('/api/tutorRequests', async (req, res) => {
    try {
        const requests = req.body;
        if (!Array.isArray(requests)) {
            return res.status(400).json({ error: '无效的数据格式' });
        }

        // 使用Promise.all批量处理
        const results = await Promise.all(
            requests.map(request => 
                request.id ? 
                tutorRequestsAPI.update(request.id, request) : 
                tutorRequestsAPI.create(request)
            )
        );

        res.json(results);
    } catch (error) {
        logger.error('Error saving tutor requests:', error);
        res.status(500).json({ error: '保存家教请求失败' });
    }
});

// 获取所有客服信息
app.get('/api/customerService', async (req, res) => {
    try {
        const services = await customerServicesAPI.getAll();
        res.json(services);
    } catch (error) {
        logger.error('Error fetching customer services:', error);
        res.status(500).json({ error: '获取客服信息失败' });
    }
});

// 添加或更新客服信息
app.post('/api/customerService', async (req, res) => {
    try {
        const services = req.body;
        if (!Array.isArray(services)) {
            return res.status(400).json({ error: '无效的数据格式' });
        }

        // 使用Promise.all批量处理
        const results = await Promise.all(
            services.map(service => 
                service.id ? 
                customerServicesAPI.update(service.id, service) : 
                customerServicesAPI.create(service)
            )
        );

        res.json(results);
    } catch (error) {
        logger.error('Error saving customer services:', error);
        res.status(500).json({ error: '保存客服信息失败' });
    }
});

// 分析家教需求内容
app.post('/api/analyze', async (req, res) => {
    try {
        const { content } = req.body;
        if (!content) {
            return res.status(400).json({ error: '内容不能为空' });
        }

        // 这里可以添加更复杂的内容分析逻辑
        const result = {
            city: extractCity(content),
            district: extractDistrict(content),
            grade_level: extractGradeLevel(content),
            subjects: extractSubjects(content)
        };

        res.json(result);
    } catch (error) {
        logger.error('Error analyzing content:', error);
        res.status(500).json({ error: '分析内容失败' });
    }
});

// 内容分析辅助函数
function extractCity(content) {
    const cities = ['北京', '上海', '广州', '深圳', '杭州'];
    return cities.find(city => content.includes(city)) || '未知';
}

function extractDistrict(content) {
    const districts = {
        '北京': ['朝阳', '海淀', '东城', '西城', '丰台'],
        '上海': ['浦东', '黄浦', '徐汇', '长宁', '静安'],
        '广州': ['越秀', '海珠', '荔湾', '天河', '白云'],
        '深圳': ['福田', '罗湖', '南山', '盐田', '宝安'],
        '杭州': ['上城', '下城', '江干', '拱墅', '西湖']
    };

    const city = extractCity(content);
    const cityDistricts = districts[city] || [];
    return cityDistricts.find(district => content.includes(district)) || '未知';
}

function extractGradeLevel(content) {
    if (content.includes('小学')) return '小学';
    if (content.includes('初中')) return '初中';
    if (content.includes('高中')) return '高中';
    return '未知';
}

function extractSubjects(content) {
    const subjects = ['语文', '数学', '英语', '物理', '化学', '生物'];
    return subjects.filter(subject => content.includes(subject));
}

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
});