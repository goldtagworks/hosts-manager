<template>
    <el-container id="App" direction="vertical">
        <el-container direction="horizontal">
            <el-aside width="260px">
                <div class="hosts-header">
                    <span>Server Hosts</span
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
                >
                    <el-table-column width="48px"> </el-table-column>
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
                    <span>Common Hosts</span
                    ><span style="width:60px; float:right;"
                        ><el-button size="mini">Apply</el-button></span
                    >
                </div>
                <el-table
                    :show-header="false"
                    :data="listCommonHosts"
                    style="width: 100%"
                    @selection-change="onSelectionChange"
                >
                    <el-table-column type="selection" width="48px">
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
                                @click="
                                    onClickedHostsEdit(scope.row['filename'])
                                "
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
    public txtCommonHosts: string = '';

    public listServerHosts: any[] = [];
    public listCommonHosts: any[] = [];
    public multipleSelection: any[] = [];
    public mainEditor: any = null;
    public subEditor: any = null;
    public isVisibleDialog: boolean = false;

    public headerData: any = [
        {
            prop: 'filename',
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
                this.onClickedSave();
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
            this.onClickedSave();
            return false;
        });

        ipcRenderer.send('watcherHosts');
        ipcRenderer.send('readSystemHosts');
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
            'onReadSystemHostsComplete',
            (event: Electron.Event, data: string) => {
                this.txtSystemHosts = data;
                if (this.mainEditor != null) {
                    this.mainEditor.gotoLine(0, 0, true);
                }
            }
        );

        ipcRenderer.on(
            'onReadServerHostsListComplete',
            (event: Electron.Event, list: string[]) => {
                this.listServerHosts = list;
            }
        );

        ipcRenderer.on(
            'onReadCommonHostsListComplete',
            (event: Electron.Event, list: string[]) => {
                this.listCommonHosts.splice(0, this.listCommonHosts.length);

                for (let i = 0; i < list.length; i++) {
                    this.listCommonHosts.push({ filename: list[i] });
                }
            }
        );
    }

    public onClickedServerHost(filename: string): void {}

    public onClickedRefresh(): void {
        ipcRenderer.send('readServerHostsList');
    }

    public onClickedSave(): void {}

    public onSelectionChange(val: any[]): void {
        this.multipleSelection = val;
        console.log(val);
    }

    public onClickedHostsEdit(filename: string): void {
        this.txtDialogTitle = filename + ' 파일 수정';
        this.isVisibleDialog = true;
    }

    public onClickedCommonHostsSave(): void {
        this.successNotify('저장한 결과가 hosts 에는 반영되지 않습니다.');
        this.isVisibleDialog = false;
    }

    public onReadCommonHostsComplete(
        err: NodeJS.ErrnoException | null,
        data: string
    ): void {
        if (err == null) {
            this.txtCommonHosts = data;
        }
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
    font-size: 11px !important;
}
.el-table th,
.el-table td {
    padding: 2px 0 !important;
}

.el-button--mini {
    padding: 3px 11px !important;
    font-size: 8px !important;
}

.hosts-header {
    padding: 10px 0;
    font-size: 11px;
    text-align: center;
    background-color: #e5e5e5;
    border-bottom: 1px solid #f5f5f5;
}

.hosts-column {
    display: inline-block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
</style>
