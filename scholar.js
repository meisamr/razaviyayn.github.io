/**
 * Scholar.js — Auto-fetch recent publications from Semantic Scholar API
 *
 * Fetches Meisam Razaviyayn's publications and displays only the last
 * few years, grouped by year. Older publications are available via
 * the Google Scholar link.
 *
 * Data source: Semantic Scholar (mirrors Google Scholar content)
 * No API key required. Updates automatically as new papers are indexed.
 */

const SEMANTIC_SCHOLAR_AUTHOR_ID = '1800298';
const GOOGLE_SCHOLAR_URL = 'https://scholar.google.com/citations?user=-qhGYywAAAAJ&hl=en';
const RECENT_YEAR_COUNT = 4; // Show papers from the last N years

// ── Main entry ──────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    fetchScholarData();
});

// ── Fetch data from Semantic Scholar ────────────────────────────

async function fetchScholarData() {
    const papersUrl = `https://api.semanticscholar.org/graph/v1/author/${SEMANTIC_SCHOLAR_AUTHOR_ID}/papers?fields=title,year,venue,citationCount,url,authors,externalIds&limit=500`;

    try {
        const res = await fetch(papersUrl);
        if (!res.ok) throw new Error(`API error: ${res.status}`);

        const papersData = await res.json();
        let papers = papersData.data || [];

        // Fetch remaining pages if needed
        if (papersData.next) {
            const more = await fetchRemainingPapers(papersData.next);
            papers = papers.concat(more);
        }

        // Filter to recent years only
        const cutoffYear = new Date().getFullYear() - RECENT_YEAR_COUNT + 1;
        const recentPapers = papers.filter(p => p.year && p.year >= cutoffYear);

        renderPublications(recentPapers);
    } catch (error) {
        console.error('Error fetching scholar data:', error);
        renderError();
    }
}

async function fetchRemainingPapers(offset) {
    const allPapers = [];
    let currentOffset = offset;

    while (currentOffset) {
        try {
            const url = `https://api.semanticscholar.org/graph/v1/author/${SEMANTIC_SCHOLAR_AUTHOR_ID}/papers?fields=title,year,venue,citationCount,url,authors,externalIds&limit=500&offset=${currentOffset}`;
            const res = await fetch(url);
            if (!res.ok) break;
            const data = await res.json();
            allPapers.push(...(data.data || []));
            currentOffset = data.next || null;
        } catch {
            break;
        }
    }

    return allPapers;
}

// ── Render publications ─────────────────────────────────────────

function renderPublications(papers) {
    // Sort by year descending, then by citations descending
    papers.sort((a, b) => {
        const yearDiff = (b.year || 0) - (a.year || 0);
        if (yearDiff !== 0) return yearDiff;
        return (b.citationCount || 0) - (a.citationCount || 0);
    });

    // Group by year
    const grouped = groupByYear(papers);

    renderGroupedPapers(grouped);
}

function groupByYear(papers) {
    const grouped = {};
    for (const paper of papers) {
        const year = paper.year || 'Undated';
        if (!grouped[year]) grouped[year] = [];
        grouped[year].push(paper);
    }
    return grouped;
}

function renderGroupedPapers(grouped) {
    const container = document.getElementById('publications-list');
    if (!container) return;

    container.innerHTML = '';

    const years = Object.keys(grouped).sort((a, b) => {
        if (a === 'Undated') return 1;
        if (b === 'Undated') return -1;
        return Number(b) - Number(a);
    });

    if (years.length === 0) {
        container.innerHTML = '<p style="text-align:center; color: var(--text-light); padding: 32px 0;">No publications found matching your search.</p>';
        return;
    }

    for (const year of years) {
        const section = document.createElement('div');
        section.className = 'year-group';

        const header = document.createElement('h3');
        header.className = 'year-header';
        header.textContent = year;
        section.appendChild(header);

        for (const paper of grouped[year]) {
            section.appendChild(createPaperElement(paper));
        }

        container.appendChild(section);
    }
}

function createPaperElement(paper) {
    const el = document.createElement('div');
    el.className = 'publication-item';

    const title = escapeHtml(paper.title || 'Untitled');
    const url = paper.url || '#';
    const venue = escapeHtml(paper.venue || '');

    // Format authors, highlighting "Razaviyayn"
    const authors = (paper.authors || [])
        .map(a => {
            const name = escapeHtml(a.name || '');
            if (/razaviyayn/i.test(name)) {
                return `<strong>${name}</strong>`;
            }
            return name;
        })
        .join(', ');

    el.innerHTML = `
        <div class="pub-main">
            <a href="${url}" class="pub-title" target="_blank" rel="noopener">${title}</a>
            ${authors ? `<p class="pub-authors">${authors}</p>` : ''}
            ${venue ? `<p class="pub-venue">${venue}</p>` : ''}
        </div>
    `;

    return el;
}

// ── Error fallback ──────────────────────────────────────────────

function renderError() {
    const container = document.getElementById('publications-list');
    if (container) {
        container.innerHTML = `
            <div class="pub-error">
                <p>Unable to load publications automatically. Please visit Google Scholar for the full list.</p>
                <a href="${GOOGLE_SCHOLAR_URL}" target="_blank" rel="noopener" class="btn btn-primary">
                    View on Google Scholar
                </a>
            </div>
        `;
    }
}

// ── Navigation ──────────────────────────────────────────────────

function initNavigation() {
    const navbar = document.getElementById('navbar');
    const toggle = document.getElementById('navToggle');
    const links = document.getElementById('navLinks');

    // Scroll shadow
    if (navbar) {
        window.addEventListener('scroll', () => {
            navbar.classList.toggle('scrolled', window.scrollY > 10);
        }, { passive: true });
    }

    // Mobile menu
    if (toggle && links) {
        toggle.addEventListener('click', () => {
            links.classList.toggle('active');
            toggle.classList.toggle('active');
        });

        links.querySelectorAll('a').forEach(a => {
            a.addEventListener('click', () => {
                links.classList.remove('active');
                toggle.classList.remove('active');
            });
        });
    }

    // Active section highlight
    const sections = document.querySelectorAll('section[id], header[id]');
    const navItems = document.querySelectorAll('.nav-links a');

    if (sections.length && navItems.length) {
        window.addEventListener('scroll', () => {
            let current = '';
            for (const section of sections) {
                if (window.scrollY >= section.offsetTop - 100) {
                    current = section.getAttribute('id');
                }
            }
            navItems.forEach(item => {
                item.classList.toggle('active', item.getAttribute('href') === `#${current}`);
            });
        }, { passive: true });
    }
}

// ── Utility ─────────────────────────────────────────────────────

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
