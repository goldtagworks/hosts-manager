import Vue from 'vue';
import os from 'os';
import fs from 'fs';
import axios from 'axios';
import iconv from 'iconv-lite';
import { remote } from 'electron';
import fileWatcher from 'chokidar';
import { ElLoadingComponent } from 'element-ui/types/loading';

type CallFuncTypeVV = (lockScreen: ElLoadingComponent) => void;

export default class AppBase extends Vue {
    public prefixServerURL: string =
        'http://devenv.melon.com/hostsmanager_config2/';
    //'http://127.0.0.1/hosts/';
    public listFilename: string = 'serverinfo.txt';
    public commonFilename: string = '%EA%B3%B5%ED%86%B5.txt';
    public lCommonFilename: string = 'local_common.txt';

    public successNotify(msg: string): void {
        this.$notify({
            type: 'success',
            title: '확인',
            message: msg,
            position: 'top-left'
        });
    }

    public errorNotify(msg: string): void {
        this.$notify.error({
            title: '확인',
            message: msg,
            position: 'top-left'
        });
    }

    public waiting(lockText: string, func: CallFuncTypeVV): void {
        let lockScreen = this.$loading({
            lock: true,
            text: lockText,
            spinner: 'el-icon-loading',
            background: 'rgba(245, 245, 245, 0.6)'
        });

        func(lockScreen);
    }

    public waitLoading(func: CallFuncTypeVV): void {
        this.waiting('데이터를 불러오는 중입니다.', func);
    }

    public waitSaving(func: CallFuncTypeVV): void {
        this.waiting('데이터를 저장하는 중입니다.', func);
    }

    public getHomePath(): string {
        return os.homedir() + '/hosts/';
    }

    public getHostsPath(): string {
        switch (process.platform) {
            case 'darwin': {
                return '/etc/hosts';
            }
            case 'win32': {
                return (
                    remote.process.env.SystemRoot +
                    '/system32/drivers/etc/hosts'
                );
            }
        }

        return '';
    }

    // /etc/hosts 파일 감시
    public watcherHosts(): void {
        let watcher = fileWatcher.watch(this.getHostsPath());

        watcher.on(
            'change',
            (path: string): void => {
                this.readSystemHosts();
            }
        );
    }

    // /etc/hosts 읽은후 - 상속클래스에서 직접구현
    public onReadSystemHostsComplete(
        err: NodeJS.ErrnoException | null,
        data: string
    ): void {}

    public readSystemHosts(): void {
        this.checkLocalCommonHostsFile();

        fs.readFile(
            this.getHostsPath(),
            (err: NodeJS.ErrnoException | null, data: Buffer): void => {
                let result = '';

                if (err == null) {
                    result = iconv.decode(data, 'euc-kr');
                } else {
                    this.terminalCommand();
                }

                this.onReadSystemHostsComplete(err, result);
            }
        );
    }

    private saveHosts(data: string): void {
        let saveData = iconv.encode(data, 'euc-kr');

        fs.writeFile(this.getHostsPath(), saveData, err => {
            if (err != null) {
                this.terminalCommand();
            }
        });
    }

    public saveSystemHosts(data: string): void {
        this.waitSaving((lockScreen: ElLoadingComponent) => {
            this.saveHosts(data);
            lockScreen.close();
        });
    }

    // /etc/hosts 읽은후 - 상속클래스에서 직접구현
    public onReadCommonHostsComplete(
        err: NodeJS.ErrnoException | null,
        data: string
    ): void {}

    public readCommonHosts(): void {
        this.checkLocalCommonHostsFile();

        fs.readFile(
            this.getHomePath() + this.lCommonFilename,
            (err: NodeJS.ErrnoException | null, data: Buffer): void => {
                let result = '';

                if (err == null) {
                    result = iconv.decode(data, 'euc-kr');
                } else {
                    this.terminalCommand();
                }

                this.onReadCommonHostsComplete(err, result);
            }
        );
    }

    public saveCommonHosts(data: string): void {
        this.waitSaving((lockScreen: ElLoadingComponent) => {
            let saveData = iconv.encode(data, 'euc-kr');

            fs.writeFile(
                this.getHomePath() + this.lCommonFilename,
                saveData,
                err => {
                    if (err != null) {
                        this.errorNotify(
                            this.getHomePath() + ' 폴더에 쓰기권한이 없습니다.'
                        );
                    }
                }
            );
            lockScreen.close();
        });
    }

