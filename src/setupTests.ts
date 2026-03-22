// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Keep router usage test-friendly even when routing package resolution differs in CI.
jest.mock('react-router-dom', () => ({
	BrowserRouter: ({ children }: any) => children,
	Routes: ({ children }: any) => children,
	Route: ({ element }: any) => element ?? null,
}), { virtual: true });

// Prevent Jest from loading ESM-only globe package through App tree.
jest.mock('react-globe.gl', () => () => null, { virtual: true });

Object.defineProperty(window, 'matchMedia', {
	writable: true,
	value: jest.fn().mockImplementation((query: string) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: jest.fn(),
		removeListener: jest.fn(),
		addEventListener: jest.fn(),
		removeEventListener: jest.fn(),
		dispatchEvent: jest.fn(),
	})),
});

// Provide a minimal 2D context mock for canvas-based components in JSDOM.
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
	value: jest.fn(() => ({
		fillStyle: '',
		strokeStyle: '',
		lineWidth: 1,
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
	})),
	configurable: true,
});
