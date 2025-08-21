// Progressive Processing Manager for unlimited rows
class ProgressiveProcessor {
    constructor() {
        this.workers = [];
        this.workerCount = navigator.hardwareConcurrency || 4;
        this.chunkSize = this.calculateOptimalChunkSize();
        this.totalChunks = 0;
        this.processedChunks = 0;
        this.userAccumulators = new Map();
        this.messageAccumulators = new Map();
        this.isProcessing = false;
        this.startTime = null;
        
        this.initializeWorkers();
    }

    calculateOptimalChunkSize() {
        // Calculate chunk size based on available memory
        const availableMemory = navigator.deviceMemory || 4; // GB
        
        if (availableMemory >= 16) return 100000;  // 16GB+ = 100K chunks
        if (availableMemory >= 8) return 75000;    // 8GB+ = 75K chunks
        if (availableMemory >= 4) return 50000;    // 4GB+ = 50K chunks
        return 25000;                              // Default = 25K chunks
    }

    initializeWorkers() {
        // Create Web Workers for parallel processing
        for (let i = 0; i < this.workerCount; i++) {
            const worker = new Worker('worker.js');
            worker.onmessage = this.handleWorkerMessage.bind(this);
            this.workers.push({
                worker,
                busy: false,
                chunkIndex: null
            });
        }
    }

    async processFile(file) {
        this.isProcessing = true;
        this.startTime = Date.now();
        this.processedChunks = 0;
        this.userAccumulators.clear();
        this.messageAccumulators.clear();

        try {
            // Show processing UI
            this.showProcessingInterface();
            
            // Stream and chunk the file
            const chunks = await this.streamAndChunkFile(file);
            this.totalChunks = chunks.length;
            
            // Process chunks in parallel
            await this.processChunksInParallel(chunks);
            
            // Calculate final metrics
            const results = await this.calculateFinalMetrics();
            
            // Hide processing UI
            this.hideProcessingInterface();
            
            return results;
            
        } catch (error) {
            this.hideProcessingInterface();
            throw error;
        }
    }

    async streamAndChunkFile(file) {
        return new Promise((resolve, reject) => {
            const chunks = [];
            let currentChunk = [];
            let rowCount = 0;
            let headers = [];

            Papa.parse(file, {
                header: true,
                step: (row) => {
                    // Store headers on first row
                    if (rowCount === 0) {
                        headers = Object.keys(row.data);
                    }

                    // Skip empty rows
                    if (row.data.id && row.data.id.trim() !== '') {
                        currentChunk.push(row.data);
                        rowCount++;

                        // When chunk is full, save it and start new chunk
                        if (currentChunk.length >= this.chunkSize) {
                            chunks.push([...currentChunk]);
                            currentChunk = [];
                            
                            // Update progress
                            this.updateStreamingProgress(chunks.length * this.chunkSize);
                        }
                    }
                },
                complete: () => {
                    // Add final chunk if it has data
                    if (currentChunk.length > 0) {
                        chunks.push(currentChunk);
                    }
                    
                    console.log(`File streamed into ${chunks.length} chunks (${rowCount} total rows)`);
                    resolve(chunks);
                },
                error: (error) => {
                    reject(error);
                }
            });
        });
    }

