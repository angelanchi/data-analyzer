# Analysis Tool Design Notes

**版本**: 2.0
**最後更新**: 2025-01-22
**狀態**: 已實作

## Current Workflow Snapshot (v2.0)

### Data Processing Flow
- **Upload & Parse**: CSV/Excel files uploaded via multipart/form-data, parsed using papaparse/xlsx.js
- **Data Cleaning**: Frontend-driven cleaning rules applied to raw data (handle missing values, detect outliers)
- **Data View Generation**: Two view modes generated based on user selection:
  - **Flattened Data** (逐筆數據): All original records with optional primary/secondary sorting
  - **Grouped Data** (分組彙總): Aggregated statistics when grouping fields are selected
- **Chart Generation**: Plotly.js (scatter) and Chart.js (line/bar) render charts client-side
- **Export**: Complete data structure exported via unified API endpoint with multi-sheet Excel or sectioned CSV format

### Architecture Components
- **Express Backend**: API routes for upload, data processing, and export; no Python dependencies
- **React Frontend**: Context providers for state management, page-level containers in `frontend/src/pages`
- **Shared Types**: TypeScript type definitions shared between frontend and backend in `shared/types`

## Key Design Decisions (v2.0)

### 1. Two Data View Modes
**Decision**: Simplified from 3 modes (flattened, grouped, hierarchical) to 2 modes (flattened, grouped)
- **Flattened Data**: Preserves all original records, supports primary/secondary sorting
- **Grouped Data**: Aggregates by selected grouping fields with mean/count/min/max/sum statistics
- **Rationale**: Hierarchical sorting functionality merged into flattened view via sorting parameters

### 2. Numeric vs Categorical Metrics Classification
**Decision**: Automatic field classification into numeric and categorical types
- **Numeric Metrics**: Used for statistical calculations and aggregations
- **Categorical Metrics**: Used for grouping, sorting, and chart legend grouping
- **Implementation**: `metadata.columnTypes.numeric` and `metadata.columnTypes.categorical`
- **Benefits**: Clearer UI, prevents invalid operations (e.g., aggregating text fields)

### 3. Primary/Secondary Sorting
**Decision**: Integrated sorting into data view generation instead of separate hierarchical view
- **Primary Sort**: First-level sorting field
- **Secondary Sort**: Second-level sorting field (optional)
- **Applied To**: Flattened data before export
- **Implementation**: `applySorting()` function in exportService.ts

### 4. Export API Unification
**Decision**: Single unified endpoint `POST /api/export/data` for all data exports
- **Old Design**: Separate GET endpoints for CSV/Excel with viewType parameter
- **New Design**: POST endpoint accepting complete data structure
- **Export Structure**:
  - **Excel**: Multi-sheet (Data Overview + Flattened Data + Grouped Data + Statistics)
  - **CSV**: Multi-section format with UTF-8 BOM encoding
- **Parameters**: Includes flattenedData, groupedData, metadata, primarySort, secondarySort
- **Benefits**: Consistent export structure, supports sorting, includes comprehensive metadata

### 5. Chart Export Frontend Handling
**Decision**: Move chart export from backend API to frontend utilities
- **Plotly Charts**: Native `Plotly.downloadImage()` for PNG/SVG export
- **Chart.js Charts**: Canvas `toBlob()` for PNG export
- **Implementation**: `frontend/src/utils/chartExport.ts`
- **Benefits**: Reduces backend complexity, better performance, direct DOM access

## Current Implementation Details

### Data View Generation Logic
Located in `frontend/src/utils/dataViews.ts`:

```typescript
interface CreateDataViewsOptions {
  numericMetrics?: string[];
  categoricalMetrics?: string[];
  groupFields?: string[];
  primarySort?: string | null;
  secondarySort?: string | null;
  uniqueIdConfig?: UniqueIdConfig;
}
```

**Behavior**:
- If `groupFields.length === 0`: Generate flattened view only
- If `groupFields.length > 0`: Generate both flattened and grouped views
- Flattened view preserves all original records
- Grouped view calculates aggregations (mean, count, min, max, sum) for numeric metrics

### Export Service Architecture
Located in `backend/src/services/exportService.ts`:

