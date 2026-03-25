import { LayoutSpec, Widget } from './model';

function widget(partial: Omit<Widget, 'computed'>): Widget {
  return {
    ...partial,
    computed: { x: 0, y: 0, width: 0, height: 0 },
  };
}

export function createDemoSpec(): LayoutSpec {
  return {
    padding: 16,
    gap: 12,
    footerHeight: 78,
    widgets: {
      title: widget({
        id: 'title',
        title: 'Adaptive Editor',
        kind: 'toolbar',
        minWidth: 220,
        minHeight: 72,
        prefWidth: 280,
        prefHeight: 72,
        maxWidth: 320,
      }),
      search: widget({
        id: 'search',
        title: 'Search',
        kind: 'toolbar',
        minWidth: 190,
        minHeight: 72,
        prefWidth: 240,
        prefHeight: 72,
        maxWidth: 300,
      }),
      filter: widget({
        id: 'filter',
        title: 'Filter',
        kind: 'toolbar',
        minWidth: 120,
        minHeight: 72,
        prefWidth: 140,
        prefHeight: 72,
        maxWidth: 180,
      }),
      export: widget({
        id: 'export',
        title: 'Export',
        kind: 'toolbar',
        minWidth: 120,
        minHeight: 72,
        prefWidth: 140,
        prefHeight: 72,
        maxWidth: 180,
      }),
      share: widget({
        id: 'share',
        title: 'Share',
        kind: 'toolbar',
        minWidth: 120,
        minHeight: 72,
        prefWidth: 140,
        prefHeight: 72,
        maxWidth: 180,
      }),
      content: widget({
        id: 'content',
        title: 'Main content',
        kind: 'content',
        minWidth: 420,
        minHeight: 300,
        prefWidth: 760,
        prefHeight: 540,
      }),
      sidebar: widget({
        id: 'sidebar',
        title: 'Controls panel',
        kind: 'panel',
        minWidth: 300,
        minHeight: 240,
        prefWidth: 360,
        prefHeight: 300,
        maxWidth: 440,
      }),
      ctrlA: widget({
        id: 'ctrlA',
        title: 'Brightness',
        kind: 'control',
        minWidth: 100,
        minHeight: 84,
        prefWidth: 120,
        prefHeight: 84,
        maxWidth: 140,
      }),
      ctrlB: widget({
        id: 'ctrlB',
        title: 'Contrast',
        kind: 'control',
        minWidth: 100,
        minHeight: 84,
        prefWidth: 120,
        prefHeight: 84,
        maxWidth: 140,
      }),
      ctrlC: widget({
        id: 'ctrlC',
        title: 'Layers',
        kind: 'control',
        minWidth: 100,
        minHeight: 84,
        prefWidth: 120,
        prefHeight: 84,
        maxWidth: 140,
      }),
      footer: widget({
        id: 'footer',
        title: 'Status footer',
        kind: 'footer',
        minWidth: 500,
        minHeight: 78,
        prefWidth: 900,
        prefHeight: 78,
      }),
    },
  };
}

export const OR_GROUPS = {
  toolbar: ['row', 'twoRows'] as const,
  sidebar: ['right', 'below'] as const,
  controls: ['horizontal', 'vertical'] as const,
};