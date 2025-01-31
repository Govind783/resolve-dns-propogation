type DNSRecordType = "A" | "AAAA" | "CNAME" | "MX" | "NS" | "TXT" | "SRV" | "PTR" | "SOA" | "CAA";

const VALID_DNS_TYPES: DNSRecordType[] = ["A", "AAAA", "CNAME", "MX", "NS", "TXT", "SRV", "PTR", "SOA", "CAA"];

interface DNSCheckResult {
  propagated: boolean;
  raw_response?: any;
  message: string;
}

interface DNSError {
  code: string;
  message: string;
}

interface DNSQueryObject {
  [key: string]: {
    domain: string;
    expectedValue: string;
  };
}

interface MultipleDNSCheckResult {
  [key: string]: DNSCheckResult;
}

interface GoogleDNSResponse {
  Status: number;
  Answer?: Array<{
    name: string;
    type: number;
    TTL: number;
    data: string;
  }>;
  Question?: Array<{
    name: string;
    type: number;
  }>;
}

const sanitizeDomain = (domain: string): string => {
  return domain.replace(/^(https?:\/\/)?(www\.)?/, "");
};

/**
 * Validates input parameters for DNS propagation check
 */
const validateInputs = (type: DNSRecordType, domain: string, expectedValue: string): void | DNSError => {
  if (!VALID_DNS_TYPES.includes(type)) {
    return { code: "INVALID_TYPE", message: `Invalid DNS record type: ${type}` };
  }
  if (!domain) {
    return { code: "INVALID_DOMAIN", message: "Domain cannot be empty" };
  }
  if (!expectedValue) {
    return { code: "INVALID_VALUE", message: "Expected value cannot be empty" };
  }
};

/**
 * Checks if the expected value exists in the DNS response
 */
