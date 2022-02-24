'use strict';

const Main = imports.ui.main;
const ExtensionUtils = imports.misc.extensionUtils;

const Me = ExtensionUtils.getCurrentExtension();

const { SnxPanelMenuButton } = Me.imports.snxPanelMenuButton;

class Extension {
    constructor() {
        this._indicator = null;
    }

    enable() {
        log(`enabling ${Me.metadata.name} in Extension`);
        this._indicator = new SnxPanelMenuButton();
        Main.panel.addToStatusArea('SNX Indicator', this._indicator);
    }

    disable() {
        log(`${Me.metadata.name}`);

        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
    }
}

function init() {
    log(`Creating extension ${Me.metadata.name}. Search path '${imports.searchPath}'`);
    return new Extension();
}
