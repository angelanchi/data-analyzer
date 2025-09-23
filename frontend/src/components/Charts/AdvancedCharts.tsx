import React, { useRef, forwardRef, useImperativeHandle } from 'react';
import Plot from 'react-plotly.js';
import { Box, Typography, Paper, Alert } from '@mui/material';
import { ChartConfig } from '../../types';

type GenericRecord = Record<string, unknown>;

interface AdvancedChartsProps {
  data: GenericRecord[];
  config: ChartConfig;
  width?: number;
  height?: number;
}

const toNumberOrNull = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const AdvancedCharts = forwardRef<any, AdvancedChartsProps>(({ data, config, width = 800, height = 400 }, ref) => {
  const plotRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Expose the container div to parent components for export
  useImperativeHandle(ref, () => containerRef.current);

  if (!data || data.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Alert severity="error">No data available for advanced charts.</Alert>
      </Paper>
    );
  }

  const xField = String(config.xAxis);
  const yField = Array.isArray(config.yAxis) ? String(config.yAxis[0]) : String(config.yAxis);

  const prepareScatter = (): any[] => {
    if (!config.groupBy) {
      return [
        {
          x: data.map((row) => row[xField]),
          y: data.map((row) => row[yField]),
          type: 'scatter',
          mode: 'markers',
          marker: {
            size: 8,
            color: 'rgba(54, 162, 235, 0.7)',
            line: { color: 'rgba(54, 162, 235, 1)', width: 1 },
          },
          name: `${xField} vs ${yField}`,
          text: data.map(
            (row) => `${xField}: ${row[xField]}<br>${yField}: ${row[yField]}`
          ),
          hovertemplate: '%{text}<extra></extra>',
        },
      ];
    }

    const groupMap = new Map<string, GenericRecord[]>();
    data.forEach((row) => {
      const key = String(row[config.groupBy!]);
      if (!groupMap.has(key)) {
        groupMap.set(key, []);
      }
      groupMap.get(key)!.push(row);
    });

    const colors = [
      'rgba(255, 99, 132, 0.7)',
      'rgba(54, 162, 235, 0.7)',
      'rgba(255, 205, 86, 0.7)',
      'rgba(75, 192, 192, 0.7)',
      'rgba(153, 102, 255, 0.7)',
      'rgba(255, 159, 64, 0.7)',
    ];

    return Array.from(groupMap.entries()).map(([group, rows], index) => {
      const color = colors[index % colors.length];
      return {
        x: rows.map((row) => row[xField]),
        y: rows.map((row) => row[yField]),
        type: 'scatter',
        mode: 'markers',
        marker: {
          size: 8,
          color,
          line: { color: color.replace('0.7', '1'), width: 1 },
        },
        name: group,
        text: rows.map(
          (row) => `${config.groupBy}: ${group}<br>${xField}: ${row[xField]}<br>${yField}: ${row[yField]}`
        ),
        hovertemplate: '%{text}<extra></extra>',
      };
    });
  };


  const plotData = (() => {
    switch (config.type) {
    case 'scatter':
      return prepareScatter();
    default:
      return null;
    }
  })();

  if (!plotData) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Alert severity="error">Unsupported chart type for advanced renderer.</Alert>
      </Paper>
    );
  }

  const baseLayout = {
    title: {
      text: config.title || `${config.type.toUpperCase()} chart`,
      font: { size: 16 },
    },
    autosize: true,
    width,
    height,
    margin: { l: 60, r: 60, t: 80, b: 60 },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
  };

  const plotLayout = (() => {
    switch (config.type) {
    case 'scatter':
      return {
        ...baseLayout,
        xaxis: { title: { text: config.xAxis }, showgrid: true, gridcolor: 'rgba(0,0,0,0.1)' },
        yaxis: { title: { text: Array.isArray(config.yAxis) ? config.yAxis.join(', ') : config.yAxis }, showgrid: true, gridcolor: 'rgba(0,0,0,0.1)' },
        hovermode: 'closest' as const,
      };
    default:
      return baseLayout;
    }
  })();

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          {config.title || `${config.type.toUpperCase()} chart`}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          X axis: {config.xAxis} | Y axis: {Array.isArray(config.yAxis) ? config.yAxis.join(', ') : config.yAxis}
          {config.groupBy && ` | Group by: ${config.groupBy}`}
        </Typography>
      </Box>
      <Box ref={containerRef} sx={{ width: '100%', overflow: 'hidden' }}>
        <Plot
          ref={plotRef}
          data={plotData}
          layout={plotLayout}
          config={{
            responsive: true,
            displayModeBar: true,
            displaylogo: false,
            modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
            toImageButtonOptions: {
              format: 'png',
              filename: `${config.type}_chart`,
              height,
              width,
              scale: 2,
            },
          }}
          style={{ width: '100%', height: '100%' }}
          useResizeHandler
        />
      </Box>
    </Paper>
  );
});

AdvancedCharts.displayName = 'AdvancedCharts';

export default AdvancedCharts;
