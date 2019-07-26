<template>
    <el-container id="App" direction="vertical">
        <el-container direction="horizontal">
            <el-aside width="260px">
                <el-menu
                    ref="menu"
                    :unique-opened="false"
                    background-color="#545c64"
                    text-color="#fff"
                    active-text-color="#ffd04b"
                >
                    <el-submenu index="0" popper-class="submenu">
                        <template slot="title">
                            <i class="el-icon-set-up"></i>
                            <span>Server Hosts</span>
                        </template>
                        <el-menu-item
                            v-for="(filename, index) in serverHosts"
                            :key="filename"
                            :index="'0_' + index"
                            v-text="filename"
                            @click="onClickedServerHost(filename)"
                        />
                    </el-submenu>
                    <!--
                    <el-submenu index="1" popper-class="submenu">
                        <template slot="title">
                            <i class="el-icon-set-up"></i>
                            <span>Local Hosts</span>
                        </template>
                        <el-menu-item
                            v-for="(filename, index) in localHosts"
                            :key="filename"
                            :index="'1_' + index"
                            v-text="filename"
                            @click="onClickedLocalHost(filename)"
                        />
                    </el-submenu>
                    // -->
                </el-menu>
            </el-aside>
            <el-container direction="vertical">
                <el-main
                    ><editor
                        v-model="systemHosts"
                        @init="onMainEditorInit"
                        lang="ini"
                        theme="dracula"
                        width="100%"
                        height="100%"
                        :options="options"
                    ></editor
                ></el-main>
                <el-footer>
                    <div style=" float: right;">
                        <el-button
                            type="primary"
                            icon="el-icon-refresh"
                            size="mini"
                            @click="onShowDialog"
                            >공통 hosts 편집</el-button
                        >
                        <el-button
                            type="primary"
                            icon="el-icon-refresh"
                            size="mini"
                            @click="onClickedRefreshList"
                            >List 갱신</el-button
                        >
                        <el-button
                            type="primary"
                            icon="el-icon-edit"
                            size="mini"
                            @click="onClickedSave"
                            >Hosts 저장</el-button
                        >
                    </div>
                </el-footer>
            </el-container>
        </el-container>
        <el-dialog
            title="공통 hosts 편집"
            width="800px"
            :visible.sync="visibleDialog"
            :close-on-click-modal="false"
        >
            <div style="height:300px;">
                <editor
                    v-model="commonHosts"
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
                    size="mini"
                    @click="visibleDialog = false"
                    icon="el-icon-close"
                    >닫기</el-button
                >
                <el-button
                    size="mini"
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
import { remote } from 'electron';
import { Vue, Component } from 'vue-property-decorator';
import AppBase from '@/AppBase';

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
    public systemHosts: string = '';
    public commonHosts: string = '';

    public serverHosts: string[] = [];
    public localHosts: string[] = [];
    public mainEditor: any = null;
    public subEditor: any = null;
    public visibleDialog: boolean = false;

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
    }

    public mounted(): void {
        this.watcherHosts();
        this.readServerHostsList();
        //this.readLocalHostsList();
        this.readSystemHosts();
    }

    public onClickedServerHost(filename: string): void {
        this.saveServerHosts(filename);
    }

    public onClickedLocalHost(filename: string): void {
        this.saveLocalHosts(filename);
    }

    public onClickedRefreshList(): void {
        this.readServerHostsList();
    }

    public onClickedSave(): void {
        this.saveSystemHosts(this.systemHosts);
    }

    // /etc/hosts 읽은후
    public onReadSystemHostsComplete(
        err: NodeJS.ErrnoException | null,
        data: string
    ): void {
        if (err == null) {
            this.systemHosts = data;
            this.mainEditor.gotoLine(0, 0, true);
        }
    }

    public onReadServerHostsListComplete(list: string[]): void {
        this.serverHosts = list;
        (this.$refs['menu'] as ElMenu).open('0');
    }

    public onReadLocalHostsListComplete(list: string[]): void {
        this.localHosts = list;
        (this.$refs['menu'] as ElMenu).open('1');
    }

    public onShowDialog(): void {
        this.readCommonHosts();
        this.visibleDialog = true;
    }

    public onClickedCommonHostsSave(): void {
        this.saveCommonHosts(this.commonHosts);
        this.successNotify('저장한 결과가 hosts 에는 반영되지 않습니다.');
        this.visibleDialog = false;
    }

    public onReadCommonHostsComplete(
        err: NodeJS.ErrnoException | null,
        data: string
    ): void {
        if (err == null) {
            this.commonHosts = data;
        }
    }
}
</script>

<style>
body {
    margin: 0;
}
.el-footer {
    background-color: #f5f5f5;
    color: #fff;
    padding: 0px 20px !important;
    height: 50px !important;
    line-height: 50px !important;
}

.el-main {
    padding: 0 !important;
    height: calc(100vh - 50px);
}

.el-aside {
    background-color: #545c64;
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
</style>
