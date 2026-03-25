import { createDemoSpec } from './demo';
import { solveLayout } from './engine';
import { renderApp } from './renderer';
import './styles.css';

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('Could not find #app');
}

const spec = createDemoSpec();
const ui = renderApp(app);

function computeStageSize(): { width: number; height: number } {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const sidebarSpace = viewportWidth > 1100 ? 380 : 40;
  const stageWidth = Math.max(360, Math.min(1240, viewportWidth - sidebarSpace - 48));
  const stageHeight = Math.max(620, Math.min(860, viewportHeight - 110));

  return {
    width: stageWidth,
    height: stageHeight,
  };
}

function updateLayout(): void {
  const { width, height } = computeStageSize();
  const result = solveLayout(spec, width, height);
  ui.update(result, width, height);
}

let rafId = 0;

function onResize(): void {
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(updateLayout);
}

updateLayout();
window.addEventListener('resize', onResize);