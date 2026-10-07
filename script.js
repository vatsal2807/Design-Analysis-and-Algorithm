/**
 * DAA ALGORITHM ENGINE & CLIENT-SIDE PLAGIARISM CHECKER
 *Hybrid Rabin-Karp Pre-filtering & LCS Verification
 */

document.addEventListener('DOMContentLoaded', () => {
    setupFileInputs();
    document.getElementById('analyzeBtn').addEventListener('click', runPlagiarismAnalysis);
    document.getElementById('searchBtn').addEventListener('click', executeTargetSearch);
});

/* ============================================================================
 * 1. FILE READER API & PDF PARSING INTEGRATION
 * ============================================================================ */
function setupFileInputs() {
    setupSingleFile('fileA', 'textA');
    setupSingleFile('fileB', 'textB');
}

function setupSingleFile(fileInputId, textAreaId) {
    document.getElementById(fileInputId).addEventListener('change', async function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const textArea = document.getElementById(textAreaId);

        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
            try {
                textArea.value = "Parsing PDF document...";
                const arrayBuffer = await file.arrayBuffer();
                const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
                const pdfDoc = await loadingTask.promise;
                
                let extractedText = "";
                for (let i = 1; i <= pdfDoc.numPages; i++) {
                    const page = await pdfDoc.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map(item => item.str).join(' ');
                    extractedText += pageText + "\n";
                }
                textArea.value = extractedText.trim();
            } catch (error) {
                console.error("PDF Parsing Error:", error);
                alert("Error parsing PDF file. Please ensure it is a valid text-based PDF.");
                textArea.value = "";
            }
            return;
        }

        const reader = new FileReader();
        reader.onload = function(event) {
            textArea.value = event.target.result;
        };
        reader.readAsText(file);
    });
}

/* ============================================================================
 * 2. ALGORITHMIC ARCHITECTURE (DP LCS & Rabin-Karp Search)
 * ============================================================================ */

/**
 * Rabin-Karp Algorithm with Rolling Hash for Substring Search
 * Time Complexity: O(n + m) average | Space Complexity: O(1)
 */
function rabinKarpSearch(text, pattern) {
    const d = 256;
    const q = 101;
    const m = pattern.length;
    const n = text.length;
    const matches = [];
    
    if (m === 0 || m > n) return matches;

    let h = 1;
    for (let i = 0; i < m - 1; i++) {
        h = (h * d) % q;
    }

    let p = 0; 
    let t = 0; 

    for (let i = 0; i < m; i++) {
        p = (d * p + pattern.charCodeAt(i)) % q;
        t = (d * t + text.charCodeAt(i)) % q;
    }

    for (let i = 0; i <= n - m; i++) {
        if (p === t) {
            let match = true;
            for (let j = 0; j < m; j++) {
                if (text[i + j] !== pattern[j]) {
                    match = false;
                    break;
                }
            }
            if (match) matches.push(i);
        }

        if (i < n - m) {
            t = (d * (t - text.charCodeAt(i) * h) + text.charCodeAt(i + m)) % q;
            if (t < 0) t = t + q;
        }
    }
    return matches;
}

/**
 * Longest Common Subsequence (LCS) Dynamic Programming
 * Time Complexity: O(m * n) | Space Complexity: O(m * n)
 */
function computeLCSLength(str1, str2) {
    const m = str1.length;
    const n = str2.length;
    if (m === 0 || n === 0) return 0;

    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (str1[i - 1] === str2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }
    return dp[m][n];
}

/* ============================================================================
 * 3. HYBRID PLAGIARISM ANALYSIS & UI CONTROLLERS
 * ============================================================================ */

