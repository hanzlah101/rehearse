import { os } from "@orpc/server";

import { declaredErrorsOnly } from "@/server/core/declared-errors";
import { BadRequest, InternalServerError } from "@/server/errors";

export type Context = {
  headers: Headers;
};

export const publicOS = os
  .$context<Context>()
  .errors({
    [BadRequest.code]: BadRequest,
    [InternalServerError.code]: InternalServerError,
  })
  .use(declaredErrorsOnly);
