// Application State
let appState = {
    releases: [],
    filteredReleases: [],
    currentFilter: 'all',
    searchQuery: ''
};

// DOM Elements
const btnRefresh = document.getElementById('btn-refresh');
const btnExportCsv = document.getElementById('btn-export-csv');
const searchInput = document.getElementById('search-input');
const searchClear = document.getElementById('search-clear');
const filterTabs = document.getElementById('filter-tabs');
const cacheIndicator = document.getElementById('cache-indicator');
const statsBanner = document.getElementById('stats-banner');
const visibleCount = document.getElementById('visible-count');
const totalCount = document.getElementById('total-count');

// State Containers
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const errorMessage = document.getElementById('error-message');
const emptyState = document.getElementById('empty-state');
const notesGrid = document.getElementById('notes-grid');
const btnRetry = document.getElementById('btn-retry');
const btnClearSearch = document.getElementById('btn-clear-search');

// Modal Elements
const tweetModal = document.getElementById('tweet-modal');
const tweetTextarea = document.getElementById('tweet-text');
const btnCloseModal = document.getElementById('btn-close-modal');
const btnPostTweet = document.getElementById('btn-post-tweet');
const charCounter = document.getElementById('char-counter');
const progressRingCircle = document.getElementById('progress-ring-indicator');

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    fetchReleases(false);
    
    // Refresh & Export handlers
    btnRefresh.addEventListener('click', () => fetchReleases(true));
    btnExportCsv.addEventListener('click', exportToCSV);
    btnRetry.addEventListener('click', () => fetchReleases(false));
    
    // Search handlers
    searchInput.addEventListener('input', handleSearchInput);
    searchClear.addEventListener('click', clearSearch);
    btnClearSearch.addEventListener('click', resetFiltersAndSearch);
    
    // Filter Tab handlers
    filterTabs.addEventListener('click', handleFilterClick);
    
    // Modal handlers
    btnCloseModal.addEventListener('click', closeModal);
    tweetTextarea.addEventListener('input', updateCharCount);
    btnPostTweet.addEventListener('click', postTweet);
    
    // Close modal on clicking outside the card
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) closeModal();
    });
    
    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && tweetModal.classList.contains('open')) {
            closeModal();
        }
    });
});

