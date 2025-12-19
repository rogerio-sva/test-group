import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Lock, User, Mail, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

export default function Profile() {
  const { profile, updateProfile, updatePassword } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const { toast } = useToast();

  const handleUpdateProfile = async () => {
    if (!fullName) {
      toast({
        title: 'Nome obrigatorio',
        description: 'Digite seu nome completo.',
        variant: 'destructive',
      });
      return;
    }

    setIsUpdatingProfile(true);
    await updateProfile({ full_name: fullName });
    setIsUpdatingProfile(false);
  };

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) {
      return 'A senha deve ter pelo menos 8 caracteres.';
    }
    if (!/\d/.test(pwd)) {
      return 'A senha deve conter pelo menos 1 numero.';
    }
    return null;
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast({
        title: 'Campos obrigatorios',
        description: 'Preencha todos os campos de senha.',
        variant: 'destructive',
      });
      return;
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      toast({
        title: 'Senha invalida',
        description: passwordError,
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Senhas nao coincidem',
        description: 'As senhas digitadas nao sao iguais.',
        variant: 'destructive',
      });
      return;
    }

    setIsUpdatingPassword(true);
    const { error } = await updatePassword(newPassword);

    if (!error) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }

    setIsUpdatingPassword(false);
  };

  return (
    <MainLayout
      title="Meu Perfil"
      subtitle="Gerencie suas informacoes pessoais"
    >
      <div className="max-w-3xl space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle>Informacoes Pessoais</CardTitle>
                <CardDescription>
                  Atualize seus dados pessoais
                </CardDescription>
              </div>
              {profile?.role === 'admin' && (
                <Badge className="gap-1">
                  <Shield className="h-3 w-3" />
                  Administrador
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nome Completo</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Seu nome"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  className="pr-10"
                />
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">
                O email nao pode ser alterado
              </p>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Funcao</p>
                <p className="font-medium">
                  {profile?.role === 'admin' ? 'Administrador' : 'Usuario'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Membro desde</p>
                <p className="font-medium">
                  {profile?.created_at
                    ? format(new Date(profile.created_at), 'dd/MM/yyyy')
                    : '-'}
                </p>
              </div>
            </div>
            <Button
              onClick={handleUpdateProfile}
              disabled={isUpdatingProfile}
              variant="hero"
            >
              {isUpdatingProfile ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Alteracoes
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Lock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Alterar Senha</CardTitle>
                <CardDescription>
                  Mantenha sua conta segura com uma senha forte
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova Senha</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
              <p className="text-xs text-muted-foreground">
                Minimo 8 caracteres, pelo menos 1 numero
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>
            <Button
              onClick={handleUpdatePassword}
              disabled={isUpdatingPassword}
              variant="hero"
            >
              {isUpdatingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Atualizando...
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Alterar Senha
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
