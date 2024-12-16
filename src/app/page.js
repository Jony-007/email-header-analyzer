"use client";

import { useState } from "react";

export default function Home() {
  const [headerText, setHeaderText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const analyzeHeader = async () => {
    setResult(null); // Clear previous results
    setLoading(true); // Show spinner
    try {
      const response = await fetch("/api/analyze-header", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ headerText }),
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: "Failed to analyze header." });
    } finally {
      setLoading(false); // Hide spinner
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-10">
      <h1 className="text-2xl font-bold mb-5">Email Header Analyzer</h1>
      <textarea
        className="w-full max-w-3xl h-60 p-4 border border-gray-300 rounded"
        placeholder="Paste email header here..."
        value={headerText}
        onChange={(e) => setHeaderText(e.target.value)}
      />
      <button
        className={`mt-4 bg-blue-500 text-white px-6 py-2 rounded flex items-center justify-center ${
          loading ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-600"
        }`}
        onClick={analyzeHeader}
        disabled={loading}
      >
        {loading ? (
          <>
            <svg
              className="animate-spin h-5 w-5 mr-2 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4l-3.5 3.5L4 12zm1.5 5.5L9 14v4a8 8 0 01-8-8h4l3.5 3.5z"
              ></path>
            </svg>
            Analyzing...
          </>
        ) : (
          "Analyze Header"
        )}
      </button>
      {result && (
        <div className="mt-8 w-full max-w-3xl bg-white p-6 border border-gray-200 rounded shadow">
          {result.error ? (
            <p className="text-red-500">{result.error}</p>
          ) : (
            <>
              <h2 className="text-xl font-semibold mb-4">Detailed Analysis</h2>
              <div className="space-y-4">
                <h3 className="font-semibold">Extracted IPs</h3>
                <ul className="list-disc list-inside">
                  {result.detailed_analysis.extractedIPs.map(
                    (ipData, index) => (
                      <li key={index}>
                        IP: {ipData.ip} - Geolocation: {ipData.geolocation}
                      </li>
                    )
                  )}
                </ul>
                <h3 className="font-semibold">Email Quality</h3>
                <pre className="bg-gray-100 p-4 rounded">
                  {JSON.stringify(result.detailed_analysis.email, null, 2)}
                </pre>
                <h3 className="font-semibold">Domain Reputation</h3>
                <pre className="bg-gray-100 p-4 rounded">
                  {JSON.stringify(result.detailed_analysis.domain, null, 2)}
                </pre>
                <h3 className="font-semibold">AI Analysis</h3>
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                  {result.detailed_analysis.aiAnalysis.details}
                </pre>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
