const pointerInput = 'data-pointer-input';

export function trackFocusInput(owner: Document) {
  const markPointer = () => owner.body.toggleAttribute(pointerInput, true);
  const markKeyboard = (event: KeyboardEvent) => {
    if (
      event.isComposing ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.key === 'Shift'
    )
      return;
    owner.body.removeAttribute(pointerInput);
  };
  owner.addEventListener('pointerdown', markPointer, true);
  owner.addEventListener('keydown', markKeyboard, true);
  return () => {
    owner.removeEventListener('pointerdown', markPointer, true);
    owner.removeEventListener('keydown', markKeyboard, true);
    owner.body.removeAttribute(pointerInput);
  };
}
