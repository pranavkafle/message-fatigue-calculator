# 📊 Message Fatigue Calculator

A privacy-first web application that analyzes email delivery data to calculate message fatigue metrics without uploading any data to external servers.

## 🔒 Privacy Features

- **100% Local Processing** - All data processing happens in your browser
- **No Server Uploads** - Your CSV files never leave your computer
- **No Data Storage** - Data is cleared when you close the browser tab
- **Secure by Design** - No external API calls or data transmission

## ✨ Features

### 📈 Core Analytics
- **Message Frequency Analysis** - Calculate average messages per user per day/week/month
- **Risk Assessment** - Identify users at high risk of message fatigue
- **Campaign Analysis** - Analyze frequency patterns by campaign
- **Time-based Trends** - Visualize message volume over time

### 📊 Visualizations
- **Interactive Charts** - Messages over time and user risk distribution
- **Responsive Tables** - Sortable and filterable user and campaign data
- **Real-time Filtering** - Search and filter results instantly

### 📥 Export Capabilities
- **CSV Export** - Download detailed analysis results
- **PDF Reports** - Generate summary reports with recommendations
- **Chart Export** - Save visualizations as PNG images

## 🚀 Getting Started

### Quick Start
1. Open `index.html` in your web browser
2. Drag and drop your CSV file or click to browse
3. View instant results and analytics

### File Requirements
Your CSV file must contain these columns:
- `customer_id` - Unique customer identifier
- `email` - Customer email address
- `created_RFC3339` - Message creation timestamp (RFC3339 format)

### Optional Columns
- `campaign_name` - Campaign name for campaign analysis
- `campaign_id` - Campaign identifier
- `template_name` - Email template name

## 📋 Sample Data Format

```csv
id,customer_id,email,created_RFC3339,campaign_name
1,222,user@example.com,2025-01-01T10:00:00Z,Welcome Campaign
2,222,user@example.com,2025-01-02T14:30:00Z,Welcome Campaign
3,333,user2@example.com,2025-01-01T09:15:00Z,Newsletter
```

## 🎯 Use Cases

### Marketing Teams
- **Campaign Optimization** - Identify optimal sending frequencies
- **Audience Segmentation** - Find high-engagement vs. fatigued users
- **A/B Testing** - Compare fatigue levels across different strategies

### Customer Success
- **Retention Analysis** - Prevent customer churn from over-messaging
- **Personalization** - Tailor frequency to individual preferences
- **Health Monitoring** - Track communication health metrics

### Email Deliverability
- **Reputation Management** - Maintain sender reputation
- **Engagement Optimization** - Improve open and click rates
- **Compliance** - Ensure respectful communication practices

## 📊 Metrics Calculated

### User-Level Metrics
- **Total Messages** - Overall message count per user
- **Daily Average** - Average messages per day
- **Weekly Average** - Average messages per week
- **Monthly Average** - Average messages per month
- **Risk Level** - Low/Medium/High fatigue risk scoring

### Campaign-Level Metrics
- **Message Volume** - Total messages sent per campaign
- **Unique Recipients** - Number of unique users reached
- **Average Frequency** - Average messages per recipient per campaign

### Risk Scoring
- **Low Risk**: ≤1 message per day average
- **Medium Risk**: 1-3 messages per day average
- **High Risk**: >3 messages per day average

## 🛠️ Technical Details

### Technology Stack
- **Frontend**: Vanilla JavaScript (ES6+)
- **CSV Parsing**: Papa Parse library
- **Charts**: Chart.js
- **PDF Generation**: jsPDF
- **Styling**: Modern CSS with Flexbox/Grid

### Browser Support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Performance
- **File Size Limit**: 10MB maximum
- **Processing Time**: <3 seconds for typical files
- **Memory Usage**: Optimized for large datasets

## 🧪 Testing

Run the test suite by opening `test.html` in your browser. Tests cover:

- ✅ File size formatting
- ✅ CSV data validation
- ✅ Fatigue calculation algorithms
- ✅ Risk level assessment
- ✅ Date parsing and handling
- ✅ Edge case scenarios

## 🔧 Development

### Project Structure
```
message-fatigue-calculator/
├── index.html          # Main application
├── styles.css          # Application styles
├── app.js             # Core JavaScript logic
├── test.html          # Test suite
├── README.md          # This file
└── deliveries 2.csv   # Sample data file
```

### Local Development
1. Clone or download the project
2. Open `index.html` in your browser
3. No build process required - runs directly in browser

### Customization
- Modify risk thresholds in `app.js`
- Customize styling in `styles.css`
- Add new chart types or metrics as needed

## 📈 Interpretation Guide

### Understanding Your Results

**High Daily Averages (>3/day)**
- Users receiving frequent messages
- High risk of fatigue and unsubscribes
- Consider reducing frequency or segmentation

**Medium Daily Averages (1-3/day)**
- Moderate messaging frequency
- Monitor engagement trends
- Good candidates for preference centers

**Low Daily Averages (<1/day)**
- Conservative messaging approach
- Potential for increased engagement
- Consider testing higher frequencies

### Recommended Actions

**For High-Risk Users:**
- Reduce sending frequency immediately
- Implement preference centers
- Segment based on engagement
- Consider re-engagement campaigns

**For Medium-Risk Users:**
- Monitor engagement closely
- Test optimal frequency
- Personalize content and timing
- Implement gradual frequency adjustments

**Campaign-Level Insights:**
- Compare campaign performance
- Identify over-performing campaigns
- Optimize underperforming campaigns
- Balance portfolio frequency

## 🔐 Security & Privacy

### Data Protection
- **No External Calls** - Zero network requests with your data
- **Local Processing** - All calculations happen in browser memory
- **No Persistence** - Data cleared when tab closes
- **No Analytics** - No tracking or usage monitoring

### Compliance
- **GDPR Compliant** - No personal data processing on servers
- **CCPA Compliant** - No data sharing or selling
- **SOC 2 Ready** - Designed for enterprise security requirements

## 🤝 Contributing

This is a standalone application designed for privacy and security. If you need modifications:

1. Fork the project
2. Make your changes locally
3. Test thoroughly with `test.html`
4. Ensure all privacy principles are maintained

## 📞 Support

For issues or questions:
- Check the test suite for validation
- Review the browser console for errors
- Ensure your CSV format matches requirements
- Verify browser compatibility

## 📄 License

This project is designed for free use while maintaining user privacy. Feel free to modify and distribute while preserving the privacy-first principles.

---

**🔒 Remember: Your data stays private and secure with local-only processing!**
