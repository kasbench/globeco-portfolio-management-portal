# Requirement 6

This requirement fixes a flaw in the design of the trade submit logic.

- When a trade is submitted from the Trade Management page, there are two additional pieces of information that are required.
    1.  The quantity to be submitted.  The quantity must be greater than zero and less than or equal to the remaining quantity.  Remaining quantity is defined as quantity - quantitySent.
    2. The destination.  The destinations come from GET api/v1/destinations.  Display the destination abbreviation.  The destination id will be required on the API call below.
- This information will have to be collected from the user for each submission.  There should be an easy way to submit all, since that will be the most common action.
- The request body for the POST api/v1/traderOrders/batch/submit API looks like:
```
{
  "submissions": [
    {
      "tradeOrderId": 156,
      "quantity": 100,
      "destinationId": 1
    }
  ]
}
```
- We are currently sending the following, which is incorrect:
```
{method: 'POST', url: '/api/v1/tradeOrders/batch/submit', params: undefined, data: '{"tradeOrderIds":[155]}'}
```
