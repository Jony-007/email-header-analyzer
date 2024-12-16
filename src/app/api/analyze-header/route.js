import { NextResponse } from "next/server";
import axios from "axios";

require("dotenv").config();

const ABUSEIPDB_API_KEY = process.env.ABUSEIPDB_API_KEY;
const IPQUALITY_API_KEY = process.env.IPQUALITY_API_KEY;
const VIRUSTOTAL_API_KEY = process.env.VIRUSTOTAL_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Function to extract unique IPs from headers
const extractIPs = (headers) => {
  const ipRegex = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
  const matches = headers.match(ipRegex);
  return matches ? [...new Set(matches)] : [];
};

// Extract email from the "From" header
const extractEmailFromHeader = (headerText) => {
  const match =
    headerText.match(/From:.*?<([^>]+)>/i) ||
    headerText.match(/From:.*?([^\s]+@[^\s]+)/i);
  return match ? match[1].trim() : null;
};

// Extract domain from email
const extractDomainFromEmail = (email) => {
  if (!email) return null;
  const match = email.match(/@([a-zA-Z0-9.-]+)/);
  return match ? match[1].replace(/[^a-zA-Z0-9.-]/g, "") : null;
};

// Fetch geolocation data for IPs
const fetchGeolocation = async (ip) => {
  if (
    ip.startsWith("192.168") ||
    ip.startsWith("10.") ||
    ip.startsWith("172.") ||
    ip === "127.0.0.1"
  ) {
    console.log(`Private or loopback IP detected: ${ip}`);
    return { ip, error: "Private or Loopback IP - Geolocation Not Applicable" };
  }
  try {
    console.log(`Fetching geolocation for IP: ${ip}`);
    const response = await axios.get(`http://ip-api.com/json/${ip}`);
    return {
      ip,
      city: response.data.city || "N/A",
      region: response.data.regionName || "N/A",
      country: response.data.country || "N/A",
    };
  } catch (error) {
    console.error(`Geolocation API error for IP ${ip}:`, error.message);
    return { ip, error: "Failed to fetch geolocation data" };
  }
};

// Fetch AbuseIPDB reports for IPs
const checkAbuseIPDB = async (ip) => {
  try {
    console.log(`Checking AbuseIPDB for IP: ${ip}`);
    const response = await axios.get(`https://api.abuseipdb.com/api/v2/check`, {
      params: { ipAddress: ip, maxAgeInDays: 90 },
      headers: {
        Key: ABUSEIPDB_API_KEY,
        Accept: "application/json",
      },
    });
    return response.data.data
      ? { ip, abuseConfidenceScore: response.data.data.abuseConfidenceScore }
      : { ip, error: "No abuse data available" };
  } catch (error) {
    console.error(`AbuseIPDB API error for IP ${ip}:`, error.message);
    return { ip, error: "Failed to check AbuseIPDB" };
  }
};

// Fetch email quality
const fetchEmailQuality = async (email) => {
  try {
    console.log(`Checking email quality for: ${email}`);
    const response = await axios.get(
      `https://www.ipqualityscore.com/api/json/email/${IPQUALITY_API_KEY}/${email}`
    );
    return response.data.success
      ? {
          valid: response.data.valid,
          disposable: response.data.disposable,
          deliverability: response.data.deliverability,
          fraudScore: response.data.fraud_score,
          domainAge: response.data.domain_age.human,
          message: "Email analysis completed.",
        }
      : { valid: false, error: "Failed to fetch email quality data." };
  } catch (error) {
    console.error(
      `IPQualityScore API error for email ${email}:`,
      error.message
    );
    return { valid: false, error: "Failed to fetch email quality data." };
  }
};

