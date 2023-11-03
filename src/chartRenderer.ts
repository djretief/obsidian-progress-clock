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
            if (this.plugin.settings.themeable || themeColors) {
                let i = 1;
                while (true) {
                    let color = getComputedStyle(el).getPropertyValue(`--chart-color-${i}`);
                    if (color) {
                        colors.push(color);
                        i++;
                    } else {
                        break;
                    }
                }
            }
            for (let i = 0; yaml.series.length > i; i++) {
                const {title, ...rest} = yaml.series[i];
                const dataset = {
                    label: title ?? "",
                    backgroundColor: yaml.labelColors ? colors.length ? generateInnerColors(colors, yaml.transparency) : generateInnerColors(this.plugin.settings.colors, yaml.transparency) : colors.length ? generateInnerColors(colors, yaml.transparency)[i] : generateInnerColors(this.plugin.settings.colors, yaml.transparency)[i],
                    borderColor: yaml.labelColors ? colors.length ? colors : this.plugin.settings.colors : colors.length ? colors[i] : this.plugin.settings.colors[i],
                    borderWidth: 1,
                    fill: yaml.fill ? yaml.stacked ? i == 0 ? 'origin' : '-1' : true : false, //See https://github.com/phibr0/obsidian-charts/issues/53#issuecomment-1084869550
                    tension: yaml.tension ?? 0,
                    ...rest,
                };
                datasets.push(dataset);
            }
        }

        let time = yaml.time ? { type: 'time', time: { unit: yaml.time } } : null

        let labels = yaml.labels;

        const gridColor = getComputedStyle(el).getPropertyValue('--background-modifier-border');

        let chartOptions: ChartConfiguration;

        Chart.defaults.color = yaml.textColor || getComputedStyle(el).getPropertyValue('--text-muted');
        Chart.defaults.font.family = getComputedStyle(el).getPropertyValue('--mermaid-font');
        Chart.defaults.plugins = {
            ...Chart.defaults.plugins,
            legend: {
                ...Chart.defaults.plugins.legend,
                display: yaml.legend ?? true,
                position: yaml.legendPosition ?? "top",
            },
        };
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

    /**
     * @param yaml the copied codeblock
     * @returns base64 encoded image in png format
     */
    async imageRenderer(yaml: string, options: ImageOptions): Promise<string> {
        const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));
        const destination = document.createElement('canvas');
        const destinationContext = destination.getContext("2d");

        const chartOptions = await this.datasetPrep(await parseYaml(yaml.replace("```chart", "").replace("```", "").replace(/\t/g, '    ')), document.body);

        new Chart(destinationContext, chartOptions.chartOptions);

        document.body.append(destination);
        await delay(250);
        const dataurl = destination.toDataURL(options.format, options.quality);
        document.body.removeChild(destination);

        return dataurl.substring(dataurl.indexOf(',') + 1);
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
            let x: any = {};
            if (this.data.id) {
                const colors = [];
                if (this.renderer.plugin.settings.themeable) {
                    let i = 1;
                    while (true) {
                        let color = getComputedStyle(this.el).getPropertyValue(`--chart-color-${i}`);
                        if (color) {
                            colors.push(color);
                            i++;
                        } else {
                            break;
                        }
                    }
                }
                x.datasets = [];
                let linkDest: TFile;
                if (this.data.file) linkDest = this.renderer.plugin.app.metadataCache.getFirstLinkpathDest(this.data.file, this.renderer.plugin.app.workspace.getActiveFile().path);
                const pos = this.renderer.plugin.app.metadataCache.getFileCache(
                    linkDest ?? this.renderer.plugin.app.vault.getAbstractFileByPath(this.ownPath) as TFile).sections.find(pre => pre.id === this.data.id)?.position;
                if (!pos) {
                    throw "Invalid id and/or file";
                }

                const tableString = (await this.renderer.plugin.app.vault.cachedRead(this.data.file ? linkDest : this.renderer.plugin.app.vault.getAbstractFileByPath(this.ownPath) as TFile)).substring(pos.start.offset, pos.end.offset);
                let pieData:number[] = [];

                for(let i=0;6>i;i++){
                    pieData.push(1);
                }

                // try {
                //     //tableData = generateTableData(tableString, this.data.layout ?? 'columns', this.data.select);
                // } catch (error) {
                //     throw "There is no table at that id and/or file"
                // }
                //x.labels = tableData.labels;
                //for (let i = 0; tableData.dataFields.length > i; i++) {
                x.datasets.push({
                    label: "",
                    data: pieData,
                    backgroundColor: this.data.labelColors ? colors.length ? generateInnerColors(colors, this.data.transparency) : generateInnerColors(this.renderer.plugin.settings.colors, this.data.transparency) : colors.length ? generateInnerColors(colors, this.data.transparency)[0] : generateInnerColors(this.renderer.plugin.settings.colors, this.data.transparency)[0],
                    borderColor: this.data.labelColors ? colors.length ? colors : this.renderer.plugin.settings.colors : colors.length ? colors[0] : this.renderer.plugin.settings.colors[0],
                    borderWidth: 1,
                    fill: this.data.fill ? this.data.stacked ? true ? 'origin' : '-1' : true : false,
                    tension: this.data.tension ?? 0,
                });
                //}
                data.chartOptions.data.labels = x.labels;
                data.chartOptions.data.datasets = x.datasets;


            }
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