export const requestPathname = (request: Request) =>
	new URL(request.url, 'http://localhost').pathname;
