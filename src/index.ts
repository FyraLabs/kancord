import { EmbedBuilder, time, TimestampStyles, WebhookClient } from 'discord.js';
import { WebhookPayload } from './types';

const EventInfo = {
	'card.created': { event: 'Created', color: 0x00ff00 },
	'card.updated': { event: 'Updated', color: 0xffff00 },
	'card.moved': { event: 'Moved', color: 0x0000ff },
	'card.deleted': { event: 'Deleted', color: 0xff0000 },
};
const unknownEventInfo = { event: 'Unknown', color: 0x808080 };

const verifySignature = async (env: Env, body: string, signature: string): Promise<boolean> => {
	const key = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(env.WEBHOOK_HMAC_KEY),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['verify'],
	);

	return await crypto.subtle.verify('HMAC', key, Uint8Array.fromHex(signature), new TextEncoder().encode(body));
};

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const signature = request.headers.get('X-Webhook-Signature');
		if (!signature) {
			return new Response('Missing signature', { status: 400 });
		}

		const body = await request.text();
		if (!verifySignature(env, body, signature)) {
			return new Response('Invalid signature', { status: 403 });
		}

		const {
			event,
			data: { card, board, list, user },
		} = JSON.parse(body) as WebhookPayload;

		const webhookClient = new WebhookClient({
			url: env.DISCORD_WEBHOOK_URL,
		});

		const eventInfo = EventInfo[event] ?? unknownEventInfo;
		const description = card.description && card.description?.trim() !== '' ? card.description : undefined;

		const embed = new EmbedBuilder()
			.setTitle(card.title.length > 256 ? card.title.substring(0, 253) + '...' : card.title)
			.setURL(`${env.KANBAN_URL}/cards/${card.publicId}`)
			.addFields([
				{
					name: 'Event',
					value: eventInfo.event,
					inline: true,
				},
				{ name: 'Board', value: board ? `[${board.name}](${env.KANBAN_URL}/boards/${board.id})` : 'Unknown', inline: true },
				{ name: 'List', value: list?.name ?? 'Unknown', inline: true },
				{ name: 'Due', value: card.dueDate ? time(Date.parse(card.dueDate) / 1000, TimestampStyles.RelativeTime) : 'Unset', inline: true },
				{ name: 'Actor', value: user?.name ?? 'Unknown', inline: true },
			])
			.setColor(eventInfo.color);

		if (description) {
			embed.setDescription(description.length > 4096 ? description.substring(0, 4093) + '...' : description);
		}

		await webhookClient.send({
			embeds: [embed],
		});

		return new Response(null, { status: 200 });
	},
} satisfies ExportedHandler<Env>;
