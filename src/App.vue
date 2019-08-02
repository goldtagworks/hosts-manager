<template>
    <el-container id="App" direction="vertical">
        <el-container direction="horizontal">
            <el-aside width="260px">
                <div class="hosts-header">
                    <span>서버 호스트 목록</span
                    ><span style="width:60px; float:right;"
                        ><el-button size="mini" @click="onClickedRefresh"
                            >Refresh</el-button
                        ></span
                    >
                </div>
                <el-table
                    :show-header="false"
                    :data="listServerHosts"
                    style="width: 100%"
                    @row-click="onClickedServerHosts"
                    size="mini"
                >
                    <el-table-column width="34px">
                        <template slot-scope="scope">
                            <el-checkbox
                                v-if="scope.row['checked'] == true"
                                size="mini"
                                :checked="true"
                            ></el-checkbox>
                        </template>
                    </el-table-column>
                    <el-table-column
                        v-for="item in headerData"
                        :key="item.prop"
                        :prop="item.prop"
                        :label="item.label"
                        :header-align="item.headerAlign"
                        :align="item.align"
                    >
                        <template slot-scope="scope">
                            <span
                                width="194px"
                                class="hosts-column"
                                v-text="scope.row[item.prop]"
                            ></span>
                        </template>
                    </el-table-column>
                </el-table>
                <div class="hosts-header">
                    <span>로컬 호스트 목록</span
                    ><span style="width:60px; float:right;"
                        ><!-- el-button size="mini" @click="onClickedCommonHosts"
                            >Apply</el-button
                        -->&nbsp;</span
                    >
                </div>
                <el-table
                    :show-header="false"
                    :data="listCommonHosts"
                    style="width: 100%"
                    @row-click="onClickedCommonHosts"
                    size="mini"
                >
                    <el-table-column width="34px">
                        <template slot-scope="scope">
                            <el-checkbox
                                v-if="scope.row['checked'] == true"
                                size="mini"
                                :checked="true"
                            ></el-checkbox>
                        </template>
                    </el-table-column>
                    <el-table-column
                        v-for="item in headerData"
                        :key="item.prop"
                        :prop="item.prop"
                        :label="item.label"
                        :header-align="item.headerAlign"
                        :align="item.align"
                    >
                        <template slot-scope="scope">
                            <span
                                width="134px"
                                class="hosts-column"
                                v-text="scope.row[item.prop]"
                            ></span>
                        </template>
                    </el-table-column>
                    <el-table-column width="60px">
                        <template slot-scope="scope">
                            <el-button
                                size="mini"
                                @click="onClickedHostsEdit(scope.row['label'])"
                                >Edit</el-button
                            >
                        </template>
                    </el-table-column>
                </el-table>
            </el-aside>
            <el-container direction="vertical">
                <el-main
                    ><editor
                        v-model="txtSystemHosts"
                        @init="onMainEditorInit"
                        lang="ini"
                        theme="dracula"
                        width="100%"
                        height="100%"
                        :options="options"
                    ></editor
                ></el-main>
            </el-container>
        </el-container>
        <el-dialog
            :title="txtDialogTitle"
            width="900px"
            :visible.sync="isVisibleDialog"
            :close-on-click-modal="false"
        >
            <div style="height:350px;">
                <editor
                    v-model="txtCommonHosts"
                    @init="onSubEditorInit"
                    lang="ini"
                    theme="dracula"
                    width="100%"
                    height="100%"
                    :options="options"
                ></editor>
            </div>
            <span slot="footer" class="dialog-footer">
                <el-button
                    size="small"
                    @click="isVisibleDialog = false"
                    icon="el-icon-close"
                    >닫기</el-button
                >
                <el-button
                    size="small"
                    type="primary"
                    @click="onClickedCommonHostsSave"
                    icon="el-icon-upload"
                    >저장</el-button
                >
            </span>
        </el-dialog>
    </el-container>
</template>

