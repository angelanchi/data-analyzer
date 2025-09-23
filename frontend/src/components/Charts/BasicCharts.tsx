import React, { useRef, forwardRef, useImperativeHandle } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  ChartData,
} from 'chart.js';
import { Scatter } from 'react-chartjs-2';
import { Box, Typography, Paper, Alert } from '@mui/material';
import { ChartConfig } from '../../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  Legend
);

type GenericRecord = Record<string, unknown>;

interface BasicChartsProps {
  data: GenericRecord[];
  config: ChartConfig;
  width?: number;
  height?: number;
}

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : NaN;
  }
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : NaN;
  }
  return NaN;
};

const sortByField = (rows: GenericRecord[], field: string): GenericRecord[] => {
  return [...rows].sort((a, b) => String(a[field]).localeCompare(String(b[field])));
};

const prepareDotData = (
  rows: GenericRecord[],
  xField: string,
  yField: string,
  groupBy?: string
): ChartData<'scatter'> => {
  const colors = [
    'rgba(255, 99, 132, 0.7)',
    'rgba(54, 162, 235, 0.7)',
    'rgba(255, 205, 86, 0.7)',
    'rgba(75, 192, 192, 0.7)',
    'rgba(153, 102, 255, 0.7)',
    'rgba(255, 159, 64, 0.7)',
  ];

  if (!groupBy) {
    // Create scatter data points with categorical x-axis
    const xLabels = Array.from(new Set(rows.map((row) => String(row[xField]))));
    const data = rows.map((row) => ({
      x: xLabels.indexOf(String(row[xField])),
      y: toNumber(row[yField]) || 0,
    }));

    return {
      labels: xLabels,
      datasets: [
        {
          label: yField,
          data,
          backgroundColor: colors[0],
          borderColor: colors[0].replace('0.7', '1'),
          pointRadius: 6,
          pointHoverRadius: 8,
        },
      ],
    };
  }

  const groupMap = new Map<string, GenericRecord[]>();
  rows.forEach((row) => {
    const key = String(row[groupBy]);
    if (!groupMap.has(key)) {
      groupMap.set(key, []);
    }
    groupMap.get(key)!.push(row);
  });

  const xLabels = Array.from(new Set(rows.map((row) => String(row[xField]))));

  const datasets = Array.from(groupMap.entries()).map(([group, groupRows], index) => {
    const color = colors[index % colors.length];
    const data = groupRows.map((row) => ({
      x: xLabels.indexOf(String(row[xField])),
      y: toNumber(row[yField]) || 0,
    }));

    return {
      label: group,
      data,
      backgroundColor: color,
      borderColor: color.replace('0.7', '1'),
      pointRadius: 6,
      pointHoverRadius: 8,
    };
  });

  return {
    labels: xLabels,
    datasets,
  };
};


const BasicCharts = forwardRef<any, BasicChartsProps>(({ data, config, width = 800, height = 400 }, ref) => {
  const chartRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Expose the container div to parent components for export
  useImperativeHandle(ref, () => containerRef.current);

  const chartData = (() => {
    const xField = String(config.xAxis);
    const yField = Array.isArray(config.yAxis) ? String(config.yAxis[0]) : String(config.yAxis);

    switch (config.type) {
    case 'bar':
      return prepareDotData(data, xField, yField, config.groupBy);
    default:
      return null;
    }
  })();

  if (!chartData) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Alert severity="error">Unable to build chart with the provided configuration.</Alert>
      </Paper>
    );
  }

  const baseOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: Boolean(config.title),
        text: config.title || '',
      },
    },
  };

  let chartElement: React.ReactNode;

  switch (config.type) {
  case 'bar':
    chartElement = (
      <Scatter ref={chartRef} data={chartData as ChartData<'scatter'>} options={{
        ...baseOptions,
        scales: {
          x: {
            type: 'category',
            labels: (chartData as any)?.labels || [],
            title: {
              display: true,
              text: config.xAxis,
            },
          },
          y: {
            title: {
              display: true,
              text: Array.isArray(config.yAxis) ? config.yAxis.join(', ') : config.yAxis,
            },
          },
        },
      } as ChartOptions<'scatter'>} width={width} height={height} />
    );
    break;
  default:
    chartElement = <Alert severity="warning">Unsupported chart type: {config.type}</Alert>;
  }

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
      <Box ref={containerRef} sx={{ position: 'relative', height, width: '100%' }}>{chartElement}</Box>
    </Paper>
  );
});

BasicCharts.displayName = 'BasicCharts';

export default BasicCharts;
