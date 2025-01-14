// 简单的日志记录器
const logger = {
    info: (...args) => {
        console.log(new Date().toISOString(), '[INFO]', ...args);
    },
    warn: (...args) => {
        console.warn(new Date().toISOString(), '[WARN]', ...args);
    },
    error: (...args) => {
        console.error(new Date().toISOString(), '[ERROR]', ...args);
    }
};

export default logger;
