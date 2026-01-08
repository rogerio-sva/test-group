import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";

interface RedirectData {
  success: boolean;
  inviteLink: string;
  redirectUrl: string;
  deviceType: string;
  groupName: string;
  delay: number;
}

export default function LinkRedirect() {
  const { slug } = useParams<{ slug: string }>();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [redirectData, setRedirectData] = useState<RedirectData | null>(null);

  useEffect(() => {
    if (!slug) {
      setError("Link inválido");
      setIsLoading(false);
      return;
    }

    const fetchRedirectData = async () => {
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

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Link não encontrado');
        }

        if (!data.success) {
          throw new Error('Erro ao processar o link');
        }

        setRedirectData(data);
        setIsLoading(false);

      } catch (err) {
        console.error('Redirect error:', err);
        setError(err instanceof Error ? err.message : 'Erro ao redirecionar');
        setIsLoading(false);
      }
    };

    fetchRedirectData();
  }, [slug]);

  useEffect(() => {
    if (!redirectData) return;

    const timer = setTimeout(() => {
      const { redirectUrl, inviteLink, deviceType } = redirectData;

      if (deviceType === 'ios' || deviceType === 'android') {
        window.location.href = redirectUrl;
        setTimeout(() => {
          window.location.href = inviteLink;
        }, 2000);
      } else {
        window.location.href = inviteLink;
      }
    }, redirectData.delay);

    return () => clearTimeout(timer);
  }, [redirectData]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#25D366] to-[#128C7E] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-10 text-center max-w-md shadow-2xl">
          <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
            <span className="text-3xl">😕</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-3">Link não encontrado</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  const inviteLink = redirectData?.inviteLink || '#';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#25D366] to-[#128C7E] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-10 text-center max-w-md shadow-2xl">
        <div className="w-20 h-20 mx-auto mb-6 bg-[#25D366] rounded-full flex items-center justify-center">
          <svg className="w-12 h-12 fill-white" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </svg>
        </div>

        <div className="w-10 h-10 mx-auto mb-6 border-4 border-gray-200 border-t-[#25D366] rounded-full animate-spin"></div>

        <h1 className="text-2xl font-bold text-gray-800 mb-3">Entrando no grupo...</h1>
        <p className="text-gray-600 mb-6">Você será redirecionado automaticamente para o WhatsApp.</p>

        {redirectData && (
          <p className="text-sm text-gray-500 mb-6">Grupo: {redirectData.groupName}</p>
        )}

        <a
          href={inviteLink}
          className="inline-block bg-[#25D366] text-white px-8 py-3 rounded-full font-semibold text-base hover:bg-[#128C7E] transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
        >
          Abrir WhatsApp
        </a>

        <p className="mt-5 text-sm text-gray-400">
          Não redirecionou? <a href={inviteLink} className="text-[#128C7E] hover:underline">Clique aqui</a>
        </p>
      </div>
    </div>
  );
}