    // 서버파일
    public async getServerFile(filename: string): Promise<string> {
        axios.defaults.headers.common['Cache-Control'] = 'no-cache';
        let response = await axios.request({
            method: 'GET',
            url: this.prefixServerURL + filename,
            responseType: 'arraybuffer'
        });
        let contents = Buffer.from(response.data);

        return iconv.decode(contents, 'euc-kr');
    }

    public onReadServerHostsListComplete(list: string[]): void {}

    public readServerHostsList(): void {
        this.getServerFile(this.listFilename)
            .then((response: string) => {
                let items = response.split('\n');
                let list = new Array();
                for (let i = 0; i < items.length; i++) {
                    if (items[i] != '') {
                        list.push(items[i]);
                    }
                }

                this.onReadServerHostsListComplete(list);
            })
            .catch((err: any) => {
                this.errorNotify('hosts 관리 서버에 접속할수 없습니다.');
            });
    }

    public saveServerHosts(filename: string): void {
        this.waitSaving((lockScreen: ElLoadingComponent) => {
            let result: string = '';

            this.checkLocalCommonHostsFile();
            this.getServerFile(filename + '.txt')
                .then((response: string) => {
                    result += response;
                    result += '\r\n\r\n';

                    this.getServerFile(this.commonFilename)
                        .then((response: string) => {
                            result += response;
                            result += '\r\n\r\n';

                            let data = fs.readFileSync(
                                this.getHomePath() + this.lCommonFilename
                            );
                            result += iconv.decode(data, 'euc-kr');

                            this.saveHosts(result);
                            lockScreen.close();
                        })
                        .catch((err: any) => {
                            this.errorNotify(err);
                            lockScreen.close();
                        });
                })
                .catch((err: any) => {
                    this.errorNotify(err);
                    lockScreen.close();
                });
        });
    }

    // 로컬파일
    public onReadLocalHostsListComplete(list: string[]): void {}

    public readLocalHostsList(): void {
        fs.exists(this.getHomePath(), exists => {
            if (exists) {
                this.onReadLocalHostsListComplete(
                    fs.readdirSync(this.getHomePath())
                );
            } else {
                this.errorNotify('hosts 디렉토리가 없거나 접근할수 없습니다.');
            }
        });
    }

    public saveLocalHosts(filename: string): void {
        this.waitSaving((lockScreen: ElLoadingComponent) => {
            let result: string = '';

            try {
                let rootPath = 'hosts/';

                let data = fs.readFileSync(this.getHomePath() + filename);
                result += iconv.decode(data, 'euc-kr');
                result += '\r\n\r\n';
                data = fs.readFileSync(
                    this.getHomePath() + this.lCommonFilename
                );
                result += iconv.decode(data, 'euc-kr');
            } catch (error) {
                this.errorNotify('hosts 디렉토리가 없거나 접근할수 없습니다.');
            }

            this.saveHosts(result);
            lockScreen.close();
        });
    }

    public terminalCommand(): void {
        let msg =
            '아래 작업을 수행하시기 바립니다. (한번 하면 되며, 꼭 필요한 작업입니다.)<br />';

        switch (process.platform) {
            case 'darwin': {
                msg += '&nbsp;&nbsp;&nbsp;&nbsp;1. 터미널을 실행<br />';
                msg +=
                    '&nbsp;&nbsp;&nbsp;&nbsp;2. 아래 한 줄을 복사/붙어넣어 실행하시면 됩니다.<br /><br />';
                msg +=
                    'sudo /bin/chmod +a "`/usr/bin/whoami` allow read,write" /etc/hosts';
                break;
            }
            case 'win32': {
                msg += '&nbsp;&nbsp;&nbsp;&nbsp;1. 터미널을 실행<br />';
                msg +=
                    '&nbsp;&nbsp;&nbsp;&nbsp;2. 아래 두 줄을 한줄씩 복사/붙어넣어 실행하시면 됩니다.<br /><br />';
                msg +=
                    'attrib -R %WINDIR%\\System32\\drivers\\etc\\hosts<br />';
                msg +=
                    'Icacls %WINDIR%\\System32\\drivers\\etc\\hosts /grant "%username%":F';

                break;
            }
        }
        this.$alert(msg, 'hosts 에 수정권한이 없습니다', {
            dangerouslyUseHTMLString: true
        })
            .then(() => {})
            .catch(() => {});
    }

    public checkLocalCommonHostsFile(): void {
        fs.exists(this.getHomePath(), exists => {
            if (exists == false) {
                fs.mkdirSync(this.getHomePath());
            }

            fs.exists(this.getHomePath() + this.lCommonFilename, exists => {
                if (exists == false) {
                    fs.writeFileSync(
                        this.getHomePath() + this.lCommonFilename,
                        ''
                    );
                }
            });
        });
    }
}
