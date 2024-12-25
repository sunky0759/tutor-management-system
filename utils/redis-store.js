const { Redis } = require('@upstash/redis');
const logger = require('./logger');

class RedisStore {
    constructor() {
        if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
            logger.error('Redis credentials not found in environment variables');
            throw new Error('Redis credentials not found');
        }

        this.redis = new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL,
            token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });
    }

    // 保存家教信息
    async saveTutoringInfo(info) {
        try {
            const id = Date.now().toString();
            info.id = id;
            info.createdAt = new Date().toISOString();
            
            // 保存到主列表
            await this.redis.hset('tutoring_info', { [id]: JSON.stringify(info) });
            
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
        const pipeline = this.redis.pipeline();
        
        // 城市索引
        pipeline.sadd(`index:city:${city}`, id);
        
        // 区域索引
        pipeline.sadd(`index:district:${city}:${district}`, id);
        
        // 年级索引
        pipeline.sadd(`index:grade:${grade}`, id);
        
        // 科目索引
        pipeline.sadd(`index:subject:${subject}`, id);
        
        await pipeline.exec();
    }

    // 获取所有家教信息
    async getAllTutoringInfo() {
        try {
            const allInfo = await this.redis.hgetall('tutoring_info');
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
                ids = await this.redis.smembers(`index:district:${city}:${district}`);
            } else if (city) {
                ids = await this.redis.smembers(`index:city:${city}`);
            }

            if (grade) {
                const gradeIds = await this.redis.smembers(`index:grade:${grade}`);
                ids = ids ? this.intersectSets(ids, gradeIds) : gradeIds;
            }

            if (subject) {
                const subjectIds = await this.redis.smembers(`index:subject:${subject}`);
                ids = ids ? this.intersectSets(ids, subjectIds) : subjectIds;
            }

            if (!ids || ids.length === 0) {
                return [];
            }

            // 获取详细信息
            const pipeline = this.redis.pipeline();
            ids.forEach(id => pipeline.hget('tutoring_info', id));
            const results = await pipeline.exec();

            return results
                .filter(result => result !== null)
                .map(info => JSON.parse(info));
        } catch (error) {
            logger.error('Error querying tutoring info:', error);
            throw error;
        }
    }

    // 辅助方法：计算集合交集
    intersectSets(set1, set2) {
        return set1.filter(id => set2.includes(id));
    }

    // 删除家教信息
    async deleteTutoringInfo(id) {
        try {
            const info = JSON.parse(await this.redis.hget('tutoring_info', id));
            if (!info) {
                throw new Error('Info not found');
            }

            const pipeline = this.redis.pipeline();

            // 删除主数据
            pipeline.hdel('tutoring_info', id);

            // 删除索引
            pipeline.srem(`index:city:${info.city}`, id);
            pipeline.srem(`index:district:${info.city}:${info.district}`, id);
            pipeline.srem(`index:grade:${info.grade}`, id);
            pipeline.srem(`index:subject:${info.subject}`, id);

            await pipeline.exec();
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
            const oldInfo = JSON.parse(await this.redis.hget('tutoring_info', id));
            if (!oldInfo) {
                throw new Error('Info not found');
            }

            const pipeline = this.redis.pipeline();

            // 删除旧索引
            pipeline.srem(`index:city:${oldInfo.city}`, id);
            pipeline.srem(`index:district:${oldInfo.city}:${oldInfo.district}`, id);
            pipeline.srem(`index:grade:${oldInfo.grade}`, id);
            pipeline.srem(`index:subject:${oldInfo.subject}`, id);

            // 更新信息
            newInfo.id = id;
            newInfo.updatedAt = new Date().toISOString();
            pipeline.hset('tutoring_info', { [id]: JSON.stringify(newInfo) });

            await pipeline.exec();

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
            
            await this.redis.set(`backup:${backup.timestamp}`, JSON.stringify(backup));
            
            // 清理旧备份（保留最近7天的）
            const backupKeys = await this.redis.keys('backup:*');
            const oldBackups = backupKeys
                .sort()
                .slice(0, -7); // 保留最新的7个备份

            if (oldBackups.length > 0) {
                await this.redis.del(...oldBackups);
            }

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
            const backup = await this.redis.get(`backup:${timestamp}`);
            if (!backup) {
                throw new Error('Backup not found');
            }

            const { data } = JSON.parse(backup);

            // 清除现有数据
            const keys = await this.redis.keys('tutoring_info*');
            if (keys.length > 0) {
                await this.redis.del(...keys);
            }

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

module.exports = new RedisStore();
