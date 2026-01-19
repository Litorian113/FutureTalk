import { transcribeAudio, translateText, generateTTS } from '../services/openai';

// Worker Pool Configuration
const MAX_WORKERS = 3; // Process up to 3 chunks in parallel

type ChunkJob = {
    id: number;
    uri: string;
    contextPrompt: string;
};

type ChunkResult = {
    id: number;
    original: string;
    german: string;
    language: string;
    ttsUri: string | null;
    timestamp: string;
};

class ChunkProcessor {
    private queue: ChunkJob[] = [];
    private activeWorkers = 0;
    private nextJobId = 0;
    private results: Map<number, ChunkResult> = new Map();
    private nextResultId = 0;

    private onResult: (result: ChunkResult) => void;
    private onContextUpdate: (context: string) => void;

    constructor(
        onResult: (result: ChunkResult) => void,
        onContextUpdate: (context: string) => void
    ) {
        this.onResult = onResult;
        this.onContextUpdate = onContextUpdate;
    }

    // Add a new chunk to the queue
    addChunk(uri: string, contextPrompt: string) {
        const job: ChunkJob = {
            id: this.nextJobId++,
            uri,
            contextPrompt,
        };

        this.queue.push(job);
        console.log(`[ChunkProcessor] Added job ${job.id} to queue. Queue length: ${this.queue.length}`);

        this.processQueue();
    }

    // Process queue with worker pool
    private async processQueue() {
        // Start workers if we have capacity and jobs
        while (this.activeWorkers < MAX_WORKERS && this.queue.length > 0) {
            const job = this.queue.shift();
            if (!job) break;

            this.activeWorkers++;
            console.log(`[ChunkProcessor] Starting worker for job ${job.id}. Active workers: ${this.activeWorkers}`);

            // Process in background (don't await)
            this.processJob(job).finally(() => {
                this.activeWorkers--;
                console.log(`[ChunkProcessor] Worker finished job ${job.id}. Active workers: ${this.activeWorkers}`);
                this.processQueue(); // Try to start next job
            });
        }
    }

    // Process a single job
    private async processJob(job: ChunkJob): Promise<void> {
        try {
            console.log(`[ChunkProcessor] Processing job ${job.id}...`);

            // A. Transcribe
            const { text, language } = await transcribeAudio(job.uri, job.contextPrompt);

            if (!text || text.trim().length < 2) {
                console.log(`[ChunkProcessor] Job ${job.id} - empty/silence, skipping`);
                return;
            }

            console.log(`[ChunkProcessor] Job ${job.id} - Transcribed: "${text.substring(0, 50)}..." (${language})`);

            // B. Translate
            let germanText = text;
            if (!language.startsWith('de')) {
                germanText = await translateText(text, language || "Auto", "German");
                console.log(`[ChunkProcessor] Job ${job.id} - Translated: "${germanText.substring(0, 50)}..."`);
            }

            // C. Update context (for next chunk)
            const newContext = (job.contextPrompt + " " + text).slice(-200).trim();
            this.onContextUpdate(newContext);

            // D. Generate TTS
            const ttsUri = await generateTTS(germanText, 'alloy');
            console.log(`[ChunkProcessor] Job ${job.id} - TTS generated: ${ttsUri ? 'success' : 'failed'}`);

            // E. Store result
            const result: ChunkResult = {
                id: job.id,
                original: text,
                german: germanText,
                language,
                ttsUri,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };

            this.results.set(job.id, result);

            // F. Emit results in order
            this.emitOrderedResults();

        } catch (error) {
            console.error(`[ChunkProcessor] Job ${job.id} failed:`, error);
        }
    }

    // Emit results in the correct order (even if they finish out of order)
    private emitOrderedResults() {
        while (this.results.has(this.nextResultId)) {
            const result = this.results.get(this.nextResultId)!;
            this.results.delete(this.nextResultId);
            this.nextResultId++;

            console.log(`[ChunkProcessor] Emitting result ${result.id} in order`);
            this.onResult(result);
        }
    }

    // Clear all pending jobs
    clear() {
        this.queue = [];
        this.results.clear();
        console.log('[ChunkProcessor] Queue and results cleared');
    }
}

export default ChunkProcessor;
