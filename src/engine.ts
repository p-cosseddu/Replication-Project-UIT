import {
  LayoutChoice,
  LayoutResult,
  LayoutSpec,
  Widget,
  cloneWidgets,
  clampSize,
} from './model';
import {
  alignLeft,
  alignTop,
  enforceInsideContainer,
  enforceSizeLimits,
  penalizeDistanceFromPreferred,
  placeBelow,
  placeRightOf,
} from './constraints';
import { OR_GROUPS } from './demo';

function setRect(widget: Widget, x: number, y: number, width: number, height: number): void {
  widget.computed = { x, y, width, height };
}

function sumPenalty(violations: { penalty: number }[]): number {
  return violations.reduce((sum, violation) => sum + violation.penalty, 0);
}

function chooseAllAlternatives(): LayoutChoice[] {
  const choices: LayoutChoice[] = [];

  for (const toolbarMode of OR_GROUPS.toolbar) {
    for (const sidebarMode of OR_GROUPS.sidebar) {
      for (const controlsMode of OR_GROUPS.controls) {
        choices.push({ toolbarMode, sidebarMode, controlsMode });
      }
    }
  }

  return choices;
}

function addDistancePenalty(
  actual: number,
  target: number,
  weight: number,
  violations: LayoutResult['violations'],
  message: string,
): void {
  violations.push({
    message,
    penalty: Math.abs(actual - target) * weight,
  });
}

function addMinThresholdPenalty(
  actual: number,
  threshold: number,
  weight: number,
  violations: LayoutResult['violations'],
  message: string,
): void {
  if (actual < threshold) {
    violations.push({
      message,
      penalty: (threshold - actual) * weight,
    });
  }
}

function addMaxThresholdPenalty(
  actual: number,
  threshold: number,
  weight: number,
  violations: LayoutResult['violations'],
  message: string,
): void {
  if (actual > threshold) {
    violations.push({
      message,
      penalty: (actual - threshold) * weight,
    });
  }
}

function layoutToolbar(
  spec: LayoutSpec,
  widgets: Record<string, Widget>,
  width: number,
  choice: LayoutChoice,
  debug: string[],
): number {
  const { padding, gap } = spec;
  const title = widgets.title;
  const search = widgets.search;
  const filter = widgets.filter;
  const exportBtn = widgets.export;
  const share = widgets.share;

  const rowY = padding;
  const itemHeight = title.prefHeight;

  const titleWidth = clampSize(
    Math.min(title.prefWidth, width * 0.24),
    title.minWidth,
    title.maxWidth,
  );

  const searchWidth = clampSize(
    Math.min(search.prefWidth, width * 0.22),
    search.minWidth,
    search.maxWidth,
  );

  const filterWidth = clampSize(filter.prefWidth, filter.minWidth, filter.maxWidth);
  const exportWidth = clampSize(exportBtn.prefWidth, exportBtn.minWidth, exportBtn.maxWidth);
  const shareWidth = clampSize(share.prefWidth, share.minWidth, share.maxWidth);

  setRect(title, padding, rowY, titleWidth, itemHeight);

  if (choice.toolbarMode === 'row') {
    const totalToolsWidth = searchWidth + filterWidth + exportWidth + shareWidth + gap * 3;
    const minStartAfterTitle = title.computed.x + title.computed.width + gap * 2;
    const toolsStartX = Math.max(width - padding - totalToolsWidth, minStartAfterTitle);

    setRect(search, toolsStartX, rowY, searchWidth, itemHeight);
    setRect(filter, search.computed.x + search.computed.width + gap, rowY, filterWidth, itemHeight);
    setRect(exportBtn, filter.computed.x + filter.computed.width + gap, rowY, exportWidth, itemHeight);
    setRect(share, exportBtn.computed.x + exportBtn.computed.width + gap, rowY, shareWidth, itemHeight);

    debug.push('OR choice: toolbar arranged in one row');
    return rowY + itemHeight + gap;
  }

  const secondRowY = rowY + itemHeight + gap;
  const firstRowStartX = title.computed.x + title.computed.width + gap * 2;
  const firstRowAvailable = width - padding - firstRowStartX;
  const actualSearchWidth = clampSize(
    Math.min(searchWidth, firstRowAvailable),
    search.minWidth,
    search.maxWidth,
  );

  setRect(search, firstRowStartX, rowY, actualSearchWidth, itemHeight);

  const secondRowButtonWidth = clampSize(
    Math.max(filter.minWidth, Math.min(150, (width - padding * 2 - gap * 2) / 3)),
    120,
    170,
  );

  const secondRowTotal = secondRowButtonWidth * 3 + gap * 2;
  const secondRowAvailable = width - padding * 2;
  const secondRowStartX = padding + Math.max(0, (secondRowAvailable - secondRowTotal) / 2);

  setRect(filter, secondRowStartX, secondRowY, secondRowButtonWidth, itemHeight);
  setRect(exportBtn, filter.computed.x + filter.computed.width + gap, secondRowY, secondRowButtonWidth, itemHeight);
  setRect(share, exportBtn.computed.x + exportBtn.computed.width + gap, secondRowY, secondRowButtonWidth, itemHeight);

  debug.push('OR choice: toolbar wrapped into two rows');
  return secondRowY + itemHeight + gap;
}

