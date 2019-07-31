'use strict';

import {
    app,
    protocol,
    BrowserWindow,
    Tray,
    Menu,
    nativeImage
} from 'electron';

import {
    createProtocol,
    installVueDevtools
} from 'vue-cli-plugin-electron-builder/lib';

import path from 'path';

class AppMain {
    isDevelopment = process.env.NODE_ENV !== 'production';
    public static _this: AppMain | null = null;

    // Keep a global reference of the window object, if you don't, the window will
    // be closed automatically when the JavaScript object is garbage collected.
    public win: BrowserWindow | null = null;
    public tray: Electron.Tray | null = null;

    public constructor() {
        AppMain._this = this;

        // Scheme must be registered before the app is ready
        protocol.registerSchemesAsPrivileged([
            // { scheme: 'app', privileges: { secure: true, standard: true } }
            { scheme: 'app' }
        ]);

        // Exit cleanly on request from parent process in development mode.
        if (this.isDevelopment) {
            if (process.platform === 'win32') {
                process.on('message', data => {
                    if (data === 'graceful-exit') {
                        this.AppQuit();
                    }
                });
            } else {
                process.on('SIGTERM', () => {
                    this.AppQuit();
                });
            }
        }
    }

    private AppQuit(): void {
        if (this.tray != null) {
            this.tray.destroy();
        }
        app.quit();
    }

    public async create(): Promise<void> {
        if (this.isDevelopment && !process.env.IS_TEST) {
            // Install Vue Devtools
            try {
                await installVueDevtools();
            } catch (e) {
                console.error('Vue Devtools failed to install:', e.toString());
            }
        }

        this.createWindow();
        this.createTray();
    }

    public destroy(): void {
        if (this.tray != null) {
            this.tray.destroy();
        }

        // On macOS it is common for applications and their menu bar
        // to stay active until the user quits explicitly with Cmd + Q
        if (process.platform !== 'darwin') {
            app.quit();
        }
    }

    public createWindow(): void {
        if (this.win != null) {
            return;
        }

        // Create the browser window.
        this.win = new BrowserWindow({
            width: 1200,
            height: 600,
            minWidth: 800,
            minHeight: 450,
            webPreferences: {
                nodeIntegration: true,
                webSecurity: false
            }
        });

        this.win.setMenu(null);

        if (process.env.WEBPACK_DEV_SERVER_URL) {
            // Load the url of the dev server if in development mode
            this.win.loadURL(process.env.WEBPACK_DEV_SERVER_URL as string);
            if (!process.env.IS_TEST) this.win.webContents.openDevTools();
        } else {
            createProtocol('app');
            // Load the index.html when not in development
            this.win.loadURL('app://./index.html');
        }

        this.win.on('closed', () => {
            this.win = null;
        });
    }

    public createTray(): void {
        if (this.tray != null) {
            return;
        }

        const trayIcon = nativeImage.createFromPath(
            path.join(__dirname, '/hosts.png')
        );
        this.tray = new Tray(trayIcon.resize({ width: 16, height: 16 }));
    }

    public static createTrayMenu(
        template: (Electron.MenuItemConstructorOptions | Electron.MenuItem)[]
    ): void {
        if (AppMain._this != null && AppMain._this.tray != null) {
            let trayMenu = Menu.buildFromTemplate(template);
            AppMain._this.tray.setContextMenu(trayMenu);
        }
    }

    public static ipcMainSend(channel: string, ...args: any[]): void {
        if (AppMain._this != null && AppMain._this.win != null) {
            AppMain._this.win.webContents.send(channel, ...args);
        }
    }
}

let appMain = new AppMain();

export { appMain, AppMain };
