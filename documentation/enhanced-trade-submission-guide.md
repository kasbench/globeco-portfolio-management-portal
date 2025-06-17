# Enhanced Trade Submission User Guide

## Overview

The Enhanced Trade Submission system provides granular control over trade order submissions, allowing users to specify custom quantities and destinations for each order. This replaces the previous simple "submit all" approach with a flexible, configurable workflow.

## Key Features

### Individual Order Control
- **Custom Quantities**: Submit partial quantities from trade orders
- **Destination Selection**: Choose specific destinations for each submission
- **Real-time Validation**: Immediate feedback on quantity and destination selections
- **Remaining Quantity Tracking**: Automatic calculation of unsubmitted quantities

### Batch Operations
- **Multi-order Selection**: Submit multiple orders simultaneously with different configurations
- **Bulk Actions**: Apply quantities and destinations to all selected orders at once
- **Mixed Submissions**: Configure each order individually or use bulk settings

### Workflow Steps
1. **Configure**: Set quantities and destinations for each order
2. **Review**: Verify submission details before proceeding
3. **Submit**: Process submissions with real-time progress tracking
4. **Complete**: View results with automatic data refresh

## How to Use

### Single Order Submission

1. **Navigate** to the Trade Management page (`/trading/trade-management`)
2. **Find** the trade order you want to submit
3. **Click** the action menu (⋮) next to the order
4. **Select** "Submit Trade"
5. **Configure** the submission:
   - **Quantity**: Enter the amount to submit (max: remaining quantity)
   - **Destination**: Select from available destinations
6. **Review** your submission details
7. **Submit** to process the order

### Batch Order Submission

1. **Navigate** to the Trade Management page
2. **Select** multiple orders using the checkboxes
3. **Click** "Configure Submission (X)" button
4. **Configure** submissions:
   - **Individual**: Set quantity and destination for each order
   - **Bulk Actions**: Use "Submit All Remaining" or "Set All Destinations"
5. **Review** all submission details
6. **Submit** to process all orders

### Bulk Action Features

#### Submit All Remaining
- Automatically sets quantity to remaining amount for all orders
- Useful for submitting full remaining quantities
- Can be combined with destination selection

#### Set All Destinations
- Apply the same destination to all selected orders
- Shows preview before applying
- Maintains individual quantity settings

## Validation Rules

### Quantity Validation
- **Minimum**: Must be greater than 0
- **Maximum**: Cannot exceed remaining quantity (total - already sent)
- **Numeric**: Must be a valid number
- **Integer**: Decimal quantities not supported

### Destination Validation
- **Required**: Each order must have a destination selected
- **Valid**: Must select from available destinations list
- **Active**: Only active destinations are available

### Visual Indicators
- **Red Border**: Invalid quantity (too high, too low, or invalid format)
- **Yellow Border**: Warning conditions (unusual but valid values)
- **Green Check**: Valid configuration ready for submission
- **Red X**: Invalid configuration requiring correction

## User Interface Elements

### Trade Submission Modal

#### Configure Step
- **Order Table**: Shows order details with editable quantity and destination fields
- **Bulk Actions Section**: Quick actions for multiple orders
- **Statistics Panel**: Live counts of orders, quantities, and destinations
- **Validation Summary**: Real-time feedback on form validity

#### Review Step
- **Submission Summary**: Overview of all configured submissions
- **Destination Breakdown**: Orders grouped by destination
- **Validation Status**: Final checks before submission
- **Warning Messages**: Alerts for unusual configurations

#### Submit Step
- **Progress Indicator**: Shows submission in progress
- **Real-time Status**: Updates on submission progress
- **Error Handling**: Detailed error messages for failed submissions

#### Complete Step
- **Success Confirmation**: Visual confirmation of successful submissions
- **Summary Statistics**: Count of successful/failed submissions
- **Auto-close**: Modal closes automatically after 2 seconds

### Statistics Display

The interface provides real-time statistics:
- **Orders**: Total selected orders vs. configured orders
- **Total Quantity**: Sum of all submission quantities
- **Remaining**: Sum of quantities not yet submitted
- **Destinations**: Number of unique destinations selected

