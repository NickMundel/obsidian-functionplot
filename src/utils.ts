import { PlotOptions } from "./types";

export function parseToPlot(result: PlotOptions): string {
    return `
\`\`\`functionplot
---
title: ${result.title}
xLabel: ${result.xLabel}
yLabel: ${result.yLabel}
bounds: [${result.bounds}]
disableZoom: ${result.disableZoom}
grid: ${result.grid}
---
${(result.functions ?? []).map(line => {
    let string = line.function
    if(line.derivative) string = string + " | " + line.derivative + " | " + line.updateOnMouseMove
    return string
})}
\`\`\`
`;
}
