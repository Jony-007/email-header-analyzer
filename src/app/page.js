"use client";

import { useState } from "react";

export default function Home() {
  const [headerText, setHeaderText] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const analyzeHeader = async () => {
    if (!headerText.trim()) {
      alert("Please paste an email header to analyze.");
      return;
    }

    setLoading(true);
    setResults(null);

    try {
      const response = await fetch("/api/analyze-header", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ headerText }),
      });

      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error("Error analyzing header:", error.message);
      setResults({ error: "Failed to analyze email header." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-800 font-sans">
      <div className="container mx-auto p-4 sm:p-6 md:p-8">
        {/* Title */}
        <h1 className="text-3xl sm:text-4xl font-bold text-center mb-6 text-gray-900">
          Email Header Analyzer
        </h1>

        {/* Input Field */}
        <textarea
          className="w-full border border-gray-300 rounded-md p-3 text-sm sm:text-base text-gray-800 bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          rows="6"
          placeholder="Paste your email header here..."
          value={headerText}
          onChange={(e) => setHeaderText(e.target.value)}
        ></textarea>

        {/* Analyze Button */}
        <div className="flex justify-center mt-4">
          <button
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded text-base flex items-center"
            onClick={analyzeHeader}
            disabled={loading}
          >
            {loading ? (
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
                  d="M4 12a8 8 0 018-8v8H4z"
                ></path>
              </svg>
            ) : null}
            {loading ? "Analyzing..." : "Analyze Header"}
          </button>
        </div>

        {/* Results Section */}
        {results && (
          <div className="mt-6 bg-gray-100 p-4 rounded-md shadow-lg">
            <h2 className="text-lg sm:text-xl font-semibold mb-4 text-gray-900">
              Detailed Analysis
            </h2>
            {results.error ? (
              <p className="text-red-600">{results.error}</p>
            ) : (
              <pre className="text-xs sm:text-sm overflow-auto text-gray-700 whitespace-pre-wrap">
                {JSON.stringify(results, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
