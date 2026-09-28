import { describe, expect, it } from "vitest";

import { formatTrpcErrorMessage } from "@/lib/api/format-trpc-error";

describe("formatTrpcErrorMessage", () => {
  it("joins messages from the treeified zodError", () => {
    const error = {
      message: "ignored raw payload",
      data: {
        zodError: {
          errors: [],
          properties: {
            driverId: { errors: ["ID do motorista inválido"] },
            vehicleId: { errors: ["ID do veículo inválido"] },
          },
        },
      },
    };

    expect(formatTrpcErrorMessage(error)).toBe(
      "ID do motorista inválido; ID do veículo inválido",
    );
  });

  it("joins messages from issue objects in the zodError tree", () => {
    const error = {
      message: "ignored raw payload",
      data: {
        zodError: {
          properties: {
            stops: {
              properties: {
                0: {
                  errors: [
                    { code: "invalid_format", message: "ID do ponto inválido" },
                  ],
                },
              },
            },
          },
        },
      },
    };

    expect(formatTrpcErrorMessage(error)).toBe("ID do ponto inválido");
  });

  it("parses raw Zod issues JSON from the message", () => {
    const message = JSON.stringify(
      [
        {
          origin: "string",
          code: "invalid_format",
          message: "ID do motorista inválido",
        },
        {
          origin: "string",
          code: "invalid_format",
          message: "ID do veículo inválido",
        },
      ],
      null,
      2,
    );

    expect(formatTrpcErrorMessage({ message })).toBe(
      "ID do motorista inválido; ID do veículo inválido",
    );
  });

  it("returns the plain message when there is nothing to parse", () => {
    expect(formatTrpcErrorMessage({ message: "Conflict" })).toBe("Conflict");
    expect(formatTrpcErrorMessage(new Error("plain error"))).toBe(
      "plain error",
    );
    expect(formatTrpcErrorMessage("string error")).toBe("string error");
  });

  it("falls back when the message is empty or missing", () => {
    expect(formatTrpcErrorMessage({ message: "" })).toBe("Erro desconhecido.");
    expect(formatTrpcErrorMessage(undefined)).toBe("Erro desconhecido.");
    expect(formatTrpcErrorMessage(null)).toBe("Erro desconhecido.");
    expect(formatTrpcErrorMessage(new Error(""), "Erro customizado.")).toBe(
      "Erro customizado.",
    );
  });
});
