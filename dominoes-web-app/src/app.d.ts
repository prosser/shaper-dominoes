// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}

	interface Window {
		jspdf?: {
			jsPDF: new (options?: unknown) => {
				setFillColor: (...args: unknown[]) => unknown;
				setDrawColor: (...args: unknown[]) => unknown;
				roundedRect: (x: number, y: number, w: number, h: number, rx: number, ry: number, style?: string) => unknown;
				circle: (x: number, y: number, r: number, style?: string) => unknown;
				addPage: () => unknown;
				output: (type: 'blob') => Blob;
			};
		};
	}
}

export {};
