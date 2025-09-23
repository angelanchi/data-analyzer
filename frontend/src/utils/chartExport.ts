/**
 * Chart Export Utilities
 * Handles exporting charts as PNG/SVG directly from the frontend
 */

import html2canvas from 'html2canvas';

export interface ChartExportOptions {
  filename: string;
  format: 'png' | 'svg';
  scale?: number;
  backgroundColor?: string;
}

/**
 * Export a Chart.js or Plotly.js chart as PNG
 * @param chartElement - The HTML element containing the chart
 * @param options - Export options
 */
export const exportChartAsPNG = async (
  chartElement: HTMLElement,
  options: ChartExportOptions
): Promise<void> => {
  try {
    const scale = options.scale || 2;
    const canvas = await html2canvas(chartElement, {
      scale,
      backgroundColor: options.backgroundColor || '#ffffff',
      logging: false,
      useCORS: true,
    });

    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (!blob) {
        throw new Error('Failed to create image blob');
      }

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${options.filename}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 'image/png');
  } catch (error) {
    console.error('Error exporting chart as PNG:', error);
    throw new Error('Failed to export chart as PNG');
  }
};

/**
 * Export a Plotly chart as PNG using Plotly's built-in export
 * @param plotlyDiv - The Plotly div element
 * @param options - Export options
 */
export const exportPlotlyChartAsPNG = async (
  plotlyDiv: HTMLElement,
  options: ChartExportOptions
): Promise<void> => {
  try {
    // Check if Plotly is available
    const Plotly = (window as any).Plotly;
    if (!Plotly) {
      throw new Error('Plotly library not found');
    }

    // Use Plotly's downloadImage function
    await Plotly.downloadImage(plotlyDiv, {
      format: 'png',
      width: 1200,
      height: 600,
      filename: options.filename,
      scale: options.scale || 2,
    });
  } catch (error) {
    console.error('Error exporting Plotly chart as PNG:', error);
    // Fallback to html2canvas if Plotly export fails
    await exportChartAsPNG(plotlyDiv, options);
  }
};

/**
 * Export a Chart.js canvas as PNG
 * @param canvasElement - The Chart.js canvas element
 * @param options - Export options
 */
export const exportChartJsAsPNG = (
  canvasElement: HTMLCanvasElement,
  options: ChartExportOptions
): void => {
  try {
    // Chart.js renders on canvas, so we can directly get the data URL
    const url = canvasElement.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
    link.download = `${options.filename}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error exporting Chart.js as PNG:', error);
    throw new Error('Failed to export chart as PNG');
  }
};

/**
 * Export a Plotly chart as SVG
 * @param plotlyDiv - The Plotly div element
 * @param options - Export options
 */
export const exportPlotlyChartAsSVG = async (
  plotlyDiv: HTMLElement,
  options: ChartExportOptions
): Promise<void> => {
  try {
    const Plotly = (window as any).Plotly;
    if (!Plotly) {
      throw new Error('Plotly library not found');
    }

    await Plotly.downloadImage(plotlyDiv, {
      format: 'svg',
      width: 1200,
      height: 600,
      filename: options.filename,
    });
  } catch (error) {
    console.error('Error exporting Plotly chart as SVG:', error);
    throw new Error('Failed to export chart as SVG. SVG export is only supported for Plotly charts.');
  }
};

/**
 * Export a chart element as SVG (for Chart.js, converts via canvas)
 * Note: This is a fallback for Chart.js charts which don't natively support SVG
 * @param chartElement - The chart container element
 * @param options - Export options
 */
export const exportChartAsSVG = async (
  chartElement: HTMLElement,
  options: ChartExportOptions
): Promise<void> => {
  // For Plotly charts, use native SVG export
  if (chartElement.classList.contains('js-plotly-plot') ||
      chartElement.querySelector('.js-plotly-plot')) {
    const plotlyDiv = chartElement.classList.contains('js-plotly-plot')
      ? chartElement
      : chartElement.querySelector('.js-plotly-plot') as HTMLElement;

    if (plotlyDiv) {
      await exportPlotlyChartAsSVG(plotlyDiv, options);
      return;
    }
  }

  // For Chart.js, convert to SVG via canvas
  throw new Error('SVG export is only supported for Plotly charts. Please use PNG format for Chart.js charts.');
};

/**
 * Detect chart type and export accordingly
 * @param chartElement - The chart container element
 * @param options - Export options
 */
export const exportChart = async (
  chartElement: HTMLElement | null,
  options: ChartExportOptions
): Promise<void> => {
  if (!chartElement) {
    throw new Error('Chart element not found');
  }

  // Check if it's a Plotly chart
  const isPlotly = chartElement.classList.contains('js-plotly-plot') ||
                   chartElement.querySelector('.js-plotly-plot');

  // Check if it's a Chart.js canvas
  const canvasElement = chartElement.querySelector('canvas') as HTMLCanvasElement;

  if (options.format === 'svg') {
    await exportChartAsSVG(chartElement, options);
  } else if (isPlotly) {
    const plotlyDiv = chartElement.classList.contains('js-plotly-plot')
      ? chartElement
      : chartElement.querySelector('.js-plotly-plot') as HTMLElement;
    await exportPlotlyChartAsPNG(plotlyDiv, options);
  } else if (canvasElement) {
    exportChartJsAsPNG(canvasElement, options);
  } else {
    // Fallback to html2canvas for any chart
    await exportChartAsPNG(chartElement, options);
  }
};
