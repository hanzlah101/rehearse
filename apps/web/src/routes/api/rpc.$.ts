import { COMMON_ERROR_STATUS_MAP } from "@orpc/client";
import { createFileRoute } from "@tanstack/react-router";
import { getRequestIP } from "@tanstack/react-start/server";

import { NotFound } from "@/server/errors";
import { rpcHandler } from "@/server/handlers";

async function handle({ request }: { request: Request }) {
  const { response } = await rpcHandler.handle(request, {
    context: {
      clientIp: getRequestIP({ xForwardedFor: true }) ?? null,
      headers: request.headers,
    },
    prefix: "/api/rpc",
  });

  return (
    response ??
    Response.json(new NotFound({ message: "Procedure not found." }).toJSON(), {
      status: COMMON_ERROR_STATUS_MAP.NOT_FOUND,
    })
  );
}

export const Route = createFileRoute("/api/rpc/$")({
  server: { handlers: { ANY: handle } },
});
