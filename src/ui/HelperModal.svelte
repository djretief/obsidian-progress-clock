<script lang="ts" defer>
  import { debounce, Editor, parseYaml } from "obsidian";
  import type Renderer from "../chartRenderer";
  import { createEventDispatcher } from "svelte";
  import CollapsibleSection from './CollapsibleSection.svelte'
  import { renderError } from "src/util";
  import type { DataField } from "src/constants/settingsConstants";
import type { Chart } from "chart.js";

  export let editor: Editor;
  export let renderer: Renderer;

  const dispatch = createEventDispatcher();

  let chartType: string = "pie";
  let numSegments: number = 4;
  let lastChart: Chart = null;
  let tension: number = 20;
  let width: number = 80;
  let fill: boolean = false;
  let labelColors: boolean = true;
  let startAtZero: boolean = false;
  let bestFit: boolean = false;
  let bestFitTitle: string;
  let bestFitNumber: string = "0";
  let labels: string = "";
  let data: DataField[] = [{ dataTitle: "", data: "", ticked: ""}];
  let chart: string;
  let previewElement: HTMLDivElement = null;
  const debouncedRenderChart = debounce(
    async (yaml: any, el: HTMLElement) => {
      if(lastChart) lastChart.destroy();
          previewElement.lastElementChild?.remove();
      lastChart = renderer.renderRaw(await renderer.datasetPrep(parseYaml(yaml), el), el);
    },
    500,
    true
  );

  $: {
    let dataString = "1"
    let tickedString = "1"
    for(let i=1; i<numSegments; i++){
      dataString += ",1"
      tickedString += ",0"
    }
    data[0] = {dataTitle: "Progress Clock", data: dataString, ticked: tickedString}
  }

  $: chart = `type: "pie"
labels: []
series:
${data
  .map((data) => `  - title: ${data.dataTitle}\n    data: [${data.data}]\n    ticked: [${data.ticked}]`)
  .join("\n")}
width: ${width}%
labelColors: ${labelColors}`;

  $: {
    if (previewElement) {
      try {
        debouncedRenderChart(chart, previewElement);
      } catch (error) {
        renderError(error, previewElement);
      }
    }
  }

  function insertChart() {
    let doc = editor.getDoc();
    let cursor = doc.getCursor();
    if(lastChart)
    doc.replaceRange("```chart\n" + chart + "\n```", cursor);
    dispatch("close");
  }
</script>

<div class="chart-modal">
  <h3>Create a new progress clock</h3>
  <div class="modalColumn">
    <div>
      <table style="width:100%">
        <tr>
          <td class="desc">
            <p class="mainDesc">Clock Segments</p>
            <p class="subDesc">Choose how many segments the clock will have</p>
          </td>
          <td class="controlElement">
            <select name="Segments" id="clock-segments" class="dropdown" bind:value={numSegments}>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
              <option value="6">6</option>
              <option value="7">7</option>
              <option value="8">8</option>
              <option value="10">10</option>
            </select>
          </td>
        </tr>
        <tr>
          <td class="desc">
            <p class="mainDesc">Width</p>
            <p class="subDesc">Changes the horizontal width</p>
          </td>
          <td class="controlElement">
            <input type="range" min="20" max="100" class="slider" bind:value={width}/>
          </td>
        </tr>
      </table>
    </div>
    <div class="chartPreview">
      <div id="preview" bind:this={previewElement} />
    </div>
  </div>
  <hr />
</div>
<div style="display: flex; justify-content: center; align-items: center;">
  <button class="mod-cta" on:click={insertChart}>Insert Chart</button>
</div>

<style>
  .addMoreButtonContainer {
    display: flex;
    justify-content: flex-end;
    margin-top: 0.4rem;
  }

  .subDesc {
    font-size: smaller;
    opacity: 0.5;
    margin: 0;
  }
  .desc {
    padding-right: 1em;
  }
  .mainDesc {
    margin: 0;
  }
  table {
    margin: auto;
  }
  .controlElement {
    text-align: center;
  }
  .chart-modal {
    overflow-y: auto;
  }
  .modalColumn {
    display: flex;
    gap: 2em;
  }
  .chartPreview {
    width: 30vw;
    display: flex;
    justify-content: center;
    align-items: center;
  }
</style>
