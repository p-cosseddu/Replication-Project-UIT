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

type WidgetMap = Record<string, Widget>;

type ToolbarPlan = {
  activeSearch: Widget;
  topActions: Widget[];
  movedActions: Widget[];
  hiddenActions: Widget[];
  toolbarBottom: number;
  actionWidth: number;
};

function setRect(widget: Widget, x: number, y: number, width: number, height: number): void {
  widget.computed = { x, y, width, height };
}

function hideWidget(widget: Widget): void {
  setRect(widget, 0, 0, 0, 0);
}

function sumPenalty(violations: { penalty: number }[]): number {
  return violations.reduce((sum, violation) => sum + violation.penalty, 0);
}

function chooseAllAlternatives(): LayoutChoice[] {
  const choices: LayoutChoice[] = [];

  for (const toolbarMode of OR_GROUPS.toolbar) {
    for (const sidebarMode of OR_GROUPS.sidebar) {
      for (const controlsMode of OR_GROUPS.controls) {
        for (const searchMode of OR_GROUPS.search) {
          for (const transferMode of OR_GROUPS.transfer) {
            for (const visibilityMode of OR_GROUPS.visibility) {
              choices.push({
                toolbarMode,
                sidebarMode,
                controlsMode,
                searchMode,
                transferMode,
                visibilityMode,
              });
            }
          }
        }
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

function getVisibleActionSets(widgets: WidgetMap, choice: LayoutChoice): {
  topActions: Widget[];
  movedActions: Widget[];
  hiddenActions: Widget[];
} {
  const filter = widgets.filter;
  const exportBtn = widgets.export;
  const share = widgets.share;

  const topActions: Widget[] = [filter];
  const movedActions: Widget[] = [];
  const hiddenActions: Widget[] = [];

  if (choice.transferMode === 'topOnly') {
    topActions.push(exportBtn, share);
  } else {
    movedActions.push(exportBtn, share);
  }

  if (choice.visibilityMode === 'hideShare' || choice.visibilityMode === 'hideShareExport') {
    const shareIndex = topActions.indexOf(share);
    if (shareIndex >= 0) {
      topActions.splice(shareIndex, 1);
    }
    const movedShareIndex = movedActions.indexOf(share);
    if (movedShareIndex >= 0) {
      movedActions.splice(movedShareIndex, 1);
    }
    hiddenActions.push(share);
  }

  if (choice.visibilityMode === 'hideShareExport') {
    const exportIndex = topActions.indexOf(exportBtn);
    if (exportIndex >= 0) {
      topActions.splice(exportIndex, 1);
    }
    const movedExportIndex = movedActions.indexOf(exportBtn);
    if (movedExportIndex >= 0) {
      movedActions.splice(movedExportIndex, 1);
    }
    hiddenActions.push(exportBtn);
  }

  return { topActions, movedActions, hiddenActions };
}

function layoutToolbar(
  spec: LayoutSpec,
  widgets: WidgetMap,
  width: number,
  choice: LayoutChoice,
  debug: string[],
): ToolbarPlan {
  const { padding, gap } = spec;
  const title = widgets.title;
  const search = widgets.search;
  const searchCompact = widgets.searchCompact;
  const itemHeight = title.prefHeight;
  const rowY = padding;

  const titleWidth = clampSize(
    Math.min(title.prefWidth, width * 0.24),
    title.minWidth,
    title.maxWidth,
  );
  const actionWidth = clampSize(widgets.filter.prefWidth, widgets.filter.minWidth, widgets.filter.maxWidth);

  const { topActions, movedActions, hiddenActions } = getVisibleActionSets(widgets, choice);

  for (const widget of hiddenActions) {
    hideWidget(widget);
  }
  for (const widget of movedActions) {
    hideWidget(widget);
  }

  const activeSearch = choice.searchMode === 'compact' ? searchCompact : search;
  const inactiveSearch = choice.searchMode === 'compact' ? search : searchCompact;
  hideWidget(inactiveSearch);

  const searchWidth = choice.searchMode === 'compact'
    ? clampSize(searchCompact.prefWidth, searchCompact.minWidth, searchCompact.maxWidth)
    : clampSize(Math.min(search.prefWidth, width * 0.22), search.minWidth, search.maxWidth);

  setRect(title, padding, rowY, titleWidth, itemHeight);

  if (choice.toolbarMode === 'row') {
    const totalActionsWidth = topActions.length > 0
      ? topActions.length * actionWidth + gap * (topActions.length - 1)
      : 0;
    const rightClusterWidth = searchWidth + (topActions.length > 0 ? gap + totalActionsWidth : 0);
    const minStartAfterTitle = title.computed.x + title.computed.width + gap * 2;
    const clusterStartX = Math.max(width - padding - rightClusterWidth, minStartAfterTitle);

    setRect(activeSearch, clusterStartX, rowY, searchWidth, itemHeight);

    let cursorX = clusterStartX + searchWidth + (topActions.length > 0 ? gap : 0);
    for (const action of topActions) {
      setRect(action, cursorX, rowY, actionWidth, itemHeight);
      cursorX += actionWidth + gap;
    }

    debug.push('OR choice: toolbar arranged in one row');
    return {
      activeSearch,
      topActions,
      movedActions,
      hiddenActions,
      toolbarBottom: rowY + itemHeight + gap,
      actionWidth,
    };
  }

  const secondRowY = rowY + itemHeight + gap;
  const firstRowStartX = title.computed.x + title.computed.width + gap * 2;
  setRect(activeSearch, firstRowStartX, rowY, searchWidth, itemHeight);

  if (topActions.length === 1) {
    setRect(topActions[0], activeSearch.computed.x + activeSearch.computed.width + gap, rowY, actionWidth, itemHeight);
    debug.push('OR choice: toolbar wrapped into two rows (single trailing action)');
    return {
      activeSearch,
      topActions,
      movedActions,
      hiddenActions,
      toolbarBottom: rowY + itemHeight + gap,
      actionWidth,
    };
  }

  const firstRowActionCount = topActions.length >= 3 ? 1 : 0;
  let cursorX = activeSearch.computed.x + activeSearch.computed.width + (firstRowActionCount > 0 ? gap : 0);

  for (let index = 0; index < firstRowActionCount; index += 1) {
    setRect(topActions[index], cursorX, rowY, actionWidth, itemHeight);
    cursorX += actionWidth + gap;
  }

  const secondRowActions = topActions.slice(firstRowActionCount);
  const secondRowTotal = secondRowActions.length * actionWidth + Math.max(0, secondRowActions.length - 1) * gap;
  const secondRowAvailable = width - padding * 2;
  let secondRowStartX = padding;
  if (secondRowActions.length > 0) {
    secondRowStartX = padding + Math.max(0, (secondRowAvailable - secondRowTotal) / 2);
  }

  for (let index = 0; index < secondRowActions.length; index += 1) {
    setRect(secondRowActions[index], secondRowStartX + index * (actionWidth + gap), secondRowY, actionWidth, itemHeight);
  }

  debug.push('OR choice: toolbar wrapped into two rows');
  return {
    activeSearch,
    topActions,
    movedActions,
    hiddenActions,
    toolbarBottom: secondRowY + itemHeight + gap,
    actionWidth,
  };
}

function layoutFooter(spec: LayoutSpec, widgets: WidgetMap, width: number, height: number): void {
  const { padding, footerHeight } = spec;
  setRect(widgets.footer, padding, height - padding - footerHeight, width - padding * 2, footerHeight);
}

function layoutBody(
  spec: LayoutSpec,
  widgets: WidgetMap,
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

function layoutMovedActions(
  spec: LayoutSpec,
  widgets: WidgetMap,
  choice: LayoutChoice,
  movedActions: Widget[],
  actionWidth: number,
  debug: string[],
): number {
  if (choice.transferMode !== 'split' || movedActions.length === 0) {
    return 0;
  }

  const sidebar = widgets.sidebar;
  const innerPadding = 16;
  const actionHeight = widgets.filter.prefHeight;
  const startY = sidebar.computed.y + 18;

  if (choice.sidebarMode === 'right') {
    let currentY = startY;
    const x = sidebar.computed.x + sidebar.computed.width - innerPadding - actionWidth;
    for (const action of movedActions) {
      setRect(action, x, currentY, actionWidth, actionHeight);
      currentY += actionHeight + spec.gap;
    }
    debug.push('OR choice: export/share moved into the sidebar mini-toolbar');
    return movedActions.length * actionHeight + Math.max(0, movedActions.length - 1) * spec.gap;
  }

  const totalWidth = movedActions.length * actionWidth + Math.max(0, movedActions.length - 1) * spec.gap;
  const x = sidebar.computed.x + sidebar.computed.width - innerPadding - totalWidth;
  for (let index = 0; index < movedActions.length; index += 1) {
    setRect(movedActions[index], x + index * (actionWidth + spec.gap), startY, actionWidth, actionHeight);
  }
  debug.push('OR choice: export/share moved into the top of the lower panel');
  return actionHeight;
}

function layoutControls(
  spec: LayoutSpec,
  widgets: WidgetMap,
  choice: LayoutChoice,
  movedActionHeight: number,
  debug: string[],
): void {
  const { gap } = spec;
  const sidebar = widgets.sidebar;
  const ctrlA = widgets.ctrlA;
  const ctrlB = widgets.ctrlB;
  const ctrlC = widgets.ctrlC;

  const innerPadding = 16;
  const sidebarHeaderOffset = choice.transferMode === 'split'
    ? 130 + movedActionHeight + (movedActionHeight > 0 ? gap : 0)
    : 130;
  const startX = sidebar.computed.x + innerPadding;
  const startY = sidebar.computed.y + sidebarHeaderOffset;
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

  const toolbarPlan = layoutToolbar(spec, widgets, width, choice, debug);
  layoutFooter(spec, widgets, width, height);
  layoutBody(spec, widgets, width, toolbarPlan.toolbarBottom, choice, debug);
  const movedActionHeight = layoutMovedActions(
    spec,
    widgets,
    choice,
    toolbarPlan.movedActions,
    toolbarPlan.actionWidth,
    debug,
  );
  layoutControls(spec, widgets, choice, movedActionHeight, debug);

  for (const widget of Object.values(widgets)) {
    enforceInsideContainer(widget, { width, height }, violations);
    enforceSizeLimits(widget, violations);
    penalizeDistanceFromPreferred(widget, violations);
  }

  alignTop(widgets.title, toolbarPlan.activeSearch, violations);
  if (toolbarPlan.topActions.length > 0) {
    placeRightOf(toolbarPlan.activeSearch, toolbarPlan.topActions[0], 12, violations, 3);
  }
  for (let index = 1; index < toolbarPlan.topActions.length; index += 1) {
    placeRightOf(toolbarPlan.topActions[index - 1], toolbarPlan.topActions[index], 12, violations, 6);
    addDistancePenalty(
      toolbarPlan.topActions[index].computed.width,
      toolbarPlan.actionWidth,
      1.5,
      violations,
      'Toolbar actions should keep consistent widths',
    );
  }
  for (const movedAction of toolbarPlan.movedActions) {
    addDistancePenalty(
      movedAction.computed.width,
      toolbarPlan.actionWidth,
      1.5,
      violations,
      'Moved actions should preserve the same slot size',
    );
  }

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
  const searchWidget = toolbarPlan.activeSearch.computed;
  const lastTopWidget = toolbarPlan.topActions.length > 0
    ? toolbarPlan.topActions[toolbarPlan.topActions.length - 1].computed
    : searchWidget;

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
    const toolbarGap = searchWidget.x - (title.x + title.width);
    addMinThresholdPenalty(
      toolbarGap,
      spec.gap * 2,
      12,
      violations,
      'Toolbar row leaves too little space between title and search/actions',
    );

    addMaxThresholdPenalty(
      lastTopWidget.x + lastTopWidget.width,
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

  if (width >= 840 && choice.searchMode !== 'full') {
    violations.push({ message: 'Wide layouts should keep the full search widget', penalty: 120 });
  }
  if (width < 840 && choice.searchMode !== 'compact') {
    violations.push({ message: 'Narrow layouts benefit from the compact search alternative', penalty: 120 });
  }

  if (width >= 900 && choice.transferMode !== 'topOnly') {
    violations.push({ message: 'Wide screens should keep all toolbar actions at the top', penalty: 120 });
  }
  if (width < 900 && choice.transferMode !== 'split') {
    violations.push({ message: 'Smaller widths benefit from moving actions into the sidebar', penalty: 120 });
  }

  if (width >= 900 && choice.visibilityMode !== 'all') {
    violations.push({ message: 'Wide screens should keep all optional actions visible', penalty: 140 });
  }
  if (width < 900 && width >= 700 && choice.visibilityMode !== 'hideShare') {
    violations.push({ message: 'Medium widths should hide only the lowest-priority action', penalty: 120 });
  }
  if (width < 700 && choice.visibilityMode !== 'hideShareExport') {
    violations.push({ message: 'Very narrow widths should hide two low-priority actions', penalty: 160 });
  }

  if (choice.transferMode === 'split' && choice.visibilityMode === 'hideShareExport' && choice.toolbarMode === 'twoRows') {
    violations.push({ message: 'Two wrapped rows are unnecessary once two actions are hidden', penalty: 40 });
  }

  if (
    choice.toolbarMode === 'row' &&
    searchWidget.x - (title.x + title.width) >= spec.gap * 2 &&
    lastTopWidget.x + lastTopWidget.width <= width - spec.padding
  ) {
    violations.push({ message: 'Compact toolbar row works well in this width', penalty: -40 });
  }

  if (choice.transferMode === 'split' && toolbarPlan.movedActions.length > 0) {
    violations.push({ message: 'Connected sub-layout chosen: some actions moved into the sidebar', penalty: -35 });
  }

  if (choice.visibilityMode !== 'all') {
    violations.push({ message: 'Optional widgets pattern activated', penalty: -20 });
  }

  if (choice.searchMode === 'compact') {
    violations.push({ message: 'Alternative widget pattern activated for search', penalty: -20 });
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
