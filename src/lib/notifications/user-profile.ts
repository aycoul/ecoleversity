import { createAdminClient } from '@/lib/supabase/admin';

type UserContactInfo = {
  email: string | null;
  phone: string | null;
  full_name: string;
};

/** Fetch user contact info in a single query (used by email, WhatsApp, push) */
export async function getUserContactInfo(userId: string): Promise<UserContactInfo> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('profiles')
    .select('email, phone, full_name')
    .eq('id', userId)
    .single();

  return {
    email: data?.email ?? null,
    phone: data?.phone ?? null,
    full_name: data?.full_name ?? 'Utilisateur',
  };
}
