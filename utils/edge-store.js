const { createClient } = require('@vercel/edge-config');
const logger = require('./logger');

class EdgeStore {
    constructor() {
        // 检查环境变量
        logger.info('Edge Config ID:', process.env.EDGE_CONFIG_ID);
        logger.info('Edge Config Token:', process.env.EDGE_CONFIG_TOKEN ? '存在' : '不存在');

        if (!process.env.EDGE_CONFIG_ID || !process.env.EDGE_CONFIG_TOKEN) {
            logger.error('Edge Config credentials not found in environment variables');
            throw new Error('Edge Config credentials not found');
        }

        // 尝试创建客户端
        try {
            this.client = createClient(`https://edge-config.vercel.com/${process.env.EDGE_CONFIG_ID}?token=${process.env.EDGE_CONFIG_TOKEN}`);
            logger.info('Edge Config client created successfully');
        } catch (error) {
            logger.error('Failed to create Edge Config client:', error);
            throw error;
        }

        // 初始化时测试连接
        this.testConnection();
    }

    async testConnection() {
        try {
            // 尝试获取一个简单的键值
            const result = await this.client.get('test');
            logger.info('Edge Config connection test result:', result);
            logger.info('Edge Config connection successful');
        } catch (error) {
            logger.error('Edge Config connection test failed:', error);
            throw error;
        }
    }

    // 保存家教信息
    async saveTutoringInfo(info) {
        try {
            const id = Date.now().toString();
            info.id = id;
            info.createdAt = new Date().toISOString();
            
            // 获取现有数据
            let allData = await this.getAllTutoringInfo();
            if (!Array.isArray(allData)) {
                allData = [];
            }
            
            // 添加新数据
            allData.push(info);
            
            // 保存所有数据
            await this.client.set('tutoring_info', allData);
            
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
        try {
            const { id, city, district, grade, subject } = info;
            
            // 获取现有索引
            const indexes = await this.client.get('indexes') || {
                cities: {},
                districts: {},
                grades: {},
                subjects: {}
            };
            
            // 更新城市索引
            if (!indexes.cities[city]) {
                indexes.cities[city] = [];
            }
            indexes.cities[city].push(id);
            
            // 更新区域索引
            const districtKey = `${city}:${district}`;
            if (!indexes.districts[districtKey]) {
                indexes.districts[districtKey] = [];
            }
            indexes.districts[districtKey].push(id);
            
            // 更新年级索引
            if (!indexes.grades[grade]) {
                indexes.grades[grade] = [];
            }
            indexes.grades[grade].push(id);
            
            // 更新科目索引
            if (!indexes.subjects[subject]) {
                indexes.subjects[subject] = [];
            }
            indexes.subjects[subject].push(id);
            
            // 保存更新后的索引
            await this.client.set('indexes', indexes);
        } catch (error) {
            logger.error('Error updating indexes:', error);
            throw error;
        }
    }

    // 获取所有家教信息
    async getAllTutoringInfo() {
        try {
            const data = await this.client.get('tutoring_info');
            return Array.isArray(data) ? data : [];
        } catch (error) {
            logger.error('Error getting all tutoring info:', error);
            throw error;
        }
    }

    // 按条件查询家教信息
    async queryTutoringInfo({ city, district, grade, subject }) {
        try {
            const indexes = await this.client.get('indexes') || {
                cities: {},
                districts: {},
                grades: {},
                subjects: {}
            };
            
            let matchingIds = null;
            
            // 根据条件筛选ID
            if (city && district) {
                const districtKey = `${city}:${district}`;
                matchingIds = indexes.districts[districtKey] || [];
            } else if (city) {
                matchingIds = indexes.cities[city] || [];
            }
            
            if (grade) {
                const gradeIds = indexes.grades[grade] || [];
                matchingIds = matchingIds 
                    ? this.intersectArrays(matchingIds, gradeIds)
                    : gradeIds;
            }
            
            if (subject) {
                const subjectIds = indexes.subjects[subject] || [];
                matchingIds = matchingIds
                    ? this.intersectArrays(matchingIds, subjectIds)
                    : subjectIds;
            }
            
            if (!matchingIds || matchingIds.length === 0) {
                return [];
            }
            
            // 获取所有数据
            const allData = await this.getAllTutoringInfo();
            
            // 返回匹配的数据
            return allData.filter(info => matchingIds.includes(info.id));
        } catch (error) {
            logger.error('Error querying tutoring info:', error);
            throw error;
        }
    }

    // 辅助方法：计算数组交集
    intersectArrays(arr1, arr2) {
        return arr1.filter(id => arr2.includes(id));
    }

    // 删除家教信息
    async deleteTutoringInfo(id) {
        try {
            // 获取所有数据
            const allData = await this.getAllTutoringInfo();
            const info = allData.find(item => item.id === id);
            
            if (!info) {
                throw new Error('Info not found');
            }
            
            // 删除数据
            const newData = allData.filter(item => item.id !== id);
            await this.client.set('tutoring_info', newData);
            
            // 更新索引
            await this.removeFromIndexes(info);
            
            logger.info(`Deleted tutoring info with ID: ${id}`);
            return true;
        } catch (error) {
            logger.error(`Error deleting tutoring info ${id}:`, error);
            throw error;
        }
    }

    // 从索引中删除记录
    async removeFromIndexes(info) {
        try {
            const { id, city, district, grade, subject } = info;
            const indexes = await this.client.get('indexes') || {
                cities: {},
                districts: {},
                grades: {},
                subjects: {}
            };
            
            // 从各个索引中删除ID
            if (indexes.cities[city]) {
                indexes.cities[city] = indexes.cities[city].filter(i => i !== id);
            }
            
            const districtKey = `${city}:${district}`;
            if (indexes.districts[districtKey]) {
                indexes.districts[districtKey] = indexes.districts[districtKey].filter(i => i !== id);
            }
            
            if (indexes.grades[grade]) {
                indexes.grades[grade] = indexes.grades[grade].filter(i => i !== id);
            }
            
            if (indexes.subjects[subject]) {
                indexes.subjects[subject] = indexes.subjects[subject].filter(i => i !== id);
            }
            
            await this.client.set('indexes', indexes);
        } catch (error) {
            logger.error('Error removing from indexes:', error);
            throw error;
        }
    }

    // 更新家教信息
    async updateTutoringInfo(id, newInfo) {
        try {
            const allData = await this.getAllTutoringInfo();
            const oldInfo = allData.find(item => item.id === id);
            
            if (!oldInfo) {
                throw new Error('Info not found');
            }
            
            // 删除旧索引
            await this.removeFromIndexes(oldInfo);
            
            // 更新信息
            newInfo.id = id;
            newInfo.updatedAt = new Date().toISOString();
            const newData = allData.map(item => 
                item.id === id ? newInfo : item
            );
            
            await this.client.set('tutoring_info', newData);
            
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
            
            // 获取现有备份
            const backups = await this.client.get('backups') || [];
            
            // 添加新备份
            backups.push(backup);
            
            // 只保留最近7天的备份
            const recentBackups = backups.slice(-7);
            
            await this.client.set('backups', recentBackups);
            
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
            const backups = await this.client.get('backups') || [];
            const backup = backups.find(b => b.timestamp === timestamp);
            
            if (!backup) {
                throw new Error('Backup not found');
            }
            
            // 清除现有数据和索引
            await this.client.set('tutoring_info', []);
            await this.client.set('indexes', {
                cities: {},
                districts: {},
                grades: {},
                subjects: {}
            });
            
            // 恢复数据
            for (const info of backup.data) {
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

module.exports = new EdgeStore();
