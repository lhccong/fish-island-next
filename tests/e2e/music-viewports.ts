import { test } from '@playwright/test';

export function musicViewports(register: () => void) {
  for (const width of [1280, 375, 390]) {
    test.describe(`${width}px`, () => {
      test.use({
        viewport: { width, height: width === 1280 ? 720 : 844 },
        isMobile: width < 760,
        hasTouch: width < 760,
      });
      register();
    });
  }
}
