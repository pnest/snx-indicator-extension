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
        this._indicator = null;
        this._checkStatusMenuItem = null;
        this._scheduleCheckStatusSourceId = null;
        this._checkStatusSourceId = null;
        this._icon = null;
        this._boxLayout = null;

        log(`${Me.metadata.name}: creating`);
    }

    _init() {
        super._init(St.Align.START, _('SNX Tunnel Indicator'), false);

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

        this._checkStatusMenuItem = this.menu.addAction(_('Check status'), this._scheduleCheckStatus.bind(this));
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        this.menu.addAction(_('Open Settings'));

        this._scheduleCheckStatus();
    }

    destroy() {
        super.destroy();
    }

    _scheduleCheckStatusOnIdle() {
        if (this._scheduleCheckStatusSourceId || this._checkStatusSourceId) {
            log(`${Me.metadata.name}: skipping scheduling check status`);
            return;
        }

        this._scheduleCheckStatusSourceId = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            this._scheduleCheckStatusSourceId = null;
            log(`${Me.metadata.name} was invoked because no other sources were read`);
            this._scheduleCheckStatus();
            return GLib.SOURCE_REMOVE;
        });
        log(`${Me.metadata.name}: scheduling check status on idle with sourceId=${this._scheduleCheckStatusSourceId}`);
    }

    _scheduleCheckStatus() {
        if (this._checkStatusSourceId) {
            log(`${Me.metadata.name}: skipping scheduling check status on idle`);
            return;
        }

        this._checkStatusSourceId = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            try {
                Gio.Subprocess.new(
                    // ['sh', '-c', 'ip -brief address | grep snx'],
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
                    }
                });
            } catch (error) {
                logError(error, 'Cannot schedule idle action due to unexpected error');
            } finally {
                this._checkStatusSourceId = null;
            }
            return GLib.SOURCE_REMOVE;
        });
        log(`${Me.metadata.name}: scheduling check status on idle with sourceId=${this._checkStatusSourceId}`);

    }

    _onVpnConnected() {
        if (this._icon) {
            this._icon.set_gicon(Gio.icon_new_for_string(Me.path + '/icons/vpn-caps-symbolic.svg'));
            this._icon.set_style_class_name('connected');
        }

        if (this._label) {
            this._label.set_text(`${SNX_TUNNEL_LABEL} UP`);
            this._label.set_style_class_name('connected');
        }
    }

    _onVpnDisconnected() {
        if (this._icon) {
            this._icon.set_gicon(Gio.icon_new_for_string(Me.path + '/icons/vpn-caps-disabled-symbolic.svg'));
            this._icon.set_style_class_name('disconnected');
        }

        if (this._label) {
            this._label.set_text(`${SNX_TUNNEL_LABEL} DOWN`);
            this._label.set_style_class_name('disconnected');
        }
    }
});
