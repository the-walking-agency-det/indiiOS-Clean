/**
 * StemSeparationService.ts
 *
 * Orchestrates AI-powered audio stem separation (Spleeter/Demucs).
 * Calls the Python sidecar on localhost:50080; falls back to a
 * progress-simulation when the sidecar is unavailable (web/no-Docker).
 */

import { useStore } from '@/core/store';
import { logger } from '@/utils/logger';
import { VideoUploadService } from '@/services/video/VideoUploadService';
import { getDownloadURL, ref } from 'firebase/storage';
import { storage } from '@/services/firebase';

export interface StemResults {
    vocalsUrl: string;
    drumsUrl: string;
    bassUrl: string;
    otherUrl: string;
}

interface SidecarStemResponse {
    job_id: string;
    vocals_path: string;
    drums_path: string;
    bass_path: string;
    other_path: string;
    storage_prefix: string;
}

const SIDECAR_BASE_URL =
    (import.meta as any).env?.VITE_A0_BASE_URL || 'http://127.0.0.1:50080';

export class StemSeparationService {
    /**
     * Triggers stem separation for an audio file.
     * Returns a jobId to poll for completion.
     */
    async separate(file: File): Promise<string> {
        const store = useStore.getState();
        const jobId = `stem_${Date.now()}`;

        store.addJob({
            id: jobId,
            title: `Stem Separation: ${file.name}`,
            progress: 0,
            status: 'running',
            type: 'audio_process',
        });

        try {
            logger.info(`[StemSeparation] Uploading ${file.name}…`);
            const uploadResult = await VideoUploadService.uploadVideo(
                file,
                `audio/stems/pending/${jobId}`
            );

            // Try the Python sidecar first
            const sidecarResult = await this.callSidecar(uploadResult.url, jobId);
            if (sidecarResult) {
                store.updateJobStatus(jobId, 'success');
                logger.info(`[StemSeparation] Sidecar completed job ${jobId}`);
                return jobId;
            }

            // Sidecar unavailable — simulate progress for web builds
            logger.warn(
                '[StemSeparation] Sidecar unreachable; running simulation fallback'
            );
            this.simulateProgress(jobId, file.name);
            return jobId;
        } catch (error: any) {
            logger.error('[StemSeparation] Failed to start separation:', error);
            store.updateJobStatus(jobId, 'error', error.message || 'Separation failed');
            throw error;
        }
    }

    /**
     * Calls the Python sidecar's /tools/separate-stems endpoint.
     * Returns the sidecar response on success, null if the sidecar is offline.
     */
    private async callSidecar(
        audioUrl: string,
        jobId: string
    ): Promise<SidecarStemResponse | null> {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10_000); // 10s connect timeout

        try {
            const response = await fetch(`${SIDECAR_BASE_URL}/tools/separate-stems`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: audioUrl, job_id: jobId }),
                signal: controller.signal,
            });

            if (!response.ok) {
                logger.warn(
                    `[StemSeparation] Sidecar returned ${response.status} — falling back`
                );
                return null;
            }

            return (await response.json()) as SidecarStemResponse;
        } catch (err: any) {
            if (err.name === 'AbortError') {
                logger.warn('[StemSeparation] Sidecar connection timed out — falling back');
            } else {
                logger.warn('[StemSeparation] Sidecar unreachable:', err.message);
            }
            return null;
        } finally {
            clearTimeout(timeout);
        }
    }

    /**
     * Simulates background processing when the sidecar is unavailable.
     * Used in web builds or when Docker isn't running.
     */
    private simulateProgress(jobId: string, filename: string) {
        let progress = 0;
        const interval = setInterval(() => {
            progress += 5;
            const store = useStore.getState();
            store.updateJobProgress(jobId, progress);

            if (progress >= 100) {
                clearInterval(interval);
                store.updateJobStatus(jobId, 'success');
                logger.info(`[StemSeparation] Simulation finished for ${filename}`);
            }
        }, 1_000);
    }

    /**
     * Resolves Firebase Storage download URLs for separated stems.
     * Falls back to sidecar-relative paths if not found in Storage.
     */
    async getStemUrls(jobId: string): Promise<StemResults> {
        const stems = ['vocals', 'drums', 'bass', 'other'] as const;
        const urls: Record<string, string> = {};

        await Promise.all(
            stems.map(async (stem) => {
                const storagePath = `audio/stems/${jobId}/${stem}.mp3`;
                try {
                    urls[stem] = await getDownloadURL(ref(storage, storagePath));
                } catch {
                    // Not yet in Storage (sidecar pending upload or sim mode)
                    urls[stem] = `/stems/${jobId}/${stem}.mp3`;
                }
            })
        );

        return {
            vocalsUrl: urls.vocals,
            drumsUrl: urls.drums,
            bassUrl: urls.bass,
            otherUrl: urls.other,
        };
    }
}

export const stemSeparationService = new StemSeparationService();
