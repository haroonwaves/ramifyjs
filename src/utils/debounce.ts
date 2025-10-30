export function debounce<F extends (...args: any[]) => void>(
	fn: F,
	wait: number
): (...args: Parameters<F>) => void {
	let timeout: ReturnType<typeof setTimeout> | undefined;
	return function (this: any, ...args: Parameters<F>) {
		if (timeout) clearTimeout(timeout);
		timeout = setTimeout(() => fn.apply(this, args), wait);
	};
}
