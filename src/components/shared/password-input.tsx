"use client";

import { forwardRef, useState } from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";

export const PasswordInput = forwardRef<HTMLInputElement, React.ComponentProps<typeof InputGroupInput>>(
  function PasswordInput(props, ref) {
    const [visible, setVisible] = useState(false);
    return (
      <InputGroup>
        <InputGroupInput ref={ref} type={visible ? "text" : "password"} {...props} />
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            size="icon-xs"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
          >
            {visible ? <EyeOffIcon /> : <EyeIcon />}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    );
  },
);
