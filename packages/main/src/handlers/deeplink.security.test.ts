import { describe, it, expect } from 'vitest';
import { isDeepLinkSafe } from './deeplink';

describe('isDeepLinkSafe', () => {
    it('should allow valid indii-os URLs', () => {
        expect(isDeepLinkSafe('indii-os://app/settings')).toBe(true);
        expect(isDeepLinkSafe('indii-os://user/profile?id=123')).toBe(true);
        expect(isDeepLinkSafe('indii-os://path-with_hyphens-and_underscores')).toBe(true);
        expect(isDeepLinkSafe('indii-os://a.com/b/c?d=e&f=g%20h')).toBe(true);
    });

    it('should reject URLs with invalid protocols', () => {
        expect(isDeepLinkSafe('http://app/settings')).toBe(false);
        expect(isDeepLinkSafe('https://app/settings')).toBe(false);
        expect(isDeepLinkSafe('ftp://app/settings')).toBe(false);
        expect(isDeepLinkSafe('file:///app/settings')).toBe(false);
        expect(isDeepLinkSafe('javascript:alert(1)')).toBe(false);
    });

    it('should reject URLs that fail URL parsing', () => {
        expect(isDeepLinkSafe('not-a-url')).toBe(false);
        expect(isDeepLinkSafe('indii-os://:::')).toBe(false);
    });

    it('should reject URLs with internal IP hostnames (SSRF protection)', () => {
        expect(isDeepLinkSafe('indii-os://localhost/path')).toBe(false);
        expect(isDeepLinkSafe('indii-os://127.0.0.1/path')).toBe(false);
        expect(isDeepLinkSafe('indii-os://127.0.0.2/path')).toBe(false);
        expect(isDeepLinkSafe('indii-os://10.0.0.1/path')).toBe(false);
        expect(isDeepLinkSafe('indii-os://172.16.0.1/path')).toBe(false);
        expect(isDeepLinkSafe('indii-os://172.31.255.255/path')).toBe(false);
        expect(isDeepLinkSafe('indii-os://192.168.1.1/path')).toBe(false);
        expect(isDeepLinkSafe('indii-os://169.254.0.1/path')).toBe(false);
        expect(isDeepLinkSafe('indii-os://0.0.0.0/path')).toBe(false);
        expect(isDeepLinkSafe('indii-os://[::1]/path')).toBe(false);
    });

    it('should reject URLs with unsafe characters in path or search', () => {
        expect(isDeepLinkSafe('indii-os://app/settings<script>')).toBe(false);
        expect(isDeepLinkSafe('indii-os://app/settings?q=<script>')).toBe(false);
        expect(isDeepLinkSafe('indii-os://app/settings?q="quoted"')).toBe(false);
        expect(isDeepLinkSafe("indii-os://app/settings?q='quoted'")).toBe(false);
        expect(isDeepLinkSafe('indii-os://app/settings;reboot')).toBe(false);
        expect(isDeepLinkSafe('indii-os://app/settings|reboot')).toBe(false);
        expect(isDeepLinkSafe('indii-os://app/settings`reboot`')).toBe(false);
        expect(isDeepLinkSafe('indii-os://app/settings\nreboot')).toBe(false);
        expect(isDeepLinkSafe('indii-os://app/settings\rreboot')).toBe(false);
        expect(isDeepLinkSafe('indii-os://app/settings$()')).toBe(false);
    });
});
