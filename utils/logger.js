const winston = require('winston');
const path = require('path');

// 创建 logger 实例
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json()
    ),
    defaultMeta: { service: 'tutoring-service' },
    transports: [
        // 写入所有日志到 combined.log
        new winston.transports.File({ 
            filename: path.join(__dirname, '../logs/combined.log'),
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            )
        }),
        // 写入错误日志到 error.log
        new winston.transports.File({ 
            filename: path.join(__dirname, '../logs/error.log'), 
            level: 'error',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            )
        }),
        // 开发环境下同时输出到控制台
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple(),
                winston.format.printf(({ level, message, timestamp, ...metadata }) => {
                    let msg = `${timestamp} [${level}]: ${message}`;
                    
                    // 如果有其他元数据，添加到输出中
                    if (Object.keys(metadata).length > 0) {
                        msg += JSON.stringify(metadata);
                    }
                    
                    return msg;
                })
            )
        })
    ]
});

// 确保日志目录存在
const fs = require('fs');
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

module.exports = logger;
