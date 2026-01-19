import { transcribeAudio, translateText } from '../services/openai';

// Simplified processor for Listen Mode (no TTS, just text)
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
    timestamp: string;
};

class ListenModeProcessor {
    private queue: ChunkJob[] = [];
    private isProcessing = false;
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
        console.log(`[ListenProcessor] Added job ${job.id}. Queue: ${this.queue.length}`);

        // Start processing if not already running
        if (!this.isProcessing) {
            this.processNext();
        }
    }

    // Process jobs one by one (sequential, but recording continues in parallel)
    private async processNext() {
        if (this.queue.length === 0) {
            this.isProcessing = false;
            console.log('[ListenProcessor] Queue empty, idle');
            return;
        }

        this.isProcessing = true;
        const job = this.queue.shift()!;

        console.log(`[ListenProcessor] Processing job ${job.id}...`);

        try {
            // A. Transcribe
            const { text, language } = await transcribeAudio(job.uri, job.contextPrompt);

            if (!text || text.trim().length < 2) {
                console.log(`[ListenProcessor] Job ${job.id} - empty, skipping`);
                this.processNext(); // Continue with next
                return;
            }

            console.log(`[ListenProcessor] Job ${job.id} - Transcribed: "${text.substring(0, 50)}..." (${language})`);

            // B. Translate to German (if needed)
            let germanText = text;
            if (!language.startsWith('de')) {
                germanText = await translateText(text, language || "Auto", "German");
                console.log(`[ListenProcessor] Job ${job.id} - Translated: "${germanText.substring(0, 50)}..."`);
            } else {
                console.log(`[ListenProcessor] Job ${job.id} - Already German`);
            }

            // C. Update context for next chunk
            const newContext = (job.contextPrompt + " " + text).slice(-200).trim();
            this.onContextUpdate(newContext);

            // D. Store result
            const result: ChunkResult = {
                id: job.id,
                original: text,
                german: germanText,
                language,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };

            this.results.set(job.id, result);

            // E. Emit results in order
            this.emitOrderedResults();

        } catch (error) {
            console.error(`[ListenProcessor] Job ${job.id} failed:`, error);
        }

        // Process next job
        this.processNext();
    }

    // Emit results in the correct order
    private emitOrderedResults() {
        while (this.results.has(this.nextResultId)) {
            const result = this.results.get(this.nextResultId)!;
            this.results.delete(this.nextResultId);
            this.nextResultId++;

            console.log(`[ListenProcessor] Emitting result ${result.id}`);
            this.onResult(result);
        }
    }

    // Clear all pending jobs
    clear() {
        this.queue = [];
        this.results.clear();
        this.isProcessing = false;
        console.log('[ListenProcessor] Cleared');
    }
}

export default ListenModeProcessor;
