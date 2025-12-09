export function debounce<F extends (...args: unknown[]) => void>(
	fn: F,
	wait: number
): (this: ThisParameterType<F>, ...args: Parameters<F>) => void {
	let timeout: ReturnType<typeof setTimeout> | undefined;
	return function (this: ThisParameterType<F>, ...args: Parameters<F>) {
		if (timeout) clearTimeout(timeout);
		timeout = setTimeout(() => fn.apply(this, args), wait);
	};
}
