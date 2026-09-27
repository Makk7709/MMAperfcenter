import { createWebhookHandler } from "./handler.ts";

Deno.serve(createWebhookHandler());