<script lang="ts">
import { remote, ipcRenderer } from 'electron';
import { Vue, Component } from 'vue-property-decorator';
import AppBase from '@/app-base';

import mousetrap from 'mousetrap';
import editor from 'vue2-ace-editor';
import 'brace/mode/ini';
import 'brace/theme/dracula';

import { ElMenu } from 'element-ui/types/menu';

@Component({
    components: {
        editor
    }
})
export default class App extends AppBase {
    public txtDialogTitle: string = '';
    public txtSystemHosts: string = '';
    public txtServerFilename: string = '';
    public listServerHosts: any[] = [];

    public txtCommonHosts: string = '';
    public txtCommonFilename: string = '';
    public listCommonHosts: any[] = [];

    public mainEditor: any = null;
    public subEditor: any = null;
    public isVisibleDialog: boolean = false;
    public rowClickEvent: boolean = true;
    public isSaved: boolean = false;

    public headerData: any = [
        {
            prop: 'label',
            label: 'Server Hosts',
            headerAlign: 'center',
            align: 'left'
        }
    ];

    // public options: any = { fontFamily: 'tahoma', fontSize: '10pt' };
    public options: any = { fontSize: '10pt' };

    public onMainEditorInit(editor: any): void {
        this.mainEditor = editor;

        editor.commands.addCommand({
            name: 'save',
            bindKey: { win: 'Ctrl-S', mac: 'Cmd-S' },
            exec: (editor: any) => {
                this.onClickedSystemHostsSave();
            }
        });

        editor.setShowPrintMargin(false);
        editor.focus();
    }

    public onSubEditorInit(editor: any): void {
        this.subEditor = editor;

        editor.commands.addCommand({
            name: 'save',
            bindKey: { win: 'Ctrl-S', mac: 'Cmd-S' },
            exec: (editor: any) => {
                this.onClickedCommonHostsSave();
            }
        });

        editor.setShowPrintMargin(false);
        editor.focus();
    }

    public created(): void {
        mousetrap.bind(['command+s', 'ctrl+s'], () => {
            this.onClickedSystemHostsSave();
            return false;
        });

        this.initIPC();
    }

    public initIPC() {
        ipcRenderer.send('readLocalFile', 'hosts');
        ipcRenderer.send('readServerHostsList');
        ipcRenderer.send('readCommonHostsList');

        ipcRenderer.on(
            'successNotify',
            (event: Electron.Event, msg: string) => {
                this.errorNotify(msg);
            }
        );

        ipcRenderer.on('errorNotify', (event: Electron.Event, msg: string) => {
            this.errorNotify(msg);
        });

        ipcRenderer.on('showTerminalCommand', (event: Electron.Event) => {
            this.showTerminalCommand();
        });

        ipcRenderer.on(
            'onReadLocalFileComplete',
            (event: Electron.Event, filename: string, data: string) => {
                if (this.isSaved == true) {
                    this.isSaved = false;

                    // 체크된 로컬파일이 수정된 경우 hosts 에 반영
                    this.changeSaveCommonHosts(this.txtCommonFilename);

                    return;
                }
                if (filename == 'hosts') {
                    this.txtSystemHosts = data;
                    if (this.mainEditor != null) {
                        this.mainEditor.gotoLine(0, 0, true);
                    }
                } else {
                    // 체크된 로컬파일이 수정된 경우 hosts 에 반영
                    this.changeSaveCommonHosts(filename);

                    this.txtCommonHosts = data;
                    if (this.subEditor != null) {
                        this.subEditor.gotoLine(0, 0, true);
                    }
                }
            }
        );

        ipcRenderer.on(
            'onReadServerHostsListComplete',
            (event: Electron.Event, list: any) => {
                for (let item of list) {
                    if (item.checked == true) {
                        this.txtServerFilename = item.label;
                    }
                }
                this.listServerHosts = list;
            }
        );

        ipcRenderer.on(
            'onReadCommonHostsListComplete',
            (event: Electron.Event, list: any) => {
                this.listCommonHosts = list;
            }
        );

        ipcRenderer.on(
            'onClickedServerMenuItem',
            (event: Electron.Event, filename: string) => {
                for (let item of this.listServerHosts) {
                    if (item.label == filename) {
                        this.onClickedServerHosts(item, item, null);
                        break;
                    }
                }
            }
        );

        ipcRenderer.on(
            'onClickedCommonMenuItem',
            (event: Electron.Event, filename: string) => {
                for (let item of this.listCommonHosts) {
                    if (item.label == filename) {
                        this.onClickedCommonHosts(item, item, null);
                        break;
                    }
                }
            }
        );
    }

    public changeSaveCommonHosts(filename: string): void {
        for (let item of this.listCommonHosts) {
            if (item.label == filename && item.checked == true) {
                ipcRenderer.send(
                    'saveHostsList',
                    this.txtServerFilename,
                    this.listCommonHosts
                );
            }
        }
    }

    public onClickedRefresh(): void {
        ipcRenderer.send('readServerHostsList');
    }

    public onClickedServerHosts(row: any, column: any, event: any): void {
        let isSaveChecked = row.checked;
        for (let item of this.listServerHosts) {
            item.checked = false;
        }

        row.checked = !isSaveChecked;
        if (row.checked == true) {
            this.txtServerFilename = row.label;
        } else {
            this.txtServerFilename = '';
        }

        ipcRenderer.send(
            'saveHostsList',
            this.txtServerFilename,
            this.listCommonHosts
        );
    }

    public onClickedCommonHosts(row: any, column: any, event: any): void {
        if (this.rowClickEvent == false) {
            this.rowClickEvent = true;
            return;
        }

        if (row != null && row != undefined) {
            row.checked = !row.checked;
        }

        ipcRenderer.send(
            'saveHostsList',
            this.txtServerFilename,
            this.listCommonHosts
        );
    }

    public onClickedSystemHostsSave(): void {
        this.isSaved = true;
        ipcRenderer.send('saveLocalFile', 'hosts', this.txtSystemHosts);
    }

    public onClickedHostsEdit(filename: string): void {
        this.rowClickEvent = false;

        this.txtCommonFilename = filename;
        ipcRenderer.send('readLocalFile', this.txtCommonFilename);

        this.txtDialogTitle = this.txtCommonFilename + ' 파일 수정';
        this.isVisibleDialog = true;
    }

    public onClickedCommonHostsSave(): void {
        this.isSaved = true;
        ipcRenderer.send(
            'saveLocalFile',
            this.txtCommonFilename,
            this.txtCommonHosts
        );
        this.isVisibleDialog = false;
    }
}
</script>

<style>
body {
    margin: 0;
}

.el-main {
    padding: 0 !important;
    height: calc(100vh - 50px);
}

.el-aside {
    height: 100vh;
    overflow-y: scroll;
}

.el-submenu__title {
    height: 36px !important;
    line-height: 36px !important;
}

.el-submenu .el-menu-item {
    height: 30px !important;
    line-height: 30px !important;
}

.el-loading-spinner .el-loading-text {
    color: #000000 !important;
    font-weight: bolder;
}
.el-dialog__body {
    padding: 0px 5px !important;
}

.el-table {
    font-size: 10px !important;
}
.el-table .cell {
    line-height: 22px !important;
}
.el-table th,
.el-table td {
    padding: 2px 0 !important;
}

.el-button--mini {
    padding: 3px 11px !important;
    font-size: 8px !important;
}

.el-button--mini {
    padding: 3px 11px !important;
    font-size: 8px !important;
}

.el-button--small {
    padding: 7px 15px !important;
    font-size: 10px !important;
}

.hosts-header {
    padding: 10px 0;
    font-size: 12px;
    text-align: center;
    background-color: #e5e5e5;
    border-bottom: 1px solid #f5f5f5;
}

.hosts-column {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
</style>
