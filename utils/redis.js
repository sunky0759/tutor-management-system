import { Redis } from 'ioredis';
import logger from './logger.js';

// Redis客户端 - 使用Upstash
const redis = new Redis('redis://default:AXQfAAIjcDFiMzk2YTUzMWI1M2I0YzQwOTA3ZmZkNDM1NTExMjkzNXAxMA@good-mongrel-29727.upstash.io:6379', {
    tls: {
        rejectUnauthorized: false
    }
});

// 家教需求相关操作
const tutorRequestsAPI = {
    // 创建新的家教需求
    async create(data) {
        try {
            const id = await redis.incr('tutor_request_id_counter');
            const key = String(id);
            const now = new Date().toISOString();
            
            const requestData = {
                id: key,
                ...data,
                created_at: now,
                updated_at: now
            };

            await redis.hset('tutorRequests', key, JSON.stringify(requestData));
            logger.info(`Created tutor request with ID: ${id}`);
            return requestData;
        } catch (error) {
            logger.error('Error creating tutor request:', error);
            throw error;
        }
    },

    // 获取所有家教需求
    async getAll() {
        try {
            const requests = await redis.hgetall('tutorRequests');
            return Object.values(requests).map(str => JSON.parse(str));
        } catch (error) {
            logger.error('Error getting all tutor requests:', error);
            throw error;
        }
    },

    // 更新家教需求
    async update(id, data) {
        try {
            const key = String(id);
            const existing = await redis.hget('tutorRequests', key);
            
            if (!existing) {
                logger.warn(`Tutor request not found with ID: ${id}`);
                return null;
            }

            const existingData = JSON.parse(existing);
            const updatedData = {
                ...existingData,
                ...data,
                updated_at: new Date().toISOString()
            };

            await redis.hset('tutorRequests', key, JSON.stringify(updatedData));
            logger.info(`Updated tutor request with ID: ${id}`);
            return updatedData;
        } catch (error) {
            logger.error('Error updating tutor request:', error);
            throw error;
        }
    },

    // 删除家教需求
    async delete(id) {
        try {
            const key = String(id);
            const result = await redis.hdel('tutorRequests', key);
            logger.info(`Deleted tutor request with ID: ${id}`);
            return result === 1;
        } catch (error) {
            logger.error('Error deleting tutor request:', error);
            throw error;
        }
    }
};

// 客服相关操作
const customerServicesAPI = {
    // 创建新的客服
    async create(data) {
        try {
            const id = await redis.incr('customer_service_id_counter');
            const key = String(id);
            const now = new Date().toISOString();
            
            const serviceData = {
                id: key,
                ...data,
                created_at: now,
                updated_at: now
            };

            await redis.hset('customerServices', key, JSON.stringify(serviceData));
            logger.info(`Created customer service with ID: ${id}`);
            return serviceData;
        } catch (error) {
            logger.error('Error creating customer service:', error);
            throw error;
        }
    },

    // 获取所有客服
    async getAll() {
        try {
            const services = await redis.hgetall('customerServices');
            return Object.values(services).map(str => JSON.parse(str));
        } catch (error) {
            logger.error('Error getting all customer services:', error);
            throw error;
        }
    },

    // 更新客服信息
    async update(id, data) {
        try {
            const key = String(id);
            const existing = await redis.hget('customerServices', key);
            
            if (!existing) {
                logger.warn(`Customer service not found with ID: ${id}`);
                return null;
            }

            const existingData = JSON.parse(existing);
            const updatedData = {
                ...existingData,
                ...data,
                updated_at: new Date().toISOString()
            };

            await redis.hset('customerServices', key, JSON.stringify(updatedData));
            logger.info(`Updated customer service with ID: ${id}`);
            return updatedData;
        } catch (error) {
            logger.error('Error updating customer service:', error);
            throw error;
        }
    },

    // 删除客服
    async delete(id) {
        try {
            const key = String(id);
            const result = await redis.hdel('customerServices', key);
            logger.info(`Deleted customer service with ID: ${id}`);
            return result === 1;
        } catch (error) {
            logger.error('Error deleting customer service:', error);
            throw error;
        }
    }
};

// 导出API
export {
    redis,
    tutorRequestsAPI,
    customerServicesAPI
};
