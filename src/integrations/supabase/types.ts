export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          aktif: boolean
          created_at: string
          id: string
          nama: string
          password_hash: string
          role: string
          updated_at: string
          username: string
        }
        Insert: {
          aktif?: boolean
          created_at?: string
          id?: string
          nama: string
          password_hash: string
          role?: string
          updated_at?: string
          username: string
        }
        Update: {
          aktif?: boolean
          created_at?: string
          id?: string
          nama?: string
          password_hash?: string
          role?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      anggota: {
        Row: {
          aktif: boolean
          catatan: string | null
          created_at: string
          id: string
          jabatan: string | null
          nama: string
          nip: string | null
          tanggal_bergabung: string
          telepon: string | null
          updated_at: string
        }
        Insert: {
          aktif?: boolean
          catatan?: string | null
          created_at?: string
          id?: string
          jabatan?: string | null
          nama: string
          nip?: string | null
          tanggal_bergabung?: string
          telepon?: string | null
          updated_at?: string
        }
        Update: {
          aktif?: boolean
          catatan?: string | null
          created_at?: string
          id?: string
          jabatan?: string | null
          nama?: string
          nip?: string | null
          tanggal_bergabung?: string
          telepon?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      angsuran: {
        Row: {
          bunga: number
          catatan: string | null
          created_at: string
          denda: number
          dibuat_oleh: string | null
          id: string
          pinjaman_id: string
          pokok: number
          tanggal: string
        }
        Insert: {
          bunga?: number
          catatan?: string | null
          created_at?: string
          denda?: number
          dibuat_oleh?: string | null
          id?: string
          pinjaman_id: string
          pokok?: number
          tanggal?: string
        }
        Update: {
          bunga?: number
          catatan?: string | null
          created_at?: string
          denda?: number
          dibuat_oleh?: string | null
          id?: string
          pinjaman_id?: string
          pokok?: number
          tanggal?: string
        }
        Relationships: [
          {
            foreignKeyName: "angsuran_pinjaman_id_fkey"
            columns: ["pinjaman_id"]
            isOneToOne: false
            referencedRelation: "pinjaman"
            referencedColumns: ["id"]
          },
        ]
      }
      koperasi_settings: {
        Row: {
          id: number
          updated_at: string
          whatsapp_number: string | null
        }
        Insert: {
          id?: number
          updated_at?: string
          whatsapp_number?: string | null
        }
        Update: {
          id?: number
          updated_at?: string
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      pinjaman: {
        Row: {
          anggota_id: string
          bunga_persen: number
          bunga_tipe: string
          catatan: string | null
          created_at: string
          dibuat_oleh: string | null
          id: string
          pokok: number
          status: string
          tanggal_pinjam: string
          tenor_bulan: number
          tgl_jatuh_tempo: number | null
          updated_at: string
        }
        Insert: {
          anggota_id: string
          bunga_persen?: number
          bunga_tipe?: string
          catatan?: string | null
          created_at?: string
          dibuat_oleh?: string | null
          id?: string
          pokok: number
          status?: string
          tanggal_pinjam?: string
          tenor_bulan: number
          tgl_jatuh_tempo?: number | null
          updated_at?: string
        }
        Update: {
          anggota_id?: string
          bunga_persen?: number
          bunga_tipe?: string
          catatan?: string | null
          created_at?: string
          dibuat_oleh?: string | null
          id?: string
          pokok?: number
          status?: string
          tanggal_pinjam?: string
          tenor_bulan?: number
          tgl_jatuh_tempo?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pinjaman_anggota_id_fkey"
            columns: ["anggota_id"]
            isOneToOne: false
            referencedRelation: "anggota"
            referencedColumns: ["id"]
          },
        ]
      }
      simpanan: {
        Row: {
          anggota_id: string
          catatan: string | null
          created_at: string
          dibuat_oleh: string | null
          id: string
          jenis: string
          jumlah: number
          tanggal: string
          tipe: string
        }
        Insert: {
          anggota_id: string
          catatan?: string | null
          created_at?: string
          dibuat_oleh?: string | null
          id?: string
          jenis: string
          jumlah: number
          tanggal?: string
          tipe?: string
        }
        Update: {
          anggota_id?: string
          catatan?: string | null
          created_at?: string
          dibuat_oleh?: string | null
          id?: string
          jenis?: string
          jumlah?: number
          tanggal?: string
          tipe?: string
        }
        Relationships: [
          {
            foreignKeyName: "simpanan_anggota_id_fkey"
            columns: ["anggota_id"]
            isOneToOne: false
            referencedRelation: "anggota"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
