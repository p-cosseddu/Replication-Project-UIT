import { ConstraintViolation, ContainerRect, Rect, Widget } from './model';

function rectRight(rect: Rect): number {
  return rect.x + rect.width;
}

function rectBottom(rect: Rect): number {
  return rect.y + rect.height;
}

function isHidden(widget: Widget): boolean {
  return widget.computed.width <= 0.5 || widget.computed.height <= 0.5;
}

export function enforceInsideContainer(
  widget: Widget,
  container: ContainerRect,
  violations: ConstraintViolation[],
): void {
  if (isHidden(widget)) {
    return;
  }

  const rect = widget.computed;

  if (rect.x < 0) {
    violations.push({ message: `${widget.id} exceeds left container bound`, penalty: -rect.x * 50 });
  }
  if (rect.y < 0) {
    violations.push({ message: `${widget.id} exceeds top container bound`, penalty: -rect.y * 50 });
  }
  if (rectRight(rect) > container.width) {
    violations.push({
      message: `${widget.id} exceeds right container bound`,
      penalty: (rectRight(rect) - container.width) * 50,
    });
  }
  if (rectBottom(rect) > container.height) {
    violations.push({
      message: `${widget.id} exceeds bottom container bound`,
      penalty: (rectBottom(rect) - container.height) * 50,
    });
  }
}

export function enforceSizeLimits(widget: Widget, violations: ConstraintViolation[]): void {
  if (isHidden(widget)) {
    return;
  }

  const rect = widget.computed;
  if (rect.width < widget.minWidth) {
    violations.push({
      message: `${widget.id} is narrower than its minimum width`,
      penalty: (widget.minWidth - rect.width) * 30,
    });
  }
  if (rect.height < widget.minHeight) {
    violations.push({
      message: `${widget.id} is shorter than its minimum height`,
      penalty: (widget.minHeight - rect.height) * 30,
    });
  }
  if (widget.maxWidth !== undefined && rect.width > widget.maxWidth) {
    violations.push({
      message: `${widget.id} exceeds its maximum width`,
      penalty: (rect.width - widget.maxWidth) * 10,
    });
  }
  if (widget.maxHeight !== undefined && rect.height > widget.maxHeight) {
    violations.push({
      message: `${widget.id} exceeds its maximum height`,
      penalty: (rect.height - widget.maxHeight) * 10,
    });
  }
}

export function penalizeDistanceFromPreferred(widget: Widget, violations: ConstraintViolation[]): void {
  if (isHidden(widget)) {
    return;
  }

  const rect = widget.computed;
  const widthPenalty = Math.abs(rect.width - widget.prefWidth) * 0.4;
  const heightPenalty = Math.abs(rect.height - widget.prefHeight) * 0.4;
  if (widthPenalty > 0) {
    violations.push({
      message: `${widget.id} deviates from preferred width`,
      penalty: widthPenalty,
    });
  }
  if (heightPenalty > 0) {
    violations.push({
      message: `${widget.id} deviates from preferred height`,
      penalty: heightPenalty,
    });
  }
}

export function alignTop(a: Widget, b: Widget, violations: ConstraintViolation[], weight = 4): void {
  if (isHidden(a) || isHidden(b)) {
    return;
  }
  const diff = Math.abs(a.computed.y - b.computed.y);
  if (diff > 0.5) {
    violations.push({
      message: `${a.id} and ${b.id} are not top-aligned`,
      penalty: diff * weight,
    });
  }
}

export function alignLeft(a: Widget, b: Widget, violations: ConstraintViolation[], weight = 4): void {
  if (isHidden(a) || isHidden(b)) {
    return;
  }
  const diff = Math.abs(a.computed.x - b.computed.x);
  if (diff > 0.5) {
    violations.push({
      message: `${a.id} and ${b.id} are not left-aligned`,
      penalty: diff * weight,
    });
  }
}

export function placeRightOf(
  left: Widget,
  right: Widget,
  spacing: number,
  violations: ConstraintViolation[],
  weight = 12,
): void {
  if (isHidden(left) || isHidden(right)) {
    return;
  }
  const expected = left.computed.x + left.computed.width + spacing;
  const diff = Math.abs(right.computed.x - expected);
  if (diff > 0.5) {
    violations.push({
      message: `${right.id} is not correctly placed right of ${left.id}`,
      penalty: diff * weight,
    });
  }
}

export function placeBelow(
  upper: Widget,
  lower: Widget,
  spacing: number,
  violations: ConstraintViolation[],
  weight = 12,
): void {
  if (isHidden(upper) || isHidden(lower)) {
    return;
  }
  const expected = upper.computed.y + upper.computed.height + spacing;
  const diff = Math.abs(lower.computed.y - expected);
  if (diff > 0.5) {
    violations.push({
      message: `${lower.id} is not correctly placed below ${upper.id}`,
      penalty: diff * weight,
    });
  }
}
