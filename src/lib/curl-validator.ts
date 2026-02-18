export interface CurlValidationResult {
  valid: boolean;
  error?: string;
  parsed?: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: string;
  };
}

export function validateCurl(curlCommand: string): CurlValidationResult {
  if (!curlCommand || !curlCommand.trim()) {
    return { valid: false, error: "Empty curl command" };
  }

  try {
    const trimmed = curlCommand.trim();
    
    if (!trimmed.toLowerCase().startsWith("curl")) {
      return { valid: false, error: "Command must start with 'curl'" };
    }

    const urlMatch = trimmed.match(/['"]?(https?:\/\/[^'"\s]+)['"]?/);
    if (!urlMatch) {
      return { valid: false, error: "No valid URL found" };
    }

    const headers: Record<string, string> = {};
    const headerMatches = trimmed.matchAll(/-H\s+['"]([^'"]+)['"]/g);
    for (const match of headerMatches) {
      const [key, ...valueParts] = match[1].split(":");
      if (key && valueParts.length > 0) {
        headers[key.trim()] = valueParts.join(":").trim();
      }
    }

    let body: string | undefined;
    const bodyMatch = trimmed.match(/-d\s+['"]([^'"]+)['"]/);
    if (bodyMatch) {
      body = bodyMatch[1];
    }

    const methodMatch = trimmed.match(/-X\s+(GET|POST|PUT|DELETE|PATCH)/i);
    const method = methodMatch ? methodMatch[1].toUpperCase() : body ? "POST" : "GET";

    return {
      valid: true,
      parsed: {
        url: urlMatch[1],
        method,
        headers,
        body,
      },
    };
  } catch (e) {
    return { valid: false, error: "Failed to parse curl command" };
  }
}
