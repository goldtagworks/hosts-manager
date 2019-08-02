import os from 'os';
import fs from 'fs';
import path from 'path';
import { stringify } from 'querystring';

export default class Helper {
    public static appendLF(): string {
        switch (process.platform) {
            case 'darwin': {
                return '\n';
            }
            case 'win32': {
                return '\r\n';
            }
        }
        return '';
    }

    public static getFilename(fullpath: string): string {
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

    public static getHomePath(): string {
        switch (process.platform) {
            case 'darwin': {
                return path.join(os.homedir(), '/hosts/');
            }
            case 'win32': {
                return path.join(os.homedir(), '\\hosts\\');
            }
        }
        return '';
    }

    public static getHostsPath(): string {
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

    public static getHostsFullPath(): string {
        switch (process.platform) {
            case 'darwin': {
                return '/etc/hosts';
            }
            case 'win32': {
                return (
                    process.env.SystemRoot + '\\system32\\drivers\\etc\\hosts'
                );
            }
        }

        return '';
    }

    public static saveConfig(filename: string, list: any): void {
        fs.writeFileSync(
            path.join(Helper.getHomePath(), filename),
            JSON.stringify(list),
            { encoding: 'utf8' }
        );
    }

    public static readConfig(filename: string): any {
        let fullpath = path.join(Helper.getHomePath(), filename);
        if (fs.existsSync(fullpath)) {
            let data = fs.readFileSync(fullpath, { encoding: 'utf8' });
            return JSON.parse(data);
        }

        return new Array();
    }
}
