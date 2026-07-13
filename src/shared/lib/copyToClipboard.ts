/**
 * Скопировать строку в системный буфер обмена.
 *
 * Стратегия в порядке предпочтения:
 *  1) `navigator.clipboard.writeText` — но только в Secure Context (HTTPS / localhost).
 *  2) Если передан `sourceElement` — выделяем его текст через Range/Selection
 *     и зовём `document.execCommand('copy')`. Это самый надёжный путь внутри
 *     модалок с focus-trap (Radix Dialog и т.п.), потому что элемент уже
 *     находится в активной зоне фокуса.
 *  3) Фолбэк: невидимая `textarea`, прицепленная по возможности к ближайшему
 *     `[role="dialog"]` (чтобы не выпасть из focus-trap'а), либо к `body`.
 *
 * Возвращает `true`, если копирование реально произошло; `false` — если все
 * способы провалились (в логах при этом не шумим — это нормальный графа-флоу).
 */
export async function copyToClipboard(
  text: string,
  sourceElement?: HTMLElement | null,
): Promise<boolean> {
  // 1) Современный API — только в secure context (иначе writeText бросит или будет undefined).
  if (
    typeof navigator !== 'undefined' &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === 'function' &&
    typeof window !== 'undefined' &&
    window.isSecureContext
  ) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // падаем в фолбэк
    }
  }

  if (typeof document === 'undefined') return false;

  // Сохраняем текущее выделение пользователя, чтобы потом восстановить.
  const selection = document.getSelection();
  const previousRange =
    selection && selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;

  // 2) Если есть видимый элемент-источник — выделяем его содержимое напрямую.
  //    Самый надёжный путь, особенно внутри Radix Dialog (focus-trap не мешает,
  //    т.к. элемент уже в активной зоне).
  if (sourceElement && document.body.contains(sourceElement) && selection) {
    try {
      const range = document.createRange();
      range.selectNodeContents(sourceElement);
      selection.removeAllRanges();
      selection.addRange(range);
      const ok = document.execCommand('copy');
      selection.removeAllRanges();
      if (previousRange) selection.addRange(previousRange);
      if (ok) return true;
    } catch {
      // падаем в textarea-фолбэк
    }
  }

  // 3) Фолбэк через скрытую textarea. Цепляем её к ближайшему диалогу,
  //    чтобы остаться внутри focus-trap'а; иначе — к body.
  const host =
    (document.activeElement?.closest?.('[role="dialog"]') as HTMLElement | null) ?? document.body;
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.setAttribute('aria-hidden', 'true');
  // Положение «за экраном», но видимое для selection.
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  ta.style.top = '0';
  ta.style.width = '1px';
  ta.style.height = '1px';
  ta.style.padding = '0';
  ta.style.border = 'none';
  ta.style.outline = 'none';
  ta.style.boxShadow = 'none';
  ta.style.background = 'transparent';
  host.appendChild(ta);

  try {
    ta.focus({ preventScroll: true });
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    return ok;
  } catch {
    return false;
  } finally {
    host.removeChild(ta);
    if (previousRange && selection) {
      selection.removeAllRanges();
      selection.addRange(previousRange);
    }
  }
}
