import { test } from "node:test";
import assert from "node:assert/strict";
import moment from "moment";
import { display, parse } from "../build/dates.mjs";

test("display in the chosen format", () => {
	assert.equal(display(moment, "2026-11-07", "date", "DD.MM.YYYY", "HH:mm"), "07.11.2026");
	assert.equal(display(moment, "2026-11-07T14:30", "datetime", "DD/MM/YYYY", "HH:mm"), "07/11/2026 14:30");
	assert.equal(display(moment, "2026-11-07T14:30", "datetime", "YYYY-MM-DD", "h:mm A"), "2026-11-07 2:30 PM");
	assert.equal(display(moment, "", "date", "DD.MM.YYYY", "HH:mm"), "");
	assert.equal(display(moment, "not a date", "date", "DD.MM.YYYY", "HH:mm"), "not a date");
});

test("parse what the user types, own format first, ISO always", () => {
	assert.equal(parse(moment, "07.11.2026", "date", "DD.MM.YYYY", "HH:mm"), "2026-11-07");
	assert.equal(parse(moment, "2026-11-07", "date", "DD.MM.YYYY", "HH:mm"), "2026-11-07");
	assert.equal(parse(moment, " 7.11.2026 ", "date", "D.M.YYYY", "HH:mm"), "2026-11-07");
	assert.equal(parse(moment, "07/11/2026 14:30", "datetime", "DD/MM/YYYY", "HH:mm"), "2026-11-07T14:30");
	assert.equal(parse(moment, "07/11/2026 2:30 PM", "datetime", "DD/MM/YYYY", "h:mm A"), "2026-11-07T14:30");
	assert.equal(parse(moment, "07/11/2026", "datetime", "DD/MM/YYYY", "HH:mm"), "2026-11-07T00:00");
	assert.equal(parse(moment, "", "date", "DD.MM.YYYY", "HH:mm"), "");
	assert.equal(parse(moment, "31.02.2026", "date", "DD.MM.YYYY", "HH:mm"), null);
	assert.equal(parse(moment, "tomorrow", "date", "DD.MM.YYYY", "HH:mm"), null);
});
