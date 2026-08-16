CREATE TABLE `activation_items` (
	`id` text PRIMARY KEY NOT NULL,
	`activation_id` text NOT NULL,
	`model` text NOT NULL,
	`license_type` text NOT NULL,
	`subscription_end` text DEFAULT '' NOT NULL,
	`price_cents` integer NOT NULL,
	FOREIGN KEY (`activation_id`) REFERENCES `activations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_activation_items_activation_id` ON `activation_items` (`activation_id`);--> statement-breakpoint
CREATE TABLE `activations` (
	`id` text PRIMARY KEY NOT NULL,
	`number` text NOT NULL,
	`order_number` text DEFAULT '' NOT NULL,
	`organization_id` text NOT NULL,
	`status` text NOT NULL,
	`vendor` text NOT NULL,
	`total_cents` integer NOT NULL,
	`payment_status` text NOT NULL,
	`ordered_at` text NOT NULL,
	`comment` text DEFAULT '' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_activations_number_unique` ON `activations` (`number`);--> statement-breakpoint
CREATE INDEX `idx_activations_organization_ordered_at` ON `activations` (`organization_id`,`ordered_at`);--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`department` text NOT NULL,
	`position` text NOT NULL,
	`full_name` text NOT NULL,
	`phone` text NOT NULL,
	`email` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_contacts_user_active` ON `contacts` (`user_id`,`is_active`);--> statement-breakpoint
CREATE TABLE `license_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`activation_item_id` text NOT NULL,
	`serial_number` text NOT NULL,
	`license_key` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'Активна' NOT NULL,
	FOREIGN KEY (`activation_item_id`) REFERENCES `activation_items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_license_keys_activation_item_id` ON `license_keys` (`activation_item_id`);--> statement-breakpoint
CREATE TABLE `reference_items` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_reference_items_kind_code_unique` ON `reference_items` (`kind`,`code`);--> statement-breakpoint
CREATE INDEX `idx_reference_items_kind_active` ON `reference_items` (`kind`,`is_active`);--> statement-breakpoint
ALTER TABLE `orders` ADD `vendor` text DEFAULT '' NOT NULL;