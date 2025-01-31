type DNSRecordType = "A" | "AAAA" | "CNAME" | "MX" | "NS" | "TXT" | "SRV" | "PTR" | "SOA" | "CAA";
interface DNSCheckResult {
    propagated: boolean;
    raw_response?: any;
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
/**
 * Checks if a DNS record has propagated with the expected value
 * @param type - DNS record type (e.g., "A", "CNAME", "TXT")
 * @param domain - The domain to check
 * @param expectedValue - The expected value that should be present in DNS
 * @returns Promise resolving to the check result
 */
declare const verifyDNSPropagation: (type: DNSRecordType, domain: string, expectedValue: string) => Promise<DNSCheckResult>;
/**
 * Checks multiple DNS records for propagation
 * @param dnsQueries - Object containing multiple DNS queries
 * @returns Promise resolving to results for all queries
 */
declare const verifyDNSPropogationGroup: (dnsQueries: DNSQueryObject) => Promise<MultipleDNSCheckResult>;

export { verifyDNSPropagation, verifyDNSPropogationGroup };
