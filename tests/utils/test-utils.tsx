import { ReactElement } from 'react';
import { render as rtlRender, RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Custom render function that can be extended with providers
function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  return {
    user: userEvent.setup(),
    ...rtlRender(ui, { ...options }),
  };
}

export * from '@testing-library/react';
export { customRender as render };
