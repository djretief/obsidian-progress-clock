import { MarkdownView, Plugin, parseYaml, Menu, Editor, View, Notice, MarkdownPostProcessorContext } from 'obsidian';

import Renderer from './chartRenderer';
import { ProgressClockSettings, DEFAULT_SETTINGS } from './constants/settingsConstants';
import { ChartSettingTab } from './ui/settingsTab';
import { CreationHelperModal } from './ui/creationHelperModal';
import { addIcons } from 'src/ui/icons';
import { renderError } from 'src/util';

export default class ProgressClockPlugin extends Plugin {
	settings: ProgressClockSettings;
	renderer: Renderer;

	postprocessor = async (content: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
		let data;
		try {
			data = await parseYaml(content.replace(/	/g, '    '));
		} catch (error) {
			renderError(error, el);
			return;
		}
		if(!data.id) {
			if (!data || !data.type || !data.labels || !data.series) {
				renderError("Missing type, labels or series", el)
				return;
			}
		}
		await this.renderer.renderFromYaml(data, el, ctx);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async onload() {
		console.log('loading plugin: Obsidian Progress Clock');

		await this.loadSettings()

		addIcons();

		this.renderer = new Renderer(this);

		//@ts-ignore
		window.renderChart = this.renderer.renderRaw;

		this.addSettingTab(new ChartSettingTab(this.app, this));

		this.addCommand({
			id: 'creation-helper',
			name: 'Insert Clock',
			checkCallback: (checking: boolean) => {
				let leaf = this.app.workspace.activeLeaf;
				if (leaf.view instanceof MarkdownView) {
					if (!checking) {
						new CreationHelperModal(this.app, leaf.view, this.settings, this.renderer).open();
					}
					return true;
				}
				return false;
			}
		});

		this.registerMarkdownCodeBlockProcessor('chart', this.postprocessor);
		this.registerMarkdownCodeBlockProcessor('advanced-chart', async (data, el) => this.renderer.renderRaw(await JSON.parse(data), el));

		// Remove this ignore when the obsidian package is updated on npm
		// Editor mode
		// @ts-ignore
		this.registerEvent(this.app.workspace.on('editor-menu',
			(menu: Menu, _: Editor, view: MarkdownView) => {
				if (view && this.settings.contextMenu) {
					menu.addItem((item) => {
						item.setTitle("Insert Clock")
							.setIcon("chart")
							.onClick((_) => {
								new CreationHelperModal(this.app, view, this.settings, this.renderer).open();
							});
					});
				}
			}));
	}

	onunload() {
		console.log('unloading plugin: Obsidian Charts');
	}
}
