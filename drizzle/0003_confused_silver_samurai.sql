ALTER TABLE `orders` ADD `cart_number` text DEFAULT '' NOT NULL;--> statement-breakpoint
WITH numbered_carts AS (
	SELECT user_id, cart_id, CAST(652 + ROW_NUMBER() OVER (ORDER BY user_id, cart_id) AS text) AS cart_number
	FROM (SELECT DISTINCT user_id, cart_id FROM orders WHERE cart_id <> '')
)
UPDATE orders
SET cart_number = (
	SELECT numbered_carts.cart_number FROM numbered_carts
	WHERE numbered_carts.user_id = orders.user_id AND numbered_carts.cart_id = orders.cart_id
)
WHERE cart_id <> '';--> statement-breakpoint
ALTER TABLE `organizations` ADD `public_id` text DEFAULT '' NOT NULL;--> statement-breakpoint
UPDATE organizations
SET public_id = id
WHERE id <> '' AND id NOT GLOB '*[^0-9]*';--> statement-breakpoint
WITH numbered_organizations AS (
	SELECT id, CAST(
		MAX(102, COALESCE((SELECT MAX(CAST(public_id AS integer)) FROM organizations WHERE public_id <> ''), 0))
		+ ROW_NUMBER() OVER (ORDER BY id)
	AS text) AS public_id
	FROM organizations
	WHERE public_id = ''
)
UPDATE organizations
SET public_id = (
	SELECT numbered_organizations.public_id FROM numbered_organizations
	WHERE numbered_organizations.id = organizations.id
)
WHERE public_id = '';--> statement-breakpoint
CREATE UNIQUE INDEX `organizations_public_id_unique` ON `organizations` (`public_id`);
