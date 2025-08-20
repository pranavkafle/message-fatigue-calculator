// Message Fatigue Calculator - Main Application
class MessageFatigueCalculator {
    constructor() {
        this.data = null;
        this.processedData = null;
        this.charts = {};
        this.filteredUsers = [];
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // File upload events
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const browseBtn = document.getElementById('browseBtn');

        uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        uploadArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
        uploadArea.addEventListener('drop', this.handleDrop.bind(this));
        uploadArea.addEventListener('click', () => fileInput.click());
        
        browseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            fileInput.click();
        });
        
        fileInput.addEventListener('change', this.handleFileSelect.bind(this));

        // Search and filter events
        document.getElementById('userSearch').addEventListener('input', this.filterUsers.bind(this));
        document.getElementById('riskFilter').addEventListener('change', this.filterUsers.bind(this));

        // Export events
        document.getElementById('exportCsv').addEventListener('click', this.exportCSV.bind(this));
        document.getElementById('exportPdf').addEventListener('click', this.exportPDF.bind(this));
        document.getElementById('exportCharts').addEventListener('click', this.exportCharts.bind(this));
    }

    // File handling methods
    handleDragOver(e) {
        e.preventDefault();
        document.getElementById('uploadArea').classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        document.getElementById('uploadArea').classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        document.getElementById('uploadArea').classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.processFile(file);
        }
    }

    processFile(file) {
        // Validate file
        if (!file.name.toLowerCase().endsWith('.csv')) {
            this.showStatus('error', 'Please select a CSV file.');
            return;
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            this.showStatus('error', 'File size must be less than 10MB.');
            return;
        }

        this.showStatus('processing', 'Processing file...');
        this.showFileInfo(file);

        // Parse CSV
        Papa.parse(file, {
            header: true,
            complete: this.handleCSVParsed.bind(this),
            error: (error) => {
                this.showStatus('error', `Error parsing CSV: ${error.message}`);
            }
        });
    }

    handleCSVParsed(results) {
        const data = results.data.filter(row => row.id && row.id.trim() !== ''); // Remove empty rows
        
        // Validate required columns
        const requiredColumns = ['customer_id', 'email', 'created_RFC3339'];
        const columns = Object.keys(data[0] || {});
        const missingColumns = requiredColumns.filter(col => !columns.includes(col));

        if (missingColumns.length > 0) {
            this.showValidationResults(false, `Missing required columns: ${missingColumns.join(', ')}`);
            return;
        }

        this.data = data;
        this.showValidationResults(true, 'All required columns found. Data is valid.');
        this.calculateFatigueMetrics();
    }

    showFileInfo(file) {
        document.getElementById('fileName').textContent = file.name;
        document.getElementById('fileSize').textContent = this.formatFileSize(file.size);
        document.getElementById('fileInfo').style.display = 'block';
    }

    showStatus(type, message) {
        const statusEl = document.getElementById('uploadStatus');
        statusEl.className = `upload-status ${type}`;
        statusEl.textContent = message;
        statusEl.style.display = 'block';
    }

    showValidationResults(isValid, message) {
        const validationEl = document.getElementById('validationResults');
        validationEl.className = `validation-results ${isValid ? 'valid' : 'invalid'}`;
        validationEl.textContent = message;
    }

    formatFileSize(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Byte';
        const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    // Fatigue calculation methods
    calculateFatigueMetrics() {
        if (!this.data || this.data.length === 0) return;

        this.showStatus('processing', 'Calculating fatigue metrics...');

        // Parse dates and group by user
        const userMessages = {};
        const campaignData = {};
        let minDate = new Date();
        let maxDate = new Date(0);

        this.data.forEach(row => {
            const email = row.email || row.recipient;
            const customerId = row.customer_id;
            const createdDate = new Date(row.created_RFC3339);
            const campaignName = row.campaign_name;

            if (!email || !customerId || isNaN(createdDate.getTime())) return;

            // Track date range
            if (createdDate < minDate) minDate = createdDate;
            if (createdDate > maxDate) maxDate = createdDate;

            // Group by user
            const userKey = email;
            if (!userMessages[userKey]) {
                userMessages[userKey] = {
                    email: email,
                    customerId: customerId,
                    messages: []
                };
            }
            userMessages[userKey].messages.push({
                date: createdDate,
                campaign: campaignName
            });

            // Group by campaign
            if (campaignName) {
                if (!campaignData[campaignName]) {
                    campaignData[campaignName] = {
                        name: campaignName,
                        messageCount: 0,
                        uniqueRecipients: new Set()
                    };
                }
                campaignData[campaignName].messageCount++;
                campaignData[campaignName].uniqueRecipients.add(email);
            }
        });

        // Calculate metrics for each user
        const userAnalysis = Object.values(userMessages).map(user => {
            const messages = user.messages;
            const totalMessages = messages.length;
            
            // Calculate date range for this user
            const userMinDate = new Date(Math.min(...messages.map(m => m.date)));
            const userMaxDate = new Date(Math.max(...messages.map(m => m.date)));
            const daysDiff = Math.max(1, (userMaxDate - userMinDate) / (1000 * 60 * 60 * 24));
            
            const dailyAvg = totalMessages / daysDiff;
            const weeklyAvg = dailyAvg * 7;
            const monthlyAvg = dailyAvg * 30;
            
            // Risk scoring
            let riskLevel = 'low';
            if (dailyAvg > 3) riskLevel = 'high';
            else if (dailyAvg > 1) riskLevel = 'medium';

            return {
                email: user.email,
                customerId: user.customerId,
                totalMessages,
                dailyAvg: Math.round(dailyAvg * 100) / 100,
                weeklyAvg: Math.round(weeklyAvg * 100) / 100,
                monthlyAvg: Math.round(monthlyAvg * 100) / 100,
                riskLevel,
                messages: user.messages
            };
        });

        // Calculate campaign metrics
        const campaignAnalysis = Object.values(campaignData).map(campaign => ({
            name: campaign.name,
            messageCount: campaign.messageCount,
            uniqueRecipients: campaign.uniqueRecipients.size,
            avgFrequency: Math.round((campaign.messageCount / campaign.uniqueRecipients.size) * 100) / 100
        }));

        // Store processed data
        this.processedData = {
            users: userAnalysis,
            campaigns: campaignAnalysis,
            dateRange: { min: minDate, max: maxDate },
            summary: {
                totalMessages: this.data.length,
                uniqueUsers: userAnalysis.length,
                avgPerDay: Math.round((userAnalysis.reduce((sum, user) => sum + user.dailyAvg, 0) / userAnalysis.length) * 100) / 100,
                highFreqUsers: userAnalysis.filter(user => user.riskLevel === 'high').length
            }
        };

        this.displayResults();
    }

    displayResults() {
        // Update file info
        document.getElementById('totalRecords').textContent = this.data.length.toLocaleString();
        document.getElementById('dateRange').textContent = 
            `${this.processedData.dateRange.min.toLocaleDateString()} - ${this.processedData.dateRange.max.toLocaleDateString()}`;

        // Update summary cards
        document.getElementById('totalMessages').textContent = this.processedData.summary.totalMessages.toLocaleString();
        document.getElementById('uniqueUsers').textContent = this.processedData.summary.uniqueUsers.toLocaleString();
        document.getElementById('avgPerDay').textContent = this.processedData.summary.avgPerDay;
        document.getElementById('highFreqUsers').textContent = this.processedData.summary.highFreqUsers.toLocaleString();

        // Create charts
        this.createCharts();

        // Populate tables
        this.populateUserTable();
        this.populateCampaignTable();

        // Show results section
        document.getElementById('resultsSection').style.display = 'block';
        this.showStatus('success', 'Analysis complete! Results displayed below.');
    }

    createCharts() {
        this.createTimeChart();
        this.createDistributionChart();
    }

    createTimeChart() {
        const ctx = document.getElementById('timeChart').getContext('2d');
        
        // Group messages by date
        const dailyCounts = {};
        this.data.forEach(row => {
            const date = new Date(row.created_RFC3339).toDateString();
            dailyCounts[date] = (dailyCounts[date] || 0) + 1;
        });

        const sortedDates = Object.keys(dailyCounts).sort((a, b) => new Date(a) - new Date(b));
        const labels = sortedDates.map(date => new Date(date).toLocaleDateString());
        const data = sortedDates.map(date => dailyCounts[date]);

        if (this.charts.timeChart) {
            this.charts.timeChart.destroy();
        }

        this.charts.timeChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Messages Sent',
                    data: data,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Messages'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    createDistributionChart() {
        const ctx = document.getElementById('distributionChart').getContext('2d');
        
        // Group users by risk level
        const riskCounts = {
            low: this.processedData.users.filter(user => user.riskLevel === 'low').length,
            medium: this.processedData.users.filter(user => user.riskLevel === 'medium').length,
            high: this.processedData.users.filter(user => user.riskLevel === 'high').length
        };

        if (this.charts.distributionChart) {
            this.charts.distributionChart.destroy();
        }

        this.charts.distributionChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Low Risk', 'Medium Risk', 'High Risk'],
                datasets: [{
                    data: [riskCounts.low, riskCounts.medium, riskCounts.high],
                    backgroundColor: ['#2ed573', '#ffa502', '#ff4757'],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    populateUserTable() {
        const tbody = document.getElementById('userTableBody');
        this.filteredUsers = [...this.processedData.users];
        this.renderUserTable();
    }

    renderUserTable() {
        const tbody = document.getElementById('userTableBody');
        tbody.innerHTML = '';

        this.filteredUsers.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.email}</td>
                <td>${user.totalMessages}</td>
                <td>${user.dailyAvg}</td>
                <td>${user.weeklyAvg}</td>
                <td>${user.monthlyAvg}</td>
                <td><span class="risk-${user.riskLevel}">${user.riskLevel.toUpperCase()}</span></td>
            `;
            tbody.appendChild(row);
        });
    }

    populateCampaignTable() {
        const tbody = document.getElementById('campaignTableBody');
        tbody.innerHTML = '';

        this.processedData.campaigns
            .sort((a, b) => b.messageCount - a.messageCount)
            .forEach(campaign => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${campaign.name || 'Unknown Campaign'}</td>
                    <td>${campaign.messageCount.toLocaleString()}</td>
                    <td>${campaign.uniqueRecipients.toLocaleString()}</td>
                    <td>${campaign.avgFrequency}</td>
                `;
                tbody.appendChild(row);
            });
    }

    filterUsers() {
        const searchTerm = document.getElementById('userSearch').value.toLowerCase();
        const riskFilter = document.getElementById('riskFilter').value;

        this.filteredUsers = this.processedData.users.filter(user => {
            const matchesSearch = user.email.toLowerCase().includes(searchTerm);
            const matchesRisk = riskFilter === 'all' || user.riskLevel === riskFilter;
            return matchesSearch && matchesRisk;
        });

        this.renderUserTable();
    }

    // Export methods
    exportCSV() {
        const csvData = [
            ['Email', 'Total Messages', 'Daily Average', 'Weekly Average', 'Monthly Average', 'Risk Level'],
            ...this.processedData.users.map(user => [
                user.email,
                user.totalMessages,
                user.dailyAvg,
                user.weeklyAvg,
                user.monthlyAvg,
                user.riskLevel
            ])
        ];

        const csvContent = csvData.map(row => row.join(',')).join('\n');
        this.downloadFile('message-fatigue-analysis.csv', csvContent, 'text/csv');
    }

    exportPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Add title
        doc.setFontSize(20);
        doc.text('Message Fatigue Analysis Report', 20, 30);

        // Add summary
        doc.setFontSize(12);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 50);
        doc.text(`Total Messages: ${this.processedData.summary.totalMessages.toLocaleString()}`, 20, 60);
        doc.text(`Unique Users: ${this.processedData.summary.uniqueUsers.toLocaleString()}`, 20, 70);
        doc.text(`Average Messages per User per Day: ${this.processedData.summary.avgPerDay}`, 20, 80);
        doc.text(`High-Risk Users: ${this.processedData.summary.highFreqUsers.toLocaleString()}`, 20, 90);

        // Add recommendations
        doc.text('Recommendations:', 20, 110);
        const recommendations = [
            '• Consider reducing frequency for high-risk users',
            '• Implement preference centers for user control',
            '• Monitor engagement metrics regularly',
            '• Test optimal sending frequencies'
        ];
        
        recommendations.forEach((rec, index) => {
            doc.text(rec, 25, 120 + (index * 10));
        });

        doc.save('message-fatigue-report.pdf');
    }

    exportCharts() {
        // Export time chart
        const timeCanvas = document.getElementById('timeChart');
        const timeImageData = timeCanvas.toDataURL('image/png');
        this.downloadFile('messages-over-time.png', timeImageData, 'image/png', true);

        // Export distribution chart
        setTimeout(() => {
            const distCanvas = document.getElementById('distributionChart');
            const distImageData = distCanvas.toDataURL('image/png');
            this.downloadFile('user-risk-distribution.png', distImageData, 'image/png', true);
        }, 500);
    }

    downloadFile(filename, content, mimeType, isDataURL = false) {
        const blob = isDataURL ? 
            this.dataURLToBlob(content) : 
            new Blob([content], { type: mimeType });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    dataURLToBlob(dataURL) {
        const arr = dataURL.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MessageFatigueCalculator();
});
