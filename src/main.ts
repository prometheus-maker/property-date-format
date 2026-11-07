import { App, moment, Plugin, PluginSettingTab, Setting, setIcon } from "obsidian";
import { DATE_PRESETS, display, Kind, MomentLike, parse, TIME_PRESETS } from "./dates";

interface Settings { dateFormat: string; timeFormat: string }
const DEFAULTS: Settings = { dateFormat: "YYYY-MM-DD", timeFormat: "HH:mm" };
const M = moment as unknown as MomentLike;
const DONE = "pdfDone";

export default class PropertyDateFormat extends Plugin {
	settings: Settings = { ...DEFAULTS };
	private observer?: MutationObserver;
	private redraws: (() => void)[] = [];

	async onload() {
		this.settings = { ...DEFAULTS, ...((await this.loadData()) as Partial<Settings> | null) };
		this.addSettingTab(new FormatTab(this.app, this));
		this.app.workspace.onLayoutReady(() => {
			this.scan(document.body);
			// Property widgets are created and re-created all the time (opening notes, editing, Bases), so watch for them.
			this.observer = new MutationObserver((muts) => {
				for (const m of muts) m.addedNodes.forEach((n) => n.instanceOf(HTMLElement) && this.scan(n));
			});
			this.observer.observe(document.body, { childList: true, subtree: true });
		});
	}

	onunload() {
		this.observer?.disconnect();
		document.querySelectorAll<HTMLElement>(".pdf-field").forEach((el) => el.remove());
		document.querySelectorAll<HTMLInputElement>("input.pdf-native").forEach((el) => {
			el.classList.remove("pdf-native");
			el.parentElement?.removeClass("pdf-host");
			delete el.dataset[DONE];
		});
	}

	async save() {
		await this.saveData(this.settings);
		this.redraws = this.redraws.filter((r) => (r(), true));
	}

	private scan(root: HTMLElement) {
		const inputs = root.matches?.("input.mod-date, input.mod-datetime")
			? [root as HTMLInputElement]
			: Array.from(root.querySelectorAll<HTMLInputElement>("input.mod-date, input.mod-datetime"));
		for (const input of inputs) if (!input.dataset[DONE]) this.enhance(input);
	}

	/** Put a text field in the user's format in front of Obsidian's native date input. The native input keeps the value. */
	private enhance(native: HTMLInputElement) {
		native.dataset[DONE] = "1";
		const kind: Kind = native.type === "datetime-local" ? "datetime" : "date";
		const wrap = createDiv({ cls: "pdf-field" });
		const text = wrap.createEl("input", { type: "text", cls: "metadata-input metadata-input-text pdf-text" });
		text.placeholder = "Empty";
		const pick = wrap.createDiv({ cls: "clickable-icon pdf-pick", attr: { "aria-label": "Pick a date" } });
		setIcon(pick, kind === "date" ? "calendar" : "calendar-clock");
		native.insertAdjacentElement("beforebegin", wrap);
		native.classList.add("pdf-native");
		native.parentElement?.addClass("pdf-host");

		const s = () => this.settings;
		const redraw = () => {
			if (document.activeElement !== text) text.value = display(M, native.value, kind, s().dateFormat, s().timeFormat);
			text.title = native.value;
		};
		redraw();
		this.redraws.push(redraw);

		let committing = false;
		const commit = () => {
			const v = parse(M, text.value, kind, s().dateFormat, s().timeFormat);
			if (v === null) { text.addClass("pdf-bad"); text.title = `Can't read this date. Use ${s().dateFormat}${kind === "datetime" ? " " + s().timeFormat : ""}, or YYYY-MM-DD.`; return; }
			text.removeClass("pdf-bad");
			if (v !== native.value) {
				committing = true;
				native.value = v;
				// Obsidian saves the property on these events, the same as when you edit its own field.
				native.dispatchEvent(new Event("input", { bubbles: true }));
				native.dispatchEvent(new Event("change", { bubbles: true }));
				native.dispatchEvent(new FocusEvent("blur"));
				committing = false;
			}
			redraw();
		};
		text.addEventListener("keydown", (e) => {
			if (e.key === "Enter") { e.preventDefault(); commit(); text.blur(); }
			if (e.key === "Escape") { text.removeClass("pdf-bad"); text.blur(); redraw(); }
		});
		text.addEventListener("blur", commit);
		native.addEventListener("change", () => {
			redraw();
			// A date picked in the calendar: Obsidian only saves the property when its input loses focus.
			if (!committing) native.dispatchEvent(new FocusEvent("blur"));
		});
		pick.addEventListener("click", () => {
			try { native.showPicker(); } catch { native.focus(); }
		});
	}
}

class FormatTab extends PluginSettingTab {
	constructor(app: App, private plugin: PropertyDateFormat) { super(app, plugin); }
	display() {
		const { containerEl: el } = this;
		el.empty();
		const p = this.plugin;
		const sample = () => `${M("2026-03-09T14:05").format(p.settings.dateFormat)} ${M("2026-03-09T14:05").format(p.settings.timeFormat)}`;
		const preview = el.createEl("p", { text: "" });
		const show = () => preview.setText(`9 March 2026, 14:05 shows as: ${sample()}`);
		new Setting(el).setName("Date format").setDesc("How dates look in Properties. Uses Moment.js tokens (YYYY, MM, DD, MMM, ddd).")
			.addDropdown((d) => {
				for (const f of DATE_PRESETS) d.addOption(f, `${f}  (${M("2026-03-09").format(f)})`);
				if (!DATE_PRESETS.includes(p.settings.dateFormat)) d.addOption(p.settings.dateFormat, p.settings.dateFormat);
				d.setValue(p.settings.dateFormat).onChange(async (v) => { p.settings.dateFormat = v; await p.save(); this.display(); });
			})
			.addText((t) => t.setPlaceholder("custom, e.g. DD MMM YYYY").setValue(p.settings.dateFormat)
				.onChange(async (v) => { if (v.trim()) { p.settings.dateFormat = v.trim(); await p.save(); show(); } }));
		new Setting(el).setName("Time format").setDesc("For date & time properties. HH:mm is 24-hour, h:mm A is 12-hour.")
			.addDropdown((d) => {
				for (const f of TIME_PRESETS) d.addOption(f, `${f}  (${M("2026-03-09T14:05").format(f)})`);
				if (!TIME_PRESETS.includes(p.settings.timeFormat)) d.addOption(p.settings.timeFormat, p.settings.timeFormat);
				d.setValue(p.settings.timeFormat).onChange(async (v) => { p.settings.timeFormat = v; await p.save(); show(); });
			});
		el.append(preview);
		show();
		el.createEl("p", { cls: "setting-item-description", text: "Only the display changes. Your notes keep the standard YYYY-MM-DD value, so Bases, Dataview and other apps read them as before. You can type a date in your format or as YYYY-MM-DD." });
	}
}
