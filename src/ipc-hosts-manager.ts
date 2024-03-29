import { ipcMain, Menu, MenuItem } from 'electron';
import fs from 'fs';
import path from 'path';

import axios from 'axios';
import iconv from 'iconv-lite';
import fileWatcher from 'chokidar';
import Helper from './helper';
import { AppMain } from './app-main';
import { Checkbox } from 'element-ui';

export default class IPCMainHostsManager {
    public prefixServerURL: string =
        'http://hostmanager.melon.devel.kakao.com/hosts-manager-config2/';
    // public prefixServerURL: string = 'http://127.0.0.1/hosts/';
    public filenameList: string = 'serverinfo.txt';
    public filenameCommon: string = 'COMMON.txt';
    public filenameITCommon: string = 'IT_COMMON.txt';
    public appMain: AppMain;
    public trayMenu: Menu | null = null;
    public trayTitle: string = '';

    public trayServerList = Helper.readConfig('server.list.config.json');
    public trayCommonList = Helper.readConfig('common.list.config.json');

    public constructor(appMain: AppMain) {
        this.appMain = appMain;

        for (let item of this.trayServerList) {
            if (item.checked == true) {
                this.trayTitle = item.label;
            }
        }
        this.saveHostsList(this.trayTitle, this.trayCommonList, false);

        this.initIPC();
    }

    private initIPC(): void {
        // 파일 생성
        ipcMain.on('createFile', (event: Electron.Event, filename: string) => {
            let fullpath = path.join(Helper.getHomePath(), filename);
            if (!fs.existsSync(fullpath)) {
                fs.writeFileSync(fullpath, '', { encoding: 'utf8' });
            }
        });

        // 파일 이름 변경
        ipcMain.on(
            'renameFile',
            (event: Electron.Event, ofilename: string, nfilename: string) => {
                let ofullpath = path.join(Helper.getHomePath(), ofilename);
                let nfullpath = path.join(Helper.getHomePath(), nfilename);
                if (!fs.existsSync(nfullpath)) {
                    if (fs.existsSync(ofullpath)) {
                        fs.renameSync(ofullpath, nfullpath);
                    }
                }
            }
        );

        // 파일 삭제
        ipcMain.on('deleteFile', (event: Electron.Event, filename: string) => {
            let fullpath = path.join(Helper.getHomePath(), filename);
            if (fs.existsSync(fullpath)) {
                fs.unlinkSync(fullpath);
            }
        });

        // hosts 파일 읽기
        ipcMain.on(
            'readLocalFile',
            (event: Electron.Event, filename: string) => {
                this.readHosts(filename);
            }
        );

        // hosts 파일 저장
        ipcMain.on(
            'saveLocalFile',
            (event: Electron.Event, filename: string, data: string) => {
                this.saveHosts(filename, data, true);
            }
        );

        ipcMain.on('readServerHostsList', (event: Electron.Event) => {
            this.getServerFile(this.filenameList)
                .then((response: string) => {
                    response = response.replace(/\r/gi, '');
                    let items = response.split('\n');

                    // 목록구성
                    let list = new Array();

                    for (let filename of items) {
                        if (filename != '') {
                            list.push({
                                checked: this.getCheckedState(
                                    this.trayServerList,
                                    filename
                                ),
                                label: filename
                            });
                        }
                    }

                    this.createTrayMenuList(
                        this.trayServerList,
                        list,
                        'onClickedServerMenuItem'
                    );

                    this.createTrayMenu();
                    event.sender.send('onReadServerHostsListComplete', list);
                })
                .catch((err: any) => {
                    event.sender.send(
                        'errorNotify',
                        'hosts 관리 서버에 접속할수 없습니다.'
                    );
                });
        });

        ipcMain.on('readCommonHostsList', (event: Electron.Event) => {
            this.readCommonHostsList(event);
        });

        ipcMain.on(
            'saveHostsList',
            (event: Electron.Event, filename: string, list: any) => {
                this.menuSync(filename, list);

                this.saveHostsList(filename, list, true);

                Helper.saveConfig(
                    'server.list.config.json',
                    this.trayServerList
                );
                Helper.saveConfig(
                    'common.list.config.json',
                    this.trayCommonList
                );
            }
        );
    }

