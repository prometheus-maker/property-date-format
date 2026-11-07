// Pure date logic, no Obsidian imports, so it can be unit-tested. `moment` is passed in (Obsidian ships it).
export interface MomentLike {
	(input?: string, format?: string | string[], strict?: boolean): {
		isValid(): boolean;
		format(f: string): string;
	};
}

export type Kind = "date" | "datetime";

/** Value as Obsidian stores it in the native input: "2026-11-07" or "2026-11-07T14:30". */
export function display(moment: MomentLike, value: string, kind: Kind, dateFmt: string, timeFmt: string): string {
	if (!value) return "";
	const m = moment(value, kind === "date" ? "YYYY-MM-DD" : ["YYYY-MM-DDTHH:mm", "YYYY-MM-DDTHH:mm:ss"], true);
	if (!m.isValid()) return value;
	return kind === "date" ? m.format(dateFmt) : m.format(`${dateFmt} ${timeFmt}`);
}

/**
 * What the user typed -> native value, or null if it can't be read.
 * Accepts the user's own format first, then ISO, so pasting 2026-11-07 always works.
 */
export function parse(moment: MomentLike, text: string, kind: Kind, dateFmt: string, timeFmt: string): string | null {
	const t = text.trim();
	if (!t) return "";
	const formats =
		kind === "date"
			? [dateFmt, "YYYY-MM-DD"]
			: [`${dateFmt} ${timeFmt}`, `${dateFmt} HH:mm`, "YYYY-MM-DD HH:mm", "YYYY-MM-DDTHH:mm", dateFmt, "YYYY-MM-DD"];
	for (const f of formats) {
		const m = moment(t, f, true);
		if (m.isValid()) return kind === "date" ? m.format("YYYY-MM-DD") : m.format("YYYY-MM-DDTHH:mm");
	}
	return null;
}

export const DATE_PRESETS = ["YYYY-MM-DD", "DD.MM.YYYY", "DD/MM/YYYY", "MM/DD/YYYY", "D MMM YYYY", "ddd, D MMM YYYY", "MMMM D, YYYY"];
export const TIME_PRESETS = ["HH:mm", "h:mm A"];
