const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
const DATA_FILE = path.join(app.getPath('userData'), 'tutoring_data.json');

// 确保数据文件存在
function ensureDataFile() {
    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), 'utf8');
    }
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile('index.html');
    // mainWindow.webContents.openDevTools(); // 开发时打开开发者工具
}

app.whenReady().then(() => {
    ensureDataFile();
    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// 读取数据
ipcMain.handle('read-data', async () => {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('读取数据失败:', error);
        return [];
    }
});

// 保存数据
ipcMain.handle('save-data', async (event, data) => {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
        return { success: true };
    } catch (error) {
        console.error('保存数据失败:', error);
        return { success: false, error: error.message };
    }
});

// 自动备份
function createBackup() {
    try {
        const backupDir = path.join(app.getPath('userData'), 'backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir);
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = path.join(backupDir, `backup_${timestamp}.json`);
        
        fs.copyFileSync(DATA_FILE, backupFile);

        // 只保留最近的10个备份
        const backups = fs.readdirSync(backupDir)
            .filter(file => file.startsWith('backup_'))
            .sort()
            .reverse();

        if (backups.length > 10) {
            backups.slice(10).forEach(file => {
                fs.unlinkSync(path.join(backupDir, file));
            });
        }
    } catch (error) {
        console.error('创建备份失败:', error);
    }
}

// 每天自动备份一次
setInterval(createBackup, 24 * 60 * 60 * 1000); 