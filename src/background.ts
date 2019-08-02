'use strict';

import { app } from 'electron';
import { appMain } from './app-main';

function main() {
    // Quit when all windows are closed.
    app.on('window-all-closed', () => {
        appMain.destroy();
    });

    app.on('activate', () => {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        appMain.createWindow();
    });

    // This method will be called when Electron has finished
    // initialization and is ready to create browser windows.
    // Some APIs can only be used after this event occurs.
    app.on('ready', async () => {
        appMain.create();
    });
}

main();