// Fetch Release Notes from API
async function fetchReleases(forceRefresh = false) {
    // UI Loading State
    setLoadingState(true);
    btnRefresh.classList.add('loading');
    
    try {
        const response = await fetch(`/api/releases?refresh=${forceRefresh}`);
        if (!response.ok) {
            throw new Error(`Server returned status ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.status === 'error') {
            throw new Error(result.message);
        }
        
        // Save to state
        appState.releases = result.data || [];
        
        // Update Cache/Time Indicator
        if (result.last_updated) {
            cacheIndicator.textContent = `Updated: ${result.last_updated}`;
            if (result.cached) {
                cacheIndicator.textContent += ' (Cached)';
            }
        }
        
        // Set UI back to normal
        setLoadingState(false);
        applyFiltersAndRender();
        
    } catch (error) {
        console.error("Error fetching release notes:", error);
        setLoadingState(false);
        showError(error.message);
    } finally {
        btnRefresh.classList.remove('loading');
    }
}

// Set Loading UI state
function setLoadingState(isLoading) {
    if (isLoading) {
        loadingState.style.display = 'flex';
        errorState.style.display = 'none';
        emptyState.style.display = 'none';
        notesGrid.style.display = 'none';
        statsBanner.style.display = 'none';
    } else {
        loadingState.style.display = 'none';
    }
}

// Show Error UI state
function showError(msg) {
    errorState.style.display = 'flex';
    errorMessage.textContent = msg;
    notesGrid.style.display = 'none';
    emptyState.style.display = 'none';
    statsBanner.style.display = 'none';
}

// Category Normalizer Helper
function getNormalizedCategory(type) {
    const t = (type || '').toLowerCase().trim();
    if (t.includes('feature')) return 'feature';
    if (t.includes('announcement')) return 'announcement';
    if (t.includes('issue') || t.includes('fix') || t.includes('broken')) return 'issue';
    if (t.includes('deprecation')) return 'deprecation';
    return 'general';
}

// Search Input Handler
function handleSearchInput(e) {
    appState.searchQuery = e.target.value;
    
    // Toggle clear search button
    if (appState.searchQuery.length > 0) {
        searchClear.style.display = 'block';
    } else {
        searchClear.style.display = 'none';
    }
    
    applyFiltersAndRender();
}

// Clear Search Query
function clearSearch() {
    searchInput.value = '';
    appState.searchQuery = '';
    searchClear.style.display = 'none';
    searchInput.focus();
    applyFiltersAndRender();
}

// Filter Tab Click Handler
function handleFilterClick(e) {
    const tab = e.target.closest('.filter-tab');
    if (!tab) return;
    
    // Update active class on tabs
    document.querySelectorAll('.filter-tab').forEach(btn => btn.classList.remove('active'));
    tab.classList.add('active');
    
    // Update filter in state
    appState.currentFilter = tab.getAttribute('data-type');
    applyFiltersAndRender();
}

// Reset all Filters and Search
function resetFiltersAndSearch() {
    // Reset search
    searchInput.value = '';
    appState.searchQuery = '';
    searchClear.style.display = 'none';
    
    // Reset tab active state
    document.querySelectorAll('.filter-tab').forEach(btn => btn.classList.remove('active'));
    document.querySelector('.filter-tab[data-type="all"]').classList.add('active');
    appState.currentFilter = 'all';
    
    applyFiltersAndRender();
}

// Main Filtering and Rendering Logic
function applyFiltersAndRender() {
    const { releases, currentFilter, searchQuery } = appState;
    
    // 1. Filter by category type
    let tempReleases = releases;
    if (currentFilter !== 'all') {
        tempReleases = tempReleases.filter(item => getNormalizedCategory(item.type) === currentFilter);
    }
    
    // 2. Filter by search query
    if (searchQuery.trim().length > 0) {
        const query = searchQuery.toLowerCase().trim();
        tempReleases = tempReleases.filter(item => {
            const titleMatch = (item.date || '').toLowerCase().includes(query);
            const typeMatch = (item.type || '').toLowerCase().includes(query);
            const contentMatch = (item.text || '').toLowerCase().includes(query);
            return titleMatch || typeMatch || contentMatch;
        });
    }
    
    appState.filteredReleases = tempReleases;
    
    // Update count labels
    totalCount.textContent = releases.length;
    visibleCount.textContent = tempReleases.length;
    statsBanner.style.display = 'inline-block';
    
    // Render States
    if (tempReleases.length === 0) {
        notesGrid.style.display = 'none';
        emptyState.style.display = 'flex';
    } else {
        emptyState.style.display = 'none';
        notesGrid.style.display = 'grid';
        renderNotes(tempReleases);
    }
}

// HTML Generation and Render
function renderNotes(items) {
    notesGrid.innerHTML = '';
    
    items.forEach((item, index) => {
        const category = getNormalizedCategory(item.type);
        const card = document.createElement('article');
        card.className = `note-card note-${category}`;
        card.style.animationDelay = `${Math.min(index * 0.05, 0.4)}s`;
        
        // Escape special chars from JSON strings for safe inline click handlers
        const escapedItem = encodeURIComponent(JSON.stringify(item));
        
        card.innerHTML = `
            <div class="note-header">
                <div class="note-header-left">
                    <span class="badge badge-${category}">${item.type}</span>
                    <time class="note-date" datetime="${item.updated || ''}">${item.date}</time>
                </div>
                <div class="note-actions">
                    <button class="btn-icon-copy" onclick="copyCardText(this, '${escapedItem}')" title="Copy update description to clipboard">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                        Copy
                    </button>
                    <button class="btn-icon-tweet" onclick="prepareTweet('${escapedItem}')" title="Share this update on X/Twitter">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                        Tweet
                    </button>
                </div>
            </div>
            
            <div class="note-body">
                ${item.html}
            </div>
            
            <div class="note-link-wrapper">
                <a href="${item.link}" target="_blank" rel="noopener noreferrer" class="note-source-link">
                    View in Official Release Notes
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
                    </svg>
                </a>
            </div>
        `;
        
        notesGrid.appendChild(card);
    });
}

// Prepare Tweet text and open Modal
window.prepareTweet = function(escapedItemJson) {
    const item = JSON.parse(decodeURIComponent(escapedItemJson));
    const category = getNormalizedCategory(item.type);
    
    // Choose appropriate emoji
    const emojiMap = {
        'feature': '🚀',
        'announcement': '📢',
        'issue': '⚠️',
        'deprecation': '🛑',
        'general': '💡'
    };
    const emoji = emojiMap[category] || '💡';
    
    // Format default tweet
    const baseText = `${emoji} BigQuery ${item.type} (${item.date}):\n`;
    const linkText = `\n\nDetails: ${item.link}`;
    
    // Calculate maximum characters left for excerpt (Twitter limits to 280, URL takes 23 characters)
    // 23 chars for link + 2 chars for double newline + length of base header text
    const metaLength = baseText.length + 25; 
    const maxExcerptLength = 280 - metaLength - 5; // 5 char buffer
    
    let excerpt = item.text || '';
    if (excerpt.length > maxExcerptLength) {
        excerpt = excerpt.substring(0, maxExcerptLength).trim();
        // Cut nicely at word boundary
        const lastSpace = excerpt.lastIndexOf(' ');
        if (lastSpace > 120) {
            excerpt = excerpt.substring(0, lastSpace).trim();
        }
        excerpt += '...';
    }
    
    const tweetContent = `${baseText}${excerpt}${linkText}`;
    openModal(tweetContent);
};

// Modal functions
function openModal(tweetText) {
    tweetTextarea.value = tweetText;
    tweetModal.classList.add('open');
    updateCharCount();
    
    // Focus textarea
    setTimeout(() => {
        tweetTextarea.focus();
        // Place cursor at the end of the text
        tweetTextarea.selectionStart = tweetTextarea.selectionEnd = tweetTextarea.value.length;
    }, 100);
}

function closeModal() {
    tweetModal.classList.remove('open');
}

// X/Twitter Character Counter (mimics X's logic where any HTTP/HTTPS URL takes 23 chars)
function updateCharCount() {
    const text = tweetTextarea.value;
    const urlRegex = /https?:\/\/[^\s]+/g;
    
    let length = text.length;
    
    // Find all urls in the text and replace their actual length contribution with exactly 23
    const matches = text.match(urlRegex);
    if (matches) {
        matches.forEach(url => {
            length = length - url.length + 23;
        });
    }
    
    const maxChars = 280;
    const remaining = maxChars - length;
    
    charCounter.textContent = remaining;
    
    // Update Progress Circle
    const percent = Math.min(100, Math.max(0, (length / maxChars) * 100));
    const circleRadius = 14;
    const circumference = 2 * Math.PI * circleRadius; // ~87.96
    const strokeOffset = circumference - (percent / 100) * circumference;
    
    progressRingCircle.style.strokeDashoffset = strokeOffset;
    
    // Danger / Warning Classes
    if (remaining < 0) {
        charCounter.className = 'char-counter danger';
        progressRingCircle.style.stroke = 'var(--color-issue)';
        btnPostTweet.classList.add('disabled');
        btnPostTweet.setAttribute('disabled', 'true');
    } else if (remaining < 30) {
        charCounter.className = 'char-counter warning';
        progressRingCircle.style.stroke = 'var(--color-announcement)';
        btnPostTweet.classList.remove('disabled');
        btnPostTweet.removeAttribute('disabled');
    } else {
        charCounter.className = 'char-counter';
        progressRingCircle.style.stroke = '#1d9bf0';
        btnPostTweet.classList.remove('disabled');
        btnPostTweet.removeAttribute('disabled');
    }
}

// Dispatch Tweet Web Intent
function postTweet() {
    const text = tweetTextarea.value;
    
    // Final check on length before posting
    const urlRegex = /https?:\/\/[^\s]+/g;
    let length = text.length;
    const matches = text.match(urlRegex);
    if (matches) {
        matches.forEach(url => {
            length = length - url.length + 23;
        });
    }
    
    if (length > 280) {
        alert("Your tweet exceeds the 280-character limit.");
        return;
    }
    
    const intentUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(intentUrl, '_blank', 'width=600,height=400,resizable=yes');
    closeModal();
}

// Copy release note text to clipboard
window.copyCardText = function(btn, escapedItemJson) {
    const item = JSON.parse(decodeURIComponent(escapedItemJson));
    const textToCopy = `${item.date} - [${item.type}]\n\n${item.text}\n\nSource Link: ${item.link}`;
    
    navigator.clipboard.writeText(textToCopy).then(() => {
        const originalHTML = btn.innerHTML;
        btn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px;">
                <polyline points="20 6 9 17 4 12"/>
            </svg>
            Copied!
        `;
        btn.classList.add('copied');
        
        setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.classList.remove('copied');
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
        alert('Failed to copy text.');
    });
};

// Export currently filtered release notes to CSV file
function exportToCSV() {
    const items = appState.filteredReleases;
    if (!items || items.length === 0) {
        alert("No release notes found in current search/filter view to export.");
        return;
    }
    
    // Define headers
    const headers = ["Date", "Type", "Link", "Content"];
    
    // Format rows
    const rows = items.map(item => [
        item.date,
        item.type,
        item.link,
        item.text ? item.text.replace(/"/g, '""').replace(/\r?\n/g, ' ') : ""
    ]);
    
    // Build CSV string
    const csvContent = [
        headers.join(","),
        ...rows.map(row => row.map(val => `"${val}"`).join(","))
    ].join("\r\n");
    
    // Trigger file download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const timestamp = new Date().toISOString().slice(0, 10);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `bigquery_release_notes_${timestamp}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
