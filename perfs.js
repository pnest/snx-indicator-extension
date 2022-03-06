const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const Gdk = imports.gi.Gdk;
const Lang = imports.lang;
const Gio = imports.gi.Gio;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

var SnxIndicatorPrefs = GObject.registerClass(class SnxIndicatorPrefs extends Gtk.ListBox {
    _init(params) {
        super._init(params);
        this.selection_mode = Gtk.SelectionMode.NONE;
        this._settings = ExtensionUtils.getSettings();
        this._blocked = [];

        this.margin = 24;
        this.add(this.make_row_switch('ping-check'));
    }

    make_row_switch(name) {
        const schema = this._settings.settings_schema;

        const row = new Gtk.ListBoxRow();

        let hbox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL });
        row.add(hbox);

        const vbox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL });
        hbox.pack_start(vbox, true, true, 6);

        const sw = new Gtk.Switch({ valign: Gtk.Align.CENTER });
        hbox.pack_start(sw, false, false, 0);

        const key = schema.get_key(name);

        const summary = new Gtk.Label({
            label: `<span size='medium'><b>${key.get_summary()}</b></span>`,
            hexpand: true,
            halign: Gtk.Align.START,
            use_markup: true
        });
        vbox.pack_start(summary, false, false, 0);

        const description = new Gtk.Label({
            label: `<span size='small'>${key.get_description()}</span>`,
            hexpand: true,
            halign: Gtk.Align.START,
            use_markup: true
        });
        description.get_style_context().add_class('dim-label');
        vbox.pack_start(description, false, false, 0);

        this._settings.bind(name, sw, 'active', Gio.SettingsBindFlags.DEFAULT);
        return row;
    }
});

function init() {
    // ExtensionUtils.initTranslations();
}

function buildPrefsWidget() {
    const widget = new SnxIndicatorPrefs();
    widget.show_all();
    return widget;
}
