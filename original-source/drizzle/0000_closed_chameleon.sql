CREATE TABLE `desk_chunks` (
	`owner` text NOT NULL,
	`position` integer NOT NULL,
	`payload` text NOT NULL,
	PRIMARY KEY(`owner`, `position`)
);
--> statement-breakpoint
CREATE TABLE `desk_workspaces` (
	`owner` text PRIMARY KEY NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`write_token` text DEFAULT '' NOT NULL,
	`updated_at` text NOT NULL
);
