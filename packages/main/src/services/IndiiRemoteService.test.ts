import { describe, it, expect, vi, afterEach } from 'vitest';

// First mock dependencies
vi.mock('express', () => {
    const use = vi.fn();
    const post = vi.fn();
    const staticFn = vi.fn();
    const jsonFn = vi.fn();
    const expressFn = vi.fn(() => ({ use, post })) as any;
    expressFn.static = staticFn;
    expressFn.json = jsonFn;
    return {
        default: expressFn,
    };
});
vi.mock('http', () => {
    const mockServer = {
        listen: vi.fn((port, host, cb) => {
            if (cb) cb();
        }),
        close: vi.fn(),
    };
    return {
        createServer: vi.fn(() => mockServer),
        default: {
            createServer: vi.fn(() => mockServer),
        }
    };
});
vi.mock('ws', () => {
    return {
        WebSocketServer: class {
            on = vi.fn();
            close = vi.fn();
        },
        WebSocket: vi.fn(),
    };
});
vi.mock('@ngrok/ngrok', () => ({
    default: {
        connect: vi.fn(() => Promise.resolve({ url: () => 'https://mock-tunnel.ngrok.io' })),
        disconnect: vi.fn(() => Promise.resolve()),
    },
}));
vi.mock('electron', () => ({
    app: {
        getAppPath: vi.fn(() => '/mock/app/path'),
        isReady: vi.fn(() => false),
    },
    BrowserWindow: {
        getAllWindows: vi.fn(() => []),
    },
}));

import { indiiRemoteService, IndiiRemoteError } from './IndiiRemoteService';

describe('IndiiRemoteService', () => {
    afterEach(async () => {
        // We ensure state is stopped
        try {
            await indiiRemoteService.stop();
        } catch (_e) {
            // ignore
        }
    });

    describe('start()', () => {
        it('rejects startup if config password is empty', async () => {
            await expect(indiiRemoteService.start({ password: '' })).rejects.toThrow(IndiiRemoteError);
            await expect(indiiRemoteService.start({ password: '' })).rejects.toThrow(/Refusing to start with default credentials/);
        });

        it('rejects startup if config password is whitespace', async () => {
            await expect(indiiRemoteService.start({ password: '   ' })).rejects.toThrow(IndiiRemoteError);
        });

        it('starts successfully with valid password and port', async () => {
            const url = await indiiRemoteService.start({ password: 'valid-password', port: 1234 });
            expect(url).toBe('http://127.0.0.1:1234');
            const status = indiiRemoteService.getStatus();
            expect(status.isRunning).toBe(true);
            expect(status.url).toBe('http://127.0.0.1:1234');
        });

        it('returns pending promise if startup is already in progress', async () => {
            // start but dont await yet
            const p1 = indiiRemoteService.start({ password: 'test1' });
            const p2 = indiiRemoteService.start({ password: 'test2' }); // should return p1

            const [url1, url2] = await Promise.all([p1, p2]);
            expect(url1).toBe('http://127.0.0.1:3333');
            expect(url2).toBe('http://127.0.0.1:3333');
        });

        it('rejects updatePassword if password is empty', () => {
            expect(() => indiiRemoteService.updatePassword('')).toThrow(IndiiRemoteError);
        });

        it('updates password successfully', () => {
            indiiRemoteService.updatePassword('new-pass');
        });
    });
});
