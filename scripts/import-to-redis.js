import { Redis } from '@upstash/redis';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 创建 Redis 客户端
const redis = new Redis({
    url: 'https://good-mongrel-29727.upstash.io',
    token: 'AXQfAAIjcDFiMzk2YTUzMWI1M2I0YzQwOTA3ZmZkNDM1NTExMjkzNXAxMA=='
});

async function importData() {
    try {
        // 读取本地存储的数据
        const dataPath = path.join(__dirname, '..', 'data', 'local-storage.json');
        const data = JSON.parse(await fs.readFile(dataPath, 'utf-8'));

        // 导入客服数据
        if (data.customerServices?.length > 0) {
            await redis.set('customerServices', JSON.stringify(data.customerServices));
            console.log('客服数据导入成功');
        }

        // 导入家教记录
        if (data.results?.length > 0) {
            await redis.set('tutorResults', JSON.stringify(data.results));
            console.log('家教记录导入成功');
        }

        // 导入推荐项目
        if (data.recommendedItems?.length > 0) {
            await redis.set('recommendedItems', JSON.stringify(data.recommendedItems));
            console.log('推荐项目导入成功');
        }

        console.log('所有数据导入完成');
    } catch (error) {
        console.error('导入数据时出错:', error);
    }
}

// 执行导入
importData();