function layoutFooter(spec: LayoutSpec, widgets: Record<string, Widget>, width: number, height: number): void {
  const { padding, footerHeight } = spec;
  setRect(widgets.footer, padding, height - padding - footerHeight, width - padding * 2, footerHeight);
}

function layoutBody(
  spec: LayoutSpec,
  widgets: Record<string, Widget>,
  width: number,
  headerBottom: number,
  choice: LayoutChoice,
  debug: string[],
): void {
  const { padding, gap } = spec;
  const bodyTop = headerBottom;
  const footerTop = widgets.footer.computed.y;
  const bodyHeight = footerTop - bodyTop - gap;
  const bodyWidth = width - padding * 2;

  const content = widgets.content;
  const sidebar = widgets.sidebar;

  if (choice.sidebarMode === 'right') {
    const usableWidth = bodyWidth - gap;
    const preferredSidebarRatio = 0.34;

    let sidebarWidth = clampSize(
      usableWidth * preferredSidebarRatio,
      sidebar.minWidth,
      sidebar.maxWidth,
    );

    // Keep the content panel dominant, but do not starve the sidebar.
    sidebarWidth = Math.max(sidebarWidth, Math.min(sidebar.prefWidth, 360));

    let contentWidth = usableWidth - sidebarWidth;

    if (contentWidth < content.minWidth) {
      const missing = content.minWidth - contentWidth;
      sidebarWidth = Math.max(sidebar.minWidth, sidebarWidth - missing);
      contentWidth = usableWidth - sidebarWidth;
    }

    setRect(content, padding, bodyTop, contentWidth, bodyHeight);
    setRect(sidebar, content.computed.x + content.computed.width + gap, bodyTop, sidebarWidth, bodyHeight);

    debug.push('OR choice: sidebar placed to the right of the content');
    return;
  }

  const preferredSidebarHeightRatio = 0.32;
  const usableHeight = bodyHeight - gap;

  let sidebarHeight = clampSize(
    usableHeight * preferredSidebarHeightRatio,
    sidebar.minHeight,
    sidebar.maxHeight,
  );

  let contentHeight = usableHeight - sidebarHeight;

  if (contentHeight < content.minHeight) {
    const missing = content.minHeight - contentHeight;
    sidebarHeight = Math.max(sidebar.minHeight, sidebarHeight - missing);
    contentHeight = usableHeight - sidebarHeight;
  }

  setRect(content, padding, bodyTop, bodyWidth, contentHeight);
  setRect(sidebar, padding, content.computed.y + content.computed.height + gap, bodyWidth, sidebarHeight);

  debug.push('OR choice: sidebar placed below the content');
}

