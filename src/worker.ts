type Fetcher = {
	fetch(request: Request): Promise<Response>;
};

type D1PreparedStatement<T = unknown> = {
	bind(...values: unknown[]): D1PreparedStatement<T>;
	run(): Promise<unknown>;
	all<Row = T>(): Promise<{ results?: Row[] }>;
};

type D1Database = {
	prepare<T = unknown>(query: string): D1PreparedStatement<T>;
};

type Env = {
	ASSETS: Fetcher;
	DB?: D1Database;
};

type ScoreEntry = {
	name: string;
	score: number;
	created_at: string;
};

const jsonHeaders = {
	"content-type": "application/json; charset=utf-8",
};

function json(data: unknown, init: ResponseInit = {}) {
	return new Response(JSON.stringify(data), {
		...init,
		headers: {
			...jsonHeaders,
			...(init.headers || {}),
		},
	});
}

function cleanName(value: unknown) {
	const name = String(value || "")
		.replace(/[<>]/g, "")
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, 16);
	return name || "路过的玩家";
}

async function ensureLeaderboardTable(db: D1Database) {
	await db
		.prepare(
			`CREATE TABLE IF NOT EXISTS stickman_scores (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				name TEXT NOT NULL,
				score INTEGER NOT NULL,
				created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
			)`,
		)
		.run();
}

async function getTopScores(db: D1Database) {
	const result = await db
		.prepare(
			`SELECT name, score, created_at
			 FROM stickman_scores
			 ORDER BY score DESC, created_at ASC
			 LIMIT 10`,
		)
		.all<ScoreEntry>();
	return result.results || [];
}

async function handleLeaderboard(request: Request, env: Env) {
	if (!env.DB) {
		return json(
			{
				error:
					"Leaderboard database is not configured. Bind a Cloudflare D1 database as DB.",
				entries: [],
			},
			{ status: 503 },
		);
	}

	await ensureLeaderboardTable(env.DB);

	if (request.method === "GET") {
		return json({ entries: await getTopScores(env.DB) });
	}

	if (request.method === "POST") {
		let body: { name?: unknown; score?: unknown };
		try {
			body = await request.json();
		} catch {
			return json({ error: "Invalid JSON" }, { status: 400 });
		}

		const score = Math.floor(Number(body.score));
		if (!Number.isFinite(score) || score <= 0 || score > 999999) {
			return json({ error: "Invalid score" }, { status: 400 });
		}

		await env.DB.prepare(
			"INSERT INTO stickman_scores (name, score) VALUES (?, ?)",
		)
			.bind(cleanName(body.name), score)
			.run();

		return json({ entries: await getTopScores(env.DB) });
	}

	return json({ error: "Method not allowed" }, { status: 405 });
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		if (url.pathname === "/api/stickman-leaderboard") {
			return handleLeaderboard(request, env);
		}
		return env.ASSETS.fetch(request);
	},
};
