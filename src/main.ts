import functionPlot, { Chart } from 'function-plot'
import { FunctionPlotDatum, FunctionPlotOptions } from 'function-plot/dist/types'
import { MarkdownPostProcessorContext, Plugin, parseYaml, Editor } from 'obsidian'
import CreatePlotModal from './app/CreatePlotModal'
import SettingsTab from './app/SettingsTab'
import { parseToPlot } from "./utils"
import createStylingPlugin from './plugins/styling'
import { PlotOptions, DEFAULT_PLOT_OPTIONS, PluginSettings, DEFAULT_PLOT_PLUGIN_SETTINGS, FunctionOptions } from './types'

export default class ObsidianFunctionPlot extends Plugin {
  settings: PluginSettings
  activePlots: Chart[]

  async onload(): Promise<void> {
    // load settings
    await this.loadSettings();
    this.activePlots = [];
    // add settings tab
    this.addSettingTab(new SettingsTab(this.app, this))
    // register command for PlotModal
    this.addCommand({
      id: 'insert-functionplot',
      name: 'Plot a function',
      editorCallback: (editor: Editor) => {
        new CreatePlotModal(this.app, this, (result) => {
          const line = editor.getCursor().line
          editor.setLine(line, parseToPlot(result))
        }).open()
      },
    })
    // register code block renderer
    this.registerMarkdownCodeBlockProcessor(
      'functionplot',
      this.createFunctionPlotHandler(this)
    )
    this.registerDomEvent(window, "resize", this.handleResize.bind(this));
  }

  handleResize() {
    // Hier können Sie weitere Aktionen basierend auf der neuen Fenstergröße ausführen
    this.activePlots.forEach(plot => {
      setTimeout(async () => {
        const target: HTMLElement = <HTMLElement>plot.options.target
        plot.options.width = target.parentElement?.clientWidth;
        plot.build()
      }, 0);
    });
  }
  
  async loadSettings() {
    // TODO load default settings for font size, color and line width from themes
    this.settings = Object.assign({}, DEFAULT_PLOT_PLUGIN_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  createFunctionPlotHandler(plugin: ObsidianFunctionPlot) {
    return async (
      source: string,
      el: HTMLElement,
      _ctx: MarkdownPostProcessorContext
    ) => {

      // parse functionplot options
      const header: string = (source.match(/-{3}[^]*-{3}/) || [null])[0]

      const functions: FunctionOptions[] = (header ? source.substring(header.length) : source)
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map(line => {
        const [func, derivative, updateOnMouseMove] = line.split(' | ').filter(el => el.length > 0).slice(0, 3);
        return {
          function: func || '',
          derivative: derivative || '',
          updateOnMouseMove: updateOnMouseMove ? updateOnMouseMove.toLowerCase() === 'true' : false
        };
      });

      const options: PlotOptions = Object.assign(
        {},
        DEFAULT_PLOT_OPTIONS,
        header ? parseYaml(header.match(/-{3,}([^]*?)-{3,}/)[1]) : {},
        { functions: functions }
      )
      
      await setTimeout(async () => {
        const parentWidth = el.parentElement?.clientWidth;
          this.activePlots.push(await createPlot(options, el, plugin, parentWidth))
      }, 0);
    }
  }
  
}

export async function createPlot(
  options: PlotOptions,
  target: HTMLElement,
  plugin: ObsidianFunctionPlot,
  width: number
): Promise<Chart> {
  try {
    const fPlotOptions: FunctionPlotOptions = {
      target: target,
      plugins: [createStylingPlugin(plugin)],
      title: options.title,
      grid: options.grid,
      disableZoom: options.disableZoom,
      xAxis: {
        domain: options.bounds.slice(0, 2),
        label: options.xLabel,
      },
      yAxis: {
        domain: options.bounds.slice(2, 4),
        label: options.yLabel,
      },
      data: options.functions.map((line) => {
        const result: Partial<FunctionPlotDatum> = { 
          fn: line.function.split('=')[1], 
          graphType: 'polyline' as const
        };
      
        if (line.derivative) {
          result.derivative = {
            fn: line.derivative,
            updateOnMouseMove: line.updateOnMouseMove
          };
        }
      
        return result as FunctionPlotDatum;
      })
    }
    width ? fPlotOptions.width = width : null
    const plot = functionPlot(fPlotOptions)
    
    return plot
  } catch (e) {
    console.debug(e)
  }
}


