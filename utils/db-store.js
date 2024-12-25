const { Sequelize, DataTypes, Op } = require('sequelize');
const path = require('path');
const logger = require('./logger');

// 创建数据库连接
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, '../data/tutoring.db'),
    logging: msg => logger.debug(msg)
});

// 定义家教信息模型
const TutoringInfo = sequelize.define('TutoringInfo', {
    id: {
        type: DataTypes.STRING,
        primaryKey: true
    },
    city: {
        type: DataTypes.STRING,
        allowNull: false
    },
    district: {
        type: DataTypes.STRING,
        allowNull: false
    },
    grade: {
        type: DataTypes.STRING,
        allowNull: false
    },
    subject: {
        type: DataTypes.STRING,
        allowNull: false
    },
    createdAt: {
        type: DataTypes.DATE,
        allowNull: false
    },
    updatedAt: {
        type: DataTypes.DATE
    }
});

// 定义备份模型
const Backup = sequelize.define('Backup', {
    timestamp: {
        type: DataTypes.STRING,
        primaryKey: true
    },
    data: {
        type: DataTypes.TEXT,
        allowNull: false
    }
});

class DbStore {
    constructor() {
        this.initialized = false;
        this.init();
    }

    async init() {
        try {
            await sequelize.sync();
            this.initialized = true;
            logger.info('Database initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize database:', error);
            throw error;
        }
    }

    // 保存家教信息
    async saveTutoringInfo(info) {
        try {
            const id = Date.now().toString();
            info.id = id;
            info.createdAt = new Date();
            
            await TutoringInfo.create(info);
            
            logger.info(`Saved tutoring info with ID: ${id}`);
            return id;
        } catch (error) {
            logger.error('Error saving tutoring info:', error);
            throw error;
        }
    }

    // 获取所有家教信息
    async getAllTutoringInfo() {
        try {
            const data = await TutoringInfo.findAll({
                order: [['createdAt', 'DESC']]
            });
            return data.map(item => item.toJSON());
        } catch (error) {
            logger.error('Error getting all tutoring info:', error);
            throw error;
        }
    }

    // 按条件查询家教信息
    async queryTutoringInfo({ city, district, grade, subject }) {
        try {
            const where = {};
            
            if (city) where.city = city;
            if (district) where.district = district;
            if (grade) where.grade = grade;
            if (subject) where.subject = subject;
            
            const data = await TutoringInfo.findAll({
                where,
                order: [['createdAt', 'DESC']]
            });
            
            return data.map(item => item.toJSON());
        } catch (error) {
            logger.error('Error querying tutoring info:', error);
            throw error;
        }
    }

    // 删除家教信息
    async deleteTutoringInfo(id) {
        try {
            const result = await TutoringInfo.destroy({
                where: { id }
            });
            
            if (result === 0) {
                throw new Error('Info not found');
            }
            
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
            const info = await TutoringInfo.findByPk(id);
            
            if (!info) {
                throw new Error('Info not found');
            }
            
            newInfo.updatedAt = new Date();
            await info.update(newInfo);
            
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
                data: JSON.stringify(allData)
            };
            
            await Backup.create(backup);
            
            // 只保留最近7天的备份
            const oldBackups = await Backup.findAll({
                order: [['timestamp', 'DESC']],
                offset: 7
            });
            
            for (const oldBackup of oldBackups) {
                await oldBackup.destroy();
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
            const backup = await Backup.findByPk(timestamp);
            
            if (!backup) {
                throw new Error('Backup not found');
            }
            
            const data = JSON.parse(backup.data);
            
            // 清除现有数据
            await TutoringInfo.destroy({ where: {} });
            
            // 恢复数据
            for (const info of data) {
                await TutoringInfo.create(info);
            }
            
            logger.info(`Restored backup from ${timestamp}`);
            return true;
        } catch (error) {
            logger.error(`Error restoring backup from ${timestamp}:`, error);
            throw error;
        }
    }
}

module.exports = new DbStore();
