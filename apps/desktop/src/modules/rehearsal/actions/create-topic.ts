import type { Topic } from "@server/modules/topics/topics.schemas";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { orpc } from "@/modules/common/lib/orpc";
import { topicsQueryOptions } from "@/modules/rehearsal/queries/topics";

// Saves a typed topic (the server returns the existing one for a known title)
// and puts it at the top of the cached list. Failures are shown by the topic
// dialog's <FormAlert mutation={createTopic} />.
export function useCreateTopic() {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.topics.create.mutationOptions({
      onSuccess: (topic) => {
        queryClient.setQueryData(
          topicsQueryOptions.queryKey,
          (topics: Topic[] | undefined) =>
            topics?.some((item) => item.id === topic.id) === true
              ? topics
              : [topic, ...(topics ?? [])]
        );
      },
    })
  );
}
