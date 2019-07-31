import Vue from 'vue';
import { ElLoadingComponent } from 'element-ui/types/loading';

type CallFuncTypeVV = (lockScreen: ElLoadingComponent) => void;

export default class AppBase extends Vue {
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

    public showTerminalCommand(): void {
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
}