function layoutControls(
  spec: LayoutSpec,
  widgets: Record<string, Widget>,
  choice: LayoutChoice,
  debug: string[],
): void {
  const { gap } = spec;
  const sidebar = widgets.sidebar;
  const ctrlA = widgets.ctrlA;
  const ctrlB = widgets.ctrlB;
  const ctrlC = widgets.ctrlC;

  const innerPadding = 16;
  const startX = sidebar.computed.x + innerPadding;
  const startY = sidebar.computed.y + 130;
  const availableWidth = sidebar.computed.width - innerPadding * 2;

  if (choice.controlsMode === 'horizontal') {
    const targetGap = 12;
    const targetWidth = (availableWidth - targetGap * 2) / 3;
    const controlWidth = clampSize(targetWidth, ctrlA.minWidth, ctrlA.maxWidth);
    const totalWidth = controlWidth * 3;
    const actualGap = Math.max(8, (availableWidth - totalWidth) / 2);

    setRect(ctrlA, startX, startY, controlWidth, ctrlA.prefHeight);
    setRect(ctrlB, ctrlA.computed.x + ctrlA.computed.width + actualGap, startY, controlWidth, ctrlB.prefHeight);
    setRect(ctrlC, ctrlB.computed.x + ctrlB.computed.width + actualGap, startY, controlWidth, ctrlC.prefHeight);

    debug.push('OR choice: controls panel arranged horizontally');
    return;
  }

  const controlWidth = clampSize(Math.min(availableWidth, 200), ctrlA.minWidth, ctrlA.maxWidth);
  setRect(ctrlA, startX, startY, controlWidth, ctrlA.prefHeight);
  setRect(ctrlB, startX, ctrlA.computed.y + ctrlA.computed.height + gap, controlWidth, ctrlB.prefHeight);
  setRect(ctrlC, startX, ctrlB.computed.y + ctrlB.computed.height + gap, controlWidth, ctrlC.prefHeight);

  debug.push('OR choice: controls panel arranged vertically');
}

