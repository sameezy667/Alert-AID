import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Alert Aid shell', () => {
  render(<App />);
  const appBrand = screen.getByText(/Alert Aid/i);
  expect(appBrand).toBeInTheDocument();
});