    async processChunksInParallel(chunks) {
        return new Promise((resolve) => {
            let chunksCompleted = 0;
            let nextChunkIndex = 0;

            const processNextChunk = () => {
                // Find available worker
                const availableWorker = this.workers.find(w => !w.busy);
                
                if (availableWorker && nextChunkIndex < chunks.length) {
                    // Assign chunk to worker
                    availableWorker.busy = true;
                    availableWorker.chunkIndex = nextChunkIndex;
                    
                    availableWorker.worker.postMessage({
                        type: 'PROCESS_CHUNK',
                        data: chunks[nextChunkIndex],
                        chunkIndex: nextChunkIndex
                    });
                    
                    nextChunkIndex++;
                    
                    // Process next chunk if workers available
                    setTimeout(processNextChunk, 0);
                }
            };

            // Handle worker completion
            this.chunkCompleteHandler = (workerIndex, chunkIndex, result) => {
                // Merge results into accumulators
                this.mergeChunkResults(result);
                
                // Mark worker as available
                this.workers[workerIndex].busy = false;
                this.workers[workerIndex].chunkIndex = null;
                
                chunksCompleted++;
                this.processedChunks = chunksCompleted;
                
                // Update progress
                this.updateProcessingProgress();
                
                // Check if all chunks completed
                if (chunksCompleted === chunks.length) {
                    resolve();
                } else {
                    // Process next chunk
                    processNextChunk();
                }
            };

            // Start processing with all available workers
            for (let i = 0; i < this.workerCount && i < chunks.length; i++) {
                processNextChunk();
            }
        });
    }

    handleWorkerMessage(event) {
        const { type, chunkIndex, result } = event.data;
        
        if (type === 'CHUNK_COMPLETE') {
            const workerIndex = this.workers.findIndex(w => w.chunkIndex === chunkIndex);
            this.chunkCompleteHandler(workerIndex, chunkIndex, result);
        }
    }

    mergeChunkResults(chunkResult) {
        const { userAccumulators, messageAccumulators } = chunkResult;
        
        // Merge user accumulators
        userAccumulators.forEach(([email, userData]) => {
            if (this.userAccumulators.has(email)) {
                const existingUser = this.userAccumulators.get(email);
                
                // Merge message counts
                existingUser.messageCount += userData.messageCount;
                
                // Merge message dates
                userData.messageDates.forEach(date => existingUser.messageDates.add(date));
                
                // Update date range
                existingUser.minDate = userData.minDate < existingUser.minDate ? userData.minDate : existingUser.minDate;
                existingUser.maxDate = userData.maxDate > existingUser.maxDate ? userData.maxDate : existingUser.maxDate;
                
                // Merge messages array
                existingUser.messages = existingUser.messages.concat(userData.messages);
            } else {
                // Convert Set back from array for messageDates
                userData.messageDates = new Set(userData.messageDates);
                this.userAccumulators.set(email, userData);
            }
        });

        // Merge message accumulators
        messageAccumulators.forEach(([messageKey, messageData]) => {
            if (this.messageAccumulators.has(messageKey)) {
                const existingMessage = this.messageAccumulators.get(messageKey);
                existingMessage.messageCount += messageData.messageCount;
                
                // Merge unique recipients
                messageData.uniqueRecipients.forEach(recipient => 
                    existingMessage.uniqueRecipients.add(recipient)
                );
            } else {
                // Convert Set back from array
                messageData.uniqueRecipients = new Set(messageData.uniqueRecipients);
                this.messageAccumulators.set(messageKey, messageData);
            }
        });
    }

    async calculateFinalMetrics() {
        // Use worker to calculate final metrics
        return new Promise((resolve) => {
            const worker = this.workers[0].worker;
            
            // Prepare data for worker (convert Sets to arrays for transfer)
            const userData = Array.from(this.userAccumulators.entries()).map(([email, data]) => [
                email, 
                {
                    ...data,
                    messageDates: Array.from(data.messageDates)
                }
            ]);
            
            const messageData = Array.from(this.messageAccumulators.entries()).map(([key, data]) => [
                key,
                {
                    ...data,
                    uniqueRecipients: Array.from(data.uniqueRecipients)
                }
            ]);

            worker.onmessage = (event) => {
                if (event.data.type === 'FINAL_METRICS_COMPLETE') {
                    const { userMetrics, messageMetrics } = event.data;
                    
                    // Calculate summary statistics
                    const summary = this.calculateSummaryStats(userMetrics);
                    
                    resolve({
                        users: userMetrics,
                        messages: messageMetrics,
                        summary,
                        processingTime: Date.now() - this.startTime,
                        totalRows: this.processedChunks * this.chunkSize
                    });
                }
            };

            worker.postMessage({
                type: 'CALCULATE_FINAL_METRICS',
                data: {
                    userAccumulators: userData,
                    messageAccumulators: messageData
                }
            });
        });
    }

