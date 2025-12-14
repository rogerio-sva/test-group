import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export default function LinkRedirect() {
  const { slug } = useParams<{ slug: string }>();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!slug) {
      setError("Link inválido");
      setIsLoading(false);
      return;
    }

    const redirect = async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
          throw new Error('Configuração do Supabase não encontrada');
        }

        const response = await fetch(
          `${supabaseUrl}/functions/v1/smart-link-redirect?slug=${encodeURIComponent(slug)}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${supabaseKey}`,
            },
          }
        );

        const contentType = response.headers.get('content-type');

        if (!response.ok) {
          let errorMessage = 'Link não encontrado';
          if (contentType?.includes('application/json')) {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          }
          throw new Error(errorMessage);
        }

        if (contentType?.includes('text/html')) {
          const html = await response.text();
          document.open();
          document.write(html);
          document.close();
        } else {
          throw new Error('Resposta inválida do servidor');
        }

      } catch (err) {
        console.error('Redirect error:', err);
        setError(err instanceof Error ? err.message : 'Erro ao redirecionar');
        setIsLoading(false);
      }
    };

    redirect();
  }, [slug]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center p-4">
        <div className="bg-card rounded-2xl p-8 text-center max-w-md shadow-2xl">
          <div className="w-16 h-16 mx-auto mb-6 bg-destructive/10 rounded-full flex items-center justify-center">
            <span className="text-3xl">😕</span>
          </div>
          <h1 className="text-xl font-bold text-card-foreground mb-2">Link não encontrado</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl p-8 text-center max-w-md shadow-2xl">
        <div className="w-16 h-16 mx-auto mb-6 bg-primary/10 rounded-full flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
        <h1 className="text-xl font-bold text-card-foreground mb-2">Entrando no grupo...</h1>
        <p className="text-muted-foreground">Aguarde, você será redirecionado.</p>
      </div>
    </div>
  );
}
