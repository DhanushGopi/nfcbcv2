# NFC Tag Format for Blockchain-Enhanced Offline Payment System

## Overview

This document describes the data format used for storing payment information on NFC tags in our system.

## Data Structure

The NFC tag stores data in NDEF (NFC Data Exchange Format) format with a single Text record containing a JSON string with the following structure:

```json
{
  "balance": 100.00,
  "pin": "1234",
  "lastUpdated": 1640995200000,
  "transactions": ["tx-1640995200000-123456", "tx-1640995300000-789012"],
  "id": "nfc-tag-1640995200000"
}
```

### Fields

- **balance** (number): The current monetary balance stored on the tag
- **pin** (string): A 4-digit PIN used for transaction authorization (in a production system, this would be properly hashed)
- **lastUpdated** (number): Timestamp of the last update to the tag (milliseconds since epoch)
- **transactions** (array): List of transaction hashes for record-keeping
- **id** (string): Unique identifier for the NFC tag

## Security Considerations

In a production environment:

1. The PIN should never be stored in plain text but should be securely hashed
2. All data should be cryptographically signed to prevent tampering
3. Consider encrypting the entire payload for additional security
4. Implement anti-replay protection to prevent transaction replay attacks

## Reading and Writing

The Web NFC API is used to read from and write to NFC tags:

### Reading

```javascript
const reader = new NDEFReader();
reader.scan().then(() => {
  reader.addEventListener("reading", ({ message }) => {
    for (const record of message.records) {
      if (record.recordType === "text") {
        const textDecoder = new TextDecoder();
        const text = textDecoder.decode(record.data);
        const data = JSON.parse(text);
        // Process the data
      }
    }
  });
});
```

### Writing

```javascript
const writer = new NDEFReader();
const data = {
  balance: 100.00,
  pin: "1234",
  lastUpdated: Date.now(),
  transactions: [],
  id: `nfc-tag-${Date.now()}`
};

const jsonData = JSON.stringify(data);
const ndefMessage = {
  records: [{
    recordType: "text",
    data: jsonData
  }]
};

writer.write(ndefMessage);
```

## Browser Compatibility

The Web NFC API is currently supported in:
- Chrome for Android (89+)
- Chrome OS (89+)

It is not supported in iOS browsers or desktop browsers.