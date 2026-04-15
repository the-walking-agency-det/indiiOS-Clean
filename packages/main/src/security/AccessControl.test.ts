import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'path';

// Mocks
const mockUserData = '/userData';
const mockTmpDir = '/tmp';
const mockDocuments = '/documents';
const mockIndiiOS = path.join(mockDocuments, 'IndiiOS');

vi.mock('electron', () => ({
    app: {
        getPath: (name: string) => {
            if (name === 'userData') return mockUserData;
            if (name === 'documents') return mockDocuments;
            return '';
        }
    }
}));

vi.mock('os', () => ({
    default: {
        tmpdir: () => mockTmpDir
    }
}));


vi.mock('fs', () => {
    let throwOnUserData = false;
    return {
        default: {
            realpathSync: (p: string) => {
                // Feature to enable test-specific throwing
                if (throwOnUserData && p === mockUserData) {
                    throw new Error('mock error on userData');
                }

                // Allow test paths
                if (p.startsWith(mockUserData) ||
                    p.startsWith(mockTmpDir) ||
                    p.startsWith(mockDocuments) ||
                    p.startsWith('/authorized')) {
                    return p;
                }
                throw new Error(`ENOENT: no such file or directory, realpath '${p}'`);
            },
            __setThrowOnUserData: (val: boolean) => {
                throwOnUserData = val;
            }
        }
    };
});

import { accessControlService } from './AccessControlService';

describe('AccessControlService', () => {
    beforeEach(() => {
        // Reset the singleton state
        (accessControlService as any).authorizedPaths.clear();
    });

    it('should deny arbitrary paths by default', () => {
        // /random/file.txt is not in allowlist mock, so realpathSync throws, verifying deny logic handles errors
        expect(accessControlService.verifyAccess('/random/file.txt')).toBe(false);
    });

    it('should allow paths in userData', () => {
        expect(accessControlService.verifyAccess(path.join(mockUserData, 'config.json'))).toBe(true);
    });

    it('should allow paths in tmpdir', () => {
        expect(accessControlService.verifyAccess(path.join(mockTmpDir, 'staged/file.txt'))).toBe(true);
    });

    it('should allow paths in Documents/IndiiOS', () => {
        expect(accessControlService.verifyAccess(path.join(mockIndiiOS, 'Assets/Video/movie.mp4'))).toBe(true);
    });

    it('should deny paths in Documents outside IndiiOS', () => {
        // Documents itself is mocked to exist, so realpath works.
        // But logic should deny it.
        expect(accessControlService.verifyAccess(path.join(mockDocuments, 'secret.txt'))).toBe(false);
    });

    it('should allow explicitly granted files', () => {
        const file = '/authorized/file.txt';
        accessControlService.grantAccess(file);
        expect(accessControlService.verifyAccess(file)).toBe(true);
    });

    it('should allow files in explicitly granted directories', () => {
        const dir = '/authorized/dir';
        accessControlService.grantAccess(dir);
        expect(accessControlService.verifyAccess(path.join(dir, 'file.txt'))).toBe(true);
    });

    it('should deny files that do not exist (realpath failure)', () => {
        // /nonexistent/file.txt -> realpath throws -> returns false
        expect(accessControlService.verifyAccess('/nonexistent/file.txt')).toBe(false);
    });

    it('should catch error when path.resolve throws in grantAccess', () => {
        const spy = vi.spyOn(path, 'resolve').mockImplementationOnce(() => {
            throw new Error('mock resolve error');
        });

        expect(() => accessControlService.grantAccess('/some/path')).not.toThrow();
        expect((accessControlService as any).authorizedPaths.size).toBe(0);

        spy.mockRestore();
    });

    it('should fallback to path.resolve when realpathSync throws for system roots', async () => {
        const fsMock = await import('fs');
        (fsMock.default as any).__setThrowOnUserData(true);

        expect(accessControlService.verifyAccess(path.join(mockUserData, 'config.json'))).toBe(true);

        (fsMock.default as any).__setThrowOnUserData(false);
    });
});
