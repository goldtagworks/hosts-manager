'use strict';

import { app, protocol, BrowserWindow, Tray, nativeImage } from 'electron';
import {
    createProtocol,
    installVueDevtools
} from 'vue-cli-plugin-electron-builder/lib';

import IPCMainHostsManager from './ipc-hosts-manager';
import path from 'path';

// 메인 클래스
class AppMain {
    public isDevelopment = process.env.NODE_ENV !== 'production';

    // Keep a global reference of the window object, if you don't, the window will
    // be closed automatically when the JavaScript object is garbage collected.
    public win: BrowserWindow | null = null;
    public tray: Tray | null = null;
    public ipc: IPCMainHostsManager = new IPCMainHostsManager(this);

    // 생성자에서 기본적인 초기화
    public constructor() {
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

    // async 윈도우 생성
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

    // 실제 윈도우 생성함수
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

        this.ipc.watcherHosts();
    }

    // 트레이 생성함수
    public createTray(): void {
        if (this.tray != null) {
            return;
        }

        // 빌드용과 테스트용은 경로가 다르다.
        let iconPath = '/hosts.png';
        if (this.isDevelopment && !process.env.IS_TEST) {
            iconPath = '../public/hosts.png';
        }

        const trayIcon = nativeImage.createFromPath(
            path.join(__dirname, iconPath)
        );
        this.tray = new Tray(trayIcon.resize({ width: 16, height: 16 }));
        this.setTitle(this.ipc.trayTitle);
    }

    public setTitle(title: string): void {
        if (this.tray != null) {
            if (title == '') {
                title = 'Hosts Manager';
            }
            this.tray.setToolTip(title);
            this.tray.setTitle(title);
        }
    }
}

let appMain = new AppMain();

export { appMain, AppMain };
