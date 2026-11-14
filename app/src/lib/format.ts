export const brl = (c: number | string) => (Number(c) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const dataBR = (d: Date | string | null) => (d ? new Date(d).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "—");
