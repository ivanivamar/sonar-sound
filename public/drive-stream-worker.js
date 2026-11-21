self.addEventListener('install', () => {
    console.log('[drive worker] installed');
});

self.addEventListener('activate', (event) => {
    console.log('[drive worker] activated');
    event.waitUntil(self.clients.claim());
});

function parseRange(header, size) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(header);

    if (!match || (!match[1] && !match[2])) return null;

    let start;
    let end;

    if (!match[1]) {
        const suffix = Number(match[2]);
        if (!Number.isSafeInteger(suffix) || suffix <= 0) return null;

        start = Math.max(0, size - suffix);
        end = size - 1;
    } else {
        start = Number(match[1]);
        end = match[2] ? Number(match[2]) : size - 1;

        if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end)) return null;
        end = Math.min(end, size - 1);
    }

    if (start >= size || start > end) return null;
    return { start, end };
}

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    const testUrl = new URL('__drive-stream/test', self.registration.scope);

    if (url.origin === testUrl.origin && url.pathname === testUrl.pathname) {
        event.respondWith(
            (async () => {
                const client = await self.clients.get(event.clientId);

                if (!client) {
                    return new Response('Could not find the requesting page.', { status: 503 });
                }

                const channel = new MessageChannel();

                const reply = await new Promise((resolve) => {
                    const timeout = setTimeout(() => resolve(null), 3000);

                    channel.port1.onmessage = (messageEvent) => {
                        clearTimeout(timeout);
                        resolve(messageEvent.data);
                    };

                    client.postMessage({ type: 'drive-stream:token' }, [channel.port2]);
                });

                channel.port1.close();

                if (!reply) {
                    return new Response('The page did not answer.', { status: 503 });
                }

                if (!reply.token) {
                    return new Response('No valid token available.', { status: 401 });
                }

                const fileId = url.searchParams.get('fileId');

                if (!fileId || !/^[a-zA-Z0-9_-]+$/.test(fileId)) {
                    return new Response('A valid Drive file ID is required.', { status: 400 });
                }

                try {
                    const driveUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`;

                    const headers = new Headers({
                        Authorization: `Bearer ${reply.token}`,
                    });

                    const rangeHeader = event.request.headers.get('Range');
                    const size = Number(url.searchParams.get('size'));
                    let requestedRange = null;

                    if (rangeHeader) {
                        if (!Number.isSafeInteger(size) || size <= 0) {
                            return new Response('A valid file size is required.', { status: 400 });
                        }

                        requestedRange = parseRange(rangeHeader, size);

                        if (!requestedRange) {
                            return new Response(null, {
                                status: 416,
                                headers: {
                                    'Content-Range': `bytes */${size}`,
                                },
                            });
                        }

                        headers.set('Range', `bytes=${requestedRange.start}-${requestedRange.end}`);
                    }

                    const response = await fetch(driveUrl, {
                        headers,
                    });

                    console.log('[drive worker] upstream status:', response.status);

                    if (!response.ok) {
                        return new Response('Drive could not provide the file.', {
                            status: response.status,
                        });
                    }

                    const responseHeaders = new Headers({
                        'Content-Type': 'audio/flac',
                        'Cache-Control': 'no-store',
                    });

                    if (response.status === 206) {
                        if (!requestedRange) {
                            return new Response('Unexpected partial response from Drive.', {
                                status: 502,
                            });
                        }

                        const expectedRange = `bytes ${requestedRange.start}-${requestedRange.end}/${size}`;
                        const upstreamRange = response.headers.get('Content-Range');

                        if (upstreamRange && upstreamRange !== expectedRange) {
                            return new Response('Drive returned an unexpected range.', {
                                status: 502,
                            });
                        }

                        responseHeaders.set('Content-Range', expectedRange);
                        responseHeaders.set('Accept-Ranges', 'bytes');
                    }

                    return new Response(response.body, {
                        status: response.status,
                        headers: responseHeaders,
                    });
                } catch (error) {
                    console.error('[drive worker] Request failed:', error);
                    return new Response('Could not reach Drive.', { status: 502 });
                }
            })(),
        );
    }
});
