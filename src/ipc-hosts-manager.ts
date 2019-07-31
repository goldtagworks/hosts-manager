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

function getHomePath(): string {
    return os.homedir() + '/hosts/';
}

function getHostsPath(): string {
    switch (process.platform) {
        case 'darwin': {
            return '/etc/hosts';
        }
        case 'win32': {
            return process.env.SystemRoot + '/system32/drivers/etc/hosts';
        }
    }

    return '';
}

// 로컬에 파일 읽기
function readHosts(
    event: Electron.Event | null,
    filename: string,
    channel: string
): void {
    fs.readFile(
        filename,
        (err: NodeJS.ErrnoException | null, data: Buffer): void => {
            let result = '';

            if (err == null) {
                result = iconv.decode(data, 'euc-kr');
            } else {
                AppMain.ipcMainSend('showTerminalCommand', '');
            }

            if (event != null) {
                event.sender.send(channel, result);
            } else {
                AppMain.ipcMainSend(channel, result);
            }
        }
    );
}

// 로컬에 파일 저장
function saveHosts(
    event: Electron.Event,
    filename: string,
    data: string,
    channel: string
): void {
    let saveData = iconv.encode(data, 'euc-kr');

    fs.writeFile(filename, saveData, err => {
        if (err != null) {
            AppMain.ipcMainSend('showTerminalCommand', '');
        }

        if (event != null) {
            event.sender.send(channel);
        } else {
            AppMain.ipcMainSend(channel);
        }
    });
}

// hosts 파일 변경 감지
ipcMain.on('watcherHosts', (event: Electron.Event) => {
    let watcher = fileWatcher.watch(getHostsPath());
    watcher.on(
        'change',
        (path: string): void => {
            readHosts(null, getHostsPath(), 'onReadSystemHostsComplete');
        }
    );
});

// hosts 파일 읽기
ipcMain.on('readSystemHosts', (event: Electron.Event) => {
    readHosts(event, getHostsPath(), 'onReadSystemHostsComplete');
});

// hosts 파일 저장
ipcMain.on('saveSystemHosts', (event: Electron.Event, data: string) => {
    saveHosts(event, getHostsPath(), data, 'onSaveSystemHostsComplete');
});

// 공통 hosts 파일 읽기
ipcMain.on('readCommonHosts', (event: Electron.Event, filename: string) => {
    readHosts(event, getHomePath() + filename, 'onReadCommonHostsComplete');
});

// 공통 hosts 파일 저장
ipcMain.on('saveCommonHosts', (event: Electron.Event, data: string) => {
    saveHosts(event, getHomePath(), data, 'onSaveCommonHostsComplete');
});

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

                    saveHosts(
                        event,
                        getHostsPath(),
                        result,
                        'onSaveServerHostsComplete'
                    );
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
    fs.exists(getHomePath(), exists => {
        if (exists) {
            event.sender.send(
                'onReadCommonHostsListComplete',
                fs.readdirSync(getHomePath())
            );
        } else {
            fs.mkdirSync(getHomePath());
        }
    });
});
