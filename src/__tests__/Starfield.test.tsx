import React from 'react';
import { render } from '@testing-library/react';
import Starfield from '../components/Starfield/Starfield';

describe('Starfield', () => {
  beforeEach(() => {
    // Mock canvas and context
    HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
      fillStyle: '',
      setTransform: jest.fn(),
      fillRect: jest.fn(),
      clearRect: jest.fn(),
      beginPath: jest.fn(),
      closePath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
      createRadialGradient: jest.fn(() => ({
        addColorStop: jest.fn(),
      })),
    })) as any;
  });

  it('renders canvas element when enabled', () => {
    const { container } = render(<Starfield />);
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('has correct CSS class for styling', () => {
    const { container } = render(<Starfield />);
    const canvas = container.querySelector('canvas');
    expect(canvas).toHaveClass('aa-starfield-canvas');
  });

  it('sets aria-hidden attribute for accessibility', () => {
    const { container } = render(<Starfield />);
    const canvas = container.querySelector('canvas');
    expect(canvas).toHaveAttribute('aria-hidden');
  });

  it('has aria-label for screen readers', () => {
    const { container } = render(<Starfield />);
    const canvas = container.querySelector('canvas');
    expect(canvas).toHaveAttribute('aria-label');
  });

  it('canvas has fixed positioning via CSS class', () => {
    const { container } = render(<Starfield />);
    const canvas = container.querySelector('canvas');
    expect(canvas).toHaveClass('aa-starfield-canvas');
    // CSS should apply position: fixed, but we're testing class presence
  });
});
