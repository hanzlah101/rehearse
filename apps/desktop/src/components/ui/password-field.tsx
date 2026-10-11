import { IconEyeClosed, IconEyeFilled } from "@tabler/icons-react";
import { useRef, useState } from "react";
import type * as React from "react";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";

export function PasswordField(
  props: Omit<React.ComponentProps<typeof InputGroupInput>, "ref" | "type">
) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  function toggleVisibility() {
    setIsVisible((visible) => !visible);

    const input = inputRef.current;

    if (input === null) {
      return;
    }

    const { selectionEnd, selectionStart } = input;

    // Changing `type` re-renders the input; restore focus and the caret after.
    requestAnimationFrame(() => {
      input.focus();

      if (selectionStart !== null && selectionEnd !== null) {
        input.setSelectionRange(selectionStart, selectionEnd);
      }
    });
  }

  return (
    <InputGroup>
      <InputGroupInput
        placeholder="••••••••••••"
        {...props}
        ref={inputRef}
        type={isVisible ? "text" : "password"}
      />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          aria-label={isVisible ? "Hide password" : "Show password"}
          onPress={toggleVisibility}
          preventFocusOnPress
          size="icon-sm"
        >
          {isVisible ? <IconEyeClosed /> : <IconEyeFilled />}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}
