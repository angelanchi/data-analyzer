// 瀏覽器擴展錯誤防護工具

const EXTENSION_ERROR_PATTERNS = [
  'content-all.js',
  'translate-page',
  'chrome-extension',
  'moz-extension',
  'extension-',
  'popup.js',
  'content_script',
  'grammarly',
  'adblock',
  'ublock'
];

// 檢查錯誤是否來自瀏覽器擴展
export const isExtensionError = (error: Error | string): boolean => {
  const errorString = typeof error === 'string' ? error : error.message || error.stack || '';

  return EXTENSION_ERROR_PATTERNS.some(pattern =>
    errorString.toLowerCase().includes(pattern.toLowerCase())
  );
};

// 過濾擴展錯誤的控制台包裝器
export const setupExtensionErrorFilter = () => {
  if (typeof window === 'undefined') return;

  // 保存原始的 console 方法
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;

  // 包裝 console.error
  console.error = (...args: any[]) => {
    const errorMessage = args.join(' ');
    if (!isExtensionError(errorMessage)) {
      originalConsoleError.apply(console, args);
    }
  };

  // 包裝 console.warn
  console.warn = (...args: any[]) => {
    const warnMessage = args.join(' ');
    if (!isExtensionError(warnMessage)) {
      originalConsoleWarn.apply(console, args);
    }
  };

  // 監聽未捕獲的錯誤
  window.addEventListener('error', (event) => {
    if (isExtensionError(event.error || event.message)) {
      event.preventDefault();
      event.stopPropagation();
      return false;
    }
  });

  // 監聽未處理的 Promise 拒絕
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && isExtensionError(event.reason)) {
      event.preventDefault();
      return false;
    }
  });
};

// 清理應用程序錯誤日志
export const cleanErrorMessage = (error: Error | string): string => {
  const errorString = typeof error === 'string' ? error : error.message || error.toString();

  if (isExtensionError(errorString)) {
    return '[Browser Extension Error - Filtered]';
  }

  return errorString;
};

// 創建安全的錯誤報告函數
export const reportError = (error: Error | string, context?: string) => {
  if (isExtensionError(error)) {
    // 不報告擴展錯誤
    return;
  }

  const message = typeof error === 'string' ? error : error.message;
  const stack = typeof error === 'object' && error.stack ? error.stack : '';

  console.error(`[App Error]${context ? ` [${context}]` : ''}:`, message);
  if (stack) {
    console.error('Stack trace:', stack);
  }
};

// 初始化防護系統
export const initializeExtensionGuard = () => {
  setupExtensionErrorFilter();

  // 添加應用程序標識，便於調試
  if (process.env.NODE_ENV === 'development') {
    console.log('🛡️ Extension error filter initialized');
  }
};