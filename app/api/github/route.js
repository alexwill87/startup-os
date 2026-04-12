/**
 * GitHub API proxy — /api/github
 *
 * Accepts: ?owner=xxx&repo=yyy
 * Returns: { commits, branches, contributors }
 *
 * Uses GITHUB_TOKEN env var if available for higher rate limits,
 * falls back to unauthenticated requests (60/hr).
 */

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const owner = searchParams.get("owner");
  const repo = searchParams.get("repo");

  if (!owner || !repo) {
    return Response.json({ error: "Missing owner or repo" }, { status: 400 });
  }

  const headers = { Accept: "application/vnd.github.v3+json" };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const base = `https://api.github.com/repos/${owner}/${repo}`;

  try {
    const [commitsRes, branchesRes, contributorsRes] = await Promise.all([
      fetch(`${base}/commits?per_page=15`, { headers, next: { revalidate: 300 } }),
      fetch(`${base}/branches?per_page=20`, { headers, next: { revalidate: 300 } }),
      fetch(`${base}/contributors?per_page=10`, { headers, next: { revalidate: 600 } }),
    ]);

    const [commitsRaw, branchesRaw, contributorsRaw] = await Promise.all([
      commitsRes.ok ? commitsRes.json() : [],
      branchesRes.ok ? branchesRes.json() : [],
      contributorsRes.ok ? contributorsRes.json() : [],
    ]);

    // Shape commits — keep only what the UI needs
    const commits = (Array.isArray(commitsRaw) ? commitsRaw : []).map((c) => ({
      sha: c.sha?.slice(0, 7),
      message: c.commit?.message?.split("\n")[0] || "",
      author: c.commit?.author?.name || c.author?.login || "unknown",
      avatar: c.author?.avatar_url || null,
      date: c.commit?.author?.date || null,
      url: c.html_url || null,
    }));

    const branches = (Array.isArray(branchesRaw) ? branchesRaw : []).map((b) => ({
      name: b.name,
      sha: b.commit?.sha?.slice(0, 7),
    }));

    const contributors = (Array.isArray(contributorsRaw) ? contributorsRaw : []).map((c) => ({
      login: c.login,
      avatar: c.avatar_url,
      contributions: c.contributions,
      url: c.html_url,
    }));

    return Response.json({ commits, branches, contributors });
  } catch (err) {
    console.error("GitHub API error:", err);
    return Response.json({ error: "Failed to fetch GitHub data" }, { status: 502 });
  }
}
