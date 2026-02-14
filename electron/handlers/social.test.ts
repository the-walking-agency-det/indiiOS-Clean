import { describe, it, expect, vi, beforeEach } from 'vitest';

// eslint-friendly handler type
type IpcHandler = (...args: unknown[]) => unknown;

// Mock Electron modules
const mockIpcMain = {
    handle: vi.fn()
};

const mockLoadURL = vi.fn().mockResolvedValue(undefined);
const mockWebContentsOn = vi.fn();
const mockOn = vi.fn();
const mockClose = vi.fn();

const MockBrowserWindow = vi.fn();
MockBrowserWindow.mockImplementation(function(this: any) {
    return {
        loadURL: mockLoadURL,
        webContents: {
            on: mockWebContentsOn
        },
        on: mockOn,
        close: mockClose
    };
} as any);

const mockValidateSender = vi.fn();
const mockGetCredentials = vi.fn();

vi.mock('electron', () => ({
    ipcMain: mockIpcMain,
    BrowserWindow: MockBrowserWindow,
    shell: {}
}));

vi.mock('../utils/ipc-security', () => ({
    validateSender: mockValidateSender
}));

vi.mock('../services/CredentialService', () => ({
    credentialService: {
        getCredentials: mockGetCredentials
    }
}));

describe('Social Handler', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
    });

    it('should register social:connect-oauth handler', async () => {
        const { registerSocialHandlers } = await import('./social');
        registerSocialHandlers();

        expect(mockIpcMain.handle).toHaveBeenCalledWith(
            'social:connect-oauth',
            expect.any(Function)
        );
    });

    it('should register social:get-token handler', async () => {
        const { registerSocialHandlers } = await import('./social');
        registerSocialHandlers();

        expect(mockIpcMain.handle).toHaveBeenCalledWith(
            'social:get-token',
            expect.any(Function)
        );
    });

    describe('social:connect-oauth', () => {
        it('should validate sender before processing', async () => {
            let oauthHandler: IpcHandler | undefined;

            mockIpcMain.handle.mockImplementation((channel, handler) => {
                if (channel === 'social:connect-oauth') {
                    oauthHandler = handler as IpcHandler;
                }
            });

            const { registerSocialHandlers } = await import('./social');
            registerSocialHandlers();

            expect(oauthHandler).toBeDefined();

            const mockEvent = { sender: {} };

            if (oauthHandler) {
                const promise = oauthHandler(mockEvent, 'twitter');

                // Simulate window closed to resolve the promise
                const closeCall = mockOn.mock.calls.find(c => c[0] === 'closed');
                if (closeCall) {
                    closeCall[1]();
                }

                await promise;
                expect(mockValidateSender).toHaveBeenCalledWith(mockEvent);
            }
        });

        it('should create BrowserWindow for OAuth flow', async () => {
            let oauthHandler: IpcHandler | undefined;

            mockIpcMain.handle.mockImplementation((channel, handler) => {
                if (channel === 'social:connect-oauth') {
                    oauthHandler = handler as IpcHandler;
                }
            });

            const { registerSocialHandlers } = await import('./social');
            registerSocialHandlers();

            const mockEvent = { sender: {} };

            if (oauthHandler) {
                const promise = oauthHandler(mockEvent, 'twitter');

                // Simulate window closed to resolve
                const closeCall = mockOn.mock.calls.find(c => c[0] === 'closed');
                if (closeCall) {
                    closeCall[1]();
                }

                await promise;

                expect(MockBrowserWindow).toHaveBeenCalledWith(expect.objectContaining({
                    width: 600,
                    height: 800,
                    title: 'Connect to Twitter'
                }));
            }
        });

        it('should load mock OAuth page', async () => {
            let oauthHandler: IpcHandler | undefined;

            mockIpcMain.handle.mockImplementation((channel, handler) => {
                if (channel === 'social:connect-oauth') {
                    oauthHandler = handler as IpcHandler;
                }
            });

            const { registerSocialHandlers } = await import('./social');
            registerSocialHandlers();

            const mockEvent = { sender: {} };

            if (oauthHandler) {
                const promise = oauthHandler(mockEvent, 'twitter');

                // Simulate window closed to resolve
                const closeCall = mockOn.mock.calls.find(c => c[0] === 'closed');
                if (closeCall) {
                    closeCall[1]();
                }

                await promise;

                expect(mockLoadURL).toHaveBeenCalled();
                const loadedUrl = mockLoadURL.mock.calls[0][0];
                expect(loadedUrl).toContain('data:text/html');
            }
        });
    });

    describe('social:get-token', () => {
        it('should validate sender before processing', async () => {
            let tokenHandler: IpcHandler | undefined;

            mockIpcMain.handle.mockImplementation((channel, handler) => {
                if (channel === 'social:get-token') {
                    tokenHandler = handler as IpcHandler;
                }
            });

            const { registerSocialHandlers } = await import('./social');
            registerSocialHandlers();

            expect(tokenHandler).toBeDefined();

            const mockEvent = { sender: {} };

            if (tokenHandler) {
                await tokenHandler(mockEvent, 'twitter');
                expect(mockValidateSender).toHaveBeenCalledWith(mockEvent);
            }
        });

        it('should call credential service to get token', async () => {
            let tokenHandler: IpcHandler | undefined;

            mockIpcMain.handle.mockImplementation((channel, handler) => {
                if (channel === 'social:get-token') {
                    tokenHandler = handler as IpcHandler;
                }
            });

            mockGetCredentials.mockResolvedValue({
                accessToken: 'test-token'
            });

            const { registerSocialHandlers } = await import('./social');
            registerSocialHandlers();

            const mockEvent = { sender: {} };

            if (tokenHandler) {
                await tokenHandler(mockEvent, 'twitter');
                expect(mockGetCredentials).toHaveBeenCalledWith('social_twitter');
            }
        });
    });
});