function runPlagiarismAnalysis() {
    const textA = document.getElementById('textA').value;
    const textB = document.getElementById('textB').value;

    if (!textA.trim() || !textB.trim()) {
        alert("Please provide inputs in both Data A and Data B terminals.");
        return;
    }

    const spinner = document.getElementById('loadingSpinner');
    spinner.classList.remove('hidden');

    setTimeout(() => {
        const startTime = performance.now();

        // 1. Define chunk size (k-grams) for Rabin-Karp pre-filtering
        const k = 20; 
        let lcsTotalLength = 0;

        // 2. Hybrid Pipeline: Rabin-Karp Filter -> LCS Verification
        if (textA.length >= k && textB.length >= k) {
            for (let i = 0; i <= textA.length - k; i += k) {
                const chunk = textA.substring(i, i + k);
                
                // Fast pre-filter using Rabin-Karp rolling hash
                const matches = rabinKarpSearch(textB, chunk);
                
                if (matches.length > 0) {
                    // Precision verification using DP LCS on the matched window
                    const targetSubB = textB.substring(matches[0], matches[0] + k);
                    const verifiedLength = computeLCSLength(chunk, targetSubB);
                    lcsTotalLength += verifiedLength;
                }
            }
        }

        const endTime = performance.now();
        const duration = endTime - startTime;

        // Calculate hybrid similarity percentage based on filtered chunks
        const totalChars = textA.length + textB.length;
        const similarityPct = totalChars === 0 ? 0 : Number((((2 * lcsTotalLength) / totalChars) * 100).toFixed(2));

        // Update Timestamp
        const now = new Date();
        document.getElementById('computedTimestamp').innerText = `Computed (Hybrid) @ ${now.toLocaleTimeString()}`;

        // Update Metrics in Dashboard
        document.getElementById('similarityScoreText').innerText = Math.min(similarityPct, 100) + '%';
        document.getElementById('lcsMatchedLength').innerText = lcsTotalLength;
        document.getElementById('totalCharsLabel').innerText = `/ ${totalChars} Chars`;
        document.getElementById('lcsTime').innerText = duration.toFixed(4) + ' ms';

        // Apply Color Coding & Plagiarism Status thresholds
        applyPlagiarismStyling(Math.min(similarityPct, 100));

        // Render plain text in comparison view initially
        document.getElementById('outputA').innerText = textA;
        document.getElementById('outputB').innerText = textB;

        spinner.classList.add('hidden');
        document.getElementById('resultsSection').classList.remove('hidden');
        document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth' });
    }, 400);
}

function applyPlagiarismStyling(pct) {
    const progressBar = document.getElementById('similarityProgressBar');
    const statusText = document.getElementById('plagiarismStatusText');
    const scoreText = document.getElementById('similarityScoreText');

    progressBar.style.width = pct + '%';

    if (pct > 75) {
        progressBar.style.backgroundColor = '#ef4444';
        scoreText.style.color = '#ef4444';
        statusText.style.color = '#ef4444';
        statusText.innerText = '⚠️ High Risk (>75%)';
    } else if (pct >= 50 && pct <= 75) {
        progressBar.style.backgroundColor = '#f97316';
        scoreText.style.color = '#f97316';
        statusText.style.color = '#f97316';
        statusText.innerText = '⚡ High Match (50% - 75%)';
    } else if (pct >= 25 && pct < 50) {
        progressBar.style.backgroundColor = '#eab308';
        scoreText.style.color = '#eab308';
        statusText.style.color = '#eab308';
        statusText.innerText = '🔸 Moderate Match (25% - 50%)';
    } else {
        progressBar.style.backgroundColor = '#10b981';
        scoreText.style.color = '#10b981';
        statusText.style.color = '#10b981';
        statusText.innerText = '✅ Safe / Original (<25%)';
    }
}

function executeTargetSearch() {
    const query = document.getElementById('targetSearchInput').value;
    const textA = document.getElementById('textA').value;
    const textB = document.getElementById('textB').value;

    if (!query) {
        alert("Please enter a target search query.");
        return;
    }

    const matchesA = rabinKarpSearch(textA.toLowerCase(), query.toLowerCase());
    const matchesB = rabinKarpSearch(textB.toLowerCase(), query.toLowerCase());
    const totalMatches = matchesA.length + matchesB.length;

    document.getElementById('searchMatchCount').innerText = `Matches found: ${totalMatches} (Data A: ${matchesA.length}, Data B: ${matchesB.length})`;

    renderHighlightedHTML('outputA', textA, matchesA, query.length);
    renderHighlightedHTML('outputB', textB, matchesB, query.length);
}

function renderHighlightedHTML(elementId, text, matches, length) {
    if (matches.length === 0) {
        document.getElementById(elementId).innerText = text;
        return;
    }

    let html = '';
    let lastIdx = 0;

    matches.forEach(idx => {
        html += escapeHtml(text.substring(lastIdx, idx));
        html += `<mark class="highlight" style="background-color: #fde047; color: #000; padding: 2px 4px; border-radius: 3px;">${escapeHtml(text.substring(idx, idx + length))}</mark>`;
        lastIdx = idx + length;
    });
    html += escapeHtml(text.substring(lastIdx));

    document.getElementById(elementId).innerHTML = html;
}

function escapeHtml(str) {
    return str.replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;")
              .replace(/'/g, "&#039;");
}
