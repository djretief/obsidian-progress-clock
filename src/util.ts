import chroma from "chroma-js";
import type { App, Editor, TFile } from "obsidian";
import type { ProgressClockSettings } from "src/constants/settingsConstants";
import type Renderer from "src/chartRenderer";

export function generateInnerColors(colors: string[], alpha = 0.25) {
    if(typeof alpha != 'number') throw "Provided alpha value is not a number"
    return colors.map((color: string) => chroma(color.trim()).alpha(alpha).hex());
}

export function renderError(error: any, el: HTMLElement) {
    const errorEl = el.createDiv({ cls: "chart-error" });
    errorEl.createEl("b", { text: "Couldn't render Chart:" });
    errorEl.createEl("pre").createEl("code", { text: error.toString?.() ?? error });
    errorEl.createEl("hr");
    errorEl.createEl("span").innerHTML = "You might also want to look for further Errors in the Console: Press <kbd>CTRL</kbd> + <kbd>SHIFT</kbd> + <kbd>I</kbd> to open it.";
}

export function base64ToArrayBuffer(base64: string) {
    var binary_string = window.atob(base64);
    var len = binary_string.length;
    var bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
}