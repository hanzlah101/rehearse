import { COMMON_ERROR_STATUS_MAP } from "@orpc/client";
import { createFileRoute } from "@tanstack/react-router";
import { getRequestIP } from "@tanstack/react-start/server";

import { NotFound } from "@/server/errors";
import { openapiHandler } from "@/server/handlers";

async function handle({ request }: { request: Request }) {
  const { response } = await openapiHandler.handle(request, {
    context: {
      clientIp: getRequestIP({ xForwardedFor: true }) ?? null,
      headers: request.headers,
    },
    prefix: "/api",
  });

  return (
    response ??
    Response.json(new NotFound({ message: "Route not found." }).toJSON(), {
      status: COMMON_ERROR_STATUS_MAP.NOT_FOUND,
    })
  );
}

export const Route = createFileRoute("/api/$")({
  server: { handlers: { ANY: handle } },
});