    public appendLocalFile(list: any): string {
        let result = '';

        for (let item of list) {
            if (item.checked == false) {
                continue;
            }

            let fullpath = path.join(Helper.getHomePath(), item.label);
            if (fs.existsSync(fullpath)) {
                let data = fs.readFileSync(fullpath);

                result += iconv.decode(data, 'euc-kr');
                result += Helper.appendLF();
            }
        }

        return result;
    }

    public watcherHosts(): void {
        if (!fs.existsSync(Helper.getHomePath())) {
            fs.mkdirSync(Helper.getHomePath());
        }

        let watcher = fileWatcher.watch([
            Helper.getHostsFullPath(),
            Helper.getHomePath()
        ]);
        watcher.on(
            'add',
            (fullpath: string): void => {
                if (fullpath != Helper.getHostsFullPath()) {
                    this.readCommonHostsList(null);
                }
            }
        );
        watcher.on(
            'unlink',
            (fullpath: string): void => {
                if (fullpath != Helper.getHostsFullPath()) {
                    this.readCommonHostsList(null);
                }
            }
        );
        watcher.on(
            'change',
            (fullpath: string): void => {
                if (fullpath == Helper.getHostsFullPath()) {
                    this.readHosts('hosts');
                } else {
                    this.readHosts(Helper.getFilename(fullpath));
                }
            }
        );
    }

    private initTrayMenuChecked(isChecked: boolean): void {
        if (this.trayMenu != null) {
            for (let item of this.trayMenu.items) {
                item.checked = isChecked;
            }
        }

        for (let item of this.trayServerList) {
            item.checked = isChecked;
        }
        for (let item of this.trayCommonList) {
            item.checked = isChecked;
        }
    }

    private trayMenuChecked(index: number, isChecked: boolean): void {
        if (this.trayMenu != null) {
            this.trayMenu.items[index].checked = isChecked;
        }
    }

    public createTrayMenuList(
        trayMenuList: any,
        list: any,
        channel: string
    ): void {
        trayMenuList.splice(0, trayMenuList.length);
        for (let item of list) {
            trayMenuList.push({
                type: 'checkbox',
                checked: item.checked,
                label: item.label,
                click: (item: any) => {
                    this.ipcMainSend(channel, item.label);
                }
            });
        }
    }

    public getCheckedState(trayMenuList: any, filename: string): boolean {
        for (let item of trayMenuList) {
            if (item.label == filename) {
                return item.checked;
            }
        }

        return false;
    }

    private menuSync(filename: string, list: any): void {
        this.initTrayMenuChecked(false);

        this.trayServerList.forEach(
            (item: any, index: number, array: any): void => {
                if (item.label == filename) {
                    item.checked = true;

                    this.trayMenuChecked(index, true);
                }
            }
        );

        let idxTray = this.trayServerList.length;

        // separator 추가된 경우
        if (this.trayServerList.length > 0) {
            idxTray++;
        }

        this.trayCommonList.forEach(
            (item: any, index: number, array: any): void => {
                for (let sync_item of list) {
                    if (item.label == sync_item.label) {
                        item.checked = sync_item.checked;

                        this.trayMenuChecked(
                            idxTray + index,
                            sync_item.checked
                        );
                    }
                }
            }
        );
    }

    private createTrayMenu(): void {
        if (this.appMain.tray != null) {
            let menu = new Menu();

            for (let item of this.trayServerList) {
                menu.append(new MenuItem(item));
            }

            if (
                this.trayServerList.length > 0 &&
                this.trayCommonList.length > 0
            ) {
                menu.append(new MenuItem({ type: 'separator' }));
            }

            for (let item of this.trayCommonList) {
                menu.append(new MenuItem(item));
            }

            if (menu.items.length > 0) {
                this.trayMenu = menu;
                this.appMain.tray.setContextMenu(this.trayMenu);
            }
        }
    }

