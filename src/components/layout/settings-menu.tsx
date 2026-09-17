"use client";

import { Settings01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTheme } from "next-themes";
import type React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Theme } from "@/lib/config";

export function SettingsMenu({
  children,
  render,
  ...props
}: React.ComponentProps<typeof DropdownMenuTrigger>) {
  const { theme: currentTheme, setTheme } = useTheme();

  const themes: {
    [key in Theme]: string;
  } = {
    dark: "Escuro",
    light: "Claro",
    system: "Sistema",
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        {...props}
        render={
          render || (
            <Button size="icon" variant="outline">
              {children || (
                <HugeiconsIcon className="size-5" icon={Settings01Icon} />
              )}
            </Button>
          )
        }
      />

      <DropdownMenuContent align="end">
        {Object.keys(themes).map((theme) => (
          <DropdownMenuCheckboxItem
            key={theme}
            checked={theme === currentTheme}
            onCheckedChange={() => setTheme(theme)}
          >
            {themes[theme as Theme]}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
