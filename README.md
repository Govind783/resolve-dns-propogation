# DNS Propagation Checker

A fast and reliable DNS propagation checker. Check single or multiple DNS records for propagation status with automatic retries and comprehensive error handling. that WORKS in browser frontend as well as node backend

## Features

- Support for all major DNS record types
- Automatic retries on failure
- no caching all attempts are stateless
- Single and multiple record checking
- Written in TypeScript with full type definitions
- Comprehensive error handling

## Installation

```bash
npm install resolve-dns-propogation
```

## Usage

### Single DNS Record Check

```typescript
import { verifyDNSPropagation } from "resolve-dns-propogation";

// Using async/await
async function checkDNS() {
  try {
    const result = await verifyDNSPropagation(
      "A", // The DNS type
      "example.com", // URL
      "123.456.789.0" // expected value
    );

    console.log(result);
    // {
    //   propagated: true,
    //   raw_response: { ... },
    //   message: "DNS record has propagated successfully"
    // }
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
}

// Using .then
verifyDNSPropagation("CNAME", "blog.example.com", "example.netlify.app")
  .then((result) => console.log(result))
  .catch((error) => console.error(error));
```

### Multiple DNS Records Check

```typescript
import { verifyDNSPropogationGroup } from "resolve-dns-propogation";

const dnsQueries = {
  CNAME: {
    domain: "docs.example.com",
    expectedValue: "example.github.io",
  },
  TXT: {
    domain: "example.com",
    expectedValue: "v=spf1 include:spf.example.com ~all",
  },
  A: {
    domain: "api.example.com",
    expectedValue: "123.456.789.0",
  },
};

// Using async/await
async function checkMultipleDNS() {
  try {
    const results = await verifyDNSPropogationGroup(dnsQueries);

    for (const [recordType, result] of Object.entries(results)) {
      console.log(`${recordType}:`, result.message);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
}

// Using .then with results processing
verifyDNSPropogationGroup(dnsQueries)
  .then((results) => {
    for (const [recordType, result] of Object.entries(results)) {
      console.log(`${recordType}:`, result.message);
    }
  })
  .catch((error) => console.error("Error:", error.message));
```

## Data Structures

### Input Types

#### Single Record Check

```typescript
type DNSRecordType = "A" | "AAAA" | "CNAME" | "MX" | "NS" | "TXT" | "SRV" | "PTR" | "SOA" | "CAA";

verifyDNSPropogationGroup(
  type: DNSRecordType,     // DNS record type
  domain: string,          // Domain to check
  expectedValue: string    // Expected value
)
```

#### Multiple Records Check

```typescript
interface DNSQueryObject {
  [key: DNSRecordType]: {
    domain: string;
    expectedValue: string;
  };
}
```

### Response Types

#### Single Record Response

```typescript
interface DNSCheckResult {
  propagated: boolean; // Whether the record has propagated
  raw_response?: any; // Raw DNS response (if available)
  message: string; // status message for state updates or toast messages
}
```

#### Multiple Records Response

```typescript
interface MultipleDNSCheckResult {
  [key: string]: DNSCheckResult;
}
```

## Error Handling

### Error Codes

| Code                      | Description             | Possible Cause                   |
| ------------------------- | ----------------------- | -------------------------------- |
| `INVALID_TYPE`            | Invalid DNS record type | Unsupported record type provided |
| `INVALID_DOMAIN`          | Invalid domain          | Empty or malformed domain        |
| `INVALID_VALUE`           | Invalid expected value  | Empty expected value             |
| `INVALID_PARAM`           | Invalid parameter       | Malformed input object           |
| `INVALID_RECORD_TYPE`     | Invalid DNS record type | Unknown record type in object    |
| `INVALID_ENTRY_STRUCTURE` | Invalid entry structure | Malformed entry in object        |
| `HTTP_STATUS`             | HTTP request failed     | Network or DNS server error      |
| `RESPONSE_ERR`            | Invalid DNS response    | DNS server returned error        |
| `UNKNOWN_ERROR`           | Unknown error occurred  | Unexpected error                 |

### Error Object Structure

```typescript
interface DNSError {
  code: string; // Error code from above
  message: string; // Human-readable error message
}
```