    calculateSummaryStats(userMetrics) {
        const totalMessages = userMetrics.reduce((sum, user) => sum + user.totalMessages, 0);
        const avgPerDay = userMetrics.reduce((sum, user) => sum + user.dailyAvg, 0) / userMetrics.length;
        const highFreqUsers = userMetrics.filter(user => user.riskLevel === 'high').length;
        
        return {
            totalMessages,
            uniqueUsers: userMetrics.length,
            avgPerDay: Math.round(avgPerDay * 100) / 100,
            highFreqUsers
        };
    }

    showProcessingInterface() {
        // Create processing overlay
        const overlay = document.createElement('div');
        overlay.id = 'processingOverlay';
        overlay.className = 'processing-overlay';
        overlay.innerHTML = `
            <div class="processing-content">
                <div class="processing-spinner"></div>
                <h3>Processing Large Dataset</h3>
                <p id="processingStatus">Preparing to process...</p>
                <div class="progress-container">
                    <div class="progress-bar">
                        <div class="progress-fill" id="progressFill"></div>
                    </div>
                    <span id="progressText">0%</span>
                </div>
                <div class="processing-stats">
                    <div>Chunks Processed: <span id="chunksProcessed">0</span> / <span id="totalChunks">0</span></div>
                    <div>Estimated Time Remaining: <span id="timeRemaining">Calculating...</span></div>
                    <div>Processing Speed: <span id="processingSpeed">-</span> rows/sec</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
    }

    hideProcessingInterface() {
        const overlay = document.getElementById('processingOverlay');
        if (overlay) {
            overlay.remove();
        }
        this.isProcessing = false;
    }

    updateStreamingProgress(rowsProcessed) {
        const statusEl = document.getElementById('processingStatus');
        if (statusEl) {
            statusEl.textContent = `Streaming file... ${rowsProcessed.toLocaleString()} rows read`;
        }
    }

    updateProcessingProgress() {
        const progressPercent = (this.processedChunks / this.totalChunks) * 100;
        const elapsedTime = Date.now() - this.startTime;
        
        // Update progress bar
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        if (progressFill) progressFill.style.width = `${progressPercent}%`;
        if (progressText) progressText.textContent = `${Math.round(progressPercent)}%`;
        
        // Update stats
        const chunksProcessedEl = document.getElementById('chunksProcessed');
        const totalChunksEl = document.getElementById('totalChunks');
        const timeRemainingEl = document.getElementById('timeRemaining');
        const processingSpeedEl = document.getElementById('processingSpeed');
        
        if (chunksProcessedEl) chunksProcessedEl.textContent = this.processedChunks;
        if (totalChunksEl) totalChunksEl.textContent = this.totalChunks;
        
        if (this.processedChunks > 0) {
            const avgTimePerChunk = elapsedTime / this.processedChunks;
            const remainingChunks = this.totalChunks - this.processedChunks;
            const estimatedTimeRemaining = remainingChunks * avgTimePerChunk;
            
            if (timeRemainingEl) {
                timeRemainingEl.textContent = this.formatTime(estimatedTimeRemaining);
            }
            
            const rowsPerSecond = Math.round((this.processedChunks * this.chunkSize) / (elapsedTime / 1000));
            if (processingSpeedEl) {
                processingSpeedEl.textContent = rowsPerSecond.toLocaleString();
            }
        }
    }

    formatTime(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        if (seconds < 60) return `${seconds}s`;
        
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
        
        const hours = Math.floor(minutes / 60);
        return `${hours}h ${minutes % 60}m`;
    }

    destroy() {
        // Clean up workers
        this.workers.forEach(({ worker }) => worker.terminate());
        this.workers = [];
        this.hideProcessingInterface();
    }
}
