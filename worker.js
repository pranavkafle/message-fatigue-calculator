// Web Worker for parallel chunk processing
class ChunkProcessor {
    constructor() {
        this.userAccumulators = new Map();
        this.messageAccumulators = new Map();
    }

    processChunk(chunkData) {
        const results = {
            usersProcessed: 0,
            messagesProcessed: 0,
            newUsers: 0,
            errors: 0
        };

        chunkData.forEach(row => {
            try {
                this.processRow(row);
                results.messagesProcessed++;
            } catch (error) {
                results.errors++;
                console.warn('Row processing error:', error);
            }
        });

        return {
            results,
            userAccumulators: Array.from(this.userAccumulators.entries()),
            messageAccumulators: Array.from(this.messageAccumulators.entries())
        };
    }

    processRow(row) {
        // Process user data
        this.processUserRow(row);
        
        // Process message data
        this.processMessageRow(row);
    }

    processUserRow(row) {
        const email = row.email || row.recipient;
        const customerId = row.customer_id;
        const createdDate = new Date(row.created_RFC3339);

        if (!email || !customerId || isNaN(createdDate.getTime())) return;

        if (!this.userAccumulators.has(email)) {
            this.userAccumulators.set(email, {
                email: email,
                customerId: customerId,
                messageCount: 0,
                messageDates: new Set(),
                minDate: createdDate,
                maxDate: createdDate,
                messages: []
            });
        }

        const user = this.userAccumulators.get(email);
        user.messageCount++;
        user.messageDates.add(createdDate.toDateString());
        user.minDate = createdDate < user.minDate ? createdDate : user.minDate;
        user.maxDate = createdDate > user.maxDate ? createdDate : user.maxDate;
        
        // Store message info for analysis
        user.messages.push({
            date: createdDate,
            type: this.determineMessageType(row)
        });
    }

    processMessageRow(row) {
        // Determine message type and name
        let messageName = '';
        let messageType = '';
        
        if (row.campaign_name) {
            messageName = row.campaign_name;
            messageType = 'campaign';
        } else if (row.newsletter_name) {
            messageName = row.newsletter_name;
            messageType = 'newsletter';
        } else if (row.transactional_message_name) {
            messageName = row.transactional_message_name;
            messageType = 'transactional';
        } else if (row.template_name) {
            messageName = row.template_name;
            messageType = 'template';
        } else {
            messageName = 'Unknown Message';
            messageType = 'unknown';
        }

        const messageKey = `${messageType}:${messageName}`;
        
        if (!this.messageAccumulators.has(messageKey)) {
            this.messageAccumulators.set(messageKey, {
                name: messageName,
                type: messageType,
                messageCount: 0,
                uniqueRecipients: new Set()
            });
        }

        const message = this.messageAccumulators.get(messageKey);
        message.messageCount++;
        message.uniqueRecipients.add(row.email || row.recipient);
    }

    determineMessageType(row) {
        if (row.campaign_name) return 'campaign';
        if (row.newsletter_name) return 'newsletter';
        if (row.transactional_message_name) return 'transactional';
        if (row.template_name) return 'template';
        return 'unknown';
    }

    calculateFinalUserMetrics() {
        const userAnalysis = [];
        
        for (const [email, userData] of this.userAccumulators) {
            const messages = userData.messages;
            const totalMessages = messages.length;
            
            // Calculate date range for this user
            const activeDays = userData.messageDates.size;
            
            const dailyAvg = totalMessages / activeDays;
            const weeklyAvg = dailyAvg * 7;
            const monthlyAvg = dailyAvg * 30;
            
            // Risk scoring
            let riskLevel = 'low';
            if (dailyAvg > 3) riskLevel = 'high';
            else if (dailyAvg > 1) riskLevel = 'medium';

            userAnalysis.push({
                email: email,
                customerId: userData.customerId,
                totalMessages,
                dailyAvg: Math.round(dailyAvg * 100) / 100,
                weeklyAvg: Math.round(weeklyAvg * 100) / 100,
                monthlyAvg: Math.round(monthlyAvg * 100) / 100,
                riskLevel,
                activeDays,
                messages: userData.messages
            });
        }

        return userAnalysis;
    }

    calculateFinalMessageMetrics() {
        const messageAnalysis = [];
        
        for (const [messageKey, messageData] of this.messageAccumulators) {
            messageAnalysis.push({
                name: messageData.name,
                type: messageData.type,
                messageCount: messageData.messageCount,
                uniqueRecipients: messageData.uniqueRecipients.size,
                avgFrequency: Math.round((messageData.messageCount / messageData.uniqueRecipients.size) * 100) / 100
            });
        }

        return messageAnalysis;
    }
}

// Worker message handler
self.onmessage = function(e) {
    const { type, data, chunkIndex } = e.data;
    
    if (type === 'PROCESS_CHUNK') {
        const processor = new ChunkProcessor();
        const result = processor.processChunk(data);
        
        self.postMessage({
            type: 'CHUNK_COMPLETE',
            chunkIndex,
            result
        });
    } else if (type === 'CALCULATE_FINAL_METRICS') {
        const processor = new ChunkProcessor();
        
        // Reconstruct accumulators from merged data
        processor.userAccumulators = new Map(data.userAccumulators);
        processor.messageAccumulators = new Map(data.messageAccumulators);
        
        const userMetrics = processor.calculateFinalUserMetrics();
        const messageMetrics = processor.calculateFinalMessageMetrics();
        
        self.postMessage({
            type: 'FINAL_METRICS_COMPLETE',
            userMetrics,
            messageMetrics
        });
    }
};
