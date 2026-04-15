const fs = require('fs');

let content = fs.readFileSync('packages/main/src/security/AccessControl.test.ts', 'utf8');

content = content.replace(/vi\.mock\('fs', \(\) => {[\s\S]*?}\);\n/, `vi.mock('fs', () => {
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
                throw new Error(\`ENOENT: no such file or directory, realpath '\${p}'\`);
            },
            __setThrowOnUserData: (val: boolean) => {
                throwOnUserData = val;
            }
        }
    };
});
`);

fs.writeFileSync('packages/main/src/security/AccessControl.test.ts', content);
