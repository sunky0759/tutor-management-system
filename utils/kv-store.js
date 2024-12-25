const { createClient } = require('@vercel/kv');
const logger = require('./logger');

// 创建 KV 客户端
const kv = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

class KVStore {
    constructor() {
        if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
            logger.error('KV store credentials not found in environment variables');
            throw new Error('KV store credentials not found');
        }
    }

    // 保存家教信息
    async saveTutoringInfo(info) {
        try {
            const id = Date.now().toString();
            info.id = id;
            info.createdAt = new Date().toISOString();
            
            // 保存到主列表
            await kv.hset('tutoring_info', { [id]: JSON.stringify(info) });
            
            // 更新索引
            await this.updateIndexes(info);
            
            logger.info(`Saved tutoring info with ID: ${id}`);
            return id;
        } catch (error) {
            logger.error('Error saving tutoring info:', error);
            throw error;
        }
    }

    // 更新索引
    async updateIndexes(info) {
        const { id, city, district, grade, subject } = info;
        
        // 城市索引
        await kv.sadd(`index:city:${city}`, id);
        
        // 区域索引
        await kv.sadd(`index:district:${city}:${district}`, id);
        
        // 年级索引
        await kv.sadd(`index:grade:${grade}`, id);
        
        // 科目索引
        await kv.sadd(`index:subject:${subject}`, id);
    }

    // 获取所有家教信息
    async getAllTutoringInfo() {
        try {
            const allInfo = await kv.hgetall('tutoring_info');
            return Object.values(allInfo).map(info => JSON.parse(info));
        } catch (error) {
            logger.error('Error getting all tutoring info:', error);
            throw error;
        }
    }

    // 按条件查询家教信息
    async queryTutoringInfo({ city, district, grade, subject }) {
        try {
            let ids = null;

            // 根据条件获取ID集合
            if (city && district) {
                ids = await kv.smembers(`index:district:${city}:${district}`);
            } else if (city) {
                ids = await kv.smembers(`index:city:${city}`);
            }

            if (grade) {
                const gradeIds = await kv.smembers(`index:grade:${grade}`);
                ids = ids ? await this.intersectSets(ids, gradeIds) : gradeIds;
            }

            if (subject) {
                const subjectIds = await kv.smembers(`index:subject:${subject}`);
                ids = ids ? await this.intersectSets(ids, subjectIds) : subjectIds;
            }

            if (!ids || ids.length === 0) {
                return [];
            }

            // 获取详细信息
            const infoList = await Promise.all(
                ids.map(id => kv.hget('tutoring_info', id))
            );

            return infoList.filter(Boolean).map(info => JSON.parse(info));
        } catch (error) {
            logger.error('Error querying tutoring info:', error);
            throw error;
        }
    }

    // 辅助方法：计算集合交集
    async intersectSets(set1, set2) {
        return set1.filter(id => set2.includes(id));
    }

    // 删除家教信息
    async deleteTutoringInfo(id) {
        try {
            const info = JSON.parse(await kv.hget('tutoring_info', id));
            if (!info) {
                throw new Error('Info not found');
            }

            // 删除主数据
            await kv.hdel('tutoring_info', id);

            // 删除索引
            await kv.srem(`index:city:${info.city}`, id);
            await kv.srem(`index:district:${info.city}:${info.district}`, id);
            await kv.srem(`index:grade:${info.grade}`, id);
            await kv.srem(`index:subject:${info.subject}`, id);

            logger.info(`Deleted tutoring info with ID: ${id}`);
            return true;
        } catch (error) {
            logger.error(`Error deleting tutoring info ${id}:`, error);
            throw error;
        }
    }

    // 更新家教信息
    async updateTutoringInfo(id, newInfo) {
        try {
            const oldInfo = JSON.parse(await kv.hget('tutoring_info', id));
            if (!oldInfo) {
                throw new Error('Info not found');
            }

            // 删除旧索引
            await kv.srem(`index:city:${oldInfo.city}`, id);
            await kv.srem(`index:district:${oldInfo.city}:${oldInfo.district}`, id);
            await kv.srem(`index:grade:${oldInfo.grade}`, id);
            await kv.srem(`index:subject:${oldInfo.subject}`, id);

            // 更新信息
            newInfo.id = id;
            newInfo.updatedAt = new Date().toISOString();
            await kv.hset('tutoring_info', { [id]: JSON.stringify(newInfo) });

            // 添加新索引
            await this.updateIndexes(newInfo);

            logger.info(`Updated tutoring info with ID: ${id}`);
            return true;
        } catch (error) {
            logger.error(`Error updating tutoring info ${id}:`, error);
            throw error;
        }
    }

    // 备份数据
    async backup() {
        try {
            const allData = await this.getAllTutoringInfo();
            const backup = {
                timestamp: new Date().toISOString(),
                data: allData
            };
            
            await kv.set(`backup:${backup.timestamp}`, JSON.stringify(backup));
            logger.info(`Backup created at ${backup.timestamp}`);
            return backup;
        } catch (error) {
            logger.error('Error creating backup:', error);
            throw error;
        }
    }

    // 恢复备份
    async restoreBackup(timestamp) {
        try {
            const backup = await kv.get(`backup:${timestamp}`);
            if (!backup) {
                throw new Error('Backup not found');
            }

            const { data } = JSON.parse(backup);

            // 清除现有数据
            await kv.del('tutoring_info');
            
            // 重新导入数据
            for (const info of data) {
                await this.saveTutoringInfo(info);
            }

            logger.info(`Restored backup from ${timestamp}`);
            return true;
        } catch (error) {
            logger.error(`Error restoring backup from ${timestamp}:`, error);
            throw error;
        }
    }
}

module.exports = new KVStore();
