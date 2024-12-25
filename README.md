# 家教信息管理系统

这是一个用于管理家教信息的 Web 应用程序。

## 功能特点

- 家教信息录入和管理
- 城市和区域数据管理
- 数据导出功能
- 自动备份功能
- 日志记录功能

## 系统要求

- Node.js 16.x 或更高版本
- npm 8.x 或更高版本

## 安装步骤

1. 安装 Node.js
   - 访问 [Node.js 官网](https://nodejs.org/)
   - 下载并安装最新的 LTS 版本

2. 安装项目依赖
   ```bash
   npm install
   ```

3. 启动服务器
   ```bash
   npm start
   ```

4. 访问应用
   - 打开浏览器
   - 访问 http://localhost:3000

## 项目结构

```
家教单录入/
├── data/              # 数据文件
│   └── cities.json    # 城市数据
├── backups/           # 数据备份
├── logs/              # 日志文件
├── utils/             # 工具函数
│   └── logger.js      # 日志工具
├── index.html         # 主页面
├── script.js          # 主要脚本
├── styles.css         # 样式表
├── server.js          # 服务器
└── package.json       # 项目配置
```

## 开发指南

1. 开发模式启动
   ```bash
   npm run dev
   ```

2. 手动创建备份
   ```bash
   npm run backup
   ```

## 数据备份

- 系统每天凌晨 3 点自动创建备份
- 备份文件保存在 `backups` 目录
- 自动清理 7 天前的备份

## 日志

- 错误日志：`logs/error.log`
- 完整日志：`logs/combined.log`

## 注意事项

1. 确保 `data` 目录有写入权限
2. 定期检查备份文件
3. 监控错误日志

## 技术栈

- 前端：HTML5, CSS3, JavaScript (ES6+)
- 后端：Node.js, Express
- 工具：node-cron (定时任务), winston (日志)
