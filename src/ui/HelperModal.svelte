<script lang="ts" defer>
  import { debounce, Editor, parseYaml } from "obsidian";
  import type Renderer from "../chartRenderer";
  import { createEventDispatcher } from "svelte";
  import CollapsibleSection from './CollapsibleSection.svelte'
  import { renderError } from "src/util";
  import type { DataField } from "src/constants/settingsConstants";
import type { Chart, Color } from "chart.js";

  export let editor: Editor;
  export let renderer: Renderer;

  const dispatch = createEventDispatcher();
  let chartTitle: string = "Progress Clock";
  let numSegments: number = 4;
  let tickColorString: string = "rgba(255,255,255,1)";
  let tockColorString: string = "rgba(50,50,50,1)";
  let lastChart: Chart = null;
  let width: number = 80;
  let data: DataField[] = [{ dataTitle: "", data: "", ticked: "", tickColor: "", tockColor: ""}];
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
    data[0] = {dataTitle: "Progress Clock", data: dataString, ticked: tickedString, tickColor: tickColorString, tockColor: tockColorString}
  }

  $: chart = `type: "pie"
chartTitle: ${chartTitle}
labels: []
series:
${data
  .map((data) => `  - title: ${data.dataTitle}\n    data: [${data.data}]\n    ticked: [${data.ticked}]\n    tickColor: ${data.tickColor}\n    tockColor: ${data.tockColor}`)
  .join("\n")}
width: ${width}%`;

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
        <tr>
          <td class="desc">
            <p class="mainDesc">Tick Colour</p>
            <p class="subDesc">The colour of marked off segments</p>
          </td>
          <td class="controlElement">
            <select name="Tick Colour" id="tick-color" class="dropdown" bind:value={tickColorString}>
              <option style="background:rgba(200,0,0,1)" value="rgba(200,0,0,1)">Red</option>
              <option style="background:rgba(0,200,0,1)" value="rgba(0,200,0,1)">Green</option>
              <option style="background:rgba(0,0,200,1)" value="rgba(0,0,200,1)">Blue</option>
              <option style="background:rgba(200,200,200,1);color:black;" value="rgba(255,255,255,1)">White</option>
              <option style="background:rgba(100,100,100,1)" value="rgba(100,100,100,1)">Light Grey</option>
              <option style="background:rgba(200,200,0,1);color:black;" value="rgba(200,200,0,1)">Yellow</option>
              <option style="background:rgba(200,0,200,1)" value="rgba(200,0,200,1)">Purple</option>
            </select>
          </td>
        </tr>
        <tr>
          <td class="desc">
            <p class="mainDesc">Clock Base Colour</p>
            <p class="subDesc">The colour of unmarked segments</p>
          </td>
          <td class="controlElement">
            <select name="Base Colour" id="tock-color" class="dropdown" bind:value={tockColorString}>
              <option style="background:rgba(100,0,0,1)" value="rgba(100,0,0,1)">Red</option>
              <option style="background:rgba(0,100,0,1)" value="rgba(0,100,0,1)">Green</option>
              <option style="background:rgba(0,0,100,1)" value="rgba(0,0,100,1)">Blue</option>
              <option style="background:rgba(50,50,50,1)" value="rgba(50,50,50,1)">Dark Grey</option>
              <option style="background:rgba(100,100,0,1)" value="rgba(100,100,0,1)">Yellow</option>
              <option style="background:rgba(100,0,100,1)" value="rgba(100,0,100,1)">Purple</option>
            </select>
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
