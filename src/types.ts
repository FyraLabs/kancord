export type Card = {
	id: string;
	publicId: string;
	title: string;
	description?: string | null;
	dueDate?: string | null; // ISO string after JSON serialization
	listId: string;
	boardId: string;
};

export type Changes = {
	[K in keyof Card]?: {
		from: Card[K];
		to: Card[K];
	};
};

export type WebhookPayload = {
	event: 'card.created' | 'card.updated' | 'card.moved' | 'card.deleted';
	timestamp: string;
	data: {
		card: Card;
		board?: {
			id: string;
			name: string;
		};
		list?: {
			id: string;
			name: string;
		};
		user?: {
			id: string;
			name: string | null;
		};
		changes?: Changes;
	};
};
