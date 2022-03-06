const Gio = imports.gi.Gio;

const Main = imports.ui.main;
const ExtensionUtils = imports.misc.extensionUtils;

const Me = ExtensionUtils.getCurrentExtension();

const { SnxPanelMenuButton } = Me.imports.snxPanelMenuButton;

class Extension {
    constructor() {
        this._indicator = null;
    }

    enable() {
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

function init(meta) {
    log(`Creating extension ${Me.metadata.name}. Search path '${imports.searchPath}'.`);
    Object.keys(meta).forEach((key, index) => {
        if (index === 0) {
            Object.keys(meta[key]).forEach((innerKey) => {
                log(`${Me.metadata.name}: ${key}.${innerKey}=${meta[key][innerKey]}`);
            });
        } else {
            log(`${Me.metadata.name}: ${key}=${meta[key]}`);
        }
    });
    return new Extension();
}