**Key Functions**:
- `applySorting(data, primarySort, secondarySort)`: Sorts data by specified fields
- `generateDataOverviewSheet()`: Creates metadata summary sheet
- `generateFlattenedDataSheet()`: Creates sorted row-by-row data sheet
- `generateGroupedDataSheet()`: Creates aggregated statistics sheet
- `generateStatisticsSheet()`: Creates field-level statistics sheet

### Metadata Structure
```typescript
interface BatchViewMetadata {
  batchCount: number;
  flattenedRowCount: number;
  groupedPointCount: number;
  flattenParams: string[] | null;
  groupParams: string[] | null;
  defaultMetrics: string[] | null;
  defaultGroups: string[] | null;
  columnTypes: {
    numeric: string[];
    categorical: string[];
  };
  sources: BatchViewSourceSummary[];
  columns: BatchViewColumns;
  aggregations: {...};
}
```

## Completed Improvements (v2.0)

### 1. Simplified Data View Architecture
- ✅ Removed hierarchical view mode
- ✅ Integrated sorting into flattened view
- ✅ Automatic field type classification
- ✅ Unified metadata structure

### 2. Enhanced Export Functionality
- ✅ Unified export API endpoint
- ✅ Multi-sheet Excel export with comprehensive data structure
- ✅ CSV export with UTF-8 BOM encoding
- ✅ Sorting support in export (primary/secondary)
- ✅ Metadata inclusion in exports

### 3. Frontend Optimization
- ✅ Centralized API services in `frontend/src/services/api.ts`
- ✅ Chart export moved to frontend utilities
- ✅ Type-safe implementations with shared TypeScript definitions
- ✅ Color-coded UI for metric types (numeric: blue, categorical: orange)

### 4. Backend Service Improvements
- ✅ Removed Python pipeline dependencies
- ✅ Pure Node.js/TypeScript implementation
- ✅ Simplified service architecture (exportService.ts, dataProcessingService.ts)
- ✅ Consistent error handling

## UI/UX Design Patterns

### Parameter Selection Interface
Located in `DataParameterSelector.tsx`:
- **Numeric Metrics**: Blue chips, used for calculations and aggregations
- **Categorical Metrics**: Orange chips, used for grouping and labeling
- **Sorting Selectors**: Dropdown selectors with colored chips showing field types
- **Grouping Fields**: Multi-select with automatic view mode switching

### Data View Preview
Located in `DataViewPreview.tsx`:
- **Auto-switching**: Displays flattened or grouped view based on groupFields selection
- **Preview Limit**: Shows first 5-10 rows for performance
- **Column Headers**: Highlight aggregation suffixes (_mean, _count, _min, _max, _sum)
- **Row Count**: Display total rows and preview row count

### Chart Configuration
Located in `ChartTypeSelector.tsx`:
- **Chart Type**: Scatter (Plotly), Line (Chart.js), Bar (Chart.js)
- **Axis Selection**: X-axis and Y-axis from selected metrics
- **Legend Grouping**: Optional categorical field for chart legend grouping
- **Recommendations**: Automatic chart type suggestions based on data characteristics

## Future Roadmap

### Planned Enhancements (v2.1+)
1. **Authentication & Authorization**
   - JWT-based authentication
   - Role-based access control (Admin, User, Viewer)
   - Project-level permissions

2. **Real-time Collaboration**
   - Socket.io integration for multi-user sessions
   - Cursor position tracking
   - Conflict resolution for concurrent edits

3. **Advanced Analytics**
   - Web Workers for large file processing
   - Virtualized data tables for > 10,000 rows
   - Chart virtualization for large datasets
   - Statistical test integration (normality, correlation)

4. **Data Quality**
   - Automatic outlier detection visualization
   - Data profiling summaries
   - Schema drift warnings
   - Missing value analysis

5. **Export Enhancements**
   - PDF report generation
   - Custom template support
   - Scheduled exports
   - Email delivery

## Technical Debt

### Known Limitations
- Large file handling (>100MB) causes performance issues
- Chart rendering slow with >10,000 data points
- Limited unit test coverage
- No integration tests for export functionality

### Mitigation Strategies
- Implement Web Workers for file processing
- Add chart data sampling for large datasets
- Backfill unit tests (target: 70% coverage)
- Add E2E tests using Playwright/Cypress

---

**Document Version History**:
- v2.0 (2025-01-22): Major update reflecting two-view architecture, unified export API, and removal of Python pipeline
- v1.0 (2025-10-14): Initial version documenting Python-based analysis pipeline
