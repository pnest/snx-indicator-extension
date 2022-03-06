'use strict';

const St = imports.gi.St;
const Gio = imports.gi.Gio;
const GObject = imports.gi.GObject;
const { Clutter, GLib } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const SNX_TUNNEL_LABEL = 'tunsnx';

var SnxPanelMenuButton = GObject.registerClass({
    GTypeName: 'SnxPanelMenuButton',
}, class SnxPanelMenuButton extends PanelMenu.Button {
    constructor() {
        super();
        this._icon = null;
        this._boxLayout = null;

        // GSettings
        this._settings = null;

        // SourceId
        this._checkStatusSourceId = null;
        this._scheduleCheckStatusSourceId = null;
    }

    _init() {
        super._init(St.Align.START, _('SNX Tunnel Indicator'), false);

        this._settings = ExtensionUtils.getSettings();

        this._boxLayout = new St.BoxLayout({ vertical: false, style_class: 'panel-status-menu-box' });
        this.add_child(this._boxLayout);

        // this._label = new St.Label({
        //     text: `${SNX_TUNNEL_LABEL}...`,
        //     y_expand: true,
        //     y_align: Clutter.ActorAlign.CENTER
        // });
        // this._label.set_style_class_name('pending');
        // this._boxLayout.add_child(this._label);

        this._icon = new St.Icon({
            gicon: Gio.icon_new_for_string(Me.path + '/icons/vpn-caps-disabled-symbolic.svg'),
            style_class: 'system-status-icon'
        });
        this._boxLayout.add_child(this._icon);

        this.menu.addAction(_('Check status now'), this._onCheckStatus.bind(this));
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        this.menu.addAction(_('Open Settings'), this._onOpenPrefs.bind(this));

        this._checkStatus();
        this._scheduleCheckStatus();
    }

    destroy() {
        super.destroy();

        if (this._scheduleCheckStatusSourceId) {
            GLib.Source.remove(this._scheduleCheckStatusSourceId);
        }

        if (this._checkStatusSourceId) {
            GLib.Source.remove(this._checkStatusSourceId);
        }
    }

    _scheduleCheckStatus() {
        if (this._scheduleCheckStatusSourceId) {
            log(`${Me.metadata.name}: skipping scheduling check status on idle`);
            return;
        }

        const interval = this._settings.get_int('check-status-interval');
        log(`${Me.metadata.name}: check interval is ${interval} seconds`);

        this._scheduleCheckStatusSourceId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, interval, () => {
            this._scheduleCheckStatusSourceId = null;
            this._checkStatus(() => this._scheduleCheckStatus());
            return GLib.SOURCE_REMOVE;
        });
    }

    _checkStatus(onStatusChecked) {
        if (this._checkStatusSourceId) {
            return;
        }

        this._checkStatusSourceId = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            try {
                Gio.Subprocess.new(
                    ['ip', '-brief', 'address', 'show', 'label', SNX_TUNNEL_LABEL, 'up'],
                    Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
                ).communicate_utf8_async(null, null, (proc, result) => {
                    try {
                        let [, stdout, stderr] = proc.communicate_utf8_finish(result);

                        if (proc.get_successful()) {
                            const stdOutTrimmed = stdout.trim();
                            if (stdOutTrimmed) {
                                const splitted = stdOutTrimmed.split(/\s+/);
                                log(`${Me.metadata.name}: Office Mode IP ${splitted[0]}`);
                                this._onVpnConnected();
                            } else {
                                this._onVpnDisconnected();
                                log(`${Me.metadata.name}: SNX is off`);
                            }
                        } else {
                            log(`${Me.metadata.name}: error result ${stderr}`);
                            this._onVpnDisconnected();
                        }
                    } catch (error) {
                        logError(error, 'Cannot handle command output due to unexpected error');
                        this._onVpnDisconnected();
                    } finally {
                        if (onStatusChecked) {
                            onStatusChecked();
                        }
                    }
                });
            } catch (error) {
                logError(error, 'Cannot schedule idle action due to unexpected error');
            } finally {
                this._checkStatusSourceId = null;
            }
            return GLib.SOURCE_REMOVE;
        });
    }

    _onCheckStatus() {
        this._checkStatus();
    }

    _onOpenPrefs() {
        ExtensionUtils.openPrefs();
    }

    _onVpnConnected() {
        if (this._icon) {
            this._icon.set_gicon(Gio.icon_new_for_string(Me.path + '/icons/vpn-caps-symbolic.svg'));
            this._icon.remove_style_class_name('pending');
            this._icon.remove_style_class_name('disconnected');
            this._icon.add_style_class_name('connected');
        }

        if (this._label) {
            this._label.set_text(`${SNX_TUNNEL_LABEL} ${_('UP')}`);
            this._label.set_style_class_name('connected');
        }
    }

    _onVpnDisconnected() {
        if (this._icon) {
            this._icon.set_gicon(Gio.icon_new_for_string(Me.path + '/icons/vpn-caps-disabled-symbolic.svg'));
            this._icon.remove_style_class_name('pending');
            this._icon.remove_style_class_name('connected');
            this._icon.add_style_class_name('disconnected');
        }

        if (this._label) {
            this._label.set_text(`${SNX_TUNNEL_LABEL} ${_('DOWN')}`);
            this._label.set_style_class_name('disconnected');
        }
    }
});
