// Message Fatigue Calculator - Main Application
class MessageFatigueCalculator {
    constructor() {
        this.data = null;
        this.processedData = null;
        this.charts = {};
        this.filteredUsers = [];
        this.currentPage = 1;
        this.pageSize = 20;
        this.sortColumn = null;
        this.sortDirection = 'asc';
        
        // Message analysis pagination
        this.filteredMessages = [];
        this.messageCurrentPage = 1;
        this.messagePageSize = 20;
        this.messageSortColumn = null;
        this.messageSortDirection = 'asc';
        
        // Time period for metrics display
        this.currentTimePeriod = 'daily';
        
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
        document.getElementById('pageSize').addEventListener('change', this.handlePageSizeChange.bind(this));

        // Pagination events
        document.getElementById('firstPage').addEventListener('click', () => this.goToPage(1));
        document.getElementById('prevPage').addEventListener('click', () => this.goToPage(this.currentPage - 1));
        document.getElementById('nextPage').addEventListener('click', () => this.goToPage(this.currentPage + 1));
        document.getElementById('lastPage').addEventListener('click', () => this.goToPage(this.getTotalPages()));

        // Message analysis events
        document.getElementById('messageSearch').addEventListener('input', this.filterMessages.bind(this));
        document.getElementById('messageType').addEventListener('change', this.filterMessages.bind(this));
        document.getElementById('messagePageSize').addEventListener('change', this.handleMessagePageSizeChange.bind(this));

        // Message pagination events
        document.getElementById('messageFirstPage').addEventListener('click', () => this.goToMessagePage(1));
        document.getElementById('messagePrevPage').addEventListener('click', () => this.goToMessagePage(this.messageCurrentPage - 1));
        document.getElementById('messageNextPage').addEventListener('click', () => this.goToMessagePage(this.messageCurrentPage + 1));
        document.getElementById('messageLastPage').addEventListener('click', () => this.goToMessagePage(this.getMessageTotalPages()));

        // Sorting events - User table
        document.querySelectorAll('#userTable .sortable').forEach(header => {
            header.addEventListener('click', () => this.handleSort(header.dataset.sort));
        });

        // Sorting events - Message table
        document.querySelectorAll('#campaignTable .sortable').forEach(header => {
            header.addEventListener('click', () => this.handleMessageSort(header.dataset.sort));
        });

        // Time period toggle events
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.addEventListener('click', () => this.handleTimePeriodChange(btn.dataset.period));
        });

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
        const messageData = {};
        let minDate = new Date();
        let maxDate = new Date(0);

        this.data.forEach(row => {
            const email = row.email || row.recipient;
            const customerId = row.customer_id;
            const createdDate = new Date(row.created_RFC3339);
            
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
                message: messageName,
                type: messageType
            });

            // Group by message
            const messageKey = `${messageType}:${messageName}`;
            if (!messageData[messageKey]) {
                messageData[messageKey] = {
                    name: messageName,
                    type: messageType,
                    messageCount: 0,
                    uniqueRecipients: new Set()
                };
            }
            messageData[messageKey].messageCount++;
            messageData[messageKey].uniqueRecipients.add(email);
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

        // Calculate message metrics
        const messageAnalysis = Object.values(messageData).map(message => ({
            name: message.name,
            type: message.type,
            messageCount: message.messageCount,
            uniqueRecipients: message.uniqueRecipients.size,
            avgFrequency: Math.round((message.messageCount / message.uniqueRecipients.size) * 100) / 100
        }));

        // Store processed data
        this.processedData = {
            users: userAnalysis,
            messages: messageAnalysis,
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
        document.getElementById('highFreqUsers').textContent = this.processedData.summary.highFreqUsers.toLocaleString();
        
        // Update average metric based on current time period
        this.updateAverageMetric();

        // Create charts
        this.createCharts();

        // Populate tables
        this.populateUserTable();
        this.populateMessageTable();

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
        this.filteredUsers = [...this.processedData.users];
        this.currentPage = 1;
        this.renderUserTable();
    }

    renderUserTable() {
        const tbody = document.getElementById('userTableBody');
        tbody.innerHTML = '';

        // Apply sorting
        this.applySorting();

        // Calculate pagination
        const totalUsers = this.filteredUsers.length;
        const totalPages = this.getTotalPages();
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = this.pageSize === 'all' ? totalUsers : Math.min(startIndex + parseInt(this.pageSize), totalUsers);
        
        // Get current page users
        const currentPageUsers = this.pageSize === 'all' ? 
            this.filteredUsers : 
            this.filteredUsers.slice(startIndex, endIndex);

        // Render table rows
        currentPageUsers.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.email}</td>
                <td>${user.totalMessages.toLocaleString()}</td>
                <td>${user.dailyAvg}</td>
                <td>${user.weeklyAvg}</td>
                <td>${user.monthlyAvg}</td>
                <td><span class="risk-${user.riskLevel}">${user.riskLevel.toUpperCase()}</span></td>
            `;
            tbody.appendChild(row);
        });

        // Update table info
        document.getElementById('tableInfo').textContent = 
            `Showing ${startIndex + 1}-${endIndex} of ${totalUsers} users`;

        // Update pagination controls
        this.updatePaginationControls();
    }

    populateMessageTable() {
        this.filteredMessages = [...this.processedData.messages];
        this.messageCurrentPage = 1;
        this.renderMessageTable();
    }

    renderMessageTable() {
        const tbody = document.getElementById('campaignTableBody');
        tbody.innerHTML = '';

        // Apply sorting
        this.applyMessageSorting();

        // Calculate pagination
        const totalMessages = this.filteredMessages.length;
        const startIndex = (this.messageCurrentPage - 1) * this.messagePageSize;
        const endIndex = this.messagePageSize === 'all' ? totalMessages : Math.min(startIndex + parseInt(this.messagePageSize), totalMessages);
        
        // Get current page messages
        const currentPageMessages = this.messagePageSize === 'all' ? 
            this.filteredMessages : 
            this.filteredMessages.slice(startIndex, endIndex);

        // Render table rows
        currentPageMessages.forEach(message => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${message.name || 'Unknown Message'}</td>
                <td><span class="message-type-${message.type}">${this.formatMessageType(message.type)}</span></td>
                <td>${message.messageCount.toLocaleString()}</td>
                <td>${message.uniqueRecipients.toLocaleString()}</td>
                <td>${message.avgFrequency}</td>
            `;
            tbody.appendChild(row);
        });

        // Update table info
        document.getElementById('messageTableInfo').textContent = 
            `Showing ${startIndex + 1}-${endIndex} of ${totalMessages} messages`;

        // Update pagination controls
        this.updateMessagePaginationControls();
    }

    formatMessageType(type) {
        const typeMap = {
            'campaign': 'Campaign',
            'newsletter': 'Newsletter',
            'transactional': 'Transactional',
            'template': 'Template',
            'unknown': 'Unknown'
        };
        return typeMap[type] || type;
    }

    filterUsers() {
        const searchTerm = document.getElementById('userSearch').value.toLowerCase();
        const riskFilter = document.getElementById('riskFilter').value;

        this.filteredUsers = this.processedData.users.filter(user => {
            const matchesSearch = user.email.toLowerCase().includes(searchTerm);
            const matchesRisk = riskFilter === 'all' || user.riskLevel === riskFilter;
            return matchesSearch && matchesRisk;
        });

        this.currentPage = 1; // Reset to first page when filtering
        this.renderUserTable();
    }

    // Pagination methods
    handlePageSizeChange() {
        const newPageSize = document.getElementById('pageSize').value;
        this.pageSize = newPageSize === 'all' ? 'all' : parseInt(newPageSize);
        this.currentPage = 1;
        this.renderUserTable();
    }

    getTotalPages() {
        if (this.pageSize === 'all') return 1;
        return Math.ceil(this.filteredUsers.length / this.pageSize);
    }

    goToPage(page) {
        const totalPages = this.getTotalPages();
        if (page >= 1 && page <= totalPages) {
            this.currentPage = page;
            this.renderUserTable();
        }
    }

    updatePaginationControls() {
        const totalPages = this.getTotalPages();
        const paginationControls = document.getElementById('paginationControls');
        
        if (this.pageSize === 'all' || totalPages <= 1) {
            paginationControls.style.display = 'none';
            return;
        }
        
        paginationControls.style.display = 'flex';

        // Update pagination info
        document.getElementById('paginationInfo').textContent = 
            `Page ${this.currentPage} of ${totalPages}`;

        // Update button states
        document.getElementById('firstPage').disabled = this.currentPage === 1;
        document.getElementById('prevPage').disabled = this.currentPage === 1;
        document.getElementById('nextPage').disabled = this.currentPage === totalPages;
        document.getElementById('lastPage').disabled = this.currentPage === totalPages;

        // Update page numbers
        this.renderPageNumbers();
    }

    renderPageNumbers() {
        const pageNumbers = document.getElementById('pageNumbers');
        pageNumbers.innerHTML = '';
        
        const totalPages = this.getTotalPages();
        const current = this.currentPage;
        
        // Calculate which page numbers to show
        let startPage = Math.max(1, current - 2);
        let endPage = Math.min(totalPages, current + 2);
        
        // Adjust range if we're near the beginning or end
        if (current <= 3) {
            endPage = Math.min(5, totalPages);
        } else if (current >= totalPages - 2) {
            startPage = Math.max(totalPages - 4, 1);
        }

        // Add first page if not in range
        if (startPage > 1) {
            this.createPageNumber(1);
            if (startPage > 2) {
                this.createPageNumber('...', true);
            }
        }

        // Add page range
        for (let i = startPage; i <= endPage; i++) {
            this.createPageNumber(i);
        }

        // Add last page if not in range
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                this.createPageNumber('...', true);
            }
            this.createPageNumber(totalPages);
        }
    }

    createPageNumber(pageNum, isEllipsis = false) {
        const pageNumbers = document.getElementById('pageNumbers');
        const span = document.createElement('span');
        span.className = `page-number ${isEllipsis ? 'ellipsis' : ''} ${pageNum === this.currentPage ? 'active' : ''}`;
        span.textContent = pageNum;
        
        if (!isEllipsis) {
            span.addEventListener('click', () => this.goToPage(pageNum));
        }
        
        pageNumbers.appendChild(span);
    }

    // Sorting methods
    handleSort(column) {
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }
        
        this.updateSortIndicators();
        this.renderUserTable();
    }

    updateSortIndicators() {
        // Clear all sort indicators
        document.querySelectorAll('.sortable').forEach(header => {
            header.classList.remove('sort-asc', 'sort-desc');
        });
        
        // Add indicator to current sort column
        if (this.sortColumn) {
            const header = document.querySelector(`[data-sort="${this.sortColumn}"]`);
            if (header) {
                header.classList.add(`sort-${this.sortDirection}`);
            }
        }
    }

    applySorting() {
        if (!this.sortColumn) return;

        this.filteredUsers.sort((a, b) => {
            let valueA = a[this.sortColumn];
            let valueB = b[this.sortColumn];

            // Handle different data types
            if (this.sortColumn === 'email') {
                valueA = valueA.toLowerCase();
                valueB = valueB.toLowerCase();
            } else if (typeof valueA === 'number') {
                // Already numbers, no conversion needed
            } else if (this.sortColumn === 'riskLevel') {
                // Convert risk levels to numbers for sorting
                const riskOrder = { 'low': 1, 'medium': 2, 'high': 3 };
                valueA = riskOrder[valueA];
                valueB = riskOrder[valueB];
            }

            if (this.sortDirection === 'asc') {
                return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
            } else {
                return valueA > valueB ? -1 : valueA < valueB ? 1 : 0;
            }
        });
    }

    // Time period toggle methods
    handleTimePeriodChange(period) {
        this.currentTimePeriod = period;
        
        // Update active button
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-period="${period}"]`).classList.add('active');
        
        // Update metric display
        this.updateAverageMetric();
    }

    updateAverageMetric() {
        const titleElement = document.getElementById('avgMetricTitle');
        const metricElement = document.getElementById('avgMetric');
        
        let value, title, emoji;
        
        switch(this.currentTimePeriod) {
            case 'daily':
                value = this.processedData.summary.avgPerDay;
                title = 'Avg Messages/User/Day';
                emoji = '📊';
                break;
            case 'weekly':
                value = Math.round((this.processedData.summary.avgPerDay * 7) * 100) / 100;
                title = 'Avg Messages/User/Week';
                emoji = '📈';
                break;
            case 'monthly':
                value = Math.round((this.processedData.summary.avgPerDay * 30) * 100) / 100;
                title = 'Avg Messages/User/Month';
                emoji = '📅';
                break;
        }
        
        titleElement.textContent = `${emoji} ${title}`;
        metricElement.textContent = value;
    }

    // Message filtering and pagination methods
    filterMessages() {
        const searchTerm = document.getElementById('messageSearch').value.toLowerCase();
        const typeFilter = document.getElementById('messageType').value;

        this.filteredMessages = this.processedData.messages.filter(message => {
            const matchesSearch = message.name.toLowerCase().includes(searchTerm);
            const matchesType = typeFilter === 'all' || message.type === typeFilter;
            return matchesSearch && matchesType;
        });

        this.messageCurrentPage = 1; // Reset to first page when filtering
        this.renderMessageTable();
    }

    handleMessagePageSizeChange() {
        const newPageSize = document.getElementById('messagePageSize').value;
        this.messagePageSize = newPageSize === 'all' ? 'all' : parseInt(newPageSize);
        this.messageCurrentPage = 1;
        this.renderMessageTable();
    }

    getMessageTotalPages() {
        if (this.messagePageSize === 'all') return 1;
        return Math.ceil(this.filteredMessages.length / this.messagePageSize);
    }

    goToMessagePage(page) {
        const totalPages = this.getMessageTotalPages();
        if (page >= 1 && page <= totalPages) {
            this.messageCurrentPage = page;
            this.renderMessageTable();
        }
    }

    updateMessagePaginationControls() {
        const totalPages = this.getMessageTotalPages();
        const paginationControls = document.getElementById('messagePaginationControls');
        
        if (this.messagePageSize === 'all' || totalPages <= 1) {
            paginationControls.style.display = 'none';
            return;
        }
        
        paginationControls.style.display = 'flex';

        // Update pagination info
        document.getElementById('messagePaginationInfo').textContent = 
            `Page ${this.messageCurrentPage} of ${totalPages}`;

        // Update button states
        document.getElementById('messageFirstPage').disabled = this.messageCurrentPage === 1;
        document.getElementById('messagePrevPage').disabled = this.messageCurrentPage === 1;
        document.getElementById('messageNextPage').disabled = this.messageCurrentPage === totalPages;
        document.getElementById('messageLastPage').disabled = this.messageCurrentPage === totalPages;

        // Update page numbers
        this.renderMessagePageNumbers();
    }

    renderMessagePageNumbers() {
        const pageNumbers = document.getElementById('messagePageNumbers');
        pageNumbers.innerHTML = '';
        
        const totalPages = this.getMessageTotalPages();
        const current = this.messageCurrentPage;
        
        // Calculate which page numbers to show
        let startPage = Math.max(1, current - 2);
        let endPage = Math.min(totalPages, current + 2);
        
        // Adjust range if we're near the beginning or end
        if (current <= 3) {
            endPage = Math.min(5, totalPages);
        } else if (current >= totalPages - 2) {
            startPage = Math.max(totalPages - 4, 1);
        }

        // Add first page if not in range
        if (startPage > 1) {
            this.createMessagePageNumber(1);
            if (startPage > 2) {
                this.createMessagePageNumber('...', true);
            }
        }

        // Add page range
        for (let i = startPage; i <= endPage; i++) {
            this.createMessagePageNumber(i);
        }

        // Add last page if not in range
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                this.createMessagePageNumber('...', true);
            }
            this.createMessagePageNumber(totalPages);
        }
    }

    createMessagePageNumber(pageNum, isEllipsis = false) {
        const pageNumbers = document.getElementById('messagePageNumbers');
        const span = document.createElement('span');
        span.className = `page-number ${isEllipsis ? 'ellipsis' : ''} ${pageNum === this.messageCurrentPage ? 'active' : ''}`;
        span.textContent = pageNum;
        
        if (!isEllipsis) {
            span.addEventListener('click', () => this.goToMessagePage(pageNum));
        }
        
        pageNumbers.appendChild(span);
    }

    // Message sorting methods
    handleMessageSort(column) {
        if (this.messageSortColumn === column) {
            this.messageSortDirection = this.messageSortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.messageSortColumn = column;
            this.messageSortDirection = 'asc';
        }
        
        this.updateMessageSortIndicators();
        this.renderMessageTable();
    }

    updateMessageSortIndicators() {
        // Clear all sort indicators in message table
        document.querySelectorAll('#campaignTable .sortable').forEach(header => {
            header.classList.remove('sort-asc', 'sort-desc');
        });
        
        // Add indicator to current sort column
        if (this.messageSortColumn) {
            const header = document.querySelector(`#campaignTable [data-sort="${this.messageSortColumn}"]`);
            if (header) {
                header.classList.add(`sort-${this.messageSortDirection}`);
            }
        }
    }

    applyMessageSorting() {
        if (!this.messageSortColumn) return;

        this.filteredMessages.sort((a, b) => {
            let valueA = a[this.messageSortColumn];
            let valueB = b[this.messageSortColumn];

            // Handle different data types
            if (this.messageSortColumn === 'name' || this.messageSortColumn === 'type') {
                valueA = valueA.toLowerCase();
                valueB = valueB.toLowerCase();
            } else if (typeof valueA === 'number') {
                // Already numbers, no conversion needed
            }

            if (this.messageSortDirection === 'asc') {
                return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
            } else {
                return valueA > valueB ? -1 : valueA < valueB ? 1 : 0;
            }
        });
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
