import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Electron modules
const mockHandle = vi.fn();
const mockLoadURL = vi.fn().mockResolvedValue(undefined);
const mockWebContentsOn = vi.fn();
const mockOn = vi.fn();
const mockClose = vi.fn();

// Constructor Spy
const mockBrowserWindowConstructor = vi.fn();

// MockBrowserWindow plain function
const MockBrowserWindow = function(options: any) {
    mockBrowserWindowConstructor(options);
    return {
        loadURL: mockLoadURL,
        webContents: {
            on: mockWebContentsOn
        },
        on: mockOn,
        close: mockClose
    };
};

const mockValidateSender = vi.fn();
const mockGetCredentials = vi.fn();

vi.mock('electron', () => ({
    ipcMain: {
        handle: mockHandle
    },
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

        expect(mockHandle).toHaveBeenCalledWith(
            'social:connect-oauth',
            expect.any(Function)
        );
    });

    it('should register social:get-token handler', async () => {
        const { registerSocialHandlers } = await import('./social');
        registerSocialHandlers();

        expect(mockHandle).toHaveBeenCalledWith(
            'social:get-token',
            expect.any(Function)
        );
    });

    describe('social:connect-oauth', () => {
        it('should validate sender before processing', async () => {
            let oauthHandler: ((...args: any[]) => any) | undefined;

            mockHandle.mockImplementation((channel, handler) => {
                if (channel === 'social:connect-oauth') {
                    oauthHandler = handler;
                }
            });

            const { registerSocialHandlers } = await import('./social');
            registerSocialHandlers();

            expect(oauthHandler).toBeDefined();

            const mockEvent = { sender: {} };

            // Call the handler
            if (oauthHandler) {
                 // Trigger the promise but don't await it yet if it hangs on window close
                 oauthHandler(mockEvent, 'twitter');

                 expect(mockValidateSender).toHaveBeenCalledWith(mockEvent);
            }
        });
    });

    describe('social:get-token', () => {
        it('should validate sender before processing', async () => {
             let tokenHandler: ((...args: any[]) => any) | undefined;

            mockHandle.mockImplementation((channel, handler) => {
                if (channel === 'social:get-token') {
                    tokenHandler = handler;
                }
            });

            const { registerSocialHandlers } = await import('./social');
            registerSocialHandlers();

            const mockEvent = { sender: {} };

            if (tokenHandler) {
                await tokenHandler(mockEvent, 'twitter');
                expect(mockValidateSender).toHaveBeenCalledWith(mockEvent);
            }
        });

        it('should call credential service to get token', async () => {
            let tokenHandler: ((...args: any[]) => any) | undefined;

            mockHandle.mockImplementation((channel, handler) => {
                if (channel === 'social:get-token') {
                    tokenHandler = handler;
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