## Error Handling

### Common Errors
1. **Quantity Too High**: Reduce quantity to available remaining amount
2. **No Destination Selected**: Choose a destination from the dropdown
3. **No Quantity Entered**: Enter a valid quantity greater than 0
4. **API Connection Error**: Check network connection and retry

### Error Recovery
- **Individual Errors**: Fix specific order configurations and retry
- **Bulk Errors**: Review all orders and correct invalid entries
- **Network Errors**: Automatic retry with exponential backoff
- **Validation Errors**: Real-time feedback guides corrections

## Performance Considerations

### Caching
- **Destinations**: Cached for 5 minutes to improve performance
- **Trade Orders**: Fresh data loaded after successful submissions
- **Form State**: Preserved during navigation within modal

### Optimization
- **Lazy Loading**: Components load as needed
- **Batch Processing**: Multiple orders submitted efficiently
- **State Management**: Optimized for large order volumes

## Accessibility Features

### Keyboard Navigation
- **Tab Order**: Logical progression through form elements
- **Enter Key**: Submits forms and proceeds through steps
- **Escape Key**: Closes modal and cancels operations
- **Arrow Keys**: Navigate through dropdown options

### Screen Reader Support
- **ARIA Labels**: Descriptive labels for all interactive elements
- **Status Announcements**: Screen reader notifications for state changes
- **Error Descriptions**: Clear error messages linked to form fields
- **Progress Updates**: Accessible progress indicators

### Visual Accessibility
- **High Contrast**: Clear visual distinction between states
- **Color Independence**: Information not conveyed by color alone
- **Focus Indicators**: Clear focus outlines for keyboard navigation
- **Scalable Text**: Responsive to browser zoom settings

## Troubleshooting

### Common Issues

#### "No orders selected"
- **Solution**: Select at least one order using checkboxes before clicking submit
- **Prevention**: Use the individual order action menu for single submissions

#### "Validation failed"
- **Solution**: Check all quantity and destination fields for errors
- **Prevention**: Fix errors highlighted in red before proceeding

#### "Destination loading failed"
- **Solution**: Refresh the page or check network connection
- **Prevention**: Ensure stable network connection

#### "Submission timeout"
- **Solution**: Retry submission with fewer orders or check network
- **Prevention**: Submit smaller batches for better reliability

### Support Information

For technical issues or questions:
- **Development Team**: Check application logs and console errors
- **Network Issues**: Verify API connectivity and service status
- **Data Issues**: Validate trade order status and permissions

## Technical Notes

### API Endpoints
- **Destinations**: `GET /api/v1/destinations`
- **Batch Submit**: `POST /api/v1/tradeOrders/batch/submit`
- **Trade Orders**: `GET /api/v2/tradeOrders`

### Data Flow
1. Load destinations and cache for 5 minutes
2. Load selected trade orders with enhanced data
3. Validate submission configuration client-side
4. Submit batch request to API
5. Handle response and update UI state
6. Refresh trade order data automatically

### Browser Compatibility
- **Modern Browsers**: Full feature support
- **Internet Explorer**: Limited support (basic functionality only)
- **Mobile Browsers**: Responsive design with touch support
- **Screen Readers**: Full accessibility support

## Best Practices

### For Users
- **Review Before Submit**: Always check the review step before proceeding
- **Use Bulk Actions**: Leverage bulk features for efficiency with multiple orders
- **Check Validation**: Ensure all fields are valid before submission
- **Monitor Progress**: Watch for completion confirmation

### For Administrators
- **Destination Management**: Keep destination list current and accurate
- **Performance Monitoring**: Monitor API response times and error rates
- **User Training**: Ensure users understand the new workflow
- **Error Tracking**: Monitor submission errors and user feedback

### For Developers
- **Error Logging**: Comprehensive logging for debugging
- **Performance Metrics**: Track submission times and success rates
- **User Analytics**: Monitor feature usage and adoption
- **Accessibility Testing**: Regular accessibility audits and testing 