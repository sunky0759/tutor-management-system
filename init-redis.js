const Redis = require('ioredis');

// Redis连接配置
const redis = new Redis('redis://default:AXQfAAIjcDFiMzk2YTUzMWI1M2I0YzQwOTA3ZmZkNDM1NTExMjkzNXAxMA@good-mongrel-29727.upstash.io:6379', {
    tls: {
        rejectUnauthorized: false
    }
});

// 示例数据
const sampleData = {
    // 家教需求表 - Hash结构
    tutor_requests: {
        'request:1': {
            id: '1',
            content: '示例：需要高中数学家教',
            city: '北京',
            district: '海淀',
            grade_level: '高中',
            subjects: ['数学'],
            cs_name: '张三',
            cs_wechat_id: 'zhangsan123',
            is_recommended: false,
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }
    },
    
    // 客服信息表 - Hash结构
    customer_services: {
        'cs:1': {
            id: '1',
            name: '张三',
            wechat_id: 'zhangsan123',
            status: 'active',
            created_at: new Date().toISOString()
        }
    }
};

// 初始化Redis数据库
async function initializeRedis() {
    try {
        // 清除所有现有数据（谨慎使用）
        await redis.flushall();
        console.log('已清除现有数据');

        // 创建索引
        // 注意：Upstash Redis可能不支持RediSearch，所以这里只使用基本的Hash结构

        // 添加示例数据
        // 1. 家教需求
        for (const [key, value] of Object.entries(sampleData.tutor_requests)) {
            await redis.hset(key, value);
        }
        
        // 2. 客服信息
        for (const [key, value] of Object.entries(sampleData.customer_services)) {
            await redis.hset(key, value);
        }

        // 创建计数器
        await redis.set('tutor_request_id_counter', '1');
        await redis.set('customer_service_id_counter', '1');

        // 创建集合用于存储所有ID
        await redis.sadd('tutor_request_ids', '1');
        await redis.sadd('customer_service_ids', '1');

        console.log('Redis数据库初始化完成');
        
        // 验证数据
        const tutorRequest = await redis.hgetall('request:1');
        const customerService = await redis.hgetall('cs:1');
        
        console.log('\n已创建的数据示例：');
        console.log('\n家教需求示例：', tutorRequest);
        console.log('\n客服信息示例：', customerService);

    } catch (error) {
        console.error('初始化Redis数据库时出错：', error);
    } finally {
        redis.quit();
    }
}

// 运行初始化
initializeRedis();
