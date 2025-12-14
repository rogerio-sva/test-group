export interface EvolutionConfig {
  apiUrl: string;
  apiKey: string;
  instanceName: string;
}

export const getEvolutionConfig = (): EvolutionConfig | null => {
  const apiUrl = import.meta.env.VITE_EVOLUTION_API_URL;
  const apiKey = import.meta.env.VITE_EVOLUTION_API_KEY;
  const instanceName = import.meta.env.VITE_EVOLUTION_INSTANCE_NAME;

  if (!apiUrl || !apiKey || !instanceName) {
    return null;
  }

  return {
    apiUrl,
    apiKey,
    instanceName,
  };
};

export const isEvolutionConfigured = (): boolean => {
  return getEvolutionConfig() !== null;
};
