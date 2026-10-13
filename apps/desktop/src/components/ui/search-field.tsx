import { IconSearch, IconX } from "@tabler/icons-react";
import { cn } from "cn";
import { SearchField as SearchFieldPrimitive } from "react-aria-components";
import type { SearchFieldProps } from "react-aria-components";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";

// A search box on the Input surface: search icon, clear button once there's
// text (Escape clears too). Name it with aria-label.
function SearchField({
  className,
  placeholder,
  ...props
}: Omit<SearchFieldProps, "className"> & {
  className?: string;
  placeholder?: string;
}) {
  return (
    <SearchFieldPrimitive
      data-slot="search-field"
      className={cn("group/search w-full", className)}
      {...props}
    >
      <InputGroup className="h-8 rounded-md">
        <InputGroupAddon>
          <IconSearch />
        </InputGroupAddon>
        <InputGroupInput
          className="h-8 text-sm [&::-webkit-search-cancel-button]:hidden"
          placeholder={placeholder}
        />
        <InputGroupAddon
          align="inline-end"
          className="group-data-empty/search:hidden"
        >
          <InputGroupButton aria-label="Clear search" size="icon-xs">
            <IconX />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </SearchFieldPrimitive>
  );
}

export { SearchField };
