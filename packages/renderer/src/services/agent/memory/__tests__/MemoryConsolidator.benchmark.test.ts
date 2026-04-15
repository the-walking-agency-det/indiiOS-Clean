import { describe, it, expect, vi } from 'vitest';
import { MemoryConsolidator } from '../MemoryConsolidator';
import { db } from '../../../firebase';
import { getDocs, query, collection, Timestamp, doc, writeBatch } from 'firebase/firestore';

vi.mock('../../../firebase', () => ({
    db: {},
}));

vi.mock('firebase/firestore', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...(actual as any),
        collection: vi.fn(),
        doc: vi.fn((db, ...path) => ({ path: path.join('/') })),
        writeBatch: vi.fn(() => ({
            update: vi.fn(),
            commit: vi.fn().mockResolvedValue(undefined),
        })),
        Timestamp: {
            now: vi.fn(() => ({ seconds: 123, nanoseconds: 123 })),
        },
        addDoc: vi.fn().mockResolvedValue({ id: 'new-doc-id' }),
    };
});

vi.mock('../MemorySummarizer', () => ({
    MemorySummarizer: {
        summarizeMemories: vi.fn().mockResolvedValue('Summarized memory content'),
    },
}));

describe('MemoryConsolidator Benchmark', () => {
    it('benchmark consolidate method', async () => {
        const numMemories = 10000;
        const memories = Array.from({ length: numMemories }, (_, i) => ({
            id: `mem-${i}`,
            content: `Content ${i}`,
            type: 'fact',
        }));

        const start = performance.now();
        await MemoryConsolidator.consolidate('user-123', memories);
        const end = performance.now();

        console.log(`[Benchmark] consolidate (${numMemories} items): ${end - start}ms`);
        expect(end - start).toBeGreaterThan(0);
    });

    it('benchmark markAsConsolidated method', async () => {
        const numMemories = 10000;
        const memoryIds = Array.from({ length: numMemories }, (_, i) => `mem-${i}`);

        const start = performance.now();
        // Use any to access private method for benchmarking purposes
        await (MemoryConsolidator as any).markAsConsolidated('user-123', memoryIds);
        const end = performance.now();

        console.log(`[Benchmark] markAsConsolidated (${numMemories} items): ${end - start}ms`);
        expect(end - start).toBeGreaterThan(0);
    });
});
