
/* =========================================
   RIYANSHU SHARMA — GITHUB PORTFOLIO
   ========================================= */

const CONFIG = {
  githubUsername: "Riyanshu08",
  linkedinUrl: "linkedin.com/in/riyanshu-sharma-64187836a",
  email: "riyanshusharma868@gmail.com",

  // Updated relative path
  resumePath: "assets/RIYANSHU SHARMA Resume.docx",

  showForks: false,
  maxRepos: 30
};

const projectGrid = document.getElementById("projectGrid");
const repoStatus = document.getElementById("repoStatus");
const repoCount = document.getElementById("repoCount");
const refreshButton = document.getElementById("refreshRepos");

let requestController = null;

/* ---------- BASIC HELPERS ---------- */

function setStatus(message, error = false) {
  repoStatus.textContent = message;
  repoStatus.classList.toggle("error", error);
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function countWords(text) {
  return (text.match(/\b[\w+#.-]+\b/g) || []).length;
}

/* ---------- README CLEANING ---------- */

function cleanMarkdown(markdown = "") {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/~~~[\s\S]*?~~~/g, " ")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/<[^>]*>/g, " ")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/^\s*>+\s?/gm, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[*_~|]/g, "")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

/*
  Choose complete sentences from the README to make
  a concise overview of 100–150 words.
*/
function summarizeReadme(readme) {
  const text = cleanMarkdown(readme);

  if (!text) return "";

  const sentences =
    text.match(/[^.!?\n]+[.!?]+|[^.!?\n]+$/g) || [];

  let result = "";

  for (const sentence of sentences) {
    const next = (result + " " + sentence.trim()).trim();
    const words = countWords(next);

    if (words > 150) break;

    result = next;

    if (words >= 100) break;
  }

  // Only return the summary if it meets the word range.
  if (countWords(result) >= 100 &&
      countWords(result) <= 150) {
    return result;
  }

  // A README with insufficient information is handled
  // separately rather than pretending it is a summary.
  return "";
}

/* ---------- METADATA FALLBACK ---------- */

/*
  A repository may not have a useful README.
  In that case, show an overview based on available metadata.
  Do not claim unknown features or technical functionality.
*/
function metadataOverview(repo) {
  const name = repo.name.replace(/[-_]/g, " ");
  const description = repo.description || "";

  const language = repo.language
    ? `GitHub identifies ${repo.language} as its primary programming language.`
    : "GitHub does not report a primary programming language for this repository.";

  const topics = repo.topics?.length
    ? `Its repository topics include ${repo.topics.slice(0, 5).join(", ")}.`
    : "No repository topics have been provided.";

  const created = repo.created_at
    ? `The repository was created in ${new Date(repo.created_at).getFullYear()}.`
    : "";

  const updated = repo.updated_at
    ? `The last recorded repository update was ${new Date(repo.updated_at).toLocaleDateString()}.`
    : "";

  const base = [
    `${name} is a public repository in Riyanshu Sharma's software portfolio.`,
    description
      ? `The repository description states: ${description}`
      : "A detailed project description has not been supplied in the repository metadata.",
    language,
    topics,
    created,
    updated,
    `The source code and files are available through the public GitHub repository. Interested visitors can inspect the file structure, review the commit history, and check any documentation that the author has published.`,
    `For an accurate understanding of the project's purpose, setup process, dependencies, and functionality, consult the repository files rather than assuming capabilities that have not been documented.`,
    `This overview is a metadata-based fallback because a sufficiently detailed README summary was unavailable.`
  ].filter(Boolean).join(" ");

  /*
    Extend to the requested range without adding
    unverified claims about the project's features.
  */
  const extra = [
    "The repository page is the authoritative place to find its current source code and documentation.",
    "Any available installation instructions should be followed before running the project.",
    "The overview can be improved by adding a project-specific README with its goals, implementation, and usage."
  ];

  let result = base;

  for (const sentence of extra) {
    if (countWords(result) >= 100) break;
    result += " " + sentence;
  }

  // Keep the fallback within 100–150 words.
  const words = result.match(/\b[\w+#.-]+\b/g) || [];

  if (words.length > 150) {
    return words.slice(0, 145).join(" ") + "…";
  }

  return result;
}

/* ---------- GITHUB API ---------- */

async function fetchJSON(url, signal) {
  const response = await fetch(url, {
    signal,
    headers: {
      Accept: "application/vnd.github+json"
    }
  });

  if (!response.ok) {
    const error = new Error(`GitHub API error: ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

/*
  Get the README through GitHub's API.
  GitHub returns the file content in Base64 format.
*/
async function getReadme(repo, signal) {
  try {
    const url =
      `https://api.github.com/repos/${encodeURIComponent(repo.owner.login)}` +
      `/${encodeURIComponent(repo.name)}/readme`;

    const data = await fetchJSON(url, signal);

    if (!data.content) return "";

    const binary = atob(data.content.replace(/\s/g, ""));

    const bytes = Uint8Array.from(
      binary,
      character => character.charCodeAt(0)
    );

    return new TextDecoder("utf-8").decode(bytes);
  } catch (error) {
    if (error.name === "AbortError") throw error;

    // README missing or unavailable; use repository metadata.
    return "";
  }
}

/* ---------- PROJECT CARD ---------- */

function formatDate(date) {
  if (!date) return "";

  return new Date(date).toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric"
  });
}

function createCard(repo, overview) {
  const initials = repo.name
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 2)
    .toUpperCase() || "GH";

  const topics = [...new Set([
    ...(repo.language ? [repo.language] : []),
    ...(repo.topics || [])
  ])].slice(0, 4);

  const tags = topics.map(topic =>
    `<span class="repo-language">${escapeHTML(topic)}</span>`
  ).join("");

  const liveDemo = repo.homepage
    ? `<a href="${escapeHTML(repo.homepage)}"
          target="_blank" rel="noopener noreferrer">
          Live demo ↗
       </a>`
    : "";

  return `
    <article class="project-card">

      <div class="project-visual" aria-hidden="true">
        <span class="visual-placeholder">${escapeHTML(initials)}</span>
      </div>

      <div class="project-title-row">
        <h3>${escapeHTML(repo.name.replace(/[-_]/g, " "))}</h3>
        <span class="repo-date">${escapeHTML(formatDate(repo.updated_at))}</span>
      </div>

      <p class="project-description">
        ${escapeHTML(overview)}
      </p>

      <div class="project-meta">
        ${tags || '<span class="repo-language">GitHub project</span>'}
      </div>

      <div class="project-links">
        <a href="${escapeHTML(repo.html_url)}"
           target="_blank" rel="noopener noreferrer">
          GitHub ↗
        </a>

        ${liveDemo}
      </div>

    </article>
  `;
}

/* ---------- LOAD ALL REPOSITORIES ---------- */

async function loadRepositories() {
  if (
    !CONFIG.githubUsername ||
    CONFIG.githubUsername === "YOUR_GITHUB_USERNAME"
  ) {
    setStatus("Add your GitHub username in script.js.", true);

    projectGrid.innerHTML = `
      <div class="empty-state">
        <h3>Connect your GitHub profile</h3>
        <p>
          Open script.js and replace YOUR_GITHUB_USERNAME
          with your exact GitHub username.
        </p>
      </div>
    `;

    repoCount.textContent = "—";
    return;
  }

  // Cancel any previous refresh request.
  if (requestController) {
    requestController.abort();
  }

  requestController = new AbortController();
  const signal = requestController.signal;

  refreshButton.disabled = true;
  refreshButton.textContent = "Loading…";

  setStatus("Connecting to GitHub…");

  projectGrid.innerHTML = `
    <article class="project-card loading-card">
      <div class="skeleton-image"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line short"></div>
    </article>
    <article class="project-card loading-card">
      <div class="skeleton-image"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line short"></div>
    </article>
    <article class="project-card loading-card">
      <div class="skeleton-image"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line short"></div>
    </article>
  `;

  try {
    const username = encodeURIComponent(CONFIG.githubUsername);

    const url =
      `https://api.github.com/users/${username}/repos` +
      "?type=owner&sort=updated&direction=desc&per_page=100";

    const repositories = await fetchJSON(url, signal);

    const publicRepos = repositories.filter(repo => !repo.private);

    const visibleRepos = publicRepos
      .filter(repo => CONFIG.showForks || !repo.fork)
      .slice(0, CONFIG.maxRepos);

    repoCount.textContent = publicRepos.length;

    if (visibleRepos.length === 0) {
      projectGrid.innerHTML = `
        <div class="empty-state">
          <h3>No public projects found</h3>
          <p>
            Check your username or make sure your GitHub account
            has public repositories.
          </p>
        </div>
      `;

      setStatus("Connected, but no public projects were found.");
      return;
    }

    /*
      Display each repository immediately with a loading message.
      Replace each card as soon as its README has been processed.
      One slow README will not hold up all the other projects.
    */
    projectGrid.innerHTML = "";

    const cards = visibleRepos.map(repo => {
      const element = document.createElement("div");

      element.innerHTML = `
        <article class="project-card">
          <div class="project-visual">
            <span class="visual-placeholder">
              ${escapeHTML(repo.name.slice(0, 2).toUpperCase())}
            </span>
          </div>
          <h3>${escapeHTML(repo.name)}</h3>
          <p class="project-description">Reading project documentation…</p>
        </article>
      `;

      const card = element.firstElementChild;
      projectGrid.appendChild(card);

      return card;
    });

    setStatus(
      `GitHub connected · loading ${visibleRepos.length} projects…`
    );

    let completed = 0;

    await Promise.all(visibleRepos.map(async (repo, index) => {
      try {
        const readme = await getReadme(repo, signal);
        const summary = summarizeReadme(readme);
        const overview = summary || metadataOverview(repo);

        cards[index].outerHTML = createCard(repo, overview);
      } catch (error) {
        if (error.name === "AbortError") throw error;

        cards[index].outerHTML = createCard(
          repo,
          metadataOverview(repo)
        );
      } finally {
        completed++;

        if (!signal.aborted) {
          setStatus(
            `GitHub connected · processing ${completed}/${visibleRepos.length}`
          );
        }
      }
    }));

    setStatus(
      `Updated successfully · ${visibleRepos.length} projects loaded`
    );

  } catch (error) {
    if (error.name === "AbortError") return;

    console.error("GitHub loading error:", error);

    let message = "Could not load GitHub projects.";

    if (error.status === 404) {
      message = "GitHub user not found. Check your username.";
    } else if (error.status === 403 || error.status === 429) {
      message = "GitHub API rate limit reached. Wait and refresh.";
    } else if (!navigator.onLine) {
      message = "You appear to be offline. Check your connection.";
    } else {
      message =
        "GitHub request failed. Check your connection and username.";
    }

    setStatus(message, true);

    projectGrid.innerHTML = `
      <div class="empty-state">
        <h3>Projects could not be loaded</h3>
        <p>${escapeHTML(message)}</p>
        <a class="btn btn-outline"
           href="https://github.com/${encodeURIComponent(CONFIG.githubUsername)}"
           target="_blank" rel="noopener noreferrer">
          Open GitHub profile ↗
        </a>
      </div>
    `;

  } finally {
    refreshButton.disabled = false;
    refreshButton.textContent = "↻ Refresh";
  }
}

/* ---------- PERSONAL LINKS ---------- */

function setupLinks() {
  const githubUrl = `https://github.com/${CONFIG.githubUsername}`;

  document.getElementById("githubFooter").href = githubUrl;
  document.getElementById("linkedinFooter").href = CONFIG.linkedinUrl;

  document.getElementById("emailFooter").href =
    `mailto:${CONFIG.email}`;

  document.getElementById("contactButton").href =
    `mailto:${CONFIG.email}`;

  document.getElementById("resumeLink").href = CONFIG.resumePath;
}

/* ---------- MOBILE NAVIGATION ---------- */

const menuToggle = document.getElementById("menuToggle");
const navMenu = document.getElementById("navMenu");

menuToggle.addEventListener("click", () => {
  const isOpen = navMenu.classList.toggle("open");

  menuToggle.setAttribute("aria-expanded", String(isOpen));
});

navMenu.querySelectorAll("a").forEach(link => {
  link.addEventListener("click", () => {
    navMenu.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
  });
});

/* ---------- START ---------- */

document.getElementById("refreshRepos")
  .addEventListener("click", loadRepositories);

setupLinks();
loadRepositories();