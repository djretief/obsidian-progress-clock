import { Chart, ChartConfiguration, registerables } from 'chart.js';
import './date-adapter/chartjs-adapter-moment.esm.js';
import { MarkdownPostProcessorContext, MarkdownRenderChild, parseYaml, TFile } from 'obsidian';
import { generateInnerColors, renderError } from 'src/util';
import type { ImageOptions } from './constants/settingsConstants';
import type ChartPlugin from 'src/main';
import annotationPlugin from 'chartjs-plugin-annotation'

Chart.register(...registerables, annotationPlugin);

// I need to refactor this
// Or just rewrite it completely
// It's a mess

export default class Renderer {
    plugin: ChartPlugin;

    constructor(plugin: ChartPlugin) {
        this.plugin = plugin;
    }

    async datasetPrep(yaml: any, el: HTMLElement, themeColors = false): Promise<{ chartOptions: ChartConfiguration; width: string; }> {
        let datasets = [];
        if (!yaml.id) {
            const colors = [];

            for(let i = 0; i < yaml.series[0].ticked.length; i++){
                if(yaml.series[0].ticked[i] === 0){
                    colors[i] = yaml.series[0].tockColor
                }else{
                    colors[i] = yaml.series[0].tickColor
                }
            }

            const {title, ...rest} = yaml.series[0];
            const dataset = {
                label: title ?? "Progress Clock",
                backgroundColor: generateInnerColors(colors, yaml.transparency),
                borderColor: colors,
                borderWidth: 1,
                ...rest,
            };
            datasets.push(dataset);
            
        }

        let time = yaml.time ? { type: 'time', time: { unit: yaml.time } } : null

        let labels = yaml.labels;

        const gridColor = getComputedStyle(el).getPropertyValue('--background-modifier-border');

        let chartOptions: ChartConfiguration;

        Chart.defaults.color = yaml.textColor || getComputedStyle(el).getPropertyValue('--text-muted');
        Chart.defaults.font.family = getComputedStyle(el).getPropertyValue('--mermaid-font');
        Chart.defaults.plugins.title.display = true;
        Chart.defaults.plugins.title.text = yaml.chartTitle;
        Chart.defaults.layout.padding = yaml.padding;

        if (yaml.type == 'pie') {
            (chartOptions as ChartConfiguration<"pie">) = {
                type: yaml.type,
                data: {
                    labels,
                    datasets
                },
                options: {
                    animation: {
                        duration: 0
                    },
                    //@ts-ignore
                    spanGaps: yaml.spanGaps,
                }
            };
        }
        return { chartOptions, width: yaml.width };
    }

    renderRaw(data: any, el: HTMLElement): Chart | null {
        const destination = el.createEl('canvas');

        if (data.chartOptions) {
            try {
                let chart = new Chart(destination.getContext("2d"), data.chartOptions);
                destination.parentElement.style.width = data.width ?? "100%";
                destination.parentElement.style.margin = "auto";
                return chart;
            } catch (error) {
                renderError(error, el);
                return null;
            }
        } else {
            try {
                let chart = new Chart(destination.getContext("2d"), data);
                return chart;
            } catch (error) {
                renderError(error, el);
                return null;
            }
        }
    }

    async renderFromYaml(yaml: any, el: HTMLElement, ctx: MarkdownPostProcessorContext) {
        this.plugin.app.workspace.onLayoutReady(() => ctx.addChild(new ChartRenderChild(yaml, el, this, ctx.sourcePath)));
    }
}

class ChartRenderChild extends MarkdownRenderChild {
    data: any;
    chart: null | Chart;
    renderer: Renderer;
    ownPath: string;
    el: HTMLElement;

    constructor(data: any, el: HTMLElement, renderer: Renderer, ownPath: string) {
        super(el);
        this.el = el;
        this.data = data;
        this.renderer = renderer;
        this.ownPath = ownPath;
        this.changeHandler = this.changeHandler.bind(this);
        this.reload = this.reload.bind(this);
    }

    async onload() {
        try {
            const data = await this.renderer.datasetPrep(this.data, this.el);
            this.chart = this.renderer.renderRaw(data, this.containerEl);
        } catch (error) {
            renderError(error, this.el);
        }
        if (this.data.id) {
            this.renderer.plugin.app.metadataCache.on("changed", this.changeHandler);
        }
        this.renderer.plugin.app.workspace.on('css-change', this.reload);
    }

    changeHandler(file: TFile) {
        if (this.data.file ? file.basename === this.data.file : file.path === this.ownPath) {
            this.reload();
        }
    }

    reload() {
        this.onunload();
        this.onload();
    }

    onunload() {
        this.renderer.plugin.app.metadataCache.off("changed", this.changeHandler);
        this.renderer.plugin.app.workspace.off('css-change', this.reload);
        this.el.empty();
        this.chart && this.chart.destroy();
        this.chart = null;
    }
}