function evaluateLayout(
  spec: LayoutSpec,
  width: number,
  height: number,
  choice: LayoutChoice,
): LayoutResult {
  const widgets = cloneWidgets(spec.widgets);
  const debug: string[] = [];
  const violations: LayoutResult['violations'] = [];

  const headerBottom = layoutToolbar(spec, widgets, width, choice, debug);
  layoutFooter(spec, widgets, width, height);
  layoutBody(spec, widgets, width, headerBottom, choice, debug);
  layoutControls(spec, widgets, choice, debug);

  for (const widget of Object.values(widgets)) {
    enforceInsideContainer(widget, { width, height }, violations);
    enforceSizeLimits(widget, violations);
    penalizeDistanceFromPreferred(widget, violations);
  }

  alignTop(widgets.title, widgets.search, violations);
  placeBelow(widgets.content, widgets.sidebar, spec.gap, violations, choice.sidebarMode === 'below' ? 12 : 1);
  placeRightOf(widgets.content, widgets.sidebar, spec.gap, violations, choice.sidebarMode === 'right' ? 12 : 1);

  if (choice.controlsMode === 'horizontal') {
    alignTop(widgets.ctrlA, widgets.ctrlB, violations);
    alignTop(widgets.ctrlB, widgets.ctrlC, violations);
    placeRightOf(widgets.ctrlA, widgets.ctrlB, 12, violations, 8);
    placeRightOf(widgets.ctrlB, widgets.ctrlC, 12, violations, 8);
  } else {
    alignLeft(widgets.ctrlA, widgets.ctrlB, violations);
    alignLeft(widgets.ctrlB, widgets.ctrlC, violations);
    placeBelow(widgets.ctrlA, widgets.ctrlB, 12, violations, 8);
    placeBelow(widgets.ctrlB, widgets.ctrlC, 12, violations, 8);
  }

  const content = widgets.content.computed;
  const sidebar = widgets.sidebar.computed;
  const title = widgets.title.computed;
  const search = widgets.search.computed;
  const share = widgets.share.computed;

  if (choice.sidebarMode === 'right') {
    const bodyUsableWidth = width - spec.padding * 2 - spec.gap;
    const sidebarRatio = sidebar.width / bodyUsableWidth;
    const contentRatio = content.width / bodyUsableWidth;

    addMinThresholdPenalty(
      sidebar.width,
      320,
      14,
      violations,
      'Right sidebar is too narrow to be comfortable',
    );

    addMaxThresholdPenalty(
      contentRatio,
      0.7,
      520,
      violations,
      'Main content dominates too much horizontal space',
    );

    addDistancePenalty(
      sidebarRatio,
      0.34,
      260,
      violations,
      'Right sidebar proportion is far from the preferred balance',
    );
  }

  if (choice.sidebarMode === 'below') {
    addMinThresholdPenalty(
      sidebar.height,
      180,
      2.4,
      violations,
      'Below-sidebar is too short to show its controls comfortably',
    );
  }

  if (choice.toolbarMode === 'row') {
    const toolbarGap = search.x - (title.x + title.width);
    addMinThresholdPenalty(
      toolbarGap,
      spec.gap * 2,
      12,
      violations,
      'Toolbar row leaves too little space between title and actions',
    );

    addMaxThresholdPenalty(
      share.x + share.width,
      width - spec.padding,
      24,
      violations,
      'Toolbar row pushes too far to the right',
    );
  }

  if (choice.controlsMode === 'horizontal') {
    addMinThresholdPenalty(
      sidebar.width,
      330,
      2.5,
      violations,
      'Horizontal controls need a wider sidebar',
    );
  } else {
    addMaxThresholdPenalty(
      sidebar.width,
      420,
      0.5,
      violations,
      'Very wide sidebars look less natural with vertical controls',
    );
  }

  if (width >= 1020 && choice.toolbarMode !== 'row') {
    violations.push({ message: 'Wide screens prefer a single toolbar row', penalty: 120 });
  }
  if (width < 1020 && choice.toolbarMode !== 'twoRows') {
    violations.push({ message: 'Narrower screens prefer wrapped toolbar rows', penalty: 120 });
  }

  if (width >= 980 && choice.sidebarMode !== 'right') {
    violations.push({ message: 'Wide screens prefer right-side sidebar', penalty: 180 });
  }
  if (width < 980 && choice.sidebarMode !== 'below') {
    violations.push({ message: 'Narrow screens prefer sidebar below content', penalty: 180 });
  }

  if (choice.sidebarMode === 'right' && sidebar.width >= 330 && choice.controlsMode !== 'horizontal') {
    violations.push({
      message: 'Roomy right sidebars should use horizontal controls',
      penalty: 220,
    });
  }

  if (choice.sidebarMode === 'right' && sidebar.width < 330 && choice.controlsMode !== 'vertical') {
    violations.push({
      message: 'Narrow right sidebars should use vertical controls',
      penalty: 220,
    });
  }

  if (choice.sidebarMode === 'below' && choice.controlsMode !== 'horizontal') {
    violations.push({
      message: 'Below-sidebar usually has room for horizontal controls',
      penalty: 80,
    });
  }

  if (
    choice.toolbarMode === 'row' &&
    search.x - (title.x + title.width) >= spec.gap * 2 &&
    share.x + share.width <= width - spec.padding
  ) {
    violations.push({ message: 'Compact toolbar row works well in this width', penalty: -40 });
  }

  return {
    widgets,
    choice,
    score: sumPenalty(violations),
    violations,
    debug,
  };
}

export function solveLayout(spec: LayoutSpec, width: number, height: number): LayoutResult {
  const allChoices = chooseAllAlternatives();
  let best = evaluateLayout(spec, width, height, allChoices[0]);

  for (let index = 1; index < allChoices.length; index += 1) {
    const candidate = evaluateLayout(spec, width, height, allChoices[index]);
    if (candidate.score < best.score) {
      best = candidate;
    }
  }

  return best;
}
