export type WidgetId = string;

export interface SizeLimits {
  minWidth: number;
  minHeight: number;
  prefWidth: number;
  prefHeight: number;
  maxWidth?: number;
  maxHeight?: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Widget extends SizeLimits {
  id: WidgetId;
  title: string;
  kind: 'toolbar' | 'content' | 'panel' | 'control' | 'footer';
  computed: Rect;
}

export interface ContainerRect {
  width: number;
  height: number;
}

export interface LayoutChoice {
  toolbarMode: 'row' | 'twoRows';
  sidebarMode: 'right' | 'below';
  controlsMode: 'horizontal' | 'vertical';
  searchMode: 'full' | 'compact';
  transferMode: 'topOnly' | 'split';
  visibilityMode: 'all' | 'hideShare' | 'hideShareExport';
}

export interface ConstraintViolation {
  message: string;
  penalty: number;
}

export interface LayoutResult {
  widgets: Record<WidgetId, Widget>;
  choice: LayoutChoice;
  score: number;
  violations: ConstraintViolation[];
  debug: string[];
}

export interface LayoutSpec {
  widgets: Record<WidgetId, Widget>;
  padding: number;
  gap: number;
  footerHeight: number;
}

export type PartialRect = Partial<Rect>;

export function cloneWidgets(source: Record<WidgetId, Widget>): Record<WidgetId, Widget> {
  const clone: Record<WidgetId, Widget> = {};
  for (const [id, widget] of Object.entries(source)) {
    clone[id] = {
      ...widget,
      computed: { ...widget.computed },
    };
  }
  return clone;
}

export function clampSize(value: number, min: number, max?: number): number {
  if (max !== undefined) {
    return Math.max(min, Math.min(value, max));
  }
  return Math.max(min, value);
}