const validateDNSResponse = (response: GoogleDNSResponse, expectedValue: string, type: DNSRecordType): boolean => {
  if (!response.Answer || response.Answer.length === 0) {
    return false;
  }

  // Handle TXT records separately as they might be quoted
  if (type === "TXT") {
    return response.Answer.some((answer) => {
      const cleanData = answer.data.replace(/"/g, "");
      return cleanData === expectedValue.replace(/"/g, "");
    });
  }

  // For other record types
  return response.Answer.some((answer) => answer.data === expectedValue);
};

/**
 * Makes a DNS query and validates the response
 */
const queryDNS = async (domain: string, type: DNSRecordType, expectedValue: string): Promise<DNSCheckResult> => {
  const ENDPOINT = "https://dns.google/resolve";
  const url = `${ENDPOINT}?name=${sanitizeDomain(domain)}&type=${type}&cd=1`;

  const response = await fetch(url);
  if (!response.ok) {
    throw { code: "HTTP_STATUS", message: `HTTP error ${response.status}` };
  }

  const data: GoogleDNSResponse = await response.json();
  if (data.Status !== 0) {
    throw { code: "RESPONSE_ERR", message: "Invalid response from DNS server" };
  }

  const isPropagated = validateDNSResponse(data, expectedValue, type);

  return {
    propagated: isPropagated,
    raw_response: data,
    message: isPropagated
      ? `DNS record has propagated successfully`
      : `DNS record with value "${expectedValue}" hasn't propagated yet`,
  };
};

/**
 * Checks if a DNS record has propagated with the expected value
 * @param type - DNS record type (e.g., "A", "CNAME", "TXT")
 * @param domain - The domain to check
 * @param expectedValue - The expected value that should be present in DNS
 * @returns Promise resolving to the check result
 */
export const verifyDNSPropagation = (
  type: DNSRecordType,
  domain: string,
  expectedValue: string
): Promise<DNSCheckResult> => {
  return new Promise((resolve, reject) => {
    const validationError = validateInputs(type, domain, expectedValue);
    if (validationError) {
      reject(validationError);
      return;
    }

    const MAX_RETRIES = 2;
    let attempt = 0;

    const attemptCheck = async () => {
      try {
        const result = await queryDNS(domain, type, expectedValue);
        resolve(result);
      } catch (error: any) {
        if (attempt >= MAX_RETRIES) {
          reject({
            code: error.code || "UNKNOWN_ERROR",
            message: error.message || "An unknown error occurred while checking DNS",
          });
          return;
        }
        attempt++;
        setTimeout(attemptCheck, 1000); // Wait 1 second between retries
      }
    };

    attemptCheck();
  });
};

/**
 * Validates the DNS query object structure and values
 */
const validateDNSObject = (dnsObject: unknown): DNSError | null => {
  // prettier-ignore
  if (
    typeof dnsObject !== 'object' ||
    dnsObject === null ||
    Array.isArray(dnsObject) ||
    (dnsObject instanceof RegExp) ||
    (dnsObject instanceof Date) ||
    (dnsObject instanceof Set) ||
    (dnsObject instanceof Map) ||
    (Object.getPrototypeOf(dnsObject) !== Object.prototype)
  ) {
    return { code: "INVALID_PARAM", message: `Not a valid JS object DNS: ${dnsObject}` };
  }

  const typedDNSObject = dnsObject as Record<string, any>;

  if (Object.keys(typedDNSObject).length === 0) {
    return { code: "INVALID_PARAM", message: "DNS query object cannot be empty" };
  }

  for (const [key, value] of Object.entries(typedDNSObject)) {
    if (!VALID_DNS_TYPES.includes(key as DNSRecordType)) {
      return { code: "INVALID_RECORD_TYPE", message: `Invalid DNS record type: ${key}` };
    }

    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {
        code: "INVALID_ENTRY_STRUCTURE",
        message: `Entry for ${key} must be an object with domain and expectedValue properties`,
      };
    }

    if (!value.domain || typeof value.domain !== "string") {
      return { code: "INVALID_DOMAIN", message: `Invalid or missing domain for ${key}` };
    }

    if (!value.expectedValue || typeof value.expectedValue !== "string") {
      return { code: "INVALID_VALUE", message: `Invalid or missing expected value for ${key}` };
    }
  }

  return null;
};

/**
 * Makes DNS queries for multiple records and checks their propagation
 */
const queryMultipleDNS = async (
  dnsQueries: DNSQueryObject,
  attempt: number = 0,
  maxRetries: number = 2
): Promise<MultipleDNSCheckResult> => {
  const results: MultipleDNSCheckResult = {};

  for (const [recordType, query] of Object.entries(dnsQueries)) {
    try {
      const ENDPOINT = "https://dns.google/resolve";
      const url = `${ENDPOINT}?name=${sanitizeDomain(query.domain)}&type=${recordType}&cd=1`;

      const response = await fetch(url);
      if (!response.ok) {
        throw { code: "HTTP_STATUS", message: `HTTP error ${response.status}` };
      }

      const data: GoogleDNSResponse = await response.json();
      if (data.Status !== 0) {
        throw { code: "RESPONSE_ERR", message: "Invalid response from DNS server" };
      }

      const isPropagated = validateDNSResponse(data, query.expectedValue, recordType as DNSRecordType);

      results[recordType] = {
        propagated: isPropagated,
        raw_response: data,
        message: isPropagated
          ? `DNS record has propagated successfully`
          : `DNS record with value "${query.expectedValue}" hasn't propagated yet`,
      };
    } catch (error: any) {
      if (attempt >= maxRetries) {
        results[recordType] = {
          propagated: false,
          message: `Error checking ${recordType} record: ${error.message}`,
        };
      } else {
        // Retry this specific query
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const retryResult = await queryMultipleDNS({ [recordType]: query }, attempt + 1, maxRetries);
        results[recordType] = retryResult[recordType];
      }
    }
  }

  return results;
};

/**
 * Checks multiple DNS records for propagation
 * @param dnsQueries - Object containing multiple DNS queries
 * @returns Promise resolving to results for all queries
 */
export const verifyDNSPropagationGroup = async (dnsQueries: DNSQueryObject): Promise<MultipleDNSCheckResult> => {
  return new Promise(async (resolve, reject) => {
    const validationError = validateDNSObject(dnsQueries);
    if (validationError) {
      reject(validationError);
      return;
    }

    try {
      const resultOfMultipleQueries = await queryMultipleDNS(dnsQueries);
      resolve(resultOfMultipleQueries);
    } catch (error: any) {
      reject({
        code: error.code || "UNKNOWN_ERROR",
        message: error.message || "An unknown error occurred while checking DNS",
      });
    }
  });
};
