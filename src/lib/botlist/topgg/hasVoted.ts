export async function hasVoted(userId: string) {
	const req: { voted: 0 | 1 } = await fetch(
		`https://top.gg/api/bots/1198639435395375164/check?userId=${userId}`,
		{
			headers: {
				authorization: `${Bun.env.TOPGG_TOKEN!}`,
			},
		}
	).then((res) => res.json() as any);

	return req.voted;
}
