"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// index.ts
var index_exports = {};
__export(index_exports, {
  verifyDNSPropagation: () => verifyDNSPropagation,
  verifyDNSPropagationGroup: () => verifyDNSPropagationGroup
});
module.exports = __toCommonJS(index_exports);
var VALID_DNS_TYPES = ["A", "AAAA", "CNAME", "MX", "NS", "TXT", "SRV", "PTR", "SOA", "CAA"];
var sanitizeDomain = (domain) => {
  return domain.replace(/^(https?:\/\/)?(www\.)?/, "");
};
var validateInputs = (type, domain, expectedValue) => {
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
var validateDNSResponse = (response, expectedValue, type) => {
  if (!response.Answer || response.Answer.length === 0) {
    return false;
  }
  if (type === "TXT") {
    return response.Answer.some((answer) => {
      const cleanData = answer.data.replace(/"/g, "");
      return cleanData === expectedValue.replace(/"/g, "");
    });
  }
  return response.Answer.some((answer) => answer.data === expectedValue);
};
var queryDNS = (domain, type, expectedValue) => __async(void 0, null, function* () {
  const ENDPOINT = "https://dns.google/resolve";
  const url = `${ENDPOINT}?name=${sanitizeDomain(domain)}&type=${type}&cd=1`;
  const response = yield fetch(url);
  if (!response.ok) {
    throw { code: "HTTP_STATUS", message: `HTTP error ${response.status}` };
  }
  const data = yield response.json();
  if (data.Status !== 0) {
    throw { code: "RESPONSE_ERR", message: "Invalid response from DNS server" };
  }
  const isPropagated = validateDNSResponse(data, expectedValue, type);
  return {
    propagated: isPropagated,
    raw_response: data,
    message: isPropagated ? `DNS record has propagated successfully` : `DNS record with value "${expectedValue}" hasn't propagated yet`
  };
});
var verifyDNSPropagation = (type, domain, expectedValue) => {
  return new Promise((resolve, reject) => {
    const validationError = validateInputs(type, domain, expectedValue);
    if (validationError) {
      reject(validationError);
      return;
    }
    const MAX_RETRIES = 2;
    let attempt = 0;
    const attemptCheck = () => __async(void 0, null, function* () {
      try {
        const result = yield queryDNS(domain, type, expectedValue);
        resolve(result);
      } catch (error) {
        if (attempt >= MAX_RETRIES) {
          reject({
            code: error.code || "UNKNOWN_ERROR",
            message: error.message || "An unknown error occurred while checking DNS"
          });
          return;
        }
        attempt++;
        setTimeout(attemptCheck, 1e3);
      }
    });
    attemptCheck();
  });
};
var validateDNSObject = (dnsObject) => {
  if (typeof dnsObject !== "object" || dnsObject === null || Array.isArray(dnsObject) || dnsObject instanceof RegExp || dnsObject instanceof Date || dnsObject instanceof Set || dnsObject instanceof Map || Object.getPrototypeOf(dnsObject) !== Object.prototype) {
    return { code: "INVALID_PARAM", message: `Not a valid JS object DNS: ${dnsObject}` };
  }
  const typedDNSObject = dnsObject;
  if (Object.keys(typedDNSObject).length === 0) {
    return { code: "INVALID_PARAM", message: "DNS query object cannot be empty" };
  }
  for (const [key, value] of Object.entries(typedDNSObject)) {
    if (!VALID_DNS_TYPES.includes(key)) {
      return { code: "INVALID_RECORD_TYPE", message: `Invalid DNS record type: ${key}` };
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {
        code: "INVALID_ENTRY_STRUCTURE",
        message: `Entry for ${key} must be an object with domain and expectedValue properties`
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
var queryMultipleDNS = (dnsQueries, attempt = 0, maxRetries = 2) => __async(void 0, null, function* () {
  const results = {};
  for (const [recordType, query] of Object.entries(dnsQueries)) {
    try {
      const ENDPOINT = "https://dns.google/resolve";
      const url = `${ENDPOINT}?name=${sanitizeDomain(query.domain)}&type=${recordType}&cd=1`;
      const response = yield fetch(url);
      if (!response.ok) {
        throw { code: "HTTP_STATUS", message: `HTTP error ${response.status}` };
      }
      const data = yield response.json();
      if (data.Status !== 0) {
        throw { code: "RESPONSE_ERR", message: "Invalid response from DNS server" };
      }
      const isPropagated = validateDNSResponse(data, query.expectedValue, recordType);
      results[recordType] = {
        propagated: isPropagated,
        raw_response: data,
        message: isPropagated ? `DNS record has propagated successfully` : `DNS record with value "${query.expectedValue}" hasn't propagated yet`
      };
    } catch (error) {
      if (attempt >= maxRetries) {
        results[recordType] = {
          propagated: false,
          message: `Error checking ${recordType} record: ${error.message}`
        };
      } else {
        yield new Promise((resolve) => setTimeout(resolve, 1e3));
        const retryResult = yield queryMultipleDNS({ [recordType]: query }, attempt + 1, maxRetries);
        results[recordType] = retryResult[recordType];
      }
    }
  }
  return results;
});
var verifyDNSPropagationGroup = (dnsQueries) => __async(void 0, null, function* () {
  return new Promise((resolve, reject) => __async(void 0, null, function* () {
    const validationError = validateDNSObject(dnsQueries);
    if (validationError) {
      reject(validationError);
      return;
    }
    try {
      const resultOfMultipleQueries = yield queryMultipleDNS(dnsQueries);
      resolve(resultOfMultipleQueries);
    } catch (error) {
      reject({
        code: error.code || "UNKNOWN_ERROR",
        message: error.message || "An unknown error occurred while checking DNS"
      });
    }
  }));
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  verifyDNSPropagation,
  verifyDNSPropagationGroup
});
