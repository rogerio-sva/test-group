import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, X, ListChecks } from "lucide-react";

interface PollBuilderProps {
  onPollChange: (poll: { name: string; options: string[]; multipleAnswers: boolean }) => void;
}

export function PollBuilder({ onPollChange }: PollBuilderProps) {
  const [pollName, setPollName] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [multipleAnswers, setMultipleAnswers] = useState(false);

  const handleNameChange = (name: string) => {
    setPollName(name);
    updatePoll(name, pollOptions, multipleAnswers);
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
    updatePoll(pollName, newOptions, multipleAnswers);
  };

  const handleAddOption = () => {
    const newOptions = [...pollOptions, ""];
    setPollOptions(newOptions);
    updatePoll(pollName, newOptions, multipleAnswers);
  };

  const handleRemoveOption = (index: number) => {
    if (pollOptions.length <= 2) return;
    const newOptions = pollOptions.filter((_, i) => i !== index);
    setPollOptions(newOptions);
    updatePoll(pollName, newOptions, multipleAnswers);
  };

  const handleMultipleAnswersChange = (checked: boolean) => {
    setMultipleAnswers(checked);
    updatePoll(pollName, pollOptions, checked);
  };

  const updatePoll = (name: string, options: string[], multiple: boolean) => {
    const validOptions = options.filter((opt) => opt.trim().length > 0);
    onPollChange({
      name,
      options: validOptions,
      multipleAnswers: multiple,
    });
  };

  return (
    <div className="space-y-4">
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4 text-muted-foreground">
            <ListChecks className="h-5 w-5" />
            <span className="font-medium">Configuração da Enquete</span>
          </div>

          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="pollName" className="font-medium">Pergunta da Enquete *</Label>
              <Input
                id="pollName"
                placeholder="Ex: Qual é o seu produto favorito?"
                value={pollName}
                onChange={(e) => handleNameChange(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label className="font-medium">Opções de Resposta * (mínimo 2)</Label>
              <div className="space-y-2">
                {pollOptions.map((option, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder={`Opção ${index + 1}`}
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                    />
                    {pollOptions.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveOption(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              {pollOptions.length < 12 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddOption}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Opção
                </Button>
              )}
              <p className="text-xs text-muted-foreground">
                Máximo de 12 opções permitidas
              </p>
            </div>

            <div className="flex items-center justify-between py-3 px-3 bg-secondary/30 rounded-lg border">
              <div className="flex flex-col gap-1">
                <Label htmlFor="multipleAnswers" className="cursor-pointer">
                  Permitir múltiplas respostas
                </Label>
                <span className="text-xs text-muted-foreground">
                  Os usuários podem selecionar mais de uma opção
                </span>
              </div>
              <Switch
                id="multipleAnswers"
                checked={multipleAnswers}
                onCheckedChange={handleMultipleAnswersChange}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