// Fetch domain reputation from VirusTotal
const checkVirusTotal = async (domain) => {
  try {
    console.log(`Checking VirusTotal for domain: ${domain}`);
    const response = await axios.get(
      `https://www.virustotal.com/api/v3/domains/${domain}`,
      { headers: { "x-apikey": VIRUSTOTAL_API_KEY } }
    );
    return {
      domain,
      reputation: response.data.data.attributes.reputation || "N/A",
      maliciousVotes:
        response.data.data.attributes.last_analysis_stats.malicious || 0,
    };
  } catch (error) {
    console.error(`VirusTotal API error for domain ${domain}:`, error.message);
    return { domain, error: "Failed to check VirusTotal reputation" };
  }
};

// AI Analysis using OpenAI GPT-3.5
const analyzeHeaderWithOpenAI = async (headerText, retryCount = 0) => {
  try {
    console.log("Sending header to OpenAI for analysis...");
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are a cybersecurity analyst who summarizes key information and based on it gives verdict whether the email is valid or spam.",
          },
          {
            role: "user",
            content: `Analyze this email header:\n\n${headerText}`,
          },
        ],
        max_tokens: 300,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data.choices[0].message.content;
  } catch (error) {
    if (retryCount < 2) {
      console.log(`Retrying OpenAI API (attempt ${retryCount + 1})...`);
      return await analyzeHeaderWithOpenAI(headerText, retryCount + 1);
    }
    console.error("OpenAI API error:", error.message);
    return "AI analysis unavailable due to a technical issue.";
  }
};

// Main API Route
export async function POST(req) {
  try {
    const { headerText } = await req.json();

    if (
      !headerText ||
      !headerText.includes("From:") ||
      !headerText.includes("Received:")
    ) {
      return NextResponse.json(
        { error: "Invalid or incomplete email header provided." },
        { status: 400 }
      );
    }

    // Extract data
    const ips = extractIPs(headerText);
    const email = extractEmailFromHeader(headerText);
    const domain = extractDomainFromEmail(email);

    // Perform analyses
    const geolocationResults = await Promise.all(ips.map(fetchGeolocation));
    const abuseReports = await Promise.all(ips.map(checkAbuseIPDB));
    const emailQuality = email
      ? await fetchEmailQuality(email)
      : { valid: false, error: "No email detected." };
    const virusTotal = domain
      ? await checkVirusTotal(domain)
      : {
          domain: "No valid domain detected",
          reputation: "N/A",
          maliciousVotes: 0,
        };
    const aiSpamAnalysis = await analyzeHeaderWithOpenAI(headerText);

    console.log("Full AI Analysis:", aiSpamAnalysis); // Log full AI analysis for debugging

    // Summarized Output
    const summary = {
      email_status: emailQuality.valid
        ? `Valid, with ${emailQuality.deliverability} deliverability. Fraud score is ${emailQuality.fraudScore}.`
        : "Invalid email address.",
      domain_status:
        virusTotal.reputation === "N/A"
          ? "Clean domain. No malicious activity reported."
          : "Potential risk detected.",
      geolocation_status: geolocationResults.some((geo) => geo.error)
        ? "Geolocation unavailable for some IPs."
        : "Geolocation successful.",
      abuse_reports_status: abuseReports.some((report) => report.error)
        ? "Abuse data unavailable for some IPs."
        : "No abuse reports detected.",
      ai_analysis_summary:
        aiSpamAnalysis.length > 300
          ? aiSpamAnalysis.substring(0, 300) + "..."
          : aiSpamAnalysis, // Truncate for summary
    };

    return NextResponse.json({
      summary, // You can remove this if you don't need the summary
      detailed_analysis: {
        extractedIPs: geolocationResults.map((geo, index) => ({
          ip: geo.ip,
          geolocation:
            geo.error || `${geo.city}, ${geo.region}, ${geo.country}`,
          abuseConfidenceScore:
            abuseReports[index].abuseConfidenceScore ||
            abuseReports[index].error,
        })),
        email: emailQuality,
        domain: virusTotal,
        aiAnalysis: {
          details: aiSpamAnalysis, // Send the full AI analysis details
        },
      },
    });
  } catch (error) {
    console.error("Unhandled Error:", error.message);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
