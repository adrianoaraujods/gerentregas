import * as React from "react";

import { Input } from "@/components/ui/input";

export function DebounceInput({
  onDebounce,
  delay = 400,
  onChange,
  defaultValue,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "value"> & {
  onDebounce?: (value: string) => void;
  delay?: number;
}) {
  const [value, setValue] = React.useState(String(defaultValue ?? ""));
  const timerRef = React.useRef<ReturnType<typeof setTimeout>>(null);

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) onChange(e);

    setValue(e.target.value);
    if (onDebounce) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => onDebounce(e.target.value), delay);
    }
  };

  return <Input value={value} onChange={handleChange} {...props} />;
}
