export const checkPlotlyConflicts = (): string[] => {
  const warnings: string[] = [];

  if (typeof window === 'undefined') {
    return warnings;
  }

  try {
    // 檢查是否有多個圖表庫實例
    const chartjsInstances = (window as any).Chart;
    const plotlyInstances = (window as any).Plotly;

    if (chartjsInstances && plotlyInstances) {
      warnings.push('檢測到 Chart.js 和 Plotly.js 同時存在，可能產生衝突');
    }

    // 檢查 DOM 汙染
    const chartContainers = document.querySelectorAll('[data-reactroot], [data-plotly], .chartjs-chart');
    if (chartContainers.length > 10) {
      warnings.push('檢測到過多圖表容器，可能影響性能');
    }

    // 檢查記憶體使用
    if ((performance as any).memory) {
      const memInfo = (performance as any).memory;
      const usedMB = memInfo.usedJSHeapSize / 1024 / 1024;
      if (usedMB > 100) {
        warnings.push(`記憶體使用較高 (${usedMB.toFixed(1)}MB)，建議清理圖表`);
      }
    }

  } catch (error) {
    warnings.push('圖表安全檢查時發生錯誤');
  }

  return warnings;
};

export const cleanupChartMemory = () => {
  try {
    // 清理 Plotly 圖表
    if ((window as any).Plotly && (window as any).Plotly.purge) {
      const plotlyDivs = document.querySelectorAll('[data-plotly]');
      plotlyDivs.forEach((div) => {
        (window as any).Plotly.purge(div);
      });
    }

    // 觸發垃圾回收（如果可用）
    if ((window as any).gc) {
      (window as any).gc();
    }

  } catch (error) {
    console.warn('清理圖表記憶體時發生錯誤:', error);
  }
};

export const safeChartRender = async (renderFn: () => Promise<void> | void): Promise<boolean> => {
  try {
    const warnings = checkPlotlyConflicts();
    if (warnings.length > 0) {
      console.warn('圖表渲染警告:', warnings);
    }

    await renderFn();
    return true;
  } catch (error) {
    console.error('圖表渲染失敗:', error);
    return false;
  }
};