    private ipcMainSend(channel: string, ...args: any[]): void {
        if (this.appMain.win != null) {
            this.appMain.win.webContents.send(channel, ...args);
        }
    }

    // 로컬에 파일 읽기
    private readHosts(filename: string): void {
        let channel = 'onReadLocalFileComplete';

        let fullpath: string;
        if (filename == 'hosts') {
            fullpath = Helper.getHostsPath();
        } else {
            fullpath = Helper.getHomePath();
        }

        fullpath += filename;

        fs.readFile(
            fullpath,
            (err: NodeJS.ErrnoException | null, data: Buffer): void => {
                let result = '';

                if (err == null) {
                    result = iconv.decode(data, 'euc-kr');

                    this.ipcMainSend(channel, filename, result);
                } else {
                    this.ipcMainSend('showTerminalCommand');
                }
            }
        );
    }

    // 로컬에 파일 저장
    private saveHosts(filename: string, data: string, sendFlag: boolean): void {
        let channel = 'onSaveLocalFileComplete';

        let fullpath: string;
        if (filename == 'hosts') {
            fullpath = Helper.getHostsPath();
        } else {
            fullpath = Helper.getHomePath();
        }

        fullpath += filename;

        let saveData = iconv.encode(data, 'euc-kr');
        fs.writeFile(fullpath, saveData, err => {
            if (sendFlag == true) {
                if (err == null) {
                    this.ipcMainSend(channel);
                } else {
                    this.ipcMainSend('showTerminalCommand');
                }
            }
        });
    }

    private async saveHostsList(
        filename: string,
        list: any,
        sendFlag: boolean
    ): Promise<void> {
        let result: string = '';

        if (filename != '') {
            this.trayTitle = filename;

            result += this.appendLocalFile(list);
            result += await this.getServerFile(`${filename}.txt`);
            result += await this.getServerFile(this.filenameCommon);
            result += await this.getServerFile(this.filenameITCommon);
            this.saveHosts('hosts', result, sendFlag);
        } else {
            this.trayTitle = '';

            for (let item of list) {
                if (item.checked == true) {
                    this.trayTitle = item.label;
                    break;
                }
            }

            result += this.appendLocalFile(list);
            result += await this.getServerFile(this.filenameCommon);
            result += await this.getServerFile(this.filenameITCommon);

            this.saveHosts('hosts', result, sendFlag);
        }

        this.appMain.setTitle(this.trayTitle);
    }

    private readCommonHostsList(event: Electron.Event | null): void {
        if (fs.existsSync(Helper.getHomePath())) {
            let items = fs.readdirSync(Helper.getHomePath());

            // 목록구성
            let list = new Array();

            for (let filename of items) {
                let ext = filename.split('.');

                if (ext.length > 1) {
                    if (ext[ext.length - 1] == 'txt') {
                        list.push({
                            checked: this.getCheckedState(
                                this.trayCommonList,
                                filename
                            ),
                            label: filename
                        });
                    }
                }
            }

            this.createTrayMenuList(
                this.trayCommonList,
                list,
                'onClickedCommonMenuItem'
            );

            this.createTrayMenu();

            if (event != null) {
                event.sender.send('onReadCommonHostsListComplete', list);
            } else {
                this.ipcMainSend('onReadCommonHostsListComplete', list);
            }
        } else {
            fs.mkdirSync(Helper.getHomePath());
        }
    }

    // 서버파일
    private async getServerFile(filename: string): Promise<string> {
        axios.defaults.headers.common['Cache-Control'] = 'no-cache';
        let response = await axios.request({
            method: 'GET',
            url: this.prefixServerURL + filename,
            responseType: 'arraybuffer'
        });

        let result: string = '';
        if (response.status == 200) {
            let contents = Buffer.from(response.data);
            result += iconv.decode(contents, 'euc-kr');
            result += Helper.appendLF();
        }
        return result;
    }
}
