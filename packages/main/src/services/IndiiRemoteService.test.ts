// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IndiiRemoteService, IndiiRemoteError } from './IndiiRemoteService';

// Mock dependencies that are imported in IndiiRemoteService
vi.mock('express', () => {
    const mockUse = vi.fn();
    const mockPost = vi.fn();
    const expressMock = vi.fn(() => ({
        use: mockUse,
        post: mockPost
    })) as any;
    expressMock.json = vi.fn();
    expressMock.static = vi.fn();
    return { default: expressMock };
});

vi.mock('http', () => ({
    createServer: vi.fn(() => ({
        listen: vi.fn((port: number, host: string, cb: () => void) => {
            if (cb) cb();
        }),
        close: vi.fn()
    }))
}));

vi.mock('ws', () => {
    return {
        WebSocketServer: vi.fn(() => ({
            on: vi.fn(),
            close: vi.fn()
        }))
    };
});

vi.mock('@ngrok/ngrok', () => ({
    default: {
        connect: vi.fn(),
        disconnect: vi.fn()
    }
}));

vi.mock('electron', () => ({
    app: {
        getAppPath: vi.fn().mockReturnValue('/mock/app'),
        isReady: vi.fn().mockReturnValue(true)
    },
    BrowserWindow: {
        getAllWindows: vi.fn().mockReturnValue([])
    }
}));

describe('IndiiRemoteService Startup Error Handling', () => {
    let service: IndiiRemoteService;

    beforeEach(() => {
        service = new IndiiRemoteService();
        vi.clearAllMocks();
    });

    it('should throw an IndiiRemoteError with code INVALID_CONFIG if password is empty', async () => {
        const config = {
            port: 3333,
            password: ''
        };

        await expect(service.start(config)).rejects.toThrow(IndiiRemoteError);
        await expect(service.start(config)).rejects.toThrow('IndiiRemote requires a non-empty password');

        try {
            await service.start(config);
        } catch (error) {
            expect(error).toBeInstanceOf(IndiiRemoteError);
            if (error instanceof IndiiRemoteError) {
                expect(error.code).toBe('INVALID_CONFIG');
            }
        }
    });

    it('should throw an IndiiRemoteError with code INVALID_CONFIG if password is only whitespace', async () => {
        const config = {
            port: 3333,
            password: '   \n  \t  '
        };

        await expect(service.start(config)).rejects.toThrow(IndiiRemoteError);
        await expect(service.start(config)).rejects.toThrow('IndiiRemote requires a non-empty password');

        try {
            await service.start(config);
        } catch (error) {
            expect(error).toBeInstanceOf(IndiiRemoteError);
            if (error instanceof IndiiRemoteError) {
                expect(error.code).toBe('INVALID_CONFIG');
            }
        }
    });
});
