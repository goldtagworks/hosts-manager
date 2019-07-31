import { ipcMain } from 'electron';
import fs from 'fs';
import os from 'os';
import path from 'path';

import axios from 'axios';
import iconv from 'iconv-lite';
import fileWatcher from 'chokidar';
import { appMain, AppMain } from './app-main';

const prefixServerURL: string = 'http://devenv.melon.com/hostsmanager_config2/';
// const prefixServerURL: string = 'http://127.0.0.1/hosts/';
const filenameList: string = 'serverinfo.txt';
const filenameCommon: string = '%EA%B3%B5%ED%86%B5.txt';

function getFilename(fullpath: string): string {
    let shash = '\\';
    switch (process.platform) {
        case 'darwin': {
            shash = '/';
            break;
        }
        case 'win32': {
            shash = '\\';
            break;
        }
    }
    let iFirstShash = fullpath.lastIndexOf(shash) + 1;
    return fullpath.substring(iFirstShash, fullpath.length);
}

function getHomePath(): string {
    switch (process.platform) {
        case 'darwin': {
            return os.homedir() + '/hosts/';
        }
        case 'win32': {
            return os.homedir() + '\\hosts\\';
        }
    }
    return '';
}

function getHostsPath(): string {
    switch (process.platform) {
        case 'darwin': {
            return '/etc/';
        }
        case 'win32': {
            return process.env.SystemRoot + '\\system32\\drivers\\etc\\';
        }
    }

    return '';
}

function getHostsFullPath(): string {
    switch (process.platform) {
        case 'darwin': {
            return '/etc/hosts';
        }
        case 'win32': {
            return process.env.SystemRoot + '\\system32\\drivers\\etc\\hosts';
        }
    }

    return '';
}

// 로컬에 파일 읽기
function readHosts(event: Electron.Event | null, filename: string): void {
    let channel = 'onReadLocalFileComplete';

    let fullpath: string;
    if (filename == 'hosts') {
        fullpath = getHostsPath();
    } else {
        fullpath = getHomePath();
    }

    fullpath += filename;

    fs.readFile(
        fullpath,
        (err: NodeJS.ErrnoException | null, data: Buffer): void => {
            let result = '';

            if (err == null) {
                result = iconv.decode(data, 'euc-kr');

                if (event != null) {
                    event.sender.send(channel, filename, result);
                } else {
                    AppMain.ipcMainSend(channel, filename, result);
                }
            } else {
                AppMain.ipcMainSend('showTerminalCommand');
            }
        }
    );
}

// 로컬에 파일 저장
function saveHosts(
    event: Electron.Event | null,
    filename: string,
    data: string
): void {
    let channel = 'onSaveLocalFileComplete';

    let fullpath: string;
    if (filename == 'hosts') {
        fullpath = getHostsPath();
    } else {
        fullpath = getHomePath();
    }

    fullpath += filename;

    let saveData = iconv.encode(data, 'euc-kr');

    fs.writeFile(filename, saveData, err => {
        if (err == null) {
            if (event != null) {
                event.sender.send(channel);
            } else {
                AppMain.ipcMainSend(channel);
            }
        } else {
            AppMain.ipcMainSend('showTerminalCommand');
        }
    });
}

function readCommonHostsList(event: Electron.Event | null): void {
    fs.exists(getHomePath(), exists => {
        if (exists) {
            let items = fs.readdirSync(getHomePath());

            // 목록구성
            let list = new Array();

            for (let i = 0; i < items.length; i++) {
                let ext = items[i].split('.');

                if (ext.length > 1) {
                    if (ext[ext.length - 1] == 'txt') {
                        list.push({ filename: items[i] });
                    }
                }
            }

            if (event != null) {
                event.sender.send('onReadCommonHostsListComplete', list);
            } else {
                AppMain.ipcMainSend('onReadCommonHostsListComplete', list);
            }
        } else {
            fs.mkdirSync(getHomePath());
        }
    });
}

// hosts 파일 변경 감지
ipcMain.on('watcherHosts', (event: Electron.Event) => {
    fs.exists(getHomePath(), exists => {
        if (!exists) {
            fs.mkdirSync(getHomePath());
        }
    });

    let watcher = fileWatcher.watch([getHostsFullPath(), getHomePath()]);
    watcher.on(
        'add',
        (fullpath: string): void => {
            if (fullpath != getHostsFullPath()) {
                readCommonHostsList(null);
            }
        }
    );
    watcher.on(
        'unlink',
        (fullpath: string): void => {
            if (fullpath != getHostsFullPath()) {
                readCommonHostsList(null);
            }
        }
    );
    watcher.on(
        'change',
        (fullpath: string): void => {
            if (fullpath == getHostsFullPath()) {
                readHosts(null, 'hosts');
            } else {
                readHosts(null, getFilename(fullpath));
            }
        }
    );
});

// hosts 파일 읽기
ipcMain.on('readLocalFile', (event: Electron.Event, filename: string) => {
    readHosts(event, filename);
});

// hosts 파일 저장
ipcMain.on(
    'saveLocalFile',
    (event: Electron.Event, filename: string, data: string) => {
        saveHosts(event, filename, data);
    }
);

// 서버파일
async function getServerFile(filename: string): Promise<string> {
    axios.defaults.headers.common['Cache-Control'] = 'no-cache';
    let response = await axios.request({
        method: 'GET',
        url: prefixServerURL + filename,
        responseType: 'arraybuffer'
    });
    let contents = Buffer.from(response.data);

    return iconv.decode(contents, 'euc-kr');
}

ipcMain.on('readServerHostsList', (event: Electron.Event) => {
    getServerFile(filenameList)
        .then((response: string) => {
            let items = response.split('\n');

            // 목록구성
            let list = new Array();
            // 리스트를 다시 읽으면 tray 메뉴를 다시 만든다.
            let trayMenu = new Array();

            for (let i = 0; i < items.length; i++) {
                if (items[i] != '') {
                    list.push({ filename: items[i] });
                    trayMenu.push({ label: items[i] });
                }
            }

            AppMain.createTrayMenu(trayMenu);
            event.sender.send('onReadServerHostsListComplete', list);
        })
        .catch((err: any) => {
            event.sender.send(
                'errorNotify',
                'hosts 관리 서버에 접속할수 없습니다.'
            );
        });
});

ipcMain.on('saveServerHosts', (event: Electron.Event, filename: string) => {
    let result: string = '';

    getServerFile(filename + '.txt')
        .then((response: string) => {
            result += response;
            result += '\r\n\r\n';

            getServerFile(filenameCommon)
                .then((response: string) => {
                    result += response;
                    result += '\r\n\r\n';

                    let data = fs.readFileSync(
                        getHomePath() + 'local_common.txt'
                    );
                    result += iconv.decode(data, 'euc-kr');

                    saveHosts(event, 'hosts', result);
                })
                .catch((err: any) => {
                    event.sender.send('errorNotify', err);
                });
        })
        .catch((err: any) => {
            event.sender.send('errorNotify', err);
        });
});

ipcMain.on('readCommonHostsList', (event: Electron.Event) => {
    readCommonHostsList(event);
});
