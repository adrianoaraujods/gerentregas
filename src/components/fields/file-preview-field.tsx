"use client";

import { ExternalLinkIcon, XIcon } from "lucide-react";
import Link from "next/link";
import React from "react";

import { Button } from "@/components/ui/button";

interface FilePreviewProps {
  file: File;
  onClear: () => void;
}

export function FilePreviewField({ file, onClear }: FilePreviewProps) {
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const Comp = React.useMemo(() => {
    if (previewUrl) {
      if (file.type.startsWith("image/")) {
        return (
          // biome-ignore lint/performance/noImgElement: image is fully loaded on the browser
          <img
            className="max-h-96 w-full object-contain"
            src={previewUrl}
            alt={file.name}
          />
        );
      } else if (file.type === "application/pdf") {
        return (
          <embed
            className="min-w-2xl min-h-96"
            src={`${previewUrl}#toolbar=0`}
            type="application/pdf"
          />
        );
      }
    }

    return null;
  }, [previewUrl, file]);

  return (
    <>
      <div className="flex items-center">
        <span className="flex-1 truncate text-sm">{file.name}</span>
        {previewUrl && (
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Remover arquivo"
            render={<Link href={previewUrl} target="_blank" />}
          >
            <ExternalLinkIcon className="size-4" />
          </Button>
        )}

        <Button
          size="icon-sm"
          variant="ghost"
          onClick={onClear}
          aria-label="Remover arquivo"
        >
          <XIcon className="size-4" />
        </Button>
      </div>
      <div className="max-w-3xl max-h-2xl rounded-md bg-muted">
        {Comp || (
          <div className="flex min-h-30 items-center justify-center text-sm text-muted-foreground">
            Carregando...
          </div>
        )}
      </div>
    </>
  );
}
