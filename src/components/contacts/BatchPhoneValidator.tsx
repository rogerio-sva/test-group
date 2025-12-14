import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, XCircle, Building2, Loader2, Download } from "lucide-react";
import { useValidateNumbers } from "@/hooks/use-contacts";
import type { ValidationResult } from "@/providers/types";

export function BatchPhoneValidator() {
  const [phones, setPhones] = useState("");
  const [results, setResults] = useState<ValidationResult[]>([]);

  const validateMutation = useValidateNumbers();

  const handleValidate = async () => {
    const phoneList = phones
      .split(/[\n,;]/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    if (phoneList.length === 0) {
      return;
    }

    const validationResults = await validateMutation.mutateAsync(phoneList);
    setResults(validationResults);
  };

  const handleExport = () => {
    const csv = [
      ["Número", "Válido", "Business", "Erro"].join(","),
      ...results.map((r) =>
        [
          r.phone,
          r.is_valid ? "Sim" : "Não",
          r.is_business ? "Sim" : "Não",
          r.error || "",
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `validacao-numeros-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const validCount = results.filter((r) => r.is_valid).length;
  const invalidCount = results.filter((r) => !r.is_valid).length;
  const businessCount = results.filter((r) => r.is_business).length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Validação em Lote</CardTitle>
          <CardDescription>
            Valide múltiplos números de telefone de uma vez. Insira um número por linha.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="55119999999&#10;55119999998&#10;55119999997"
            value={phones}
            onChange={(e) => setPhones(e.target.value)}
            rows={8}
            disabled={validateMutation.isPending}
          />

          <Button
            onClick={handleValidate}
            disabled={validateMutation.isPending || !phones.trim()}
            className="w-full"
          >
            {validateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Validando...
              </>
            ) : (
              "Validar Números"
            )}
          </Button>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Resultados</CardTitle>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Exportar CSV
              </Button>
            </div>
            <CardDescription>
              Total: {results.length} números | Válidos: {validCount} | Inválidos:{" "}
              {invalidCount} | Business: {businessCount}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {results.map((result, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      {result.is_valid ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      <span className="font-mono">{result.phone}</span>
                      {result.is_business && (
                        <Badge variant="secondary" className="gap-1">
                          <Building2 className="h-3 w-3" />
                          Business
                        </Badge>
                      )}
                    </div>
                    {result.error && (
                      <span className="text-xs text-destructive">{result.error}</span>
                    )}
                  </div>
                  {index < results.